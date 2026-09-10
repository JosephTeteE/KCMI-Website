-- D1.6B public website CMS documents + featured sermon flag.
-- No Giving D2 tables. No pastoral narrative tables. No events/registration.

insert into public.permissions (name, description) values
  ('website.manage', 'Edit structured public website copy (Home, About, Services, Global, FAQs, sermons page)')
on conflict (name) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name in ('media_admin', 'super_admin')
  and p.name = 'website.manage'
on conflict do nothing;

alter table public.sermons
  add column if not exists home_featured boolean not null default false;

comment on column public.sermons.home_featured is
  'When true and status is published, this sermon is used on the Home highlight. At most one row should be featured.';

create unique index if not exists sermons_one_home_featured_uidx
  on public.sermons (home_featured)
  where home_featured = true;

create table if not exists public.website_documents (
  id uuid primary key,
  document_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.publication_status not null default 'published',
  updated_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_documents_key_unique unique (document_key),
  constraint website_documents_key_chk check (
    document_key in ('home', 'about', 'services', 'global', 'faqs', 'sermons_page')
  )
);

comment on table public.website_documents is
  'Structured public website copy. JSON payloads are validated in the application. No HTML page-builder.';

drop trigger if exists website_documents_set_updated_at on public.website_documents;
create trigger website_documents_set_updated_at
  before update on public.website_documents
  for each row execute function public.set_updated_at();

alter table public.content_revisions
  drop constraint if exists content_revisions_entity_type_chk;

alter table public.content_revisions
  add constraint content_revisions_entity_type_chk check (
    entity_type in (
      'program',
      'church_branch',
      'sermon',
      'livestream_settings',
      'website_document'
    )
  );

-- Seed published documents (verified copy). Application merge still supplies defaults.
insert into public.website_documents (id, document_key, payload, status, published_at)
values
(
  'a0000000-0000-4000-8000-000000000001',
  'home',
  jsonb_build_object(
    'heroKicker', 'KCMI · Rehoboth Christian Center',
    'heroHeadline', 'Kingdom Covenant Ministries International',
    'heroSupporting', 'Using every creative biblical means, we disciple individuals, strengthen families, and transform communities—until a nation is won for Christ!',
    'heroPrimaryCtaLabel', 'Plan a visit',
    'heroPrimaryCtaHref', '#worship',
    'heroSecondaryCtaLabel', 'Watch Live',
    'heroSecondaryCtaHref', '/livestream',
    'heroMediaId', null,
    'welcomeEyebrow', 'Welcome',
    'welcomeHeading', 'Raising Kings To Build The Kingdom',
    'welcomeBody', 'We are committed to serving God faithfully, and we invite you to be part of this great mission. Discover ways to connect, grow, and serve with us.',
    'welcomeMediaId', null,
    'featuredProgramId', null
  ),
  'published',
  now()
),
(
  'a0000000-0000-4000-8000-000000000002',
  'about',
  jsonb_build_object(
    'vision', 'Raising Kings To Build The Kingdom',
    'leadershipName', 'Apostle Philemon Frank Aikins',
    'leadershipRole', 'Senior Pastor and Founder',
    'portraitMediaId', null,
    'portraitAlt', 'Apostle Philemon Frank Aikins'
  ),
  'published',
  now()
),
(
  'a0000000-0000-4000-8000-000000000003',
  'services',
  jsonb_build_object(
    'intro', 'Worship, cell fellowships, and service teams at Kingdom Covenant Ministries International. Headquarters times are listed below; other locations are on the Locations page.'
  ),
  'published',
  now()
),
(
  'a0000000-0000-4000-8000-000000000004',
  'global',
  jsonb_build_object(
    'contactEmail', 'contact@kcmi-rcc.org',
    'contactEmailLabel', 'Email KCMI',
    'contactPhoneDisplay', '+234 9134 44 8322',
    'contactPhoneTel', '+2349134448322',
    'dfrHeading', 'Daily Faith Recharge',
    'dfrSpotifyLabel', 'Listen on Spotify',
    'dfrSpotifyHref', 'https://open.spotify.com/show/6xYjccKxPNSCbBHbnPiEQq'
  ),
  'published',
  now()
),
(
  'a0000000-0000-4000-8000-000000000005',
  'faqs',
  '{}'::jsonb,
  'published',
  now()
),
(
  'a0000000-0000-4000-8000-000000000006',
  'sermons_page',
  jsonb_build_object(
    'headline', 'Experience the Word of God Anytime, Anywhere.',
    'sectionTitle', 'Where to Watch & Listen'
  ),
  'published',
  now()
)
on conflict (document_key) do nothing;

alter table public.website_documents enable row level security;

drop policy if exists website_documents_anon_published_select on public.website_documents;
create policy website_documents_anon_published_select on public.website_documents
  for select to anon
  using (status = 'published');

drop policy if exists website_documents_staff_select on public.website_documents;
create policy website_documents_staff_select on public.website_documents
  for select to authenticated
  using (
    status = 'published'
    or public.has_permission('hub.access')
  );

drop policy if exists website_documents_update on public.website_documents;
create policy website_documents_update on public.website_documents
  for update to authenticated
  using (public.has_permission('website.manage'))
  with check (public.has_permission('website.manage'));

drop policy if exists website_documents_insert on public.website_documents;
create policy website_documents_insert on public.website_documents
  for insert to authenticated
  with check (public.has_permission('website.manage'));

revoke all on table public.website_documents from public;
grant select on table public.website_documents to anon;
grant select, insert, update on table public.website_documents to authenticated;
grant all on table public.website_documents to service_role;
