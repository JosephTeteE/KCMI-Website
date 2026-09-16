-- Care staging readiness: least-privilege Prayer staff role
-- Grants ONLY hub.access + prayer.read.
-- Does NOT grant pastoral/welfare/media/finance/super_admin privileges.

insert into public.roles (name, description)
values (
  'prayer_staff',
  'Prayer queue access for authorized Prayer ministers (hub.access + prayer.read only)'
)
on conflict (name) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'prayer_staff'
  and p.name in ('hub.access', 'prayer.read')
on conflict do nothing;
