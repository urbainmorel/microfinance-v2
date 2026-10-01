-- Migration : Création du module Chatbot IA Natif et Support Omnicanal
-- Date : 2026-10-01

-- 1. Activation de l'extension vectorielle
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Configuration Singleton du Chatbot (calquée sur app_settings)
CREATE TABLE IF NOT EXISTS public.chatbot_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  bot_name TEXT NOT NULL DEFAULT 'Assistant Azari',
  bot_avatar_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#077BAD',
  model_name TEXT NOT NULL DEFAULT 'qwen/qwen-2.5-72b-instruct',
  welcome_message TEXT NOT NULL DEFAULT 'Bonjour ! Comment puis-je vous renseigner sur nos offres de crédit et d''épargne ?',
  offline_message TEXT NOT NULL DEFAULT 'Nos conseillers sont actuellement indisponibles. Laissez-nous vos coordonnées, nous vous recontacterons dès l''ouverture.',
  suggested_questions JSONB NOT NULL DEFAULT '["Comment obtenir un micro-prêt ?", "Quels sont vos taux d''épargne ?", "Quelles pièces fournir pour le KYC ?"]'::jsonb,
  ai_tone TEXT NOT NULL DEFAULT 'institutional',
  financial_disclaimer TEXT NOT NULL DEFAULT 'Les simulations et explications fournies par l''assistant sont informatives et ne constituent pas une offre contractuelle de prêt.',
  is_agent_online BOOLEAN NOT NULL DEFAULT FALSE,
  business_hours_start TIME NOT NULL DEFAULT '08:00:00',
  business_hours_end TIME NOT NULL DEFAULT '17:30:00',
  business_days INT[] NOT NULL DEFAULT '{1,2,3,4,5}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertion de la ligne unique initiale si non existante
INSERT INTO public.chatbot_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

-- 3. Base Documentaire Vectorisée (RAG)
CREATE TABLE IF NOT EXISTS public.knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Général',
  content TEXT NOT NULL,
  embedding extensions.vector(1536),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_items_embedding 
  ON public.knowledge_items 
  USING hnsw (embedding extensions.vector_cosine_ops);

-- 4. Sessions de Discussion
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'bot' CHECK (status IN ('bot', 'waiting_agent', 'agent_active', 'resolved', 'ticket_created')),
  assigned_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_conv_session ON public.support_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_support_conv_status ON public.support_conversations(status) WHERE status IN ('waiting_agent', 'agent_active');

-- 5. Messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'bot', 'agent', 'system')),
  sender_name TEXT,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_conv ON public.support_messages(conversation_id, created_at ASC);

-- 6. Demandes de Rappel / Tickets Qualifiés
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.support_conversations(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  loan_amount_requested NUMERIC(15, 2),
  loan_purpose TEXT,
  conversation_summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted', 'closed')),
  handled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

-- 7. Fonction RPC de Recherche Sémantique
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
    (1 - (k.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.knowledge_items k
  WHERE k.is_active = TRUE
    AND (1 - (k.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 8. Fonction RPC Audité de mise à jour des paramètres (alignée sur update_app_settings)
CREATE OR REPLACE FUNCTION public.update_chatbot_settings(p_values JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_old JSONB;
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
    updated_at = NOW()
  WHERE id;

  -- Enregistrement dans la piste d'audit immuable
  INSERT INTO public.audit_logs (user_id, user_role, action_type, entity_type, entity_id, old_values, new_values)
  VALUES (
    auth.uid(),
    'admin',
    'CHATBOT_SETTINGS_UPDATED',
    'chatbot_settings',
    'true',
    v_old,
    p_values
  );
END;
$$;

-- 9. Politiques de Sécurité (RLS)
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Lecture publique de la configuration (pour afficher le widget aux visiteurs)
DROP POLICY IF EXISTS chatbot_settings_select_public ON public.chatbot_settings;
CREATE POLICY chatbot_settings_select_public ON public.chatbot_settings FOR SELECT USING (TRUE);

-- Gestion RAG strictement réservée aux admins
DROP POLICY IF EXISTS knowledge_items_admin_all ON public.knowledge_items;
CREATE POLICY knowledge_items_admin_all ON public.knowledge_items FOR ALL USING (public.auth_role() = 'admin');

-- Conversations & Messages : consultation par session ou par admin
DROP POLICY IF EXISTS support_conversations_select ON public.support_conversations;
CREATE POLICY support_conversations_select ON public.support_conversations
  FOR SELECT USING (public.auth_role() = 'admin' OR session_id = current_setting('request.headers', true)::json->>'x-session-id' OR user_id = auth.uid());

DROP POLICY IF EXISTS support_conversations_insert ON public.support_conversations;
CREATE POLICY support_conversations_insert ON public.support_conversations
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS support_conversations_update ON public.support_conversations;
CREATE POLICY support_conversations_update ON public.support_conversations
  FOR UPDATE USING (public.auth_role() = 'admin' OR session_id = current_setting('request.headers', true)::json->>'x-session-id' OR user_id = auth.uid());

DROP POLICY IF EXISTS support_messages_select ON public.support_messages;
CREATE POLICY support_messages_select ON public.support_messages
  FOR SELECT USING (
    public.auth_role() = 'admin' OR 
    EXISTS (SELECT 1 FROM public.support_conversations c WHERE c.id = conversation_id AND (c.session_id = current_setting('request.headers', true)::json->>'x-session-id' OR c.user_id = auth.uid()))
  );

DROP POLICY IF EXISTS support_messages_insert ON public.support_messages;
CREATE POLICY support_messages_insert ON public.support_messages
  FOR INSERT WITH CHECK (TRUE);

-- Tickets de rappel : création autorisée, gestion par l'admin
DROP POLICY IF EXISTS support_tickets_insert ON public.support_tickets;
CREATE POLICY support_tickets_insert ON public.support_tickets FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS support_tickets_admin ON public.support_tickets;
CREATE POLICY support_tickets_admin ON public.support_tickets FOR ALL USING (public.auth_role() = 'admin');
