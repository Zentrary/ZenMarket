-- Supabase supports pg_cron. A database job runs even when no browser is open.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('zenmarket-expire-unpaid-orders','* * * * *','select public.expire_unpaid_orders();');
