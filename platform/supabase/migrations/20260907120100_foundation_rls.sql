-- RLS for foundation tables — deny by default, then explicit grants

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.audit_events enable row level security;

-- Helper: does current user hold a named role?
create or replace function public.has_role(role_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid()
      and r.name = role_name
      and p.is_active = true
  );
$$;

create or replace function public.has_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions perm on perm.id = rp.permission_id
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid()
      and perm.name = permission_name
      and p.is_active = true
  );
$$;

-- Profiles: users read self; users.manage can read all active staff directories
create policy profiles_select_self
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.has_permission('users.manage'));

create policy profiles_update_self
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Roles / permissions catalogs: readable to Hub staff with hub.access
create policy roles_select_hub
  on public.roles for select
  to authenticated
  using (public.has_permission('hub.access'));

create policy permissions_select_hub
  on public.permissions for select
  to authenticated
  using (public.has_permission('hub.access'));

create policy user_roles_select_self_or_manage
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid() or public.has_permission('users.manage'));

create policy role_permissions_select_hub
  on public.role_permissions for select
  to authenticated
  using (public.has_permission('hub.access'));

-- Mutations on role grants: users.manage only
create policy user_roles_mutate_manage
  on public.user_roles for all
  to authenticated
  using (public.has_permission('users.manage'))
  with check (public.has_permission('users.manage'));

create policy role_permissions_mutate_manage
  on public.role_permissions for all
  to authenticated
  using (public.has_permission('users.manage'))
  with check (public.has_permission('users.manage'));

-- Audit: insert by authenticated hub users; read by audit.read
create policy audit_insert_hub
  on public.audit_events for insert
  to authenticated
  with check (public.has_permission('hub.access') and actor_id = auth.uid());

create policy audit_select_readers
  on public.audit_events for select
  to authenticated
  using (public.has_permission('audit.read'));

-- Explicit deny for anon (no policies → no access when RLS enabled)
-- Pastoral narrative tables are not created in Phase B; media_admin seed grants exclude pastoral perms.
