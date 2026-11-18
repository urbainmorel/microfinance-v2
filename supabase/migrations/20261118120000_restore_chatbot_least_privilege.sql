-- Migration : Rétablissement du moindre privilège sur le chatbot et le support
-- Date : 2026-11-18
--
-- Contexte : la migration 20261002213000 a ouvert les tables support_* et les RPC
-- SECURITY DEFINER au rôle anon pour corriger un refus de permission. Le code serveur
-- n'en a pas besoin : toutes les écritures du chatbot passent par le client service-role
-- (getAdminOrFallback / createSupabaseAdminClient). L'ouverture permettait en revanche :
--   1. de lire toutes les conversations anonymes et leurs messages avec la clé publique ;
--   2. d'insérer un message avec sender_type = 'agent' (usurpation de conseiller) ;
--   3. d'exécuter purge_expired_support_data() (purge destructive) en tant qu'anon ;
--   4. de poster dans n'importe quelle conversation via post_support_message_and_transition().
--
-- Cette migration restaure le durcissement de 20261001160000 tout en conservant
-- l'exécution de public.auth_role() par anon, nécessaire à l'évaluation des policies
-- sur les tables publiques en lecture (chatbot_settings notamment).

-- 1. RPC SECURITY DEFINER : plus d'exécution publique, service-role uniquement
revoke all on function public.post_support_message_and_transition(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.post_support_message_and_transition(uuid, text, text, text, text)
  to service_role;

revoke all on function public.create_support_ticket_atomic(uuid, text, text, text, numeric, text, text)
  from public, anon, authenticated;
grant execute on function public.create_support_ticket_atomic(uuid, text, text, text, numeric, text, text)
  to service_role;

revoke all on function public.purge_expired_support_data() from public, anon, authenticated;
grant execute on function public.purge_expired_support_data() to service_role;

-- Recherche vectorielle : réservée aux sessions authentifiées et au service-role
revoke all on function public.match_knowledge_items(extensions.vector, double precision, integer)
  from public, anon;
grant execute on function public.match_knowledge_items(extensions.vector, double precision, integer)
  to authenticated, service_role;

-- 2. Tables de support : plus aucun privilège direct pour anon
revoke all on table public.support_conversations from anon;
revoke all on table public.support_messages from anon;
revoke all on table public.support_tickets from anon;

-- Les modèles d'emails ne sont lus que par les Edge Functions et le back-office
revoke all on table public.notification_templates from anon;

-- 3. Policies restrictives : propriétaire authentifié ou administrateur, jamais anon
drop policy if exists support_conversations_select on public.support_conversations;
create policy support_conversations_select on public.support_conversations
  for select using (public.auth_role() = 'admin' or user_id = auth.uid());

drop policy if exists support_conversations_insert on public.support_conversations;
create policy support_conversations_insert on public.support_conversations
  for insert with check (public.auth_role() = 'admin' or user_id = auth.uid());

drop policy if exists support_conversations_update on public.support_conversations;
create policy support_conversations_update on public.support_conversations
  for update using (public.auth_role() = 'admin' or user_id = auth.uid());

drop policy if exists support_messages_select on public.support_messages;
create policy support_messages_select on public.support_messages
  for select using (
    public.auth_role() = 'admin'
    or exists (
      select 1
      from public.support_conversations c
      where c.id = support_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists support_messages_insert on public.support_messages;
create policy support_messages_insert on public.support_messages
  for insert with check (
    public.auth_role() = 'admin'
    or (
      sender_type = 'user'
      and exists (
        select 1
        from public.support_conversations c
        where c.id = support_messages.conversation_id
          and c.user_id = auth.uid()
      )
    )
  );
