-- Phase D1.1: branch-scoped public media (shared bucket, no per-branch sites)

do $$ begin
  create type public.branch_media_placement as enum (
    'hero',
    'gallery',
    'featured',
    'announcement',
    'general'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.branch_media (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.church_branches (id) on delete cascade,
  media_asset_id uuid not null references public.media_assets (id) on delete restrict,
  placement public.branch_media_placement not null default 'general',
  sort_order integer not null default 0,
  alt_text_override text,
  is_active boolean not null default true,
  status public.publication_status not null default 'published',
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_media_dates_chk check (
    ends_at is null or starts_at is null or ends_at >= starts_at
  ),
  constraint branch_media_unique_asset_placement unique (branch_id, media_asset_id, placement)
);

create index if not exists branch_media_branch_idx
  on public.branch_media (branch_id, placement, sort_order);

create index if not exists branch_media_public_idx
  on public.branch_media (branch_id, status, is_active)
  where is_active = true and status = 'published';

drop trigger if exists branch_media_set_updated_at on public.branch_media;
create trigger branch_media_set_updated_at
  before update on public.branch_media
  for each row execute function public.set_updated_at();

comment on table public.branch_media is
  'Links shared marketing media to a branch placement. Does not duplicate binaries.';

alter table public.branch_media enable row level security;

-- Public: published + active + within optional window
drop policy if exists branch_media_anon_select on public.branch_media;
create policy branch_media_anon_select on public.branch_media
  for select to anon
  using (
    is_active = true
    and status = 'published'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
    and exists (
      select 1 from public.church_branches b
      where b.id = branch_id
        and b.is_public = true
        and b.status = 'published'
    )
  );

drop policy if exists branch_media_staff_select on public.branch_media;
create policy branch_media_staff_select on public.branch_media
  for select to authenticated
  using (
    public.has_permission('hub.access')
    or (
      is_active = true
      and status = 'published'
      and exists (
        select 1 from public.church_branches b
        where b.id = branch_id and b.is_public = true and b.status = 'published'
      )
    )
  );

drop policy if exists branch_media_insert on public.branch_media;
create policy branch_media_insert on public.branch_media
  for insert to authenticated
  with check (
    public.can_manage_branch(branch_id)
    or public.has_permission('media.manage')
  );

drop policy if exists branch_media_update on public.branch_media;
create policy branch_media_update on public.branch_media
  for update to authenticated
  using (
    public.can_manage_branch(branch_id)
    or public.has_permission('media.manage')
  )
  with check (
    public.can_manage_branch(branch_id)
    or public.has_permission('media.manage')
  );

drop policy if exists branch_media_delete on public.branch_media;
create policy branch_media_delete on public.branch_media
  for delete to authenticated
  using (
    public.can_manage_branch(branch_id)
    or public.has_permission('media.manage')
  );

-- Branch admins may upload marketing images when attaching to a branch (shared bucket).
-- Still no pastoral access; still no SVG.
drop policy if exists media_assets_insert on public.media_assets;
create policy media_assets_insert on public.media_assets
  for insert to authenticated
  with check (
    public.has_permission('media.manage')
    or public.has_permission('branches.manage')
  );

drop policy if exists marketing_public_insert on storage.objects;
create policy marketing_public_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'marketing-public'
    and (
      public.has_permission('media.manage')
      or public.has_permission('branches.manage')
    )
  );

-- Draft-only content editor role (no publish) for Hub workflow validation
insert into public.roles (name, description) values
  ('program_drafter', 'Create/edit program drafts — cannot publish')
on conflict (name) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'program_drafter'
  and p.name in ('hub.access', 'programs.create', 'programs.update')
on conflict do nothing;
