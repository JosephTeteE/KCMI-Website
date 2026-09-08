-- Phase D1.1 branch_media RLS checks
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

select set_config('test.ba_accra', gen_random_uuid()::text, true);
select set_config('test.ba_togo', gen_random_uuid()::text, true);
select set_config('test.media_asset', gen_random_uuid()::text, true);
select set_config('test.media_asset_b', gen_random_uuid()::text, true);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  current_setting('test.ba_accra')::uuid,
  'authenticated', 'authenticated',
  'd11.accra@example.invalid',
  crypt('local-test-only', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Accra Branch Admin"}'::jsonb,
  now(), now()
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  current_setting('test.ba_togo')::uuid,
  'authenticated', 'authenticated',
  'd11.togo@example.invalid',
  crypt('local-test-only', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Togo Branch Admin"}'::jsonb,
  now(), now()
);

update public.profiles set is_active = true
where id in (
  current_setting('test.ba_accra')::uuid,
  current_setting('test.ba_togo')::uuid
);

insert into public.user_roles (user_id, role_id)
select current_setting('test.ba_accra')::uuid, id from public.roles where name = 'branch_admin';

insert into public.user_roles (user_id, role_id)
select current_setting('test.ba_togo')::uuid, id from public.roles where name = 'branch_admin';

-- Accra assignment only
insert into public.branch_staff_assignments (user_id, branch_id)
values (
  current_setting('test.ba_accra')::uuid,
  'a1000000-0000-4000-8000-000000000005'::uuid
);

-- Togo assignment only
insert into public.branch_staff_assignments (user_id, branch_id)
values (
  current_setting('test.ba_togo')::uuid,
  'a1000000-0000-4000-8000-000000000004'::uuid
);

-- Fixture assets as postgres
set local role postgres;
insert into public.media_assets (
  id, storage_bucket, storage_path, public_url, content_type, byte_size, alt_text
) values
(
  current_setting('test.media_asset')::uuid,
  'marketing-public',
  'd11-test-a.webp',
  'http://127.0.0.1:54321/storage/v1/object/public/marketing-public/d11-test-a.webp',
  'image/webp',
  1200,
  'Accra hall'
),
(
  current_setting('test.media_asset_b')::uuid,
  'marketing-public',
  'd11-test-b.webp',
  'http://127.0.0.1:54321/storage/v1/object/public/marketing-public/d11-test-b.webp',
  'image/webp',
  1300,
  'Draft only'
);

insert into public.branch_media (
  branch_id, media_asset_id, placement, status, is_active, created_by
) values (
  'a1000000-0000-4000-8000-000000000005'::uuid,
  current_setting('test.media_asset')::uuid,
  'hero',
  'published',
  true,
  current_setting('test.ba_accra')::uuid
);

insert into public.branch_media (
  branch_id, media_asset_id, placement, status, is_active
) values (
  'a1000000-0000-4000-8000-000000000005'::uuid,
  current_setting('test.media_asset_b')::uuid,
  'gallery',
  'draft',
  true
);

-- Anon sees published only
reset role;
set local role anon;
reset request.jwt.claims;

select is(
  (select count(*)::int from public.branch_media where status = 'draft'),
  0,
  'anon cannot see draft branch media'
);

select is(
  (select count(*)::int from public.branch_media where placement = 'hero'),
  1,
  'anon can see published active branch hero media'
);

update public.branch_media set sort_order = 99 where placement = 'hero';
select is(
  (select sort_order from public.branch_media where placement = 'hero' limit 1),
  0,
  'anon cannot mutate branch media'
);

-- Accra admin can manage Accra, not Togo
reset role;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.ba_accra'),
    'role', 'authenticated',
    'email', 'd11.accra@example.invalid'
  )::text,
  true
);
set local role authenticated;

select ok(
  public.can_manage_branch('a1000000-0000-4000-8000-000000000005'::uuid),
  'Accra admin can_manage Accra'
);

select ok(
  not public.can_manage_branch('a1000000-0000-4000-8000-000000000004'::uuid),
  'Accra admin cannot_manage Togo'
);

select ok(
  not public.has_permission('counselling.read'),
  'branch_admin has no pastoral counselling.read'
);

select lives_ok(
  format(
    $$ insert into public.branch_media (branch_id, media_asset_id, placement, status, created_by)
       values (
         'a1000000-0000-4000-8000-000000000005'::uuid,
         %L::uuid,
         'gallery',
         'published',
         current_setting('test.ba_accra')::uuid
       ) $$,
    current_setting('test.media_asset')
  ),
  'Accra admin can attach media to Accra'
);

update public.branch_media
set placement = 'featured'
where branch_id = 'a1000000-0000-4000-8000-000000000004'::uuid;

select is(
  (select count(*)::int from public.branch_media where branch_id = 'a1000000-0000-4000-8000-000000000004'::uuid),
  0,
  'Accra admin cannot insert/mutate Togo branch media rows'
);

-- Togo admin cannot attach to Accra
reset role;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.ba_togo'),
    'role', 'authenticated',
    'email', 'd11.togo@example.invalid'
  )::text,
  true
);
set local role authenticated;

update public.branch_media
set sort_order = 42
where branch_id = 'a1000000-0000-4000-8000-000000000005'::uuid
  and placement = 'hero';

select is(
  (select sort_order from public.branch_media
   where branch_id = 'a1000000-0000-4000-8000-000000000005'::uuid
     and placement = 'hero'
   limit 1),
  0,
  'Togo admin cannot update Accra branch media'
);

select lives_ok(
  format(
    $$ insert into public.branch_media (branch_id, media_asset_id, placement, status)
       values (
         'a1000000-0000-4000-8000-000000000004'::uuid,
         %L::uuid,
         'hero',
         'published'
       ) $$,
    current_setting('test.media_asset_b')
  ),
  'Togo admin can attach media to assigned Togo branch'
);

select * from finish();
rollback;
