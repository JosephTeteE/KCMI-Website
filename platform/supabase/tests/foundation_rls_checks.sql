-- Live foundation RLS checks (pgTAP via `supabase test db`)
-- Positive + negative scenarios against local PostgreSQL with JWT role simulation.

begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

-- Seed integrity (role → permission matrix)
select ok(
  not exists (
    select 1
    from public.roles r
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'media_admin' and p.name = 'counselling.read'
  ),
  'media_admin seed excludes counselling.read'
);

select ok(
  not exists (
    select 1
    from public.roles r
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'super_admin' and p.name = 'prayer.read'
  ),
  'super_admin seed excludes prayer.read (no automatic pastoral)'
);

select ok(
  not exists (
    select 1
    from public.roles r
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'super_admin' and p.name in (
      'counselling.read', 'welfare.read', 'prayer.assign'
    )
  ),
  'super_admin seed excludes pastoral narrative permissions'
);

select ok(
  exists (
    select 1
    from public.roles r
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'pastoral_admin' and p.name = 'welfare.read'
  ),
  'pastoral_admin seed includes welfare.read'
);

select ok(
  exists (
    select 1
    from public.roles r
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'media_admin' and p.name = 'programs.publish'
  ),
  'media_admin seed includes programs.publish'
);

-- Store synthetic IDs in transaction-local settings (readable after role switch)
select set_config('test.media_id', gen_random_uuid()::text, true);
select set_config('test.admin_id', gen_random_uuid()::text, true);
select set_config('test.inactive_id', gen_random_uuid()::text, true);

-- Minimal auth.users rows for FK + profile trigger
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  current_setting('test.media_id')::uuid,
  'authenticated',
  'authenticated',
  'media.localtest@example.invalid',
  crypt('local-test-only', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Local Media Tester"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  current_setting('test.admin_id')::uuid,
  'authenticated',
  'authenticated',
  'admin.localtest@example.invalid',
  crypt('local-test-only', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Local Super Admin Tester"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  current_setting('test.inactive_id')::uuid,
  'authenticated',
  'authenticated',
  'inactive.localtest@example.invalid',
  crypt('local-test-only', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Local Inactive Tester"}'::jsonb,
  now(),
  now()
);

insert into public.user_roles (user_id, role_id)
select current_setting('test.media_id')::uuid, r.id
from public.roles r where r.name = 'media_admin';

insert into public.user_roles (user_id, role_id)
select current_setting('test.admin_id')::uuid, r.id
from public.roles r where r.name = 'super_admin';

insert into public.user_roles (user_id, role_id)
select current_setting('test.inactive_id')::uuid, r.id
from public.roles r where r.name = 'super_admin';

update public.profiles
set is_active = false
where id = current_setting('test.inactive_id')::uuid;

select set_config(
  'test.auditor_role',
  (select id::text from public.roles where name = 'auditor' limit 1),
  true
);

-- NEGATIVE: anonymous cannot read profiles
set local role anon;
reset request.jwt.claim.sub;
reset request.jwt.claims;

select throws_ok(
  $$select count(*)::int from public.profiles$$,
  '42501',
  null,
  'anonymous cannot read profiles'
);

-- Explicit insert must be denied (not an empty SELECT-driven insert)
select throws_ok(
  format(
    $$insert into public.user_roles (user_id, role_id)
      values (%L::uuid, %L::uuid)$$,
    current_setting('test.media_id'),
    current_setting('test.auditor_role')
  ),
  '42501',
  null,
  'anonymous cannot insert user_roles'
);

-- Authenticated media staff
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.media_id'),
    'role', 'authenticated',
    'email', 'media.localtest@example.invalid'
  )::text,
  true
);

select ok(
  (select count(*) from public.profiles where id = current_setting('test.media_id')::uuid) = 1,
  'media staff can read own profile'
);

select ok(
  not public.has_permission('counselling.read'),
  'media staff has_permission counselling.read is false'
);

select throws_ok(
  format(
    $$insert into public.user_roles (user_id, role_id)
      values (%L::uuid, (select id from public.roles where name = 'super_admin'))$$,
    current_setting('test.media_id')
  ),
  '42501',
  null,
  'media staff cannot self-grant roles'
);

-- Super admin (active)
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.admin_id'),
    'role', 'authenticated',
    'email', 'admin.localtest@example.invalid'
  )::text,
  true
);

select ok(
  public.has_permission('users.manage'),
  'super_admin has users.manage'
);

select ok(
  not public.has_permission('prayer.read'),
  'super_admin does not automatically get prayer.read'
);

select lives_ok(
  format(
    $$insert into public.user_roles (user_id, role_id)
      values (%L::uuid, (select id from public.roles where name = 'auditor'))
      on conflict do nothing$$,
    current_setting('test.media_id')
  ),
  'super_admin with users.manage can grant roles'
);

-- Inactive profile: helpers deny even with JWT
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.inactive_id'),
    'role', 'authenticated',
    'email', 'inactive.localtest@example.invalid'
  )::text,
  true
);

select ok(
  not public.has_permission('hub.access'),
  'inactive profile denied hub.access via has_permission'
);

select ok(
  not public.has_role('super_admin'),
  'inactive profile denied has_role super_admin'
);

select * from finish();

rollback;
