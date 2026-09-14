-- E3: Event registration config + private event_registrations.
-- No payment/receipt fields. Public has no Data API write path to registrations.

-- ---------------------------------------------------------------------------
-- Event registration configuration (defaults keep existing Events closed)
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists registration_enabled boolean not null default false,
  add column if not exists registration_opens_at timestamptz,
  add column if not exists registration_closes_at timestamptz,
  add column if not exists capacity integer;

alter table public.events
  drop constraint if exists events_capacity_chk;

alter table public.events
  add constraint events_capacity_chk check (
    capacity is null or capacity > 0
  );

alter table public.events
  drop constraint if exists events_registration_window_chk;

alter table public.events
  add constraint events_registration_window_chk check (
    registration_opens_at is null
    or registration_closes_at is null
    or registration_closes_at >= registration_opens_at
  );

comment on column public.events.registration_enabled is
  'E3: when false, public registration is unavailable. Default false.';
comment on column public.events.capacity is
  'E3: max total party size across active registrations; null = unlimited.';

-- ---------------------------------------------------------------------------
-- Registrations table
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.event_registration_status as enum (
    'submitted',
    'confirmed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

grant usage on type public.event_registration_status to authenticated, service_role;

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  reference_code text not null,
  full_name text not null,
  email text not null,
  phone text not null,
  num_people integer not null,
  status public.event_registration_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_registrations_reference_unique unique (reference_code),
  constraint event_registrations_num_people_chk check (
    num_people >= 1 and num_people <= 20
  ),
  constraint event_registrations_email_chk check (
    char_length(trim(email)) >= 3
    and position('@' in email) > 1
  ),
  constraint event_registrations_name_chk check (char_length(trim(full_name)) >= 2),
  constraint event_registrations_phone_chk check (char_length(trim(phone)) >= 7),
  constraint event_registrations_reference_chk check (
    reference_code ~ '^KCMI-[A-Z0-9]{6}$'
  )
);

create index if not exists event_registrations_event_id_idx
  on public.event_registrations (event_id);

create index if not exists event_registrations_event_email_idx
  on public.event_registrations (event_id, lower(email));

create index if not exists event_registrations_submitted_at_idx
  on public.event_registrations (submitted_at desc);

drop trigger if exists event_registrations_set_updated_at on public.event_registrations;
create trigger event_registrations_set_updated_at
  before update on public.event_registrations
  for each row execute function public.set_updated_at();

comment on table public.event_registrations is
  'E3 private Event registrations. No public SELECT/INSERT. Payment evidence is E4. Retention: 12 months after event end (automation later).';

-- ---------------------------------------------------------------------------
-- Grants / RLS — no public access
-- ---------------------------------------------------------------------------
alter table public.event_registrations enable row level security;

revoke all on table public.event_registrations from public, anon;

grant select, update on table public.event_registrations to authenticated;
grant all on table public.event_registrations to service_role;

drop policy if exists event_registrations_staff_select on public.event_registrations;
create policy event_registrations_staff_select on public.event_registrations
  for select to authenticated
  using (public.has_permission('registrations.manage'));

drop policy if exists event_registrations_staff_update on public.event_registrations;
create policy event_registrations_staff_update on public.event_registrations
  for update to authenticated
  using (public.has_permission('registrations.manage'))
  with check (public.has_permission('registrations.manage'));

-- No INSERT/DELETE policies for authenticated — Hub does not create visitor rows;
-- inserts are service-role only via controlled server registration function.

-- ---------------------------------------------------------------------------
-- Capacity-safe registration insert (service_role only — Turnstile verified in app)
-- ---------------------------------------------------------------------------
create or replace function public.admin_register_for_event(
  p_event_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_num_people integer,
  p_reference_code text
)
returns public.event_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_used integer;
  v_existing public.event_registrations%rowtype;
  v_row public.event_registrations%rowtype;
  v_email text := lower(trim(p_email));
begin
  if p_num_people is null or p_num_people < 1 or p_num_people > 20 then
    raise exception 'INVALID_PARTY_SIZE' using errcode = 'P0001';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_event.status is distinct from 'published' then
    raise exception 'EVENT_NOT_OPEN' using errcode = 'P0001';
  end if;

  if coalesce(v_event.registration_enabled, false) is not true then
    raise exception 'REGISTRATION_DISABLED' using errcode = 'P0001';
  end if;

  if v_event.registration_opens_at is not null
     and now() < v_event.registration_opens_at then
    raise exception 'REGISTRATION_NOT_OPEN' using errcode = 'P0001';
  end if;

  if v_event.registration_closes_at is not null
     and now() > v_event.registration_closes_at then
    raise exception 'REGISTRATION_CLOSED' using errcode = 'P0001';
  end if;

  -- Duplicate protection: same event + email within 5 minutes returns existing row.
  select * into v_existing
  from public.event_registrations
  where event_id = p_event_id
    and lower(email) = v_email
    and status is distinct from 'cancelled'
    and submitted_at > now() - interval '5 minutes'
  order by submitted_at desc
  limit 1;

  if found then
    return v_existing;
  end if;

  if v_event.capacity is not null then
    select coalesce(sum(num_people), 0) into v_used
    from public.event_registrations
    where event_id = p_event_id
      and status is distinct from 'cancelled';

    if v_used + p_num_people > v_event.capacity then
      raise exception 'REGISTRATION_FULL' using errcode = 'P0001';
    end if;
  end if;

  insert into public.event_registrations (
    event_id,
    reference_code,
    full_name,
    email,
    phone,
    num_people,
    status
  ) values (
    p_event_id,
    p_reference_code,
    trim(p_full_name),
    v_email,
    trim(p_phone),
    p_num_people,
    'submitted'
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.admin_register_for_event(uuid, text, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.admin_register_for_event(uuid, text, text, text, integer, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Public occupancy count only (no registration row exposure)
-- ---------------------------------------------------------------------------
create or replace function public.public_event_registered_people(p_event_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status public.publication_status;
  v_sum integer;
begin
  select status into v_status
  from public.events
  where id = p_event_id;

  if not found or v_status is distinct from 'published' then
    return 0;
  end if;

  select coalesce(sum(num_people), 0)::integer into v_sum
  from public.event_registrations
  where event_id = p_event_id
    and status is distinct from 'cancelled';

  return v_sum;
end;
$$;

revoke all on function public.public_event_registered_people(uuid)
  from public;
grant execute on function public.public_event_registered_people(uuid)
  to anon, authenticated, service_role;

comment on function public.public_event_registered_people(uuid) is
  'E3: returns total active party size for a published Event only. Does not expose registration rows.';
