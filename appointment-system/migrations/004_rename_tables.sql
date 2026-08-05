-- Generic naming: clinics → businesses, patients → clients
-- (run in the Appointment System Supabase SQL editor; deploy the matching code right after)

alter table public.clinics rename to businesses;
alter table public.clinic_secrets rename to business_secrets;
alter table public.patients rename to clients;

alter table public.business_secrets rename column clinic_id to business_id;
alter table public.staff rename column clinic_id to business_id;
alter table public.services rename column clinic_id to business_id;
alter table public.availability rename column clinic_id to business_id;
alter table public.clients rename column clinic_id to business_id;
alter table public.appointments rename column clinic_id to business_id;
alter table public.appointments rename column patient_id to client_id;
alter table public.conversations rename column clinic_id to business_id;
alter table public.events rename column clinic_id to business_id;

-- Function bodies are stored as text and do NOT follow table renames —
-- recreate the owner check under the new name, then repoint every policy.
create or replace function public.is_business_owner(b uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.businesses where id = b and owner_id = auth.uid());
$$;

drop policy "owner manages clinic" on public.businesses;
create policy "owner manages business" on public.businesses
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy "owner staff" on public.staff;
create policy "owner staff" on public.staff
  for all using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

drop policy "owner services" on public.services;
create policy "owner services" on public.services
  for all using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

drop policy "owner availability" on public.availability;
create policy "owner availability" on public.availability
  for all using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

drop policy "owner patients" on public.clients;
create policy "owner clients" on public.clients
  for all using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

drop policy "owner appointments" on public.appointments;
create policy "owner appointments" on public.appointments
  for all using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

drop policy "owner conversations" on public.conversations;
create policy "owner conversations" on public.conversations
  for all using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

drop policy "owner reads events" on public.events;
create policy "owner reads events" on public.events
  for select using (public.is_business_owner(business_id));

drop function public.is_clinic_owner(uuid);
