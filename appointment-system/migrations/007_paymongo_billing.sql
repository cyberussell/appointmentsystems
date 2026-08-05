-- "Pay Now" billing via PayMongo Checkout Sessions (manual-cycle, not PayMongo Subscriptions —
-- that API isn't enabled on this account; see docs/checkpoints for context).
alter table public.businesses
  add column paymongo_checkout_session_id text,
  add column plan_renews_at timestamptz;
