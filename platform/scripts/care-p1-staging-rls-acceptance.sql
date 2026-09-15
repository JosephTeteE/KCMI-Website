-- Care P1 staging RLS acceptance with ephemeral synthetic identities.
-- Creates disposable auth users + fixtures, asserts allow/deny, then cleans up.
-- Narratives are obviously synthetic. No real church data.

begin;

-- ---------------------------------------------------------------------------
-- Ephemeral synthetic staff identities (auth.users + profiles + roles)
-- ---------------------------------------------------------------------------
do $$
declare
  v_super uuid := 'aaaaaaaa-0001-4000-8000-000000000001';
  v_media uuid := 'aaaaaaaa-0002-4000-8000-000000000002';
  v_finance uuid := 'aaaaaaaa-0003-4000-8000-000000000003';
  v_prayer uuid := 'aaaaaaaa-0004-4000-8000-000000000004';
  v_pastor uuid := 'aaaaaaaa-0005-4000-8000-000000000005';
  v_welfare uuid := 'aaaaaaaa-0006-4000-8000-000000000006';
  v_padmin uuid := 'aaaaaaaa-0007-4000-8000-000000000007';
  v_role_id uuid;
  v_prayer_req uuid;
  v_pastoral_req uuid;
  v_pastoral_assigned uuid;
  v_welfare_req uuid;
  v_note_id uuid;
  v_cnt int;
  v_code text;
begin
  -- Clean prior partial runs
  delete from public.pastoral_case_notes
  where request_id in (
    select id from public.pastoral_requests
    where narrative like 'STAGING QA —%'
       or display_name like 'STAGING QA%'
  );
  delete from public.pastoral_requests
  where narrative like 'STAGING QA —%'
     or display_name like 'STAGING QA%';

  delete from public.user_roles
  where user_id in (v_super, v_media, v_finance, v_prayer, v_pastor, v_welfare, v_padmin);
  delete from public.profiles
  where id in (v_super, v_media, v_finance, v_prayer, v_pastor, v_welfare, v_padmin);
  delete from auth.users
  where id in (v_super, v_media, v_finance, v_prayer, v_pastor, v_welfare, v_padmin);

  -- Minimal auth.users rows (staging QA only)
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  )
  values
    (v_super, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'care-p1-qa-super@example.invalid', crypt('not-a-real-password', gen_salt('bf')),
     now(), now(), now(), '{}'::jsonb, '{}'::jsonb, false),
    (v_media, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'care-p1-qa-media@example.invalid', crypt('not-a-real-password', gen_salt('bf')),
     now(), now(), now(), '{}'::jsonb, '{}'::jsonb, false),
    (v_finance, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'care-p1-qa-finance@example.invalid', crypt('not-a-real-password', gen_salt('bf')),
     now(), now(), now(), '{}'::jsonb, '{}'::jsonb, false),
    (v_prayer, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'care-p1-qa-prayer@example.invalid', crypt('not-a-real-password', gen_salt('bf')),
     now(), now(), now(), '{}'::jsonb, '{}'::jsonb, false),
    (v_pastor, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'care-p1-qa-pastor@example.invalid', crypt('not-a-real-password', gen_salt('bf')),
     now(), now(), now(), '{}'::jsonb, '{}'::jsonb, false),
    (v_welfare, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'care-p1-qa-welfare@example.invalid', crypt('not-a-real-password', gen_salt('bf')),
     now(), now(), now(), '{}'::jsonb, '{}'::jsonb, false),
    (v_padmin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'care-p1-qa-padmin@example.invalid', crypt('not-a-real-password', gen_salt('bf')),
     now(), now(), now(), '{}'::jsonb, '{}'::jsonb, false)
  on conflict (id) do nothing;

  insert into public.profiles (id, email, display_name, is_active)
  values
    (v_super, 'care-p1-qa-super@example.invalid', 'STAGING QA Super', true),
    (v_media, 'care-p1-qa-media@example.invalid', 'STAGING QA Media', true),
    (v_finance, 'care-p1-qa-finance@example.invalid', 'STAGING QA Finance', true),
    (v_prayer, 'care-p1-qa-prayer@example.invalid', 'STAGING QA Prayer', true),
    (v_pastor, 'care-p1-qa-pastor@example.invalid', 'STAGING QA Pastor', true),
    (v_welfare, 'care-p1-qa-welfare@example.invalid', 'STAGING QA Welfare', true),
    (v_padmin, 'care-p1-qa-padmin@example.invalid', 'STAGING QA Pastoral Admin', true)
  on conflict (id) do update set is_active = true;

  -- Role bindings
  insert into public.user_roles (user_id, role_id)
  select v_super, id from public.roles where name = 'super_admin';
  insert into public.user_roles (user_id, role_id)
  select v_media, id from public.roles where name = 'media_admin';
  insert into public.user_roles (user_id, role_id)
  select v_finance, id from public.roles where name = 'finance_reviewer';
  insert into public.user_roles (user_id, role_id)
  select v_padmin, id from public.roles where name = 'pastoral_admin';
  insert into public.user_roles (user_id, role_id)
  select v_pastor, id from public.roles where name = 'pastor';

  -- Disposable roles for single-domain Care QA (avoid mutating shared pastor role)
  insert into public.roles (name, description)
  values
    ('care_p1_qa_prayer', 'STAGING QA disposable — prayer.read only'),
    ('care_p1_qa_welfare', 'STAGING QA disposable — welfare.read only'),
    ('care_p1_qa_pastor_read', 'STAGING QA disposable — counselling.read only')
  on conflict (name) do nothing;

  insert into public.role_permissions (role_id, permission_id)
  select r.id, p.id from public.roles r
  cross join public.permissions p
  where r.name = 'care_p1_qa_prayer' and p.name in ('hub.access', 'prayer.read')
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id)
  select r.id, p.id from public.roles r
  cross join public.permissions p
  where r.name = 'care_p1_qa_welfare' and p.name in ('hub.access', 'welfare.read')
  on conflict do nothing;

  insert into public.role_permissions (role_id, permission_id)
  select r.id, p.id from public.roles r
  cross join public.permissions p
  where r.name = 'care_p1_qa_pastor_read' and p.name in ('hub.access', 'counselling.read')
  on conflict do nothing;

  insert into public.user_roles (user_id, role_id)
  select v_prayer, id from public.roles where name = 'care_p1_qa_prayer';
  insert into public.user_roles (user_id, role_id)
  select v_welfare, id from public.roles where name = 'care_p1_qa_welfare';
  insert into public.user_roles (user_id, role_id)
  select v_pastor, id from public.roles where name = 'care_p1_qa_pastor_read'
  on conflict do nothing;

  -- Synthetic requests (service_role / table owner path inside DO)
  insert into public.pastoral_requests (
    id, service_type, display_name, email, contact_requested, narrative, status, assigned_to
  ) values
    (gen_random_uuid(), 'prayer', null, null, false,
     'STAGING QA — Prayer. Synthetic only. Please ignore.', 'new', null)
  returning id into v_prayer_req;

  insert into public.pastoral_requests (
    id, service_type, display_name, email, preferred_contact_method, contact_requested, narrative, status, assigned_to
  ) values
    (gen_random_uuid(), 'pastoral', 'STAGING QA Visitor', 'staging.pastoral@example.invalid', 'email', true,
     'STAGING QA — Pastoral Care. Synthetic only. Please ignore.', 'new', null)
  returning id into v_pastoral_req;

  insert into public.pastoral_requests (
    id, service_type, display_name, email, preferred_contact_method, contact_requested, narrative, status, assigned_to
  ) values
    (gen_random_uuid(), 'pastoral', 'STAGING QA Visitor Assigned', 'staging.pastoral.assigned@example.invalid', 'email', true,
     'STAGING QA — Pastoral Care assigned. Synthetic only. Please ignore.', 'new', v_pastor)
  returning id into v_pastoral_assigned;

  insert into public.pastoral_requests (
    id, service_type, display_name, email, preferred_contact_method, contact_requested, narrative, status, assigned_to
  ) values
    (gen_random_uuid(), 'welfare', 'STAGING QA Welfare Visitor', 'staging.welfare@example.invalid', 'email', true,
     'STAGING QA — Welfare. Synthetic only. Please ignore.', 'new', null)
  returning id into v_welfare_req;

  -- Reference code uniqueness / format
  select reference_code into v_code from public.pastoral_requests where id = v_prayer_req;
  if v_code is null or v_code !~ '^KCMI-CARE-[A-Z0-9]{6}$' then
    raise exception 'FAIL reference_code format: %', v_code;
  end if;

  -- Helper: impersonate
  perform set_config('request.jwt.claims', json_build_object('sub', v_super::text, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  -- Super admin: no Care SELECT
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', v_super::text, 'role', 'authenticated')::text, true);
  select count(*) into v_cnt from public.pastoral_requests;
  if v_cnt <> 0 then
    raise exception 'FAIL super_admin SELECT count=%', v_cnt;
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', v_media::text, 'role', 'authenticated')::text, true);
  select count(*) into v_cnt from public.pastoral_requests;
  if v_cnt <> 0 then
    raise exception 'FAIL media_admin SELECT count=%', v_cnt;
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', v_finance::text, 'role', 'authenticated')::text, true);
  select count(*) into v_cnt from public.pastoral_requests;
  if v_cnt <> 0 then
    raise exception 'FAIL finance_reviewer SELECT count=%', v_cnt;
  end if;

  -- Prayer shared queue only
  perform set_config('request.jwt.claims', json_build_object('sub', v_prayer::text, 'role', 'authenticated')::text, true);
  select count(*) into v_cnt from public.pastoral_requests where service_type = 'prayer';
  if v_cnt < 1 then
    raise exception 'FAIL prayer.read cannot see prayer queue';
  end if;
  select count(*) into v_cnt from public.pastoral_requests where service_type in ('pastoral','welfare');
  if v_cnt <> 0 then
    raise exception 'FAIL prayer.read cross-domain leak count=%', v_cnt;
  end if;

  -- Welfare shared queue only
  perform set_config('request.jwt.claims', json_build_object('sub', v_welfare::text, 'role', 'authenticated')::text, true);
  select count(*) into v_cnt from public.pastoral_requests where service_type = 'welfare';
  if v_cnt < 1 then
    raise exception 'FAIL welfare.read cannot see welfare queue';
  end if;
  select count(*) into v_cnt from public.pastoral_requests where service_type in ('prayer','pastoral');
  if v_cnt <> 0 then
    raise exception 'FAIL welfare.read cross-domain leak count=%', v_cnt;
  end if;

  -- Pastor counselling.read: unassigned denied, assigned allowed
  perform set_config('request.jwt.claims', json_build_object('sub', v_pastor::text, 'role', 'authenticated')::text, true);
  select count(*) into v_cnt from public.pastoral_requests where id = v_pastoral_req;
  if v_cnt <> 0 then
    raise exception 'FAIL pastor saw unassigned pastoral request';
  end if;
  select count(*) into v_cnt from public.pastoral_requests where id = v_pastoral_assigned;
  if v_cnt <> 1 then
    raise exception 'FAIL pastor cannot see assigned pastoral request';
  end if;
  select count(*) into v_cnt from public.pastoral_requests where service_type in ('prayer','welfare');
  if v_cnt <> 0 then
    raise exception 'FAIL pastor Care cross-domain leak';
  end if;

  -- Pastoral admin domain-wide
  perform set_config('request.jwt.claims', json_build_object('sub', v_padmin::text, 'role', 'authenticated')::text, true);
  select count(*) into v_cnt from public.pastoral_requests;
  if v_cnt < 4 then
    raise exception 'FAIL pastoral_admin domain-wide count=%', v_cnt;
  end if;

  -- Notes: parent auth required; media cannot read notes
  -- Insert as pastoral_admin (domain assign/read)
  perform set_config('request.jwt.claims', json_build_object('sub', v_padmin::text, 'role', 'authenticated')::text, true);
  insert into public.pastoral_case_notes (id, request_id, author_id, body)
  values (gen_random_uuid(), v_pastoral_assigned, v_padmin,
          'STAGING QA note — synthetic only. Follow-up scheduled.')
  returning id into v_note_id;

  perform set_config('request.jwt.claims', json_build_object('sub', v_media::text, 'role', 'authenticated')::text, true);
  select count(*) into v_cnt from public.pastoral_case_notes where id = v_note_id;
  if v_cnt <> 0 then
    raise exception 'FAIL media_admin read pastoral_case_notes';
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', v_pastor::text, 'role', 'authenticated')::text, true);
  select count(*) into v_cnt from public.pastoral_case_notes where id = v_note_id;
  if v_cnt <> 1 then
    raise exception 'FAIL assigned pastor cannot read note on assigned request';
  end if;

  -- Note on unassigned pastoral: create as padmin, pastor must not read
  perform set_config('request.jwt.claims', json_build_object('sub', v_padmin::text, 'role', 'authenticated')::text, true);
  insert into public.pastoral_case_notes (request_id, author_id, body)
  values (v_pastoral_req, v_padmin, 'STAGING QA note on unassigned — synthetic.');

  perform set_config('request.jwt.claims', json_build_object('sub', v_pastor::text, 'role', 'authenticated')::text, true);
  select count(*) into v_cnt from public.pastoral_case_notes where request_id = v_pastoral_req;
  if v_cnt <> 0 then
    raise exception 'FAIL pastor read note on unassigned parent';
  end if;

  raise notice 'CARE_P1_STAGING_RLS_ACCEPTANCE_PASS';
end $$;

-- Reset role for cleanup
reset role;

-- Cleanup synthetic identities + fixtures (leave shared roles pastoral_admin etc.)
delete from public.pastoral_case_notes
where body like 'STAGING QA%'
   or request_id in (
     select id from public.pastoral_requests
     where narrative like 'STAGING QA —%'
   );

delete from public.pastoral_requests
where narrative like 'STAGING QA —%'
   or display_name like 'STAGING QA%';

delete from public.user_roles
where user_id in (
  'aaaaaaaa-0001-4000-8000-000000000001'::uuid,
  'aaaaaaaa-0002-4000-8000-000000000002'::uuid,
  'aaaaaaaa-0003-4000-8000-000000000003'::uuid,
  'aaaaaaaa-0004-4000-8000-000000000004'::uuid,
  'aaaaaaaa-0005-4000-8000-000000000005'::uuid,
  'aaaaaaaa-0006-4000-8000-000000000006'::uuid,
  'aaaaaaaa-0007-4000-8000-000000000007'::uuid
);

delete from public.profiles
where id in (
  'aaaaaaaa-0001-4000-8000-000000000001'::uuid,
  'aaaaaaaa-0002-4000-8000-000000000002'::uuid,
  'aaaaaaaa-0003-4000-8000-000000000003'::uuid,
  'aaaaaaaa-0004-4000-8000-000000000004'::uuid,
  'aaaaaaaa-0005-4000-8000-000000000005'::uuid,
  'aaaaaaaa-0006-4000-8000-000000000006'::uuid,
  'aaaaaaaa-0007-4000-8000-000000000007'::uuid
);

delete from auth.users
where id in (
  'aaaaaaaa-0001-4000-8000-000000000001'::uuid,
  'aaaaaaaa-0002-4000-8000-000000000002'::uuid,
  'aaaaaaaa-0003-4000-8000-000000000003'::uuid,
  'aaaaaaaa-0004-4000-8000-000000000004'::uuid,
  'aaaaaaaa-0005-4000-8000-000000000005'::uuid,
  'aaaaaaaa-0006-4000-8000-000000000006'::uuid,
  'aaaaaaaa-0007-4000-8000-000000000007'::uuid
);

-- Keep disposable roles for audit trail of QA grants; strip role_permissions if desired
-- Leave care_p1_qa_* roles (no users attached) — optional cleanup:
delete from public.role_permissions
where role_id in (select id from public.roles where name like 'care_p1_qa_%');
delete from public.roles where name like 'care_p1_qa_%';

select 'CARE_P1_STAGING_RLS_ACCEPTANCE_PASS' as result;

commit;
