-- New plan ladder: free → basic → pro → ai_receptionist
-- (run in the Appointment System Supabase SQL editor)

-- the constraint keeps its pre-rename name from 001 unless 004 was skipped
alter table public.businesses drop constraint if exists clinics_plan_tier_check;
alter table public.businesses drop constraint if exists businesses_plan_tier_check;

-- Legacy paid tiers map onto the closest new tier.
update public.businesses set plan_tier = 'ai_receptionist' where plan_tier = 'premium';

alter table public.businesses
  add constraint businesses_plan_tier_check
  check (plan_tier in ('free', 'basic', 'pro', 'ai_receptionist'));

-- New signups land on the free plan, active immediately (no trial needed).
alter table public.businesses alter column plan_tier set default 'free';
alter table public.businesses alter column plan_status set default 'active';
