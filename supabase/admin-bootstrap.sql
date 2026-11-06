-- One-time owner bootstrap, run manually in the Supabase SQL Editor AFTER migrations.
-- First create a normal account through the app and confirm its email. Find its UUID
-- in Authentication > Users, then replace NULL below with 'the-user-uuid'::uuid.
-- Never put passwords, service keys or a real UUID into the committed file.
-- This grants the existing account ownership; it does not create an Auth account.
-- ZenMarket supports ONE owner. This script never replaces a different owner.
begin;
lock table public.store_admin in exclusive mode;
do $$
declare
  target_user_id uuid := null; -- replace NULL only in your private SQL Editor
  current_owner uuid;
begin
  if target_user_id is null then
    raise exception 'Set target_user_id to the UUID of the confirmed owner account';
  end if;
  if not exists (
    select 1 from auth.users u join public.profiles p on p.id = u.id
    where u.id = target_user_id and u.email_confirmed_at is not null
  ) then
    raise exception 'Account not found, email unconfirmed, or profile missing';
  end if;
  select user_id into current_owner from public.store_admin where singleton;
  if current_owner is not null and current_owner <> target_user_id then
    raise exception 'An owner already exists; this script will not replace it';
  end if;
  insert into public.store_admin(singleton, user_id) values (true, target_user_id)
  on conflict (singleton) do nothing;
  raise notice 'Owner configured for the selected account';
end $$;
commit;
