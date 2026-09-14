-- Forward cleanup: defer Event registration after E3 was historically applied.
-- Preserves E1/E2 Events advertising schema and events.manage write model.
-- Does NOT rewrite 20260914192000_events_e3_registration.sql.

-- ---------------------------------------------------------------------------
-- Drop privileged / public registration functions (exact E3 signatures)
-- ---------------------------------------------------------------------------
drop function if exists public.admin_register_for_event(
  uuid,
  text,
  text,
  text,
  integer,
  text
);

drop function if exists public.public_event_registered_people(uuid);

-- ---------------------------------------------------------------------------
-- Drop private registrations table (policies/indexes/trigger cascade with table)
-- ---------------------------------------------------------------------------
drop policy if exists event_registrations_staff_select on public.event_registrations;
drop policy if exists event_registrations_staff_update on public.event_registrations;

drop trigger if exists event_registrations_set_updated_at on public.event_registrations;

drop table if exists public.event_registrations;

drop type if exists public.event_registration_status;

-- ---------------------------------------------------------------------------
-- Remove E3 registration configuration columns from events
-- ---------------------------------------------------------------------------
alter table public.events
  drop constraint if exists events_capacity_chk;

alter table public.events
  drop constraint if exists events_registration_window_chk;

alter table public.events
  drop column if exists registration_enabled,
  drop column if exists registration_opens_at,
  drop column if exists registration_closes_at,
  drop column if exists capacity;

comment on table public.events is
  'KCMI Events advertising/content table (E1/E2). Registration/payment deferred.';
