select
  (select count(*)::int from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
   where r.name = 'super_admin'
     and p.name in ('prayer.read','prayer.assign','counselling.read','counselling.assign','welfare.read','welfare.assign')
  ) as super_admin_care_grants,
  (select count(*)::int from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
   where r.name = 'media_admin'
     and p.name in ('prayer.read','prayer.assign','counselling.read','counselling.assign','welfare.read','welfare.assign')
  ) as media_care_grants,
  (select count(*)::int from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
   where r.name = 'finance_reviewer'
     and p.name in ('prayer.read','prayer.assign','counselling.read','counselling.assign','welfare.read','welfare.assign')
  ) as finance_care_grants,
  (select count(ur.user_id)::int from public.roles r
    left join public.user_roles ur on ur.role_id = r.id
   where r.name = 'pastoral_admin') as pastoral_admin_user_count,
  (select count(*)::int from information_schema.role_table_grants
   where table_schema='public'
     and table_name in ('pastoral_requests','pastoral_case_notes')
     and grantee='anon') as anon_grants,
  (select count(*)::int from information_schema.role_table_grants
   where table_schema='public'
     and table_name in ('pastoral_requests','pastoral_case_notes')
     and grantee='authenticated'
     and privilege_type='DELETE') as authenticated_delete_grants,
  (public.care_generate_reference_code() ~ '^KCMI-CARE-[A-Z0-9]{6}$') as reference_code_ok;
