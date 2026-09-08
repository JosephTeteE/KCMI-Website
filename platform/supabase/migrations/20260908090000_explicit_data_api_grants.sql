-- Explicit Data API grants for hosted Supabase (new projects after 2026-05-30).
-- Local CLI historically auto-granted SELECT/INSERT/UPDATE/DELETE on public tables
-- to anon/authenticated/service_role. Hosted staging does not. RLS remains the
-- row filter; these GRANTs are the table-level opt-in.
--
-- No Giving D2 tables. No pastoral narrative tables.
-- Anon receives SELECT only on intended public content tables.
-- Authenticated mutations remain permission-gated by existing RLS policies.
-- service_role grants are for server-side clients only (never browser).

-- ---------------------------------------------------------------------------
-- Schema usage (idempotent; hosted usually already has this)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enum types used in API-visible columns
-- ---------------------------------------------------------------------------
grant usage on type public.publication_status to anon, authenticated, service_role;
grant usage on type public.program_placement to anon, authenticated, service_role;
grant usage on type public.branch_media_placement to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Helper functions used by RLS (do not leave EXECUTE to PUBLIC)
-- ---------------------------------------------------------------------------
revoke all on function public.has_role(text) from public;
grant execute on function public.has_role(text) to authenticated, service_role;

revoke all on function public.has_permission(text) from public;
grant execute on function public.has_permission(text) to authenticated, service_role;

-- can_manage_branch already granted in 20260907130000_cms_content.sql
-- set_updated_at / handle_new_user are trigger functions (not Data API)

-- ---------------------------------------------------------------------------
-- Foundation tables: no anonymous table privileges
-- ---------------------------------------------------------------------------
revoke all on table
  public.profiles,
  public.roles,
  public.permissions,
  public.user_roles,
  public.role_permissions,
  public.audit_events
from public, anon;

grant select, update on table public.profiles to authenticated;
grant select on table public.roles to authenticated;
grant select on table public.permissions to authenticated;
grant select, insert, update, delete on table public.user_roles to authenticated;
grant select, insert, update, delete on table public.role_permissions to authenticated;
grant select, insert on table public.audit_events to authenticated;

grant all on table
  public.profiles,
  public.roles,
  public.permissions,
  public.user_roles,
  public.role_permissions,
  public.audit_events
to service_role;

-- ---------------------------------------------------------------------------
-- CMS public-read tables: anon SELECT only
-- ---------------------------------------------------------------------------
revoke all on table
  public.media_assets,
  public.programs,
  public.sermons,
  public.church_branches,
  public.branch_service_times,
  public.livestream_settings,
  public.branch_media
from public;

grant select on table
  public.media_assets,
  public.programs,
  public.sermons,
  public.church_branches,
  public.branch_service_times,
  public.livestream_settings,
  public.branch_media
to anon;

grant select, insert, update, delete on table
  public.media_assets,
  public.programs,
  public.sermons,
  public.church_branches,
  public.branch_service_times,
  public.branch_media
to authenticated;

grant select, insert, update on table public.livestream_settings to authenticated;

grant all on table
  public.media_assets,
  public.programs,
  public.sermons,
  public.church_branches,
  public.branch_service_times,
  public.livestream_settings,
  public.branch_media
to service_role;

-- ---------------------------------------------------------------------------
-- Hub-only CMS tables: no anon
-- ---------------------------------------------------------------------------
revoke all on table
  public.branch_staff_assignments,
  public.content_revisions
from public, anon;

grant select, insert, update, delete on table public.branch_staff_assignments to authenticated;
grant select, insert on table public.content_revisions to authenticated;

grant all on table
  public.branch_staff_assignments,
  public.content_revisions
to service_role;
