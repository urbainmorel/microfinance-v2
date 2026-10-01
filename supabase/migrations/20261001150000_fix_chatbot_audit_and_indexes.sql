-- Migration corrective : Audit logs, HNSW vector search sargable, Index de performance & RLS tickets

-- 1. Correction de la fonction update_chatbot_settings (alignement avec audit_logs et business_days)
CREATE OR REPLACE FUNCTION public.update_chatbot_settings(p_values JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
BEGIN
  IF NOT (public.auth_role() = 'admin') THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs.';
  END IF;

  SELECT to_jsonb(s) INTO v_old FROM public.chatbot_settings s WHERE id FOR UPDATE;

  UPDATE public.chatbot_settings SET
    bot_name = COALESCE(p_values->>'botName', p_values->>'bot_name', bot_name),
    bot_avatar_url = COALESCE(p_values->>'botAvatarUrl', p_values->>'bot_avatar_url', bot_avatar_url),
    primary_color = COALESCE(p_values->>'primaryColor', p_values->>'primary_color', primary_color),
    model_name = COALESCE(p_values->>'modelName', p_values->>'model_name', model_name),
    welcome_message = COALESCE(p_values->>'welcomeMessage', p_values->>'welcome_message', welcome_message),
    offline_message = COALESCE(p_values->>'offlineMessage', p_values->>'offline_message', offline_message),
    suggested_questions = CASE 
      WHEN p_values ? 'suggestedQuestions' THEN p_values->'suggestedQuestions'
      WHEN p_values ? 'suggested_questions' THEN p_values->'suggested_questions'
      ELSE suggested_questions 
    END,
    ai_tone = COALESCE(p_values->>'aiTone', p_values->>'ai_tone', ai_tone),
    financial_disclaimer = COALESCE(p_values->>'financialDisclaimer', p_values->>'financial_disclaimer', financial_disclaimer),
    is_agent_online = COALESCE((p_values->>'isAgentOnline')::BOOLEAN, (p_values->>'is_agent_online')::BOOLEAN, is_agent_online),
    business_hours_start = COALESCE((p_values->>'businessHoursStart')::TIME, (p_values->>'business_hours_start')::TIME, business_hours_start),
    business_hours_end = COALESCE((p_values->>'businessHoursEnd')::TIME, (p_values->>'business_hours_end')::TIME, business_hours_end),
    business_days = CASE
      WHEN p_values ? 'businessDays' THEN ARRAY(SELECT jsonb_array_elements_text(p_values->'businessDays')::INT)
      WHEN p_values ? 'business_days' THEN ARRAY(SELECT jsonb_array_elements_text(p_values->'business_days')::INT)
      ELSE business_days
    END,
    updated_at = NOW()
  WHERE id;

  SELECT to_jsonb(s) INTO v_new FROM public.chatbot_settings s WHERE id;

  -- Enregistrement strict conforme aux colonnes réelles de public.audit_logs
  INSERT INTO public.audit_logs (
    user_id,
    user_role,
    action_type,
    target_id,
    old_value,
    new_value,
    reason
  ) VALUES (
    auth.uid(),
    'admin',
    'CHATBOT_SETTINGS_UPDATED',
    NULL,
    v_old,
    v_new,
    'Mise à jour des paramètres du chatbot et du support'
  );
END;
$$;

-- 2. Correction de la RPC match_knowledge_items (activation de l'index KNN HNSW sur <=>)
CREATE OR REPLACE FUNCTION public.match_knowledge_items (
  query_embedding extensions.vector(1536),
  match_threshold FLOAT DEFAULT 0.65,
  match_count INT DEFAULT 4
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  category TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.title,
    k.category,
    k.content,
    (1.0 - (k.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.knowledge_items k
  WHERE k.is_active = TRUE
    AND k.embedding <=> query_embedding < (1.0 - match_threshold)
  ORDER BY k.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

-- 3. Index de performance manquants
CREATE INDEX IF NOT EXISTS idx_support_conv_user ON public.support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_conv_agent ON public.support_conversations(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_support_conv_last_msg ON public.support_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON public.support_tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_conv ON public.support_tickets(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_handled ON public.support_tickets(handled_by);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_updated ON public.knowledge_items(updated_at DESC);

-- 4. Sécurisation de support_tickets pour le retour INSERT RETURNING id
DROP POLICY IF EXISTS support_tickets_select_own ON public.support_tickets;
CREATE POLICY support_tickets_select_own ON public.support_tickets
  FOR SELECT USING (
    public.auth_role() = 'admin' OR
    (conversation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.support_conversations c 
      WHERE c.id = conversation_id
    ))
  );
