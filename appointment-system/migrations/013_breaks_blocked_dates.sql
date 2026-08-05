-- Breaks & Blocked Dates: recurring per-staff breaks (e.g. daily lunch) and
-- one-off date exceptions (holidays, days off) — neither exists today; the
-- existing `availability` table only models a flat weekly working window.
-- Depends on is_business_staff() from 012_staff_login_accounts.sql.
-- (run in the Appointment System Supabase SQL editor)

create table public.availability_breaks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  check (start_time < end_time)
);
create index availability_breaks_staff_idx on public.availability_breaks (staff_id);

create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete cascade, -- null = whole business closed
  date date not null,
  reason text not null default '',
  created_at timestamptz not null default now()
);
create index blocked_dates_business_idx on public.blocked_dates (business_id, date);

alter table public.availability_breaks enable row level security;
alter table public.blocked_dates enable row level security;

create policy "owner availability_breaks" on public.availability_breaks
  for all using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
create policy "staff reads availability_breaks" on public.availability_breaks
  for select using (public.is_business_staff(business_id));

create policy "owner blocked_dates" on public.blocked_dates
  for all using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
create policy "staff reads blocked_dates" on public.blocked_dates
  for select using (public.is_business_staff(business_id));
