-- General website Messages & Requests inbox (NOT Care).
-- Public browser never writes directly. Inserts via service_role only.
-- Care pastoral_requests remain isolated — no cross joins.

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
insert into public.permissions (name, description) values
  ('requests.read', 'Read general website Messages & Requests inbox'),
  ('requests.update', 'Update status on website Messages & Requests'),
  ('requests.assign', 'Assign website Messages & Requests to Hub staff')
on conflict (name) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'super_admin'
  and p.name in ('requests.read', 'requests.update', 'requests.assign')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'media_admin'
  and p.name in ('requests.read', 'requests.update', 'requests.assign')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.website_request_topic as enum (
    'general',
    'cell_fellowship',
    'service_volunteer',
    'testimony_thanksgiving',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.website_request_status as enum (
    'new',
    'in_progress',
    'closed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.website_request_email_status as enum (
    'pending',
    'sent',
    'failed',
    'skipped'
  );
exception when duplicate_object then null;
end $$;

grant usage on type public.website_request_topic to authenticated, service_role;
grant usage on type public.website_request_status to authenticated, service_role;
grant usage on type public.website_request_email_status to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.website_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null,
  topic public.website_request_topic not null,
  full_name text not null,
  email text not null,
  phone text,
  message text not null,
  source text not null default 'contact',
  status public.website_request_status not null default 'new',
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  email_notified_at timestamptz,
  email_notification_status public.website_request_email_status not null default 'pending',
  constraint website_requests_reference_format
    check (reference_code ~ '^KCMI-REQ-[A-Z0-9]{6}$'),
  constraint website_requests_full_name_len
    check (char_length(btrim(full_name)) between 1 and 120),
  constraint website_requests_email_len
    check (char_length(btrim(email)) between 3 and 254),
  constraint website_requests_phone_len
    check (phone is null or char_length(btrim(phone)) between 7 and 32),
  constraint website_requests_message_len
    check (char_length(btrim(message)) between 1 and 4000),
  constraint website_requests_source_len
    check (char_length(btrim(source)) between 1 and 80),
  constraint website_requests_closed_consistency
    check (
      (status = 'closed' and closed_at is not null)
      or (status <> 'closed' and closed_at is null)
    )
);

create unique index if not exists website_requests_reference_code_uidx
  on public.website_requests (reference_code);

create index if not exists website_requests_status_created_idx
  on public.website_requests (status, created_at desc);

create index if not exists website_requests_assigned_to_idx
  on public.website_requests (assigned_to)
  where assigned_to is not null;

comment on table public.website_requests is
  'General public website enquiries (Messages & Requests). NOT Care. No public SELECT. No Search/AI/export. Retention: operational follow-up; no auto-delete in V1.';

-- ---------------------------------------------------------------------------
-- Reference code
-- ---------------------------------------------------------------------------
create or replace function public.website_request_generate_reference_code()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
  v_i integer := 0;
begin
  loop
    v_i := v_i + 1;
    v_code :=
      'KCMI-REQ-'
      || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 6));
    exit when not exists (
      select 1 from public.website_requests r where r.reference_code = v_code
    );
    if v_i > 20 then
      raise exception 'website_request_generate_reference_code: exhausted retries';
    end if;
  end loop;
  return v_code;
end;
$$;

revoke all on function public.website_request_generate_reference_code() from public;
grant execute on function public.website_request_generate_reference_code()
  to authenticated, service_role;

create or replace function public.website_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reference_code is null or btrim(new.reference_code) = '' then
    new.reference_code := public.website_request_generate_reference_code();
  end if;
  return new;
end;
$$;

drop trigger if exists website_requests_before_insert on public.website_requests;
create trigger website_requests_before_insert
  before insert on public.website_requests
  for each row execute function public.website_requests_before_insert();

drop trigger if exists website_requests_set_updated_at on public.website_requests;
create trigger website_requests_set_updated_at
  before update on public.website_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Update guard
-- ---------------------------------------------------------------------------
create or replace function public.website_requests_guard_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.reference_code is distinct from new.reference_code then
    raise exception 'website_requests: reference_code is immutable';
  end if;
  if old.message is distinct from new.message then
    raise exception 'website_requests: visitor message is immutable';
  end if;
  if old.email is distinct from new.email
     or old.full_name is distinct from new.full_name
     or old.phone is distinct from new.phone
     or old.topic is distinct from new.topic
     or old.source is distinct from new.source then
    raise exception 'website_requests: visitor fields are immutable';
  end if;

  if old.assigned_to is distinct from new.assigned_to then
    if not public.has_permission('requests.assign') then
      raise exception 'website_requests: assignment requires requests.assign';
    end if;
  end if;

  if old.status = 'closed' and new.status is distinct from 'closed' then
    if not public.has_permission('requests.assign') then
      raise exception 'website_requests: reopen requires requests.assign';
    end if;
  end if;

  if new.status = 'closed' and new.closed_at is null then
    new.closed_at := now();
  end if;
  if new.status is distinct from 'closed' then
    new.closed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists website_requests_guard_update on public.website_requests;
create trigger website_requests_guard_update
  before update on public.website_requests
  for each row execute function public.website_requests_guard_update();

-- ---------------------------------------------------------------------------
-- Assignable staff (active Hub users with requests.assign)
-- ---------------------------------------------------------------------------
create or replace function public.website_request_assignable_staff()
returns table (
  id uuid,
  display_name text,
  email text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select distinct p.id, p.display_name, p.email
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  join public.roles r on r.id = ur.role_id
  join public.role_permissions rp on rp.role_id = r.id
  join public.permissions perm on perm.id = rp.permission_id
  where p.is_active = true
    and perm.name = 'requests.assign'
    and public.has_permission('requests.assign')
  order by p.display_name nulls last, p.email nulls last;
$$;

revoke all on function public.website_request_assignable_staff() from public;
grant execute on function public.website_request_assignable_staff()
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Rate limits (hashed requester keys only — parallel to Care P4)
-- ---------------------------------------------------------------------------
create table if not exists public.website_request_rate_limits (
  requester_key text not null,
  window_started_at timestamptz not null,
  attempt_count integer not null default 0
    constraint website_request_rate_limits_attempt_nonneg check (attempt_count >= 0),
  updated_at timestamptz not null default now(),
  constraint website_request_rate_limits_pkey
    primary key (requester_key, window_started_at),
  constraint website_request_rate_limits_key_len
    check (char_length(requester_key) between 16 and 128)
);

comment on table public.website_request_rate_limits is
  'SHORT-LIVED website Contact intake rate counters. Hashed keys only. No PII.';

create index if not exists website_request_rate_limits_window_idx
  on public.website_request_rate_limits (window_started_at);

alter table public.website_request_rate_limits enable row level security;
alter table public.website_request_rate_limits force row level security;

revoke all on table public.website_request_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.website_request_rate_limits to service_role;

create or replace function public.website_request_rate_limit_consume(
  p_requester_key text,
  p_limit integer default 8,
  p_window_seconds integer default 3600
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
  v_allowed boolean;
begin
  if p_requester_key is null
     or char_length(btrim(p_requester_key)) < 16
     or char_length(btrim(p_requester_key)) > 128 then
    raise exception 'website_request_rate_limit_consume: invalid requester_key';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'website_request_rate_limit_consume: invalid limit';
  end if;

  if p_window_seconds is null or p_window_seconds < 60 or p_window_seconds > 86400 then
    raise exception 'website_request_rate_limit_consume: invalid window';
  end if;

  v_window_start :=
    to_timestamp(
      floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
    );

  delete from public.website_request_rate_limits r
  where r.requester_key = btrim(p_requester_key)
    and r.window_started_at < (v_window_start - make_interval(secs => p_window_seconds));

  insert into public.website_request_rate_limits as r (
    requester_key,
    window_started_at,
    attempt_count,
    updated_at
  )
  values (
    btrim(p_requester_key),
    v_window_start,
    1,
    now()
  )
  on conflict (requester_key, window_started_at)
  do update set
    attempt_count = r.attempt_count + 1,
    updated_at = now()
  returning r.attempt_count into v_count;

  v_allowed := v_count <= p_limit;

  return jsonb_build_object(
    'allowed', v_allowed,
    'attempt_count', v_count,
    'limit', p_limit,
    'window_started_at', v_window_start
  );
end;
$$;

revoke all on function public.website_request_rate_limit_consume(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.website_request_rate_limit_consume(text, integer, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.website_requests enable row level security;
alter table public.website_requests force row level security;

-- No anon policies.

create policy website_requests_select_authorized
  on public.website_requests
  for select
  to authenticated
  using (public.has_permission('requests.read'));

create policy website_requests_update_authorized
  on public.website_requests
  for update
  to authenticated
  using (public.has_permission('requests.update') or public.has_permission('requests.assign'))
  with check (public.has_permission('requests.update') or public.has_permission('requests.assign'));

-- No authenticated INSERT / DELETE — public intake uses service_role only.

revoke all on table public.website_requests from public, anon;
grant select, update on table public.website_requests to authenticated;
grant select, insert, update, delete on table public.website_requests to service_role;
