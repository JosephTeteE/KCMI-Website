-- Care P1 staging security acceptance (synthetic only). No real narratives.
-- Run via: npx supabase db query --linked -f scripts/care-p1-staging-acceptance.sql

select 'tables_exist' as check_id,
  (to_regclass('public.pastoral_requests') is not null) as ok,
  (to_regclass('public.pastoral_case_notes') is not null) as ok2;

select 'rls_force' as check_id, c.relname, c.relrowsecurity as rls, c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('pastoral_requests','pastoral_case_notes');

select 'grants' as check_id, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('pastoral_requests','pastoral_case_notes')
  and grantee in ('anon','authenticated','public','service_role')
order by table_name, grantee, privilege_type;

select 'reference_unique' as check_id, indexname
from pg_indexes
where tablename = 'pastoral_requests' and indexdef ilike '%unique%reference%';

select 'role_care_perms' as check_id, r.name as role_name,
  coalesce(array_agg(p.name order by p.name) filter (where p.name is not null), '{}') as care_or_all_perms
from public.roles r
left join public.role_permissions rp on rp.role_id = r.id
left join public.permissions p on p.id = rp.permission_id
  and p.name in (
    'prayer.read','prayer.assign',
    'counselling.read','counselling.assign',
    'welfare.read','welfare.assign',
    'hub.access'
  )
where r.name in ('super_admin','media_admin','finance_reviewer','pastoral_admin','pastor','auditor')
group by r.name
order by r.name;

select 'staff_with_care_roles' as check_id, pr.email, r.name as role_name
from public.profiles pr
join public.user_roles ur on ur.user_id = pr.id
join public.roles r on r.id = ur.role_id
where r.name in ('pastoral_admin','pastor')
   or exists (
     select 1
     from public.role_permissions rp
     join public.permissions p on p.id = rp.permission_id
     where rp.role_id = r.id
       and p.name in ('prayer.read','counselling.read','welfare.read')
   )
order by r.name, pr.email;
