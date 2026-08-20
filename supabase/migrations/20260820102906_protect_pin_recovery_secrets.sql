-- L'outbox contient temporairement des données destinées aux canaux externes.
-- Elle reste strictement réservée au worker service_role, même pour les administrateurs.
drop policy if exists "outbox_admin_read" on public.notification_outbox;
revoke all on table public.notification_outbox from public, anon, authenticated;
grant select, insert, update on table public.notification_outbox to service_role;

revoke all on function public.claim_notification_outbox(integer) from public, anon, authenticated;
revoke all on function public.complete_notification_outbox(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_notification_outbox(integer) to service_role;
grant execute on function public.complete_notification_outbox(uuid, boolean, text) to service_role;
