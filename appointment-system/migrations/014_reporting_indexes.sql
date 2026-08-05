-- Reporting indexes: speeds up the revenue-over-time and no-show-rate
-- queries Basic/Advanced Reporting will run. The existing
-- appointments_clinic_time_idx (business_id, starts_at) already covers most
-- other reporting access patterns, so this is the one genuinely missing
-- piece, not a broad indexing pass.
-- (run in the Appointment System Supabase SQL editor)

create index appointments_revenue_idx on public.appointments (business_id, paid_at) where amount_paid > 0;
create index appointments_status_idx on public.appointments (business_id, status);
