-- Drop the AI Receptionist tier entirely: fold any businesses on it into Pro,
-- then tighten the plan_tier constraint to only allow the remaining 3 tiers.
update public.businesses set plan_tier = 'pro' where plan_tier = 'ai_receptionist';

alter table public.businesses drop constraint if exists businesses_plan_tier_check;

alter table public.businesses
  add constraint businesses_plan_tier_check
  check (plan_tier in ('free', 'basic', 'pro'));
