-- Search V2: publication / privacy boundaries for search_public_content
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

select has_function(
  'public',
  'search_public_content',
  array['text', 'text', 'integer'],
  'search_public_content(text, text, integer) exists'
);

select set_config('test.pub_program', gen_random_uuid()::text, true);
select set_config('test.draft_program', gen_random_uuid()::text, true);
select set_config('test.pub_sermon', gen_random_uuid()::text, true);
select set_config('test.draft_sermon', gen_random_uuid()::text, true);
select set_config('test.pub_branch', gen_random_uuid()::text, true);
select set_config('test.private_branch', gen_random_uuid()::text, true);
select set_config('test.draft_doc', gen_random_uuid()::text, true);

insert into public.programs (
  id, title, slug, short_description, body_text, status, published_at
) values
(
  current_setting('test.pub_program')::uuid,
  'Search V2 Published Convention',
  'search-v2-published-convention',
  'Public convention description',
  'Body for published convention',
  'published',
  now()
),
(
  current_setting('test.draft_program')::uuid,
  'Search V2 Draft Convention',
  'search-v2-draft-convention',
  'Draft must not appear in search',
  'Secret draft body',
  'draft',
  null
);

insert into public.sermons (
  id, title, speaker, summary, status, published_at
) values
(
  current_setting('test.pub_sermon')::uuid,
  'Search V2 Published Faith Message',
  'Apostle Frank Aikins',
  'Public sermon summary',
  'published',
  now()
),
(
  current_setting('test.draft_sermon')::uuid,
  'Search V2 Draft Faith Message',
  'Internal Speaker',
  'Draft sermon must not appear',
  'draft',
  null
);

insert into public.church_branches (
  id, slug, name, city_label, country, is_public, status, sort_order, published_at
) values
(
  current_setting('test.pub_branch')::uuid,
  'search-v2-public-branch',
  'Search V2 Public Branch',
  'Test City',
  'Nigeria',
  true,
  'published',
  9001,
  now()
),
(
  current_setting('test.private_branch')::uuid,
  'search-v2-private-branch',
  'Search V2 Private Branch',
  'Hidden City',
  'Nigeria',
  false,
  'published',
  9002,
  now()
);

-- Prefer explicit draft update on allowlisted key (rolled back at end).
update public.website_documents
set status = 'draft',
    payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
      'searchV2SecretMarker',
      'SearchV2InternalDraftFaqsMarker'
    )
where document_key = 'faqs';

-- Anon role exercises
set local role anon;

select ok(
  exists (
    select 1
    from public.search_public_content('Search V2 Published Convention', 'program', 25)
    where url = '/programs/search-v2-published-convention'
  ),
  'published program is searchable as anon'
);

select ok(
  not exists (
    select 1
    from public.search_public_content('Search V2 Draft Convention', null, 25)
    where url like '%search-v2-draft-convention%'
       or title ilike '%Draft Convention%'
  ),
  'draft program is not searchable as anon'
);

select ok(
  exists (
    select 1
    from public.search_public_content('Search V2 Published Faith', 'sermon', 25)
    where result_type = 'sermon'
      and title = 'Search V2 Published Faith Message'
  ),
  'published sermon is searchable as anon'
);

select ok(
  not exists (
    select 1
    from public.search_public_content('Search V2 Draft Faith', null, 25)
    where title ilike '%Draft Faith Message%'
  ),
  'draft/unpublished sermon is not searchable as anon'
);

select ok(
  exists (
    select 1
    from public.search_public_content('Search V2 Public Branch', 'location', 25)
    where url = '/locations/search-v2-public-branch'
  ),
  'public published branch is searchable as anon'
);

select ok(
  not exists (
    select 1
    from public.search_public_content('Search V2 Private Branch', null, 25)
    where url like '%search-v2-private-branch%'
       or title ilike '%Private Branch%'
  ),
  'private branch is not searchable as anon'
);

select ok(
  not exists (
    select 1
    from public.search_public_content('SearchV2InternalDraftFaqsMarker', null, 25)
    where summary ilike '%SearchV2InternalDraftFaqsMarker%'
       or title ilike '%SearchV2InternalDraftFaqsMarker%'
  ),
  'draft website_documents payload marker is not searchable'
);

select ok(
  not exists (
    select 1
    from public.search_public_content('admin', null, 25)
    where url ilike '/admin%'
       or url ilike '/auth%'
       or url ilike '/qa%'
  ),
  'search never returns hub/auth/qa urls'
);

select ok(
  not exists (
    select 1
    from public.search_public_content('privacy', 'page', 25)
    where url in ('/privacy', '/terms')
  ),
  'privacy and terms pages are not indexed'
);

select is(
  (select count(*)::integer from public.search_public_content('   ', null, 25)),
  0,
  'blank/whitespace query returns no corpus dump'
);

select is(
  (select count(*)::integer from public.search_public_content('faith', 'not-a-type', 25)),
  0,
  'invalid type returns no rows (cannot bypass filters)'
);

select ok(
  (
    select count(*) <= 3
    from public.search_public_content('a', null, 3)
  ),
  'result limit is respected'
);

select ok(
  not exists (
    select 1
    from public.search_public_content('audit', null, 25)
    where url ilike '%audit%'
       or result_type not in ('page', 'program', 'sermon', 'location')
  ),
  'search cannot return non-public result types / audit urls'
);

select ok(
  not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'search_public_content'
  ),
  'search_public_content is a function not a base table dump'
);

-- Known curated page still searchable (static catalog; independent of faqs draft)
select ok(
  exists (
    select 1
    from public.search_public_content('About KCMI', 'page', 25)
    where url = '/about'
  ),
  'known public page catalog entry is searchable'
);

reset role;

select * from finish();
rollback;
