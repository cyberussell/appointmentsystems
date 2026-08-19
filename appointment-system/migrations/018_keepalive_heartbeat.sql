-- Dedicated singleton table for the external keep-alive cron
-- (cyberussell/supabase-keep-alive) to write to via the anon key. A read-only
-- select ping didn't reset Supabase's free-tier inactivity clock for the
-- Laundry Management System project despite firing daily, so all keep-alive
-- pings are switching from reads to writes.
create table public.keepalive_heartbeat (
  id smallint primary key default 1,
  pinged_at timestamptz not null default now(),
  constraint keepalive_heartbeat_singleton check (id = 1)
);

insert into public.keepalive_heartbeat (id) values (1);

alter table public.keepalive_heartbeat enable row level security;

create policy "anon can update heartbeat" on public.keepalive_heartbeat
  for update using (true) with check (id = 1);
