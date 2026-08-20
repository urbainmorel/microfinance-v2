-- PostgreSQL accorde EXECUTE à PUBLIC par défaut lors de la création d'une fonction.
-- Les grants applicatifs explicites des migrations précédentes sont conservés ;
-- seuls les droits implicites et les accès directs au schéma privé sont supprimés.
revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema app_private from public, anon, authenticated;

-- Empêche le retour du droit implicite pour les fonctions créées par les migrations futures.
alter default privileges for role postgres in schema public
  revoke execute on functions from public;
alter default privileges for role postgres in schema app_private
  revoke execute on functions from public;

-- Contrat minimal explicitement maintenu pour les rôles techniques.
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant execute on function public.claim_notification_outbox(integer) to service_role;
grant execute on function public.complete_notification_outbox(uuid, boolean, text) to service_role;
grant execute on function public.get_pin_security_for_verification(uuid) to service_role;
grant execute on function public.set_initial_pin_hash(uuid, text) to service_role;
grant execute on function public.replace_pin_hash(uuid, text) to service_role;
grant execute on function public.record_pin_verification_failure(uuid, integer, integer) to service_role;
grant execute on function public.record_pin_verification_success(uuid) to service_role;
