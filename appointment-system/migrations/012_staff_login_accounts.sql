-- Staff Login Accounts: lets a staff member log in and run day-to-day
-- operations (bookings, clients, conversations) without owner-level access to
-- billing, settings, or staff management. A staff row starts as just a name
-- (today's behavior) and becomes a real login once an invite is accepted and
-- profile_id is set.
--
-- Assumes one staff login belongs to exactly one business (mirrors the app's
-- existing one-owner-one-business assumption) — relax the unique index below
-- later if staff working across multiple businesses becomes a real need.
-- (run in the Appointment System Supabase SQL editor)

alter table public.staff
  add column profile_id uuid references public.profiles(id) on delete set null,
  add column invite_email text,
  add column invited_at timestamptz;

create unique index staff_profile_idx on public.staff (profile_id) where profile_id is not null;

create or replace function public.is_business_staff(b uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.staff
    where business_id = b and profile_id = auth.uid() and active = true
  );
$$;

-- Read-only: business profile, services, staff list, availability.
create policy "staff reads own business" on public.businesses
  for select using (public.is_business_staff(id));
create policy "staff reads services" on public.services
  for select using (public.is_business_staff(business_id));
create policy "staff reads staff" on public.staff
  for select using (public.is_business_staff(business_id));
create policy "staff reads availability" on public.availability
  for select using (public.is_business_staff(business_id));

-- Full operational access, but no delete — mirrors the Laundry Management
-- System's staff permission model (day-to-day operations, not destructive
-- actions). Deleting a client or appointment record stays owner-only.
create policy "staff reads clients" on public.clients
  for select using (public.is_business_staff(business_id));
create policy "staff inserts clients" on public.clients
  for insert with check (public.is_business_staff(business_id));
create policy "staff updates clients" on public.clients
  for update using (public.is_business_staff(business_id)) with check (public.is_business_staff(business_id));

create policy "staff reads appointments" on public.appointments
  for select using (public.is_business_staff(business_id));
create policy "staff inserts appointments" on public.appointments
  for insert with check (public.is_business_staff(business_id));
create policy "staff updates appointments" on public.appointments
  for update using (public.is_business_staff(business_id)) with check (public.is_business_staff(business_id));

-- Conversations are created only by the Messenger webhook (service-role);
-- staff read and hand-off (mode), never insert directly.
create policy "staff reads conversations" on public.conversations
  for select using (public.is_business_staff(business_id));
create policy "staff updates conversations" on public.conversations
  for update using (public.is_business_staff(business_id)) with check (public.is_business_staff(business_id));
