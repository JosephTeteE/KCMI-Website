-- Foundation authz schema for KCMI Hub (Phase B)
-- Uses PostgreSQL gen_random_uuid() (pgcrypto/modern default in Supabase)

create extension if not exists pgcrypto;

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_events is
  'Privileged action metadata only — never store pastoral narratives or receipt contents';

-- Seed stable roles
insert into public.roles (name, description) values
  ('super_admin', 'Platform administration — not automatic pastoral access'),
  ('pastoral_admin', 'Pastoral queues and assignments'),
  ('pastor', 'Assigned pastoral cases'),
  ('media_admin', 'Programs, media, sermons — no pastoral narratives'),
  ('branch_admin', 'Branch records'),
  ('registrar', 'Event registrations'),
  ('finance_reviewer', 'Payment evidence and giving dual-approval'),
  ('auditor', 'Read-only audit access')
on conflict (name) do nothing;

-- Seed foundation permissions
insert into public.permissions (name, description) values
  ('hub.access', 'Access KCMI Hub shell'),
  ('prayer.read', 'Read prayer pastoral requests'),
  ('prayer.assign', 'Assign prayer cases'),
  ('counselling.read', 'Read counselling pastoral requests'),
  ('counselling.assign', 'Assign counselling cases'),
  ('welfare.read', 'Read welfare pastoral requests'),
  ('welfare.assign', 'Assign welfare cases'),
  ('programs.create', 'Create programs'),
  ('programs.publish', 'Publish programs'),
  ('sermons.manage', 'Manage sermons'),
  ('events.manage', 'Manage events'),
  ('registrations.manage', 'Manage registrations'),
  ('payment_evidence.review', 'Review private payment evidence'),
  ('giving.change', 'Propose or approve giving config changes'),
  ('users.manage', 'Manage Hub users and roles'),
  ('livestream.manage', 'Manage Facebook livestream settings'),
  ('branches.manage', 'Manage branches'),
  ('audit.read', 'Read audit metadata')
on conflict (name) do nothing;

-- Role → permission grants (super_admin intentionally excludes pastoral read/assign)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'super_admin'
  and p.name in (
    'hub.access', 'users.manage', 'programs.create', 'programs.publish',
    'sermons.manage', 'events.manage', 'registrations.manage',
    'payment_evidence.review', 'giving.change', 'livestream.manage',
    'branches.manage', 'audit.read'
  )
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'pastoral_admin'
  and p.name in (
    'hub.access', 'prayer.read', 'prayer.assign',
    'counselling.read', 'counselling.assign',
    'welfare.read', 'welfare.assign', 'audit.read'
  )
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'pastor' and p.name = 'hub.access'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'media_admin'
  and p.name in ('hub.access', 'programs.create', 'programs.publish', 'sermons.manage')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'branch_admin'
  and p.name in ('hub.access', 'branches.manage')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'registrar'
  and p.name in ('hub.access', 'registrations.manage', 'events.manage')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'finance_reviewer'
  and p.name in ('hub.access', 'payment_evidence.review', 'giving.change')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'auditor'
  and p.name in ('hub.access', 'audit.read')
on conflict do nothing;

-- New auth user → profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
