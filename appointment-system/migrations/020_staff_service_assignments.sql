-- Staff-Service Assignments: lets an owner restrict which services a staff
-- member can perform, so booking (web, Messenger, manual) only offers staff
-- qualified for the chosen service. A staff member with zero rows here is
-- treated as unrestricted (can perform any service) — this keeps every
-- existing staff/service pairing working immediately after this migration;
-- restriction only kicks in once the owner explicitly assigns at least one
-- service to that staff member.
-- Depends on is_business_owner()/is_business_staff() from earlier migrations.
-- (run in the Appointment System Supabase SQL editor)

create table public.staff_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (staff_id, service_id)
);
create index staff_services_staff_idx on public.staff_services (staff_id);
create index staff_services_service_idx on public.staff_services (service_id);

alter table public.staff_services enable row level security;

create policy "owner staff_services" on public.staff_services
  for all using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
create policy "staff reads staff_services" on public.staff_services
  for select using (public.is_business_staff(business_id));
