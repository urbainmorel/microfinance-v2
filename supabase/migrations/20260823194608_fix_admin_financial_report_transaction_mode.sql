-- This read RPC uses the same locking staff guard as the admin KPI endpoint.
alter function public.get_admin_financial_report(date, date) volatile;
