-- Care P1 follow-up: reference-code generation must resolve pgcrypto on hosted Supabase.
-- Hosted projects expose gen_random_bytes via the extensions schema, not public.

create or replace function public.care_generate_reference_code()
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  v_code text;
  v_attempt integer := 0;
begin
  loop
    v_attempt := v_attempt + 1;
    v_code :=
      'KCMI-CARE-'
      || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 6));
    exit when not exists (
      select 1 from public.pastoral_requests r where r.reference_code = v_code
    );
    if v_attempt > 20 then
      raise exception 'care_generate_reference_code: exhausted retries';
    end if;
  end loop;
  return v_code;
end;
$$;

revoke all on function public.care_generate_reference_code() from public;
grant execute on function public.care_generate_reference_code() to authenticated, service_role;

-- Align SECURITY DEFINER Care helpers with fixed search_path including extensions
-- (has_permission lives in public; keep public first).
create or replace function public.can_select_pastoral_request(
  p_service public.care_service_type,
  p_assigned_to uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    case p_service
      when 'prayer' then public.has_permission('prayer.read')
      when 'welfare' then public.has_permission('welfare.read')
      when 'pastoral' then
        public.has_permission('counselling.read')
        and (
          p_assigned_to = auth.uid()
          or public.has_permission('counselling.assign')
        )
      else false
    end;
$$;

create or replace function public.can_assign_pastoral_request(
  p_service public.care_service_type
)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select public.has_permission(public.care_assign_permission_for(p_service));
$$;

create or replace function public.care_assignable_staff()
returns table (
  id uuid,
  display_name text,
  email text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select distinct p.id, p.display_name, p.email
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  join public.roles r on r.id = ur.role_id
  where p.is_active = true
    and r.name in ('pastor', 'pastoral_admin')
    and (
      public.has_permission('prayer.assign')
      or public.has_permission('counselling.assign')
      or public.has_permission('welfare.assign')
    )
  order by p.display_name nulls last, p.email nulls last;
$$;
