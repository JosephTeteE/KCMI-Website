-- Phase D1 CMS RLS policies

alter table public.media_assets enable row level security;
alter table public.programs enable row level security;
alter table public.sermons enable row level security;
alter table public.church_branches enable row level security;
alter table public.branch_service_times enable row level security;
alter table public.branch_staff_assignments enable row level security;
alter table public.livestream_settings enable row level security;
alter table public.content_revisions enable row level security;

-- ---------------------------------------------------------------------------
-- media_assets
-- ---------------------------------------------------------------------------
drop policy if exists media_assets_public_select on public.media_assets;
create policy media_assets_public_select on public.media_assets
  for select to anon, authenticated
  using (archived_at is null);

drop policy if exists media_assets_insert on public.media_assets;
create policy media_assets_insert on public.media_assets
  for insert to authenticated
  with check (public.has_permission('media.manage'));

drop policy if exists media_assets_update on public.media_assets;
create policy media_assets_update on public.media_assets
  for update to authenticated
  using (public.has_permission('media.manage'))
  with check (public.has_permission('media.manage'));

drop policy if exists media_assets_delete on public.media_assets;
create policy media_assets_delete on public.media_assets
  for delete to authenticated
  using (public.has_permission('media.manage'));

-- ---------------------------------------------------------------------------
-- programs
-- ---------------------------------------------------------------------------
drop policy if exists programs_anon_published_select on public.programs;
create policy programs_anon_published_select on public.programs
  for select to anon
  using (status = 'published');

drop policy if exists programs_staff_select on public.programs;
create policy programs_staff_select on public.programs
  for select to authenticated
  using (
    status = 'published'
    or public.has_permission('hub.access')
  );

drop policy if exists programs_insert on public.programs;
create policy programs_insert on public.programs
  for insert to authenticated
  with check (
    public.has_permission('programs.create')
    or public.has_permission('programs.update')
  );

drop policy if exists programs_update on public.programs;
create policy programs_update on public.programs
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

-- Hard delete uncommon; still permission-gated
drop policy if exists programs_delete on public.programs;
create policy programs_delete on public.programs
  for delete to authenticated
  using (public.has_permission('programs.publish'));

-- ---------------------------------------------------------------------------
-- sermons
-- ---------------------------------------------------------------------------
drop policy if exists sermons_anon_published_select on public.sermons;
create policy sermons_anon_published_select on public.sermons
  for select to anon
  using (status = 'published');

drop policy if exists sermons_staff_select on public.sermons;
create policy sermons_staff_select on public.sermons
  for select to authenticated
  using (
    status = 'published'
    or public.has_permission('hub.access')
  );

drop policy if exists sermons_insert on public.sermons;
create policy sermons_insert on public.sermons
  for insert to authenticated
  with check (public.has_permission('sermons.manage'));

drop policy if exists sermons_update on public.sermons;
create policy sermons_update on public.sermons
  for update to authenticated
  using (public.has_permission('sermons.manage'))
  with check (public.has_permission('sermons.manage'));

drop policy if exists sermons_delete on public.sermons;
create policy sermons_delete on public.sermons
  for delete to authenticated
  using (public.has_permission('sermons.manage'));

-- ---------------------------------------------------------------------------
-- church_branches
-- ---------------------------------------------------------------------------
drop policy if exists branches_anon_published_select on public.church_branches;
create policy branches_anon_published_select on public.church_branches
  for select to anon
  using (is_public = true and status = 'published');

drop policy if exists branches_staff_select on public.church_branches;
create policy branches_staff_select on public.church_branches
  for select to authenticated
  using (
    (is_public = true and status = 'published')
    or public.has_permission('hub.access')
  );

drop policy if exists branches_insert on public.church_branches;
create policy branches_insert on public.church_branches
  for insert to authenticated
  with check (public.has_role('super_admin') and public.has_permission('branches.manage'));

drop policy if exists branches_update on public.church_branches;
create policy branches_update on public.church_branches
  for update to authenticated
  using (public.can_manage_branch(id))
  with check (public.can_manage_branch(id));

drop policy if exists branches_delete on public.church_branches;
create policy branches_delete on public.church_branches
  for delete to authenticated
  using (public.has_role('super_admin') and public.has_permission('branches.manage'));

-- ---------------------------------------------------------------------------
-- branch_service_times
-- ---------------------------------------------------------------------------
drop policy if exists branch_times_anon_select on public.branch_service_times;
create policy branch_times_anon_select on public.branch_service_times
  for select to anon
  using (
    exists (
      select 1 from public.church_branches b
      where b.id = branch_id
        and b.is_public = true
        and b.status = 'published'
    )
  );

drop policy if exists branch_times_staff_select on public.branch_service_times;
create policy branch_times_staff_select on public.branch_service_times
  for select to authenticated
  using (
    exists (
      select 1 from public.church_branches b
      where b.id = branch_id
        and (
          (b.is_public = true and b.status = 'published')
          or public.has_permission('hub.access')
        )
    )
  );

drop policy if exists branch_times_insert on public.branch_service_times;
create policy branch_times_insert on public.branch_service_times
  for insert to authenticated
  with check (public.can_manage_branch(branch_id));

drop policy if exists branch_times_update on public.branch_service_times;
create policy branch_times_update on public.branch_service_times
  for update to authenticated
  using (public.can_manage_branch(branch_id))
  with check (public.can_manage_branch(branch_id));

drop policy if exists branch_times_delete on public.branch_service_times;
create policy branch_times_delete on public.branch_service_times
  for delete to authenticated
  using (public.can_manage_branch(branch_id));

-- ---------------------------------------------------------------------------
-- branch_staff_assignments (super_admin manages)
-- ---------------------------------------------------------------------------
drop policy if exists branch_assign_select on public.branch_staff_assignments;
create policy branch_assign_select on public.branch_staff_assignments
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_role('super_admin')
    or public.has_permission('users.manage')
  );

drop policy if exists branch_assign_mutate on public.branch_staff_assignments;
create policy branch_assign_mutate on public.branch_staff_assignments
  for all to authenticated
  using (public.has_role('super_admin') or public.has_permission('users.manage'))
  with check (public.has_role('super_admin') or public.has_permission('users.manage'));

-- ---------------------------------------------------------------------------
-- livestream_settings
-- ---------------------------------------------------------------------------
drop policy if exists livestream_anon_select on public.livestream_settings;
create policy livestream_anon_select on public.livestream_settings
  for select to anon, authenticated
  using (true);

drop policy if exists livestream_update on public.livestream_settings;
create policy livestream_update on public.livestream_settings
  for update to authenticated
  using (public.has_permission('livestream.manage'))
  with check (public.has_permission('livestream.manage'));

drop policy if exists livestream_insert on public.livestream_settings;
create policy livestream_insert on public.livestream_settings
  for insert to authenticated
  with check (public.has_permission('livestream.manage'));

-- ---------------------------------------------------------------------------
-- content_revisions
-- ---------------------------------------------------------------------------
drop policy if exists revisions_staff_select on public.content_revisions;
create policy revisions_staff_select on public.content_revisions
  for select to authenticated
  using (public.has_permission('hub.access'));

drop policy if exists revisions_insert on public.content_revisions;
create policy revisions_insert on public.content_revisions
  for insert to authenticated
  with check (public.has_permission('hub.access'));

-- No public/anon access to revisions
-- No update/delete of revisions for ordinary roles (immutable history)

-- ---------------------------------------------------------------------------
-- Storage policies for marketing-public
-- ---------------------------------------------------------------------------
drop policy if exists marketing_public_read on storage.objects;
create policy marketing_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'marketing-public');

drop policy if exists marketing_public_insert on storage.objects;
create policy marketing_public_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'marketing-public'
    and public.has_permission('media.manage')
  );

drop policy if exists marketing_public_update on storage.objects;
create policy marketing_public_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'marketing-public'
    and public.has_permission('media.manage')
  )
  with check (
    bucket_id = 'marketing-public'
    and public.has_permission('media.manage')
  );

drop policy if exists marketing_public_delete on storage.objects;
create policy marketing_public_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'marketing-public'
    and public.has_permission('media.manage')
  );
