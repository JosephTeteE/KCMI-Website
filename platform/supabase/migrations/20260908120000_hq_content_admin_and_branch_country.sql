-- D1.4 initial operating model: HQ Content Admin = media_admin
-- with central public CMS (including livestream + all branch public fields).
-- branch_staff_assignments and assignment-scoped branch_admin remain.

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'media_admin'
  and p.name in ('livestream.manage', 'branches.manage')
on conflict do nothing;

comment on function public.can_manage_branch(uuid) is
  'branches.manage plus (super_admin OR media.manage OR a branch_staff_assignments row). media.manage is the HQ Content Admin global path; assignments stay for future branch_admin decentralization.';

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
      or public.has_permission('media.manage')
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

alter table public.church_branches
  add column if not exists country text;

comment on column public.church_branches.country is
  'Verified country for public grouping. Leave null rather than inventing a country.';

update public.church_branches
set country = 'Nigeria'
where slug in ('headquarters', 'rumuigbo', 'abia');

update public.church_branches
set country = 'Ghana'
where slug in ('accra', 'kasoa', 'cape-coast');

update public.church_branches
set country = 'Togo'
where slug = 'togo';
