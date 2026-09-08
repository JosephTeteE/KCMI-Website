-- Staging verification (read-only assertions). Do not print secrets.

-- 1. Migration history
select version from supabase_migrations.schema_migrations order by version;

-- 2. Expected public tables
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by 1;

-- 3. Unexpected D2 / pastoral tables must not exist
select c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname ~* '(giving|donation|pastoral|counselling|counseling|welfare|prayer_request|payment_evidence|receipt)';

-- 4. Storage bucket
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'marketing-public';

-- 5. Storage policies for marketing-public
select policyname, roles, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- 6. Table grants to anon/authenticated (no values, just privileges)
select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;

-- 7. Seeded published branches
select slug, status, is_public from public.church_branches order by sort_order;
