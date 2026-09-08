-- Phase D1 CMS RLS live checks (pgTAP)
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

-- Permission catalog
select ok(
  exists (select 1 from public.permissions where name = 'media.manage'),
  'media.manage permission exists'
);

select ok(
  exists (
    select 1 from public.roles r
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'media_admin' and p.name = 'media.manage'
  ),
  'media_admin has media.manage'
);

select ok(
  exists (
    select 1 from public.roles r
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'media_admin' and p.name = 'livestream.manage'
  ),
  'media_admin has livestream.manage (HQ Content Admin)'
);

select ok(
  exists (
    select 1 from public.roles r
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'media_admin' and p.name = 'branches.manage'
  ),
  'media_admin has branches.manage (HQ Content Admin)'
);

select ok(
  not exists (
    select 1 from public.roles r
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'media_admin' and p.name like '%.read'
      and p.name in ('prayer.read','counselling.read','welfare.read')
  ),
  'media_admin has no pastoral read permissions'
);

-- Synthetic users
select set_config('test.media_id', gen_random_uuid()::text, true);
select set_config('test.branch_a_id', gen_random_uuid()::text, true);
select set_config('test.branch_b_id', gen_random_uuid()::text, true);
select set_config('test.publisher_id', gen_random_uuid()::text, true);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  current_setting('test.media_id')::uuid,
  'authenticated', 'authenticated',
  'd1.media@example.invalid',
  crypt('local-test-only', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"D1 Media"}'::jsonb,
  now(), now()
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  current_setting('test.branch_a_id')::uuid,
  'authenticated', 'authenticated',
  'd1.brancha@example.invalid',
  crypt('local-test-only', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"D1 Branch A"}'::jsonb,
  now(), now()
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  current_setting('test.branch_b_id')::uuid,
  'authenticated', 'authenticated',
  'd1.branchb@example.invalid',
  crypt('local-test-only', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"D1 Branch B"}'::jsonb,
  now(), now()
),
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  current_setting('test.publisher_id')::uuid,
  'authenticated', 'authenticated',
  'd1.publisher@example.invalid',
  crypt('local-test-only', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"D1 Publisher"}'::jsonb,
  now(), now()
);

update public.profiles set is_active = true
where id in (
  current_setting('test.media_id')::uuid,
  current_setting('test.branch_a_id')::uuid,
  current_setting('test.branch_b_id')::uuid,
  current_setting('test.publisher_id')::uuid
);

insert into public.user_roles (user_id, role_id)
select current_setting('test.media_id')::uuid, id from public.roles where name = 'media_admin';

insert into public.user_roles (user_id, role_id)
select current_setting('test.branch_a_id')::uuid, id from public.roles where name = 'branch_admin';

insert into public.user_roles (user_id, role_id)
select current_setting('test.branch_b_id')::uuid, id from public.roles where name = 'branch_admin';

-- Publisher without publish: give only programs.create via temporary — use media who has publish.
-- Create a user with programs.create but strip publish by using custom: skip — test media can insert draft.

-- Assign branch A only to branch_a user (HQ)
insert into public.branch_staff_assignments (user_id, branch_id)
values (
  current_setting('test.branch_a_id')::uuid,
  'a1000000-0000-4000-8000-000000000001'::uuid
);

-- Seed draft + published programs as service_role (bypass RLS for fixture)
set local role postgres;

insert into public.programs (id, title, slug, short_description, status, placement)
values
  ('b1000000-0000-4000-8000-000000000001', 'Draft Only', 'draft-only-d1', 'hidden', 'draft', 'none'),
  ('b1000000-0000-4000-8000-000000000002', 'Published Feat', 'published-feat-d1', 'visible', 'published', 'featured');

insert into public.sermons (id, title, status, youtube_url)
values
  ('c1000000-0000-4000-8000-000000000001', 'Draft Sermon', 'draft', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('c1000000-0000-4000-8000-000000000002', 'Published Sermon', 'published', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');

-- Anon: published only
reset role;
set local role anon;
reset request.jwt.claim.sub;
reset request.jwt.claims;

select is(
  (select count(*)::int from public.programs where slug = 'draft-only-d1'),
  0,
  'anon cannot see draft programs'
);

select is(
  (select count(*)::int from public.programs where slug = 'published-feat-d1'),
  1,
  'anon can see published programs'
);

select is(
  (select count(*)::int from public.sermons where title = 'Draft Sermon'),
  0,
  'anon cannot see draft sermons'
);

select throws_ok(
  $$ insert into public.programs (title, slug, short_description, status)
     values ('Anon Hack', 'anon-hack', 'x', 'published') $$,
  '42501',
  null,
  'anon cannot insert programs'
);

update public.livestream_settings
set is_live = true
where singleton_key = 'default';

select ok(
  (select is_live from public.livestream_settings where singleton_key = 'default') = false,
  'anon cannot change livestream is_live'
);

select ok(
  (select count(*)::int from public.church_branches where slug = 'kasoa') = 1,
  'anon can read published kasoa branch'
);

select is(
  (select count(*)::int from public.branch_service_times t
   join public.church_branches b on b.id = t.branch_id
   where b.slug = 'kasoa'),
  0,
  'kasoa has no invented service times'
);

-- Media admin JWT simulation
reset role;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.media_id'),
    'role', 'authenticated',
    'email', 'd1.media@example.invalid'
  )::text,
  true
);
set local role authenticated;

select lives_ok(
  $$ insert into public.programs (title, slug, short_description, status, created_by)
     values ('Media Draft', 'media-draft-d1', 'ok', 'draft', current_setting('test.media_id')::uuid) $$,
  'media_admin can insert draft program'
);

update public.livestream_settings
set is_live = true
where singleton_key = 'default';

select ok(
  (select is_live from public.livestream_settings where singleton_key = 'default') = true,
  'media_admin can change livestream is_live'
);

update public.livestream_settings
set is_live = false
where singleton_key = 'default';

select ok(
  not public.has_permission('counselling.read'),
  'media_admin session has_permission counselling.read is false'
);

select ok(
  public.has_permission('programs.publish'),
  'media_admin has programs.publish'
);

select ok(
  not public.has_permission('users.manage'),
  'media_admin cannot manage platform users/RBAC'
);

select ok(
  not public.has_permission('giving.change'),
  'media_admin cannot change Giving destinations'
);

select ok(
  public.can_manage_branch('a1000000-0000-4000-8000-000000000001'::uuid),
  'HQ Content Admin can_manage HQ without a branch assignment'
);

select ok(
  public.can_manage_branch('a1000000-0000-4000-8000-000000000005'::uuid),
  'HQ Content Admin can_manage Accra without a branch assignment'
);

-- Branch admin A can update HQ, not Accra
reset role;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.branch_a_id'),
    'role', 'authenticated',
    'email', 'd1.brancha@example.invalid'
  )::text,
  true
);
set local role authenticated;

select ok(
  public.can_manage_branch('a1000000-0000-4000-8000-000000000001'::uuid),
  'assigned branch_admin can_manage_branch HQ'
);

select ok(
  not public.can_manage_branch('a1000000-0000-4000-8000-000000000005'::uuid),
  'assigned branch_admin cannot_manage unassigned Accra'
);

select lives_ok(
  $$ update public.church_branches
     set city_label = city_label
     where id = 'a1000000-0000-4000-8000-000000000001'::uuid $$,
  'branch_admin can update assigned HQ'
);

update public.church_branches
set city_label = 'Hacked'
where id = 'a1000000-0000-4000-8000-000000000005'::uuid;

select is(
  (select city_label from public.church_branches where id = 'a1000000-0000-4000-8000-000000000005'::uuid),
  'Accra, Ghana',
  'branch_admin cannot change unassigned Accra city_label'
);

-- Branch admin B (no assignments) cannot update HQ
reset role;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.branch_b_id'),
    'role', 'authenticated',
    'email', 'd1.branchb@example.invalid'
  )::text,
  true
);
set local role authenticated;

select ok(
  not public.can_manage_branch('a1000000-0000-4000-8000-000000000001'::uuid),
  'unassigned branch_admin cannot_manage HQ'
);

-- Revisions not visible to anon
reset role;
set local role anon;
reset request.jwt.claim.sub;
reset request.jwt.claims;

select throws_ok(
  $$select count(*)::int from public.content_revisions$$,
  '42501',
  null,
  'anon cannot read content_revisions'
);

select * from finish();
rollback;
