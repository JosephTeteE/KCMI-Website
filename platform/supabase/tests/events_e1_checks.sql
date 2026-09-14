-- Events E1 publication / RLS checks (pgTAP-style asserts).
-- Apply after 20260914180000_events_e1_public.sql on a non-production DB.
-- Does not create registration or payment_evidence tables.

begin;

select plan(8);

-- Table exists
select has_table('public', 'events', 'events table exists');

-- Enum exists
select has_type('public', 'event_kind', 'event_kind enum exists');

-- RLS enabled
select ok(
  (
    select relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'events'
  ),
  'events RLS enabled'
);

-- No write policies in E1
select is(
  (
    select count(*)::int
    from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  ),
  0,
  'E1 has no events write policies'
);

-- Anon can only see published (policy predicate)
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and policyname = 'events_anon_published_select'
      and qual ilike '%published%'
  ),
  'anon select policy requires published'
);

-- content_revisions accepts event entity_type
select lives_ok(
  $$
    insert into public.content_revisions (entity_type, entity_id, revision_number, snapshot)
    values ('event', gen_random_uuid(), 1, '{}'::jsonb)
  $$,
  'content_revisions allows entity_type=event'
);

-- Cleanup revision insert
delete from public.content_revisions where entity_type = 'event';

-- Grants: anon has SELECT
select ok(
  has_table_privilege('anon', 'public.events', 'select'),
  'anon has select on events'
);

-- Grants: anon cannot insert
select ok(
  not has_table_privilege('anon', 'public.events', 'insert'),
  'anon cannot insert events'
);

select * from finish();
rollback;
