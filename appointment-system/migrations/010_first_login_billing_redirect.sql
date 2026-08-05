-- Tracks which plan a signup came from (landing page pricing CTA) and whether
-- the business has ever logged in, so the first post-signup login can route
-- straight to Billing instead of the default dashboard.
alter table public.businesses
  add column selected_plan_tier text,
  add column first_login_at timestamptz;
