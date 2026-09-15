-- Care P3: Pastoral Care + Welfare first-party intake support fields
-- Does NOT enable public anon INSERT/SELECT. Intake remains gated in application code.
-- Google Forms remain live visitor CTAs until a later approved cutover.

-- ---------------------------------------------------------------------------
-- Extend contact method for Pastoral "In person" preference
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'care_contact_method'
      and e.enumlabel = 'in_person'
  ) then
    alter type public.care_contact_method add value 'in_person';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Narrow welfare request category (one nullable structured field)
-- Prayer/Pastoral: must remain null. Welfare: required allowlisted values.
-- ---------------------------------------------------------------------------
alter table public.pastoral_requests
  add column if not exists request_category text;

comment on column public.pastoral_requests.request_category is
  'Structured Welfare support category only (financial/food/clothing/shelter/medical/other). Null for prayer/pastoral. Not a narrative.';

alter table public.pastoral_requests
  drop constraint if exists pastoral_requests_request_category_check;

alter table public.pastoral_requests
  add constraint pastoral_requests_request_category_check
  check (
    (
      service_type = 'welfare'
      and request_category in (
        'financial',
        'food',
        'clothing',
        'shelter',
        'medical',
        'other'
      )
    )
    or (
      service_type <> 'welfare'
      and request_category is null
    )
  );

create index if not exists pastoral_requests_welfare_category_idx
  on public.pastoral_requests (service_type, request_category, submitted_at desc)
  where service_type = 'welfare';
