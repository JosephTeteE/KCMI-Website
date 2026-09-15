-- Care P4: lightweight first-party intake rate limits
-- No raw IP, no PII, no narrative. Service-role only.
-- Retention: short-lived window rows; RPC purges stale buckets.

create table if not exists public.care_intake_rate_limits (
  requester_key text not null,
  service_type public.care_service_type not null,
  window_started_at timestamptz not null,
  attempt_count integer not null default 0
    constraint care_intake_rate_limits_attempt_nonneg check (attempt_count >= 0),
  updated_at timestamptz not null default now(),
  constraint care_intake_rate_limits_pkey
    primary key (requester_key, service_type, window_started_at),
  constraint care_intake_rate_limits_key_len
    check (char_length(requester_key) between 16 and 128)
);

comment on table public.care_intake_rate_limits is
  'SHORT-LIVED Care public-intake rate counters. Hashed requester keys only. Not for analytics. No PII/narrative.';

create index if not exists care_intake_rate_limits_window_idx
  on public.care_intake_rate_limits (window_started_at);

alter table public.care_intake_rate_limits enable row level security;
alter table public.care_intake_rate_limits force row level security;

revoke all on table public.care_intake_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.care_intake_rate_limits to service_role;

-- No policies for anon/authenticated: table is unreachable via Data API for those roles.
-- service_role bypasses RLS.

create or replace function public.care_intake_rate_limit_consume(
  p_requester_key text,
  p_service public.care_service_type,
  p_limit integer default 8,
  p_window_seconds integer default 3600
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
  v_allowed boolean;
begin
  if p_requester_key is null
     or char_length(btrim(p_requester_key)) < 16
     or char_length(btrim(p_requester_key)) > 128 then
    raise exception 'care_intake_rate_limit_consume: invalid requester_key';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'care_intake_rate_limit_consume: invalid limit';
  end if;

  if p_window_seconds is null or p_window_seconds < 60 or p_window_seconds > 86400 then
    raise exception 'care_intake_rate_limit_consume: invalid window';
  end if;

  -- Fixed UTC bucket for cleanup-friendly counters.
  v_window_start :=
    to_timestamp(
      floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
    );

  -- Drop stale buckets for this key/service (keep current + previous window).
  delete from public.care_intake_rate_limits r
  where r.requester_key = btrim(p_requester_key)
    and r.service_type = p_service
    and r.window_started_at < (v_window_start - make_interval(secs => p_window_seconds));

  insert into public.care_intake_rate_limits as r (
    requester_key,
    service_type,
    window_started_at,
    attempt_count,
    updated_at
  )
  values (
    btrim(p_requester_key),
    p_service,
    v_window_start,
    1,
    now()
  )
  on conflict (requester_key, service_type, window_started_at)
  do update set
    attempt_count = r.attempt_count + 1,
    updated_at = now()
  returning r.attempt_count into v_count;

  v_allowed := v_count <= p_limit;

  return jsonb_build_object(
    'allowed', v_allowed,
    'attempt_count', v_count,
    'limit', p_limit,
    'window_started_at', v_window_start
  );
end;
$$;

revoke all on function public.care_intake_rate_limit_consume(
  text,
  public.care_service_type,
  integer,
  integer
) from public, anon, authenticated;

grant execute on function public.care_intake_rate_limit_consume(
  text,
  public.care_service_type,
  integer,
  integer
) to service_role;

comment on function public.care_intake_rate_limit_consume is
  'Care P4 intake rate-limit consume. service_role only. Returns {allowed, attempt_count, limit, window_started_at}.';
