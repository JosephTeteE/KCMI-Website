-- Care P1: private pastoral / prayer / welfare foundation
-- NO public forms. NO anon SELECT/INSERT. NO super_admin / media_admin implicit access.
-- Visitor intake remains Google Forms until P2/P3.
-- Retention deletion jobs are NOT implemented here (documented only).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.care_service_type as enum (
    'prayer',
    'pastoral',
    'welfare'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.care_request_status as enum (
    'new',
    'in_progress',
    'closed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.care_contact_method as enum (
    'email',
    'phone',
    'either'
  );
exception when duplicate_object then null;
end $$;

grant usage on type public.care_service_type to authenticated, service_role;
grant usage on type public.care_request_status to authenticated, service_role;
grant usage on type public.care_contact_method to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.pastoral_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null,
  service_type public.care_service_type not null,
  display_name text,
  email text,
  phone text,
  preferred_contact_method public.care_contact_method,
  branch_id uuid references public.church_branches (id) on delete set null,
  contact_requested boolean not null default false,
  preferred_contact_timing text,
  narrative text not null,
  status public.care_request_status not null default 'new',
  assigned_to uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pastoral_requests_reference_format
    check (reference_code ~ '^KCMI-CARE-[A-Z0-9]{6}$'),
  constraint pastoral_requests_narrative_len
    check (char_length(btrim(narrative)) between 1 and 8000),
  constraint pastoral_requests_display_name_len
    check (display_name is null or char_length(btrim(display_name)) between 1 and 120),
  constraint pastoral_requests_email_len
    check (email is null or char_length(btrim(email)) between 3 and 254),
  constraint pastoral_requests_phone_len
    check (phone is null or char_length(btrim(phone)) between 7 and 32),
  constraint pastoral_requests_timing_len
    check (
      preferred_contact_timing is null
      or char_length(btrim(preferred_contact_timing)) between 1 and 200
    ),
  constraint pastoral_requests_closed_consistency
    check (
      (status = 'closed' and closed_at is not null)
      or (status <> 'closed' and closed_at is null)
    )
);

create unique index if not exists pastoral_requests_reference_code_uidx
  on public.pastoral_requests (reference_code);

create index if not exists pastoral_requests_service_status_idx
  on public.pastoral_requests (service_type, status, submitted_at desc);

create index if not exists pastoral_requests_assigned_to_idx
  on public.pastoral_requests (assigned_to, service_type)
  where assigned_to is not null;

comment on table public.pastoral_requests is
  'HIGHLY_SENSITIVE Care requests (prayer / pastoral / welfare). No public SELECT. No AI/Search. Retention: prayer 6mo / pastoral+welfare 12mo after closure (jobs deferred).';

create table if not exists public.pastoral_case_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null
    references public.pastoral_requests (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pastoral_case_notes_body_len
    check (char_length(btrim(body)) between 1 and 4000)
);

create index if not exists pastoral_case_notes_request_idx
  on public.pastoral_case_notes (request_id, created_at desc);

comment on table public.pastoral_case_notes is
  'HIGHLY_SENSITIVE staff notes. Same RLS domain as parent request. Never in audit payloads, email, Search, or AI.';

drop trigger if exists pastoral_requests_set_updated_at on public.pastoral_requests;
create trigger pastoral_requests_set_updated_at
  before update on public.pastoral_requests
  for each row execute function public.set_updated_at();

drop trigger if exists pastoral_case_notes_set_updated_at on public.pastoral_case_notes;
create trigger pastoral_case_notes_set_updated_at
  before update on public.pastoral_case_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Reference codes (non-sequential, no PII)
-- ---------------------------------------------------------------------------
create or replace function public.care_generate_reference_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_code text;
  v_attempt integer := 0;
begin
  loop
    v_attempt := v_attempt + 1;
    v_code :=
      'KCMI-CARE-'
      || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 6));
    exit when not exists (
      select 1 from public.pastoral_requests r where r.reference_code = v_code
    );
    if v_attempt > 20 then
      raise exception 'care_generate_reference_code: exhausted retries';
    end if;
  end loop;
  return v_code;
end;
$$;

revoke all on function public.care_generate_reference_code() from public;
grant execute on function public.care_generate_reference_code() to authenticated, service_role;

create or replace function public.pastoral_requests_set_reference()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.reference_code is null or btrim(new.reference_code) = '' then
    new.reference_code := public.care_generate_reference_code();
  end if;
  return new;
end;
$$;

drop trigger if exists pastoral_requests_set_reference on public.pastoral_requests;
create trigger pastoral_requests_set_reference
  before insert on public.pastoral_requests
  for each row execute function public.pastoral_requests_set_reference();

-- ---------------------------------------------------------------------------
-- Access helpers (domain permission + assignment rules)
-- Internal permission IDs remain counselling.* for Pastoral Care domain.
-- ---------------------------------------------------------------------------
create or replace function public.care_read_permission_for(
  p_service public.care_service_type
)
returns text
language sql
immutable
as $$
  select case p_service
    when 'prayer' then 'prayer.read'
    when 'pastoral' then 'counselling.read'
    when 'welfare' then 'welfare.read'
  end;
$$;

create or replace function public.care_assign_permission_for(
  p_service public.care_service_type
)
returns text
language sql
immutable
as $$
  select case p_service
    when 'prayer' then 'prayer.assign'
    when 'pastoral' then 'counselling.assign'
    when 'welfare' then 'welfare.assign'
  end;
$$;

revoke all on function public.care_read_permission_for(public.care_service_type) from public;
grant execute on function public.care_read_permission_for(public.care_service_type)
  to authenticated, service_role;

revoke all on function public.care_assign_permission_for(public.care_service_type) from public;
grant execute on function public.care_assign_permission_for(public.care_service_type)
  to authenticated, service_role;

-- Prayer: shared queue for prayer.read (assignment optional, not required).
-- Pastoral: counselling.read AND (assigned_to = self OR counselling.assign).
-- Welfare: welfare.read team queue (assignment optional, does not restrict list).
create or replace function public.can_select_pastoral_request(
  p_service public.care_service_type,
  p_assigned_to uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case p_service
      when 'prayer' then public.has_permission('prayer.read')
      when 'welfare' then public.has_permission('welfare.read')
      when 'pastoral' then
        public.has_permission('counselling.read')
        and (
          p_assigned_to = auth.uid()
          or public.has_permission('counselling.assign')
        )
      else false
    end;
$$;

revoke all on function public.can_select_pastoral_request(public.care_service_type, uuid) from public;
grant execute on function public.can_select_pastoral_request(public.care_service_type, uuid)
  to authenticated, service_role;

create or replace function public.can_assign_pastoral_request(
  p_service public.care_service_type
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission(public.care_assign_permission_for(p_service));
$$;

revoke all on function public.can_assign_pastoral_request(public.care_service_type) from public;
grant execute on function public.can_assign_pastoral_request(public.care_service_type)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.pastoral_requests enable row level security;
alter table public.pastoral_case_notes enable row level security;

-- Force RLS for table owners too (defense in depth on hosted projects)
alter table public.pastoral_requests force row level security;
alter table public.pastoral_case_notes force row level security;

-- No policies for anon → no anon access when RLS enabled.

create policy pastoral_requests_select_authorized
  on public.pastoral_requests
  for select
  to authenticated
  using (
    public.can_select_pastoral_request(service_type, assigned_to)
  );

-- Staff fixture / pre-public insert: domain assign holders only (app also blocks production).
create policy pastoral_requests_insert_assigners
  on public.pastoral_requests
  for insert
  to authenticated
  with check (
    public.can_assign_pastoral_request(service_type)
  );

-- Status / assignment updates (reopen + assignee changes enforced by trigger)
create policy pastoral_requests_update_authorized
  on public.pastoral_requests
  for update
  to authenticated
  using (
    public.can_select_pastoral_request(service_type, assigned_to)
  )
  with check (
    public.can_assign_pastoral_request(service_type)
    or public.can_select_pastoral_request(service_type, assigned_to)
  );

create or replace function public.pastoral_requests_guard_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.service_type is distinct from new.service_type then
    raise exception 'care: service_type is immutable';
  end if;
  if old.narrative is distinct from new.narrative then
    raise exception 'care: visitor narrative is immutable';
  end if;
  if old.reference_code is distinct from new.reference_code then
    raise exception 'care: reference_code is immutable';
  end if;

  if old.assigned_to is distinct from new.assigned_to then
    if not public.can_assign_pastoral_request(new.service_type) then
      raise exception 'care: assignment requires domain assign permission';
    end if;
  end if;

  -- Reopen closed → non-closed requires assign authority
  if old.status = 'closed' and new.status is distinct from 'closed' then
    if not public.can_assign_pastoral_request(new.service_type) then
      raise exception 'care: reopen requires domain assign permission';
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

drop trigger if exists pastoral_requests_guard_update on public.pastoral_requests;
create trigger pastoral_requests_guard_update
  before update on public.pastoral_requests
  for each row execute function public.pastoral_requests_guard_update();

-- No DELETE for authenticated (retention jobs later via service_role)

create policy pastoral_case_notes_select_authorized
  on public.pastoral_case_notes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.pastoral_requests r
      where r.id = request_id
        and public.can_select_pastoral_request(r.service_type, r.assigned_to)
    )
  );

create policy pastoral_case_notes_insert_authorized
  on public.pastoral_case_notes
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.pastoral_requests r
      where r.id = request_id
        and public.can_select_pastoral_request(r.service_type, r.assigned_to)
    )
  );

create policy pastoral_case_notes_update_author
  on public.pastoral_case_notes
  for update
  to authenticated
  using (
    author_id = auth.uid()
    and exists (
      select 1
      from public.pastoral_requests r
      where r.id = request_id
        and public.can_select_pastoral_request(r.service_type, r.assigned_to)
    )
  )
  with check (
    author_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Explicit Data API grants (hosted Supabase requires table GRANT + RLS)
-- ---------------------------------------------------------------------------
revoke all on table public.pastoral_requests from public, anon;
revoke all on table public.pastoral_case_notes from public, anon;

grant select, insert, update on table public.pastoral_requests to authenticated;
grant select, insert, update on table public.pastoral_case_notes to authenticated;

grant all on table public.pastoral_requests to service_role;
grant all on table public.pastoral_case_notes to service_role;

-- ---------------------------------------------------------------------------
-- Confirm pastoral permissions descriptions (already seeded in foundation)
-- ---------------------------------------------------------------------------
update public.permissions
set description = 'Read Prayer Care requests (shared Prayer-team queue)'
where name = 'prayer.read';

update public.permissions
set description = 'Assign Prayer Care requests'
where name = 'prayer.assign';

update public.permissions
set description = 'Read Pastoral Care requests (assigned rows unless counselling.assign)'
where name = 'counselling.read';

update public.permissions
set description = 'Assign Pastoral Care requests / domain-wide Pastoral queue'
where name = 'counselling.assign';

update public.permissions
set description = 'Read Welfare Care requests (Welfare-team queue)'
where name = 'welfare.read';

update public.permissions
set description = 'Assign Welfare Care requests'
where name = 'welfare.assign';

-- Staff list for assignment UI (no narrative data). Callable only with a Care assign permission.
create or replace function public.care_assignable_staff()
returns table (
  id uuid,
  display_name text,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct p.id, p.display_name, p.email
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  join public.roles r on r.id = ur.role_id
  where p.is_active = true
    and r.name in ('pastor', 'pastoral_admin')
    and (
      public.has_permission('prayer.assign')
      or public.has_permission('counselling.assign')
      or public.has_permission('welfare.assign')
    )
  order by p.display_name nulls last, p.email nulls last;
$$;

revoke all on function public.care_assignable_staff() from public;
grant execute on function public.care_assignable_staff() to authenticated, service_role;
