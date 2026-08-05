-- Payment tracking per appointment (run in the Appointment System Supabase SQL editor)
alter table public.appointments
  add column if not exists amount_paid numeric(10,2) not null default 0,
  add column if not exists paid_at timestamptz;

notify pgrst, 'reload schema';
