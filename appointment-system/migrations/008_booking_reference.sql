-- Customer-facing reference code for self-service manage/cancel/reschedule.
alter table public.appointments
  add column reference_code text unique;
