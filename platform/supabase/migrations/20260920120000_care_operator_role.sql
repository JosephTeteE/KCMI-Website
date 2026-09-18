-- Handover: care_operator role + assignable-staff inclusion.
-- Exact grants: hub.access + full Care read/assign only.
-- Does NOT grant users/giving/media/website/branches/livestream/events/sermons/audit.
-- Does NOT alter super_admin semantics.
-- Also repairs known Google Form URLs in published website_documents payloads
-- so public CMS overlays cannot keep serving forms.gle after cutover.

insert into public.roles (name, description)
values (
  'care_operator',
  'Authorized Care operator: Prayer, Pastoral Care, and Welfare (hub.access + Care read/assign)'
)
on conflict (name) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'care_operator'
  and p.name in (
    'hub.access',
    'prayer.read',
    'prayer.assign',
    'counselling.read',
    'counselling.assign',
    'welfare.read',
    'welfare.assign'
  )
on conflict do nothing;

-- Ensure care_operator (and prayer_staff with assign, if ever granted) can appear
-- in Care assignment pickers. Access still gated by has_permission(...) below.
create or replace function public.care_assignable_staff()
returns table (
  id uuid,
  display_name text,
  email text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select distinct p.id, p.display_name, p.email
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  join public.roles r on r.id = ur.role_id
  where p.is_active = true
    and r.name in ('pastor', 'pastoral_admin', 'care_operator')
    and (
      public.has_permission('prayer.assign')
      or public.has_permission('counselling.assign')
      or public.has_permission('welfare.assign')
    )
  order by p.display_name nulls last, p.email nulls last;
$$;

revoke all on function public.care_assignable_staff() from public;
grant execute on function public.care_assignable_staff() to authenticated, service_role;

-- Replace known legacy Google Form destinations in stored CMS JSON (exact URL swaps).
update public.website_documents
set payload = replace(
  payload::text,
  'https://forms.gle/gKTwNc9gNiVCWWrJ6',
  '/prayer'
)::jsonb
where payload::text like '%forms.gle/gKTwNc9gNiVCWWrJ6%';

update public.website_documents
set payload = replace(
  payload::text,
  'https://forms.gle/L6DyfegmTCGHuSBk6',
  '/pastoral-care'
)::jsonb
where payload::text like '%forms.gle/L6DyfegmTCGHuSBk6%';

update public.website_documents
set payload = replace(
  payload::text,
  'https://forms.gle/NcScEq6WFDeBankw5',
  '/welfare'
)::jsonb
where payload::text like '%forms.gle/NcScEq6WFDeBankw5%';

update public.website_documents
set payload = replace(
  payload::text,
  'https://forms.gle/ogHw37wRpx9HC2bs5',
  '/contact'
)::jsonb
where payload::text like '%forms.gle/ogHw37wRpx9HC2bs5%';

update public.website_documents
set payload = replace(
  payload::text,
  'https://forms.gle/Xo3rbm2rFaidrqCbA',
  '/contact'
)::jsonb
where payload::text like '%forms.gle/Xo3rbm2rFaidrqCbA%';

update public.website_documents
set payload = replace(
  payload::text,
  'https://forms.gle/QxiASWogkGFamvEJ8',
  '/contact'
)::jsonb
where payload::text like '%forms.gle/QxiASWogkGFamvEJ8%';
