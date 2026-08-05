-- Appointment System schema — run against the DEDICATED Appointment System Supabase project
-- (not the main cyberussell.com project). See appointment-system/SETUP.md.

create extension if not exists btree_gist;

-- ── Profiles (clinic owners; mirrors auth.users) ────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Clinics (the tenant root) ───────────────────────────────────────────────
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  phone text not null default '',
  address text not null default '',
  timezone text not null default 'Asia/Manila',
  plan_tier text not null default 'basic' check (plan_tier in ('basic','pro','premium')),
  -- plan_status is flipped manually after payment (manual invoicing in v1)
  plan_status text not null default 'trial' check (plan_status in ('trial','active','suspended')),
  trial_ends_at timestamptz not null default now() + interval '14 days',
  fb_page_id text unique,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index clinics_owner_idx on public.clinics (owner_id);

-- Page access tokens live apart from clinics: RLS enabled with NO policies,
-- so only the service-role key (webhook server code) can read them.
create table public.clinic_secrets (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  fb_page_token text,
  updated_at timestamptz not null default now()
);

-- ── Staff / services / availability ─────────────────────────────────────────
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  title text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index staff_clinic_idx on public.staff (clinic_id);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  duration_min integer not null check (duration_min between 5 and 480),
  price numeric(10,2) not null default 0,
  active boolean not null default true,
  -- vertical-specific fields (tooth charts etc.) go here, not in new columns
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index services_clinic_idx on public.services (clinic_id);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  check (start_time < end_time)
);
create index availability_staff_idx on public.availability (staff_id);

-- ── Patients ────────────────────────────────────────────────────────────────
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  messenger_psid text,
  notes text not null default '',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (clinic_id, messenger_psid)
);
create index patients_clinic_idx on public.patients (clinic_id);

-- ── Appointments ────────────────────────────────────────────────────────────
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed'
    check (status in ('pending','confirmed','completed','cancelled','no_show')),
  source text not null default 'web' check (source in ('messenger','web','manual')),
  intake_note text not null default '',
  created_at timestamptz not null default now(),
  check (starts_at < ends_at),
  -- hard guarantee against double-booking a staff member
  constraint no_double_booking exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending','confirmed'))
);
create index appointments_clinic_time_idx on public.appointments (clinic_id, starts_at);

-- ── Messenger conversation state ────────────────────────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  psid text not null,
  state jsonb not null default '{"step":"idle"}',
  mode text not null default 'bot' check (mode in ('bot','human')),
  last_message_at timestamptz not null default now(),
  unique (clinic_id, psid)
);

-- ── Events (analytics + AI cost tracking; feeds Phase 2 features) ───────────
create table public.events (
  id bigint generated always as identity primary key,
  clinic_id uuid references public.clinics(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index events_clinic_time_idx on public.events (clinic_id, created_at desc);

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.clinics enable row level security;
alter table public.clinic_secrets enable row level security; -- no policies: service-role only
alter table public.staff enable row level security;
alter table public.services enable row level security;
alter table public.availability enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.conversations enable row level security;
alter table public.events enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "owner manages clinic" on public.clinics
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.is_clinic_owner(c uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.clinics where id = c and owner_id = auth.uid());
$$;

create policy "owner staff" on public.staff
  for all using (public.is_clinic_owner(clinic_id)) with check (public.is_clinic_owner(clinic_id));
create policy "owner services" on public.services
  for all using (public.is_clinic_owner(clinic_id)) with check (public.is_clinic_owner(clinic_id));
create policy "owner availability" on public.availability
  for all using (public.is_clinic_owner(clinic_id)) with check (public.is_clinic_owner(clinic_id));
create policy "owner patients" on public.patients
  for all using (public.is_clinic_owner(clinic_id)) with check (public.is_clinic_owner(clinic_id));
create policy "owner appointments" on public.appointments
  for all using (public.is_clinic_owner(clinic_id)) with check (public.is_clinic_owner(clinic_id));
create policy "owner conversations" on public.conversations
  for all using (public.is_clinic_owner(clinic_id)) with check (public.is_clinic_owner(clinic_id));
create policy "owner reads events" on public.events
  for select using (public.is_clinic_owner(clinic_id));
