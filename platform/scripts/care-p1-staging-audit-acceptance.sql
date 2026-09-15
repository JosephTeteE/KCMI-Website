-- Synthetic Care open-audit shape check (no narrative in metadata).
-- Uses ephemeral pastoral_admin identity; cleans up.

begin;

do $$
declare
  v_padmin uuid := 'bbbbbbbb-0007-4000-8000-000000000007';
  v_req uuid;
  v_ref text;
  v_audit uuid;
  v_meta jsonb;
begin
  delete from public.audit_events where entity_type = 'pastoral_request' and metadata->>'synthetic' = 'true';
  delete from public.pastoral_requests where narrative like 'STAGING QA — Audit%';
  delete from public.user_roles where user_id = v_padmin;
  delete from public.profiles where id = v_padmin;
  delete from auth.users where id = v_padmin;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) values (
    v_padmin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'care-p1-qa-audit@example.invalid', crypt('not-a-real-password', gen_salt('bf')),
    now(), now(), now(), '{}'::jsonb, '{}'::jsonb, false
  );

  insert into public.profiles (id, email, display_name, is_active)
  values (v_padmin, 'care-p1-qa-audit@example.invalid', 'STAGING QA Audit', true)
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        is_active = true;

  insert into public.user_roles (user_id, role_id)
  select v_padmin, id from public.roles where name = 'pastoral_admin';

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', v_padmin::text, 'role', 'authenticated')::text, true);

  insert into public.pastoral_requests (
    service_type, display_name, contact_requested, narrative, status
  ) values (
    'prayer', null, false,
    'STAGING QA — Audit open event. Synthetic only.', 'new'
  ) returning id, reference_code into v_req, v_ref;

  insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_padmin,
    'care.request.opened',
    'pastoral_request',
    v_req::text,
    jsonb_build_object(
      'service_type', 'prayer',
      'reference_code', v_ref,
      'status', 'new',
      'synthetic', true
    )
  ) returning id, metadata into v_audit, v_meta;

  if v_meta ? 'narrative' or v_meta ? 'body' or v_meta::text ilike '%STAGING QA — Audit open%' then
    raise exception 'FAIL audit metadata contains narrative';
  end if;
  if v_meta->>'reference_code' is distinct from v_ref then
    raise exception 'FAIL audit missing reference';
  end if;

  raise notice 'CARE_P1_AUDIT_METADATA_PASS';
end $$;

reset role;

delete from public.audit_events where metadata->>'synthetic' = 'true';
delete from public.pastoral_requests where narrative like 'STAGING QA — Audit%';
delete from public.user_roles where user_id = 'bbbbbbbb-0007-4000-8000-000000000007'::uuid;
delete from public.profiles where id = 'bbbbbbbb-0007-4000-8000-000000000007'::uuid;
delete from auth.users where id = 'bbbbbbbb-0007-4000-8000-000000000007'::uuid;

select 'CARE_P1_AUDIT_METADATA_PASS' as result;

commit;
