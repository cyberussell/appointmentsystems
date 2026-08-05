-- Business type becomes multi-select: businesses can identify as more than one type
-- (run in the Appointment System Supabase SQL editor; deploy the matching code right after)

alter table public.businesses
  add column business_types text[] not null default array['medical'];

update public.businesses set business_types = array[business_type];

alter table public.businesses
  add constraint businesses_business_types_check
  check (business_types <@ array['medical','dental','spa','salon','law','veterinary','other']
     and array_length(business_types, 1) > 0);

alter table public.businesses drop column business_type;
