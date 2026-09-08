-- Storage writes for marketing-public are Hub server-only.
-- Authenticated JWTs (browser or user-scoped clients) must not INSERT/UPDATE/DELETE
-- objects. Server actions upload via service_role after permission checks and
-- file-signature validation.
--
-- Previous INSERT with_check allowed has_permission('branches.manage'), which
-- granted every branch_admin global mutation of the shared bucket.

drop policy if exists marketing_public_insert on storage.objects;
drop policy if exists marketing_public_update on storage.objects;
drop policy if exists marketing_public_delete on storage.objects;

-- Read remains public for this marketing bucket (binaries are not pastoral/receipt data).
drop policy if exists marketing_public_read on storage.objects;
create policy marketing_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'marketing-public');
