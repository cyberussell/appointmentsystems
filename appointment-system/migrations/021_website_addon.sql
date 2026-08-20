-- Optional yearly website add-on for Basic/Pro businesses (₱2,999/yr),
-- purchased on top of the existing monthly plan subscription. Tracked
-- separately from plan billing so a plan-upgrade checkout and an addon
-- checkout can be in flight at the same time without clobbering each
-- other's stale-webhook guard (see paymongo_checkout_session_id usage).
-- (run in the Appointment System Supabase SQL editor)

alter table public.businesses
  add column website_addon_expires_at timestamptz,
  add column website_addon_checkout_session_id text;

-- No grant changes needed: 011_protect_billing_columns.sql already revokes
-- UPDATE on all of public.businesses from `authenticated` and only grants
-- back a fixed column list that doesn't include these two, so new columns
-- are service-role-only by default.
