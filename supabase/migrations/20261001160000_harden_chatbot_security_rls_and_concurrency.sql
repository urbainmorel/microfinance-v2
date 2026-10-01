-- Migration : Durcissement Sécurité RLS, Résolution des Concurrences & Machine à états atomique
-- Date : 2026-10-01

-- 1. Sécurisation stricte de public.support_tickets
-- Élimine la faille VULN-01 : interdiction totale de lecture publique
DROP POLICY IF EXISTS support_tickets_select_own ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_select ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_admin ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_admin_select ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_admin_mod ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_admin_del ON public.support_tickets;

-- Seuls les administrateurs authentifiés peuvent lire les tickets
CREATE POLICY support_tickets_admin_select ON public.support_tickets
  FOR SELECT USING (public.auth_role() = 'admin');

-- Modification ou suppression réservée aux administrateurs
CREATE POLICY support_tickets_admin_mod ON public.support_tickets
  FOR UPDATE USING (public.auth_role() = 'admin');

CREATE POLICY support_tickets_admin_del ON public.support_tickets
  FOR DELETE USING (public.auth_role() = 'admin');

-- Insertion contrôlée
DROP POLICY IF EXISTS support_tickets_insert ON public.support_tickets;
CREATE POLICY support_tickets_insert ON public.support_tickets
  FOR INSERT WITH CHECK (
    public.auth_role() = 'admin' OR
    conversation_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.support_conversations c
      WHERE c.id = conversation_id
        AND (c.user_id = auth.uid() OR c.user_id IS NULL)
    )
  );

-- 2. Sécurisation stricte de public.support_messages
-- Élimine la faille VULN-03 : interdiction d'usurper sender_type = 'agent' ou 'system'
DROP POLICY IF EXISTS support_messages_insert ON public.support_messages;
CREATE POLICY support_messages_insert ON public.support_messages
  FOR INSERT WITH CHECK (
    public.auth_role() = 'admin' OR
    (
      sender_type = 'user' AND
      EXISTS (
        SELECT 1 FROM public.support_conversations c
        WHERE c.id = conversation_id
          AND (c.user_id = auth.uid() OR c.user_id IS NULL)
      )
    )
  );

-- 3. Sécurisation de la RPC match_knowledge_items
REVOKE EXECUTE ON FUNCTION public.match_knowledge_items(extensions.vector, FLOAT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_knowledge_items(extensions.vector, FLOAT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.match_knowledge_items(extensions.vector, FLOAT, INT) TO authenticated, service_role;

-- 4. Optimisation de l'index HNSW (Index Partiel avec hyperparamètres haute précision)
DROP INDEX IF EXISTS public.idx_knowledge_items_embedding;
CREATE INDEX idx_knowledge_items_embedding 
  ON public.knowledge_items 
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 24, ef_construction = 128)
  WHERE is_active = TRUE;

-- 5. RPC Atomique : Création de Ticket de Support (Résout la non-atomicité des 3 appels HTTP)
CREATE OR REPLACE FUNCTION public.create_support_ticket_atomic(
  p_conversation_id UUID,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_client_email TEXT DEFAULT NULL,
  p_loan_amount NUMERIC DEFAULT NULL,
  p_loan_purpose TEXT DEFAULT NULL,
  p_summary TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_ticket_id UUID;
  v_short_id TEXT;
BEGIN
  -- 1. Insertion dans support_tickets
  INSERT INTO public.support_tickets (
    conversation_id,
    client_name,
    client_phone,
    client_email,
    loan_amount_requested,
    loan_purpose,
    conversation_summary,
    status
  ) VALUES (
    p_conversation_id,
    p_client_name,
    p_client_phone,
    p_client_email,
    p_loan_amount,
    p_loan_purpose,
    p_summary,
    'pending'
  ) RETURNING id INTO v_ticket_id;

  v_short_id := SUBSTRING(v_ticket_id::TEXT FROM 1 FOR 8);

  -- 2. Mise à jour atomique de la conversation liée si présente
  IF p_conversation_id IS NOT NULL THEN
    UPDATE public.support_conversations
    SET 
      status = 'ticket_created',
      last_message_at = NOW()
    WHERE id = p_conversation_id;

    -- 3. Message système de confirmation traçable
    INSERT INTO public.support_messages (
      conversation_id,
      sender_type,
      sender_name,
      content
    ) VALUES (
      p_conversation_id,
      'system',
      'Système',
      'Votre demande de rappel a bien été enregistrée (Dossier N° ' || v_short_id || '). Un conseiller de crédit vous recontactera très prochainement.'
    );
  END IF;

  RETURN v_ticket_id;
END;
$$;

-- 6. RPC Atomique : Enregistrement de message avec vérification de concurrence (Résout "Bot Talkover")
CREATE OR REPLACE FUNCTION public.post_support_message_and_transition(
  p_conversation_id UUID,
  p_sender_type TEXT,
  p_sender_name TEXT,
  p_content TEXT,
  p_target_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_conv public.support_conversations%ROWTYPE;
  v_msg_id UUID;
BEGIN
  -- 1. Verrouillage pessimiste de la conversation
  SELECT * INTO v_conv
  FROM public.support_conversations
  WHERE id = p_conversation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'CONVERSATION_NOT_FOUND');
  END IF;

  -- 2. Protection Anti-Talkover : Si le bot tente d'écrire alors qu'un conseiller humain a pris la main
  IF p_sender_type = 'bot' AND v_conv.status IN ('waiting_agent', 'agent_active') THEN
    RETURN jsonb_build_object(
      'success', false, 
      'reason', 'AGENT_ALREADY_ACTIVE', 
      'current_status', v_conv.status
    );
  END IF;

  -- 3. Insertion du message
  INSERT INTO public.support_messages (
    conversation_id,
    sender_type,
    sender_name,
    content
  ) VALUES (
    p_conversation_id,
    p_sender_type,
    p_sender_name,
    p_content
  ) RETURNING id INTO v_msg_id;

  -- 4. Transition d'état atomique
  UPDATE public.support_conversations
  SET
    status = COALESCE(p_target_status, status),
    last_message_at = NOW()
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_msg_id,
    'status', COALESCE(p_target_status, v_conv.status)
  );
END;
$$;

-- 7. Rétention et Cycle de vie des données (Conformité APDP Bénin / RGPD)
CREATE OR REPLACE FUNCTION public.purge_expired_support_data()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_purged_count INT := 0;
BEGIN
  -- Suppression des conversations résolues ou abandonnées de plus de 90 jours
  WITH deleted AS (
    DELETE FROM public.support_conversations
    WHERE (
      status IN ('resolved', 'ticket_created') OR 
      (status = 'bot' AND last_message_at < NOW() - INTERVAL '30 days')
    )
    AND last_message_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_purged_count FROM deleted;

  -- Anonymisation des tickets clôturés de plus de 365 jours
  UPDATE public.support_tickets
  SET 
    client_phone = 'REDACTED',
    client_email = NULL,
    conversation_summary = 'Archivé conformément aux règles APDP'
  WHERE status IN ('converted', 'closed')
    AND created_at < NOW() - INTERVAL '365 days';

  RETURN v_purged_count;
END;
$$;
