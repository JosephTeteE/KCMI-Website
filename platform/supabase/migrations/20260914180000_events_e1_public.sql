-- E1: public Events content model (no registration / payment_evidence).
-- Events != Programs. Hub write policies deferred to E2 (events.manage).

do $$ begin
  create type public.event_kind as enum (
    'camp',
    'conference',
    'convention',
    'retreat',
    'special_service',
    'other'
  );
exception when duplicate_object then null;
end $$;

grant usage on type public.event_kind to anon, authenticated, service_role;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  theme text,
  summary text not null default '',
  body_text text not null default '',
  event_kind public.event_kind not null default 'other',
  status public.publication_status not null default 'draft',
  featured_media_id uuid references public.media_assets (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Africa/Lagos',
  venue_label text,
  venue_city text,
  venue_country text,
  location_branch_id uuid references public.church_branches (id) on delete set null,
  contact_email text,
  contact_phone_display text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_slug_unique unique (slug),
  constraint events_slug_format_chk check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 2 and 80
  ),
  constraint events_dates_chk check (
    ends_at is null or ends_at >= starts_at
  ),
  constraint events_timezone_chk check (char_length(trim(timezone)) > 0)
);

create index if not exists events_status_idx on public.events (status);
create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_published_starts_idx
  on public.events (starts_at asc)
  where status = 'published';

comment on table public.events is
  'E1 public Events content. Registration and payment evidence are E3/E4. Not Programs.';

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- Allow content revisions to reference events in E2 without a follow-up CHECK migration.
alter table public.content_revisions
  drop constraint if exists content_revisions_entity_type_chk;

alter table public.content_revisions
  add constraint content_revisions_entity_type_chk check (
    entity_type in (
      'program',
      'church_branch',
      'sermon',
      'livestream_settings',
      'website_document',
      'event'
    )
  );

alter table public.events enable row level security;

-- Public: published only
drop policy if exists events_anon_published_select on public.events;
create policy events_anon_published_select on public.events
  for select to anon
  using (status = 'published');

-- Authenticated: published, or Hub staff may read drafts (Hub UI in E2)
drop policy if exists events_staff_select on public.events;
create policy events_staff_select on public.events
  for select to authenticated
  using (
    status = 'published'
    or public.has_permission('hub.access')
  );

-- No INSERT/UPDATE/DELETE policies in E1 — E2 adds events.manage writes.

revoke all on table public.events from public;
grant select on table public.events to anon, authenticated;
grant all on table public.events to service_role;
