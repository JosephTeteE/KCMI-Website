begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

select ok(
  exists (select 1 from public.permissions where name = 'website.manage'),
  'website.manage permission exists'
);

select ok(
  exists (
    select 1 from public.roles r
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'media_admin' and p.name = 'website.manage'
  ),
  'media_admin has website.manage'
);

select ok(
  exists (
    select 1 from public.roles r
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'super_admin' and p.name = 'website.manage'
  ),
  'super_admin has website.manage'
);

select ok(
  not exists (
    select 1 from public.roles r
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'branch_admin' and p.name = 'website.manage'
  ),
  'branch_admin does not have website.manage'
);

select ok(
  not exists (
    select 1 from public.roles r
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where r.name = 'program_drafter' and p.name = 'website.manage'
  ),
  'program_drafter does not have website.manage'
);

select ok(
  exists (
    select 1 from public.website_documents where document_key = 'home' and status = 'published'
  ),
  'home website document is published'
);

select is(
  (select count(*)::int from public.website_documents),
  6,
  'six website documents exist'
);

select has_column('public', 'sermons', 'home_featured', 'sermons.home_featured exists');

reset role;
set local role anon;

select lives_ok(
  $$select id from public.website_documents where status = 'published'$$,
  'anon can read published website_documents'
);

select is(
  (select count(*)::int from public.website_documents where document_key = 'home'),
  1,
  'anon sees published home document'
);

update public.website_documents
set payload = '{"tamper":true}'::jsonb
where document_key = 'home';

reset role;

select is(
  (select coalesce(payload->>'tamper', '') from public.website_documents where document_key = 'home'),
  '',
  'anon cannot update website_documents'
);

update public.website_documents
set status = 'draft'
where document_key = 'faqs';

reset role;
set local role anon;

select is(
  (select count(*)::int from public.website_documents where document_key = 'faqs'),
  0,
  'anon cannot read draft website_documents'
);

reset role;
update public.website_documents
set status = 'published'
where document_key = 'faqs';

select * from finish();
rollback;
