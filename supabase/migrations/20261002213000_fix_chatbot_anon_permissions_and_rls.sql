-- Migration: Fix permissions and RLS policies for anonymous chatbot visitors
-- Date: 2026-10-02

-- 1. Grant execute on public.auth_role() to anon, authenticated, service_role, public
-- This prevents "permission denied for function auth_role" (code 42501) when unauthenticated
-- visitors trigger RLS policies that evaluate auth_role().
GRANT EXECUTE ON FUNCTION public.auth_role() TO anon, authenticated, service_role, public;

-- 2. Adjust support_conversations RLS policies
-- Allows both authenticated clients and anonymous visitors (user_id IS NULL AND session_id IS NOT NULL)
-- to cleanly SELECT and INSERT their conversation rows, including .insert().select('id, status')
DROP POLICY IF EXISTS support_conversations_select ON public.support_conversations;
CREATE POLICY support_conversations_select ON public.support_conversations
  FOR SELECT USING (
    public.auth_role() = 'admin' OR 
    user_id = auth.uid() OR
    (user_id IS NULL AND session_id IS NOT NULL)
  );

DROP POLICY IF EXISTS support_conversations_insert ON public.support_conversations;
CREATE POLICY support_conversations_insert ON public.support_conversations
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS support_conversations_update ON public.support_conversations;
CREATE POLICY support_conversations_update ON public.support_conversations
  FOR UPDATE USING (
    public.auth_role() = 'admin' OR 
    user_id = auth.uid() OR
    (user_id IS NULL AND session_id IS NOT NULL)
  );

-- 3. Adjust support_messages RLS policies
DROP POLICY IF EXISTS support_messages_select ON public.support_messages;
CREATE POLICY support_messages_select ON public.support_messages
  FOR SELECT USING (
    public.auth_role() = 'admin' OR 
    EXISTS (
      SELECT 1 FROM public.support_conversations c 
      WHERE c.id = conversation_id 
        AND (c.user_id = auth.uid() OR (c.user_id IS NULL AND c.session_id IS NOT NULL))
    )
  );

DROP POLICY IF EXISTS support_messages_insert ON public.support_messages;
CREATE POLICY support_messages_insert ON public.support_messages
  FOR INSERT WITH CHECK (TRUE);

-- 4. Grant execute on public.match_knowledge_items
-- Allows unauthenticated visitors to execute RAG vector similarity search
GRANT EXECUTE ON FUNCTION public.match_knowledge_items(extensions.vector, FLOAT, INT) TO anon, authenticated, service_role, public;

-- 5. Table Grants
GRANT SELECT, INSERT, UPDATE ON TABLE public.support_conversations TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.support_messages TO anon, authenticated, service_role;
