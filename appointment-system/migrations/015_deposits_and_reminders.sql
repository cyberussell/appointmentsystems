-- Scaffolding for two Pro features: online deposits collected via PayMongo
-- (distinct from amount_paid/paid_at, which record a manually-entered final
-- payment) and reminder-send tracking (so the future reminder job never
-- double-sends). One column, not a multi-reminder schema — SMS + email fire
-- together at a single trigger point, not on separate schedules.
-- (run in the Appointment System Supabase SQL editor)

alter table public.appointments
  add column deposit_amount numeric(10,2),
  add column deposit_paid_at timestamptz,
  add column deposit_paymongo_payment_id text,
  add column reminder_sent_at timestamptz;
