-- Close the billing self-escalation gap: the owner-scoped RLS policy on
-- businesses is row-level only ("owner_id = auth.uid()"), so it can't stop an
-- authenticated owner from PATCHing plan_tier/plan_status/plan_renews_at
-- directly via the REST API and granting themselves a paid plan for free.
-- RLS can't restrict individual columns, so this uses Postgres column-level
-- privileges instead, which PostgREST already respects.
--
-- Only the app's own service-role client (webhooks, admin actions) should
-- ever change billing state; the owner-scoped client should only be able to
-- write the columns the dashboard actually lets an owner edit.
-- (run in the Appointment System Supabase SQL editor)

revoke update on public.businesses from authenticated;

grant update (name, phone, address, settings, fb_page_id) on public.businesses to authenticated;
