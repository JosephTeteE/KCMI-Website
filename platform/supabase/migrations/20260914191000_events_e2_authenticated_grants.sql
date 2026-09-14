-- E2.1: Grant authenticated INSERT/UPDATE on events.
-- E1 only granted SELECT; E2 RLS write policies alone cannot authorize Data API writes.
-- RLS remains the authorization gate (events.manage). No DELETE privilege (archive via status).

grant select, insert, update on table public.events to authenticated;
grant all on table public.events to service_role;
