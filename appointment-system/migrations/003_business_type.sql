-- Business type per account — drives UI/AI terminology (run in the Appointment System Supabase SQL editor)
alter table public.clinics
  add column if not exists business_type text not null default 'medical'
  check (business_type in ('medical', 'dental', 'spa', 'salon', 'law', 'veterinary', 'other'));
