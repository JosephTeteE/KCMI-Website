-- Events E3 registration RLS / capacity / privacy checks.
-- Apply after 20260914192000_events_e3_registration.sql on a non-production DB.

begin;

select plan(14);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'registration_enabled'
  ),
  'events.registration_enabled exists'
);

select ok(
  (
    select column_default::text
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'registration_enabled'
  ) like '%false%',
  'registration_enabled defaults false'
);

select ok(
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'event_registrations'
  ),
  'event_registrations table exists'
);

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_registrations'
      and roles::text ilike '%anon%'
  ),
  'no anon policies on event_registrations'
);

select ok(
  (
    select count(*)::int
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_registrations'
      and cmd = 'SELECT'
  ) = 1,
  'one staff SELECT policy on event_registrations'
);

select ok(
  (
    select count(*)::int
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_registrations'
      and cmd = 'INSERT'
  ) = 0,
  'no authenticated INSERT policy on event_registrations'
);

select ok(
  has_function_privilege('service_role', 'public.admin_register_for_event(uuid, text, text, text, integer, text)', 'execute'),
  'service_role can execute admin_register_for_event'
);

select ok(
  not has_function_privilege('anon', 'public.admin_register_for_event(uuid, text, text, text, integer, text)', 'execute'),
  'anon cannot execute admin_register_for_event'
);

select ok(
  not has_function_privilege('authenticated', 'public.admin_register_for_event(uuid, text, text, text, integer, text)', 'execute'),
  'authenticated cannot execute admin_register_for_event'
);

select ok(
  has_function_privilege('anon', 'public.public_event_registered_people(uuid)', 'execute'),
  'anon can execute occupancy count helper'
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
  exists (
    select 1
    from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'registrar' and p.name = 'registrations.manage'
  ),
  'registrar has registrations.manage'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_registrations'
      and policyname = 'event_registrations_staff_select'
      and qual::text like '%registrations.manage%'
  ),
  'staff SELECT requires registrations.manage'
);

select ok(
  (
    select pg_get_functiondef(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'admin_register_for_event'
    limit 1
  ) like '%REGISTRATION_FULL%',
  'capacity overflow raises REGISTRATION_FULL'
);

select * from finish();
rollback;
