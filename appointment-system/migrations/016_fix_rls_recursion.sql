-- Fix RLS infinite recursion: is_business_owner() and is_business_staff()
-- were not marked security definer, so evaluating either one re-triggers RLS
-- on the table it queries internally — which, now that
-- 012_staff_login_accounts.sql added cross-referencing policies (staff
-- policies on businesses/staff that call these functions), calls back into
-- the same functions and loops until Postgres raises "stack depth limit
-- exceeded". is_business_owner() was never hit by this before because
-- businesses' own policy checked owner_id = auth.uid() inline, with no
-- function call — 012 is what introduced the cycle.
--
-- security definer makes the function's internal query run with the
-- function owner's privileges instead of the caller's, bypassing RLS for
-- that one narrow, hardcoded lookup and breaking the loop. Same root cause
-- and fix already applied to the Laundry Management System's equivalent
-- helpers.
-- (run in the Appointment System Supabase SQL editor)

alter function public.is_business_owner(uuid) security definer set search_path = public;
alter function public.is_business_staff(uuid) security definer set search_path = public;
