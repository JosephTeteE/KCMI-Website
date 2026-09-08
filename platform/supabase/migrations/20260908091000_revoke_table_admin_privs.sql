-- Least-privilege cleanup after hosted GRANT SELECT/ALL also left
-- TRUNCATE/REFERENCES/TRIGGER on API roles. RLS does not protect TRUNCATE.
-- Keep DML needed by existing policies; strip table-admin privileges from
-- anon and authenticated. service_role remains server-only.

revoke truncate, references, trigger on all tables in schema public
  from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;
