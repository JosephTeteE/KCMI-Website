-- E2: Hub Events write authorization + media_admin events.manage
-- Does not add registration/payment tables or policies.

-- ---------------------------------------------------------------------------
-- Grant events.manage to media_admin (HQ Content Admin)
-- Intentionally NOT registrations.manage or payment_evidence.review
-- ---------------------------------------------------------------------------
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'media_admin'
  and p.name = 'events.manage'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Write RLS: events.manage only (no broad authenticated writes)
-- Public SELECT from E1 unchanged.
-- ---------------------------------------------------------------------------
drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert to authenticated
  with check (public.has_permission('events.manage'));

drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update to authenticated
  using (public.has_permission('events.manage'))
  with check (public.has_permission('events.manage'));

-- Soft lifecycle only — no hard delete policy for normal Hub workflow.
-- Service role retains full access for ops; authenticated has no DELETE grant beyond RLS.

comment on table public.events is
  'Public Events content. E2 Hub writes gated by events.manage. Registration/payment are E3/E4.';
