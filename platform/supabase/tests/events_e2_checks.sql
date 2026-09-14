-- Events E2 write RLS / media_admin grant checks.
-- Apply after 20260914190000_events_e2_hub_writes.sql on a non-production DB.

begin;

select plan(6);

select ok(
  exists (
    select 1
    from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'media_admin' and p.name = 'events.manage'
  ),
  'media_admin has events.manage'
);

select ok(
  not exists (
    select 1
    from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'media_admin' and p.name = 'registrations.manage'
  ),
  'media_admin does not have registrations.manage'
);

select ok(
  not exists (
    select 1
    from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'media_admin' and p.name = 'payment_evidence.review'
  ),
  'media_admin does not have payment_evidence.review'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'events' and policyname = 'events_insert'
  ),
  'events insert policy exists'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'events' and policyname = 'events_update'
  ),
  'events update policy exists'
);

select ok(
  (
    select count(*)::int
    from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and cmd = 'DELETE'
  ) = 0,
  'E2 has no events DELETE policy (archive via status)'
);

select * from finish();
rollback;
