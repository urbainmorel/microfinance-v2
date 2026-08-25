-- The staff guard acquires a row lock, so this RPC cannot run as STABLE/read-only.
alter function public.get_admin_kpis() volatile;
