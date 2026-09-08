-- Tighten program publish authorization at RLS (Save ≠ Publish)

drop policy if exists programs_update on public.programs;
create policy programs_update on public.programs
  for update to authenticated
  using (
    public.has_permission('programs.update')
    or public.has_permission('programs.create')
    or public.has_permission('programs.publish')
  )
  with check (
    case
      when status = 'published' then public.has_permission('programs.publish')
      else (
        public.has_permission('programs.update')
        or public.has_permission('programs.create')
        or public.has_permission('programs.publish')
      )
    end
  );

drop policy if exists programs_insert on public.programs;
create policy programs_insert on public.programs
  for insert to authenticated
  with check (
    case
      when status = 'published' then public.has_permission('programs.publish')
      else (
        public.has_permission('programs.create')
        or public.has_permission('programs.update')
      )
    end
  );
