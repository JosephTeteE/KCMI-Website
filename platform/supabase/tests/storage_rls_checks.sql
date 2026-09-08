-- Storage RLS: marketing-public writes are not available to JWT roles.
begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select set_config('test.media_id', gen_random_uuid()::text, true);
select set_config('test.auditor_id', gen_random_uuid()::text, true);
select set_config('test.pastor_id', gen_random_uuid()::text, true);
select set_config('test.ba_unassigned', gen_random_uuid()::text, true);
select set_config('test.ba_accra', gen_random_uuid()::text, true);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  current_setting('test.media_id')::uuid,
  'authenticated', 'authenticated',
  'storage.media@example.invalid',
  crypt('local-test-only', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Storage Media"}'::jsonb,
  now(), now()
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  current_setting('test.auditor_id')::uuid,
  'authenticated', 'authenticated',
  'storage.auditor@example.invalid',
  crypt('local-test-only', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Storage Auditor"}'::jsonb,
  now(), now()
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  current_setting('test.pastor_id')::uuid,
  'authenticated', 'authenticated',
  'storage.pastor@example.invalid',
  crypt('local-test-only', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Storage Pastor"}'::jsonb,
  now(), now()
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  current_setting('test.ba_unassigned')::uuid,
  'authenticated', 'authenticated',
  'storage.ba.none@example.invalid',
  crypt('local-test-only', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Unassigned Branch Admin"}'::jsonb,
  now(), now()
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  current_setting('test.ba_accra')::uuid,
  'authenticated', 'authenticated',
  'storage.ba.accra@example.invalid',
  crypt('local-test-only', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Accra Branch Admin"}'::jsonb,
  now(), now()
);

update public.profiles set is_active = true
where id in (
  current_setting('test.media_id')::uuid,
  current_setting('test.auditor_id')::uuid,
  current_setting('test.pastor_id')::uuid,
  current_setting('test.ba_unassigned')::uuid,
  current_setting('test.ba_accra')::uuid
);

insert into public.user_roles (user_id, role_id)
select current_setting('test.media_id')::uuid, id from public.roles where name = 'media_admin';
insert into public.user_roles (user_id, role_id)
select current_setting('test.auditor_id')::uuid, id from public.roles where name = 'auditor';
insert into public.user_roles (user_id, role_id)
select current_setting('test.pastor_id')::uuid, id from public.roles where name = 'pastor';
insert into public.user_roles (user_id, role_id)
select current_setting('test.ba_unassigned')::uuid, id from public.roles where name = 'branch_admin';
insert into public.user_roles (user_id, role_id)
select current_setting('test.ba_accra')::uuid, id from public.roles where name = 'branch_admin';

insert into public.branch_staff_assignments (user_id, branch_id)
values (
  current_setting('test.ba_accra')::uuid,
  'a1000000-0000-4000-8000-000000000005'::uuid
);

-- Anonymous
set local role anon;
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('marketing-public', 'anon-storage-rls.webp')$$,
  '42501',
  null,
  'anonymous cannot insert marketing-public objects'
);

-- Ordinary authenticated (pastor: hub.access only)
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.pastor_id'),
    'role', 'authenticated',
    'email', 'storage.pastor@example.invalid'
  )::text,
  true
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('marketing-public', 'pastor-storage-rls.webp')$$,
  '42501',
  null,
  'ordinary authenticated user cannot insert marketing-public objects'
);

-- Auditor
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.auditor_id'),
    'role', 'authenticated',
    'email', 'storage.auditor@example.invalid'
  )::text,
  true
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('marketing-public', 'auditor-storage-rls.webp')$$,
  '42501',
  null,
  'auditor cannot insert marketing-public objects'
);

-- Unassigned branch_admin (has branches.manage, no assignment)
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.ba_unassigned'),
    'role', 'authenticated',
    'email', 'storage.ba.none@example.invalid'
  )::text,
  true
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('marketing-public', 'ba-unassigned-storage-rls.webp')$$,
  '42501',
  null,
  'unassigned branch_admin cannot insert marketing-public objects'
);

-- Assigned Accra branch_admin still cannot mutate Storage via JWT
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.ba_accra'),
    'role', 'authenticated',
    'email', 'storage.ba.accra@example.invalid'
  )::text,
  true
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('marketing-public', 'ba-accra-storage-rls.webp')$$,
  '42501',
  null,
  'assigned branch_admin cannot insert marketing-public objects via JWT'
);

-- media_admin JWT cannot write Storage directly (server action + service_role only)
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.media_id'),
    'role', 'authenticated',
    'email', 'storage.media@example.invalid'
  )::text,
  true
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('marketing-public', 'media-admin-jwt-storage-rls.webp')$$,
  '42501',
  null,
  'media_admin JWT cannot insert marketing-public objects directly'
);

-- Authorized server path: service_role / table owner bypasses RLS
reset role;
set local role postgres;
select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('marketing-public', 'server-storage-rls.webp')$$,
  'server/service-role path can insert marketing-public objects'
);

-- Anon cannot delete
set local role anon;
select throws_ok(
  $$delete from storage.objects where bucket_id = 'marketing-public'$$,
  '42501',
  null,
  'anonymous cannot delete marketing-public objects'
);

select * from finish();

rollback;
