-- D1.8: Program sessions + location/action fields (additive).
-- Do NOT apply to hosted staging without explicit release approval.
-- Legacy programs.starts_at / ends_at retained for compatibility; adapters prefer sessions.

-- ---------------------------------------------------------------------------
-- Optional visitor action kind (derived button labels in app layer)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.program_action_kind as enum (
    'none',
    'registration',
    'youtube',
    'facebook',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.program_location_kind as enum (
    'branch',
    'venue',
    'online',
    'hybrid'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.programs
  add column if not exists action_kind public.program_action_kind not null default 'none';

alter table public.programs
  add column if not exists location_kind public.program_location_kind;

alter table public.programs
  add column if not exists location_branch_id uuid references public.church_branches (id) on delete set null;

alter table public.programs
  add column if not exists location_label text;

alter table public.programs
  add column if not exists timezone text;

comment on column public.programs.action_kind is
  'D1.8 visitor action. Button label is derived in app (Register / Watch video / Learn more).';
comment on column public.programs.location_kind is
  'D1.8 where the program happens. branch uses location_branch_id; venue/online use location_label.';
comment on column public.programs.timezone is
  'IANA timezone for session local times. Prefer branch-derived values; not shown raw to volunteers.';
comment on column public.programs.starts_at is
  'LEGACY single-interval start. Prefer program_sessions. Retained for back-compat; do not remove in D1.8.';
comment on column public.programs.ends_at is
  'LEGACY single-interval end. Prefer program_sessions. Retained for back-compat; do not remove in D1.8.';

-- ---------------------------------------------------------------------------
-- Normalized sessions
-- ---------------------------------------------------------------------------
create table if not exists public.program_sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  session_date date not null,
  start_time time,
  end_time time,
  label text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_sessions_time_chk check (
    end_time is null or start_time is null or end_time >= start_time
  )
);

create index if not exists program_sessions_program_idx
  on public.program_sessions (program_id, session_date, sort_order);

comment on table public.program_sessions is
  'D1.8 multi-day / multi-session schedule rows for programs. Public adapters prefer these over legacy starts_at/ends_at.';

-- Backfill one session from legacy interval when present and no sessions yet
insert into public.program_sessions (
  program_id,
  session_date,
  start_time,
  end_time,
  label,
  sort_order
)
select
  p.id,
  (p.starts_at at time zone coalesce(p.timezone, 'Africa/Lagos'))::date,
  (p.starts_at at time zone coalesce(p.timezone, 'Africa/Lagos'))::time,
  case
    when p.ends_at is null then null
    when (p.ends_at at time zone coalesce(p.timezone, 'Africa/Lagos'))::date
      = (p.starts_at at time zone coalesce(p.timezone, 'Africa/Lagos'))::date
      then (p.ends_at at time zone coalesce(p.timezone, 'Africa/Lagos'))::time
    else null
  end,
  null,
  0
from public.programs p
where p.starts_at is not null
  and not exists (
    select 1 from public.program_sessions s where s.program_id = p.id
  );

-- Multi-day legacy ranges: also insert an end-day marker session when ends on a different day
insert into public.program_sessions (
  program_id,
  session_date,
  start_time,
  end_time,
  label,
  sort_order
)
select
  p.id,
  (p.ends_at at time zone coalesce(p.timezone, 'Africa/Lagos'))::date,
  null,
  (p.ends_at at time zone coalesce(p.timezone, 'Africa/Lagos'))::time,
  'Final day',
  1
from public.programs p
where p.starts_at is not null
  and p.ends_at is not null
  and (p.ends_at at time zone coalesce(p.timezone, 'Africa/Lagos'))::date
    > (p.starts_at at time zone coalesce(p.timezone, 'Africa/Lagos'))::date
  and (
    select count(*)::int from public.program_sessions s where s.program_id = p.id
  ) = 1;

-- ---------------------------------------------------------------------------
-- RLS (mirror programs staff model; public reads via program join only for published)
-- ---------------------------------------------------------------------------
alter table public.program_sessions enable row level security;

drop policy if exists program_sessions_anon_published_select on public.program_sessions;
create policy program_sessions_anon_published_select on public.program_sessions
  for select to anon
  using (
    exists (
      select 1 from public.programs p
      where p.id = program_id and p.status = 'published'
    )
  );

drop policy if exists program_sessions_staff_select on public.program_sessions;
create policy program_sessions_staff_select on public.program_sessions
  for select to authenticated
  using (
    exists (
      select 1 from public.programs p
      where p.id = program_id
        and (
          p.status = 'published'
          or public.has_permission('hub.access')
        )
    )
  );

drop policy if exists program_sessions_insert on public.program_sessions;
create policy program_sessions_insert on public.program_sessions
  for insert to authenticated
  with check (
    public.has_permission('programs.create')
    or public.has_permission('programs.update')
    or public.has_permission('programs.publish')
  );

drop policy if exists program_sessions_update on public.program_sessions;
create policy program_sessions_update on public.program_sessions
  for update to authenticated
  using (
    public.has_permission('programs.update')
    or public.has_permission('programs.create')
    or public.has_permission('programs.publish')
  )
  with check (
    public.has_permission('programs.update')
    or public.has_permission('programs.create')
    or public.has_permission('programs.publish')
  );

drop policy if exists program_sessions_delete on public.program_sessions;
create policy program_sessions_delete on public.program_sessions
  for delete to authenticated
  using (
    public.has_permission('programs.update')
    or public.has_permission('programs.create')
    or public.has_permission('programs.publish')
  );

grant select on public.program_sessions to anon, authenticated;
grant insert, update, delete on public.program_sessions to authenticated;
