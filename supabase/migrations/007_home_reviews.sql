-- A deliberately narrow public homepage projection. Full review/order tables
-- remain member-only; no order/user IDs, contact data or private fields escape.
create function public.get_home_reviews() returns jsonb
language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(row_to_json(r) order by r.created_at desc),'[]'::jsonb)
 from (select reviewer_name,product_name,rating,comment,created_at
       from public.product_reviews where rating > 3
       order by created_at desc,id desc limit 6) r;
$$;
revoke all on function public.get_home_reviews() from public;
grant execute on function public.get_home_reviews() to anon,authenticated;
