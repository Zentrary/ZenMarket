-- Activate after deploying the member-gated frontend, so the old frontend does
-- not fail its anonymous catalogue fetch during the additive-schema rollout.
drop policy product_read on public.products;
create policy product_read on public.products for select to authenticated using(active or public.is_admin());
revoke select on public.products from anon;
