-- Phase D1 CMS content schema (local-first)
-- Programs, media, sermons, branches, livestream, revisions
-- Giving destinations intentionally NOT included (Phase D2).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.publication_status as enum (
    'draft',
    'preview',
    'published',
    'archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.program_placement as enum (
    'none',
    'featured',
    'banner',
    'card'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Extra permissions for D1
-- ---------------------------------------------------------------------------
insert into public.permissions (name, description) values
  ('media.manage', 'Upload and manage public marketing media'),
  ('programs.update', 'Edit draft/preview programs (not publish)')
on conflict (name) do nothing;

-- Media Admin: media library + livestream only if explicitly granted later.
-- D1: grant media.manage + programs.update; livestream stays opt-in (super_admin has it).
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'media_admin'
  and p.name in ('media.manage', 'programs.update')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'super_admin'
  and p.name in ('media.manage', 'programs.update')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Media assets (public marketing images only)
-- ---------------------------------------------------------------------------
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null default 'marketing-public',
  storage_path text not null,
  public_url text not null,
  original_filename text,
  content_type text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 5242880),
  width_px integer,
  height_px integer,
  alt_text text not null default '',
  caption text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint media_assets_image_type_chk check (
    content_type in ('image/jpeg', 'image/png', 'image/webp')
  ),
  constraint media_assets_path_unique unique (storage_bucket, storage_path)
);

create index if not exists media_assets_created_idx on public.media_assets (created_at desc);
create index if not exists media_assets_archived_idx on public.media_assets (archived_at);

comment on table public.media_assets is
  'Public marketing images only — never pastoral/financial private receipts';

-- ---------------------------------------------------------------------------
-- Programs / announcements
-- ---------------------------------------------------------------------------
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  short_description text not null default '',
  body_text text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  featured_media_id uuid references public.media_assets (id) on delete set null,
  cta_label text,
  cta_url text,
  placement public.program_placement not null default 'none',
  status public.publication_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  published_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programs_slug_unique unique (slug),
  constraint programs_dates_chk check (
    ends_at is null or starts_at is null or ends_at >= starts_at
  )
);

create index if not exists programs_status_idx on public.programs (status);
create index if not exists programs_placement_status_idx
  on public.programs (placement, status)
  where status = 'published';
create index if not exists programs_updated_idx on public.programs (updated_at desc);

comment on table public.programs is
  'Hub-managed programs/announcements. Save ≠ publish. Drafts are not public.';

-- ---------------------------------------------------------------------------
-- Sermons (structured metadata; YouTube URL only — no embed HTML)
-- ---------------------------------------------------------------------------
create table if not exists public.sermons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  speaker text,
  sermon_date date,
  scripture_reference text,
  summary text,
  youtube_url text,
  thumbnail_media_id uuid references public.media_assets (id) on delete set null,
  status public.publication_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  published_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sermons_status_idx on public.sermons (status);
create index if not exists sermons_date_idx on public.sermons (sermon_date desc nulls last);

comment on table public.sermons is
  'Sermon metadata. Persist YouTube URLs only — never arbitrary iframe HTML.';

-- ---------------------------------------------------------------------------
-- Church branches (public location information)
-- ---------------------------------------------------------------------------
create table if not exists public.church_branches (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  city_label text not null default '',
  address_lines text[] not null default '{}',
  phone_display text,
  phone_tel text,
  /** Additional public phones as [{display, tel}] — primary remains phone_* */
  phones jsonb not null default '[]'::jsonb,
  email text,
  maps_query text,
  maps_url text,
  phone_evidence_note text,
  is_public boolean not null default true,
  status public.publication_status not null default 'published',
  sort_order integer not null default 100,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint church_branches_slug_unique unique (slug)
);

create index if not exists church_branches_public_idx
  on public.church_branches (sort_order, name)
  where is_public = true and status = 'published';

create table if not exists public.branch_service_times (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.church_branches (id) on delete cascade,
  day_label text not null,
  time_label text not null,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists branch_service_times_branch_idx
  on public.branch_service_times (branch_id, sort_order);

-- Branch Admin scope: assignment required (super_admin bypasses via helper)
create table if not exists public.branch_staff_assignments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  branch_id uuid not null references public.church_branches (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, branch_id)
);

-- ---------------------------------------------------------------------------
-- Livestream settings (singleton-style; ADR-0007)
-- ---------------------------------------------------------------------------
create table if not exists public.livestream_settings (
  id uuid primary key default gen_random_uuid(),
  facebook_url text,
  is_live boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint livestream_single_row_chk check (id is not null)
);

comment on table public.livestream_settings is
  'Normalized Facebook URL + manual is_live only. Never store embed HTML.';

-- Ensure at most one active settings row via unique constant key
alter table public.livestream_settings
  add column if not exists singleton_key text not null default 'default';

create unique index if not exists livestream_settings_singleton_uidx
  on public.livestream_settings (singleton_key);

-- ---------------------------------------------------------------------------
-- Content revisions (no binaries; no secrets)
-- ---------------------------------------------------------------------------
create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  revision_number integer not null,
  snapshot jsonb not null,
  changed_by uuid references public.profiles (id) on delete set null,
  change_summary text,
  created_at timestamptz not null default now(),
  constraint content_revisions_entity_rev_unique unique (entity_type, entity_id, revision_number),
  constraint content_revisions_entity_type_chk check (
    entity_type in ('program', 'church_branch', 'sermon', 'livestream_settings')
  )
);

create index if not exists content_revisions_entity_idx
  on public.content_revisions (entity_type, entity_id, revision_number desc);

comment on table public.content_revisions is
  'JSON snapshots of structured fields only — never media binaries or secrets.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists programs_set_updated_at on public.programs;
create trigger programs_set_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

drop trigger if exists sermons_set_updated_at on public.sermons;
create trigger sermons_set_updated_at
  before update on public.sermons
  for each row execute function public.set_updated_at();

drop trigger if exists church_branches_set_updated_at on public.church_branches;
create trigger church_branches_set_updated_at
  before update on public.church_branches
  for each row execute function public.set_updated_at();

drop trigger if exists media_assets_set_updated_at on public.media_assets;
create trigger media_assets_set_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

drop trigger if exists livestream_settings_set_updated_at on public.livestream_settings;
create trigger livestream_settings_set_updated_at
  before update on public.livestream_settings
  for each row execute function public.set_updated_at();

-- Branch manage scope: permission + (super_admin OR assignment)
create or replace function public.can_manage_branch(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('branches.manage')
    and (
      public.has_role('super_admin')
      or exists (
        select 1
        from public.branch_staff_assignments a
        where a.user_id = auth.uid()
          and a.branch_id = p_branch_id
      )
    );
$$;

revoke all on function public.can_manage_branch(uuid) from public;
grant execute on function public.can_manage_branch(uuid) to authenticated, anon, service_role;

-- Storage bucket for marketing images (public read after upload validation)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketing-public',
  'marketing-public',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
