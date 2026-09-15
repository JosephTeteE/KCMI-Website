-- Giving D2: structured destinations + maker/checker dual approval
-- Public /giving remains seed-backed until human financial verification.
-- No donor tables. No payment provider. No Event/Camp fee accounts.
-- Approve = publish (atomic). No self-approval. Stale proposals cannot overwrite.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.giving_account_status as enum (
    'draft',
    'published',
    'disabled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.giving_proposal_status as enum (
    'draft',
    'pending',
    'approved',
    'rejected',
    'superseded'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.giving_proposal_type as enum (
    'create',
    'update',
    'disable',
    'enable'
  );
exception when duplicate_object then null;
end $$;

grant usage on type public.giving_account_status to anon, authenticated, service_role;
grant usage on type public.giving_proposal_status to authenticated, service_role;
grant usage on type public.giving_proposal_type to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Permissions: replace broad giving.change with propose / approve
-- ---------------------------------------------------------------------------
insert into public.permissions (name, description) values
  ('giving.propose', 'Propose Giving destination changes (maker)'),
  ('giving.approve', 'Approve or reject Giving destination changes (checker)')
on conflict (name) do update
set description = excluded.description;

update public.permissions
set description = 'DEPRECATED — use giving.propose / giving.approve. Retained for historical audit only; no live write grants.'
where name = 'giving.change';

-- Grant new permissions to roles that previously held giving.change
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name in ('super_admin', 'finance_reviewer')
  and p.name in ('giving.propose', 'giving.approve')
on conflict do nothing;

-- Remove all role grants of deprecated giving.change (no bypass path)
delete from public.role_permissions rp
using public.permissions p
where rp.permission_id = p.id
  and p.name = 'giving.change';

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.giving_accounts (
  id uuid primary key default gen_random_uuid(),
  stable_key text not null,
  label text not null,
  description text not null default '',
  country text,
  bank_name text not null,
  account_name text not null,
  swift_bic text,
  external_url text,
  display_order integer not null default 0,
  status public.giving_account_status not null default 'draft',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  constraint giving_accounts_stable_key_format
    check (stable_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint giving_accounts_stable_key_len
    check (char_length(stable_key) between 2 and 80),
  constraint giving_accounts_version_positive
    check (version >= 1),
  constraint giving_accounts_external_url_https
    check (
      external_url is null
      or external_url ~* '^https://'
    )
);

create unique index if not exists giving_accounts_stable_key_uidx
  on public.giving_accounts (stable_key);

create index if not exists giving_accounts_status_order_idx
  on public.giving_accounts (status, display_order);

comment on table public.giving_accounts is
  'Giving destinations under dual-approval governance. Public site cutover deferred until human verification; not donor data.';

create table if not exists public.giving_account_numbers (
  id uuid primary key default gen_random_uuid(),
  giving_account_id uuid not null
    references public.giving_accounts (id) on delete cascade,
  currency text not null,
  account_number text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint giving_account_numbers_currency_format
    check (currency ~ '^[A-Z]{3}$'),
  constraint giving_account_numbers_account_len
    check (char_length(account_number) between 4 and 34),
  constraint giving_account_numbers_account_chars
    check (account_number ~ '^[A-Za-z0-9][A-Za-z0-9 \-]*$')
);

create unique index if not exists giving_account_numbers_account_currency_uidx
  on public.giving_account_numbers (giving_account_id, currency);

create index if not exists giving_account_numbers_account_idx
  on public.giving_account_numbers (giving_account_id, display_order);

comment on table public.giving_account_numbers is
  'Per-currency account numbers for Giving destinations. Structured rows (not JSON) for readable diffs.';

create table if not exists public.giving_change_proposals (
  id uuid primary key default gen_random_uuid(),
  target_account_id uuid references public.giving_accounts (id) on delete restrict,
  proposal_type public.giving_proposal_type not null,
  base_version integer,
  base_snapshot jsonb,
  proposer_id uuid not null references public.profiles (id) on delete restrict,
  proposed_snapshot jsonb not null,
  status public.giving_proposal_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_reason text,
  applied_at timestamptz,
  constraint giving_change_proposals_create_no_target
    check (
      (proposal_type = 'create' and target_account_id is null)
      or (proposal_type <> 'create' and target_account_id is not null)
    ),
  constraint giving_change_proposals_base_version_nonneg
    check (base_version is null or base_version >= 1),
  constraint giving_change_proposals_reject_reason
    check (
      status <> 'rejected'
      or (review_reason is not null and char_length(btrim(review_reason)) >= 3)
    )
);

create index if not exists giving_change_proposals_status_idx
  on public.giving_change_proposals (status, submitted_at desc);

create index if not exists giving_change_proposals_target_idx
  on public.giving_change_proposals (target_account_id, status);

create index if not exists giving_change_proposals_proposer_idx
  on public.giving_change_proposals (proposer_id, status);

comment on table public.giving_change_proposals is
  'Maker/checker proposals for Giving destinations. Authoritative before/proposed snapshots; append-only history (no hard delete).';

drop trigger if exists giving_accounts_set_updated_at on public.giving_accounts;
create trigger giving_accounts_set_updated_at
  before update on public.giving_accounts
  for each row execute function public.set_updated_at();

drop trigger if exists giving_account_numbers_set_updated_at on public.giving_account_numbers;
create trigger giving_account_numbers_set_updated_at
  before update on public.giving_account_numbers
  for each row execute function public.set_updated_at();

drop trigger if exists giving_change_proposals_set_updated_at on public.giving_change_proposals;
create trigger giving_change_proposals_set_updated_at
  before update on public.giving_change_proposals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.can_view_giving_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_permission('giving.propose')
    or public.has_permission('giving.approve')
    or public.has_permission('audit.read');
$$;

revoke all on function public.can_view_giving_admin() from public;
grant execute on function public.can_view_giving_admin() to authenticated, service_role;

create or replace function public.giving_snapshot_account(p_account_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_account public.giving_accounts%rowtype;
  v_numbers jsonb;
begin
  select * into v_account
  from public.giving_accounts
  where id = p_account_id;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'currency', n.currency,
        'account_number', n.account_number,
        'display_order', n.display_order
      )
      order by n.display_order, n.currency
    ),
    '[]'::jsonb
  )
  into v_numbers
  from public.giving_account_numbers n
  where n.giving_account_id = p_account_id;

  return jsonb_build_object(
    'stable_key', v_account.stable_key,
    'label', v_account.label,
    'description', v_account.description,
    'country', v_account.country,
    'bank_name', v_account.bank_name,
    'account_name', v_account.account_name,
    'swift_bic', v_account.swift_bic,
    'external_url', v_account.external_url,
    'display_order', v_account.display_order,
    'status', v_account.status::text,
    'numbers', v_numbers
  );
end;
$$;

revoke all on function public.giving_snapshot_account(uuid) from public;
grant execute on function public.giving_snapshot_account(uuid) to authenticated, service_role;

create or replace function public.giving_validate_snapshot(p_snapshot jsonb)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_key text;
  v_label text;
  v_bank text;
  v_name text;
  v_swift text;
  v_url text;
  v_status text;
  v_numbers jsonb;
  v_item jsonb;
  v_currency text;
  v_acct text;
  v_i int;
begin
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    return 'Proposed details are missing.';
  end if;

  v_key := nullif(btrim(coalesce(p_snapshot->>'stable_key', '')), '');
  v_label := nullif(btrim(coalesce(p_snapshot->>'label', '')), '');
  v_bank := nullif(btrim(coalesce(p_snapshot->>'bank_name', '')), '');
  v_name := nullif(btrim(coalesce(p_snapshot->>'account_name', '')), '');
  v_swift := nullif(btrim(coalesce(p_snapshot->>'swift_bic', '')), '');
  v_url := nullif(btrim(coalesce(p_snapshot->>'external_url', '')), '');
  v_status := nullif(btrim(coalesce(p_snapshot->>'status', '')), '');
  v_numbers := coalesce(p_snapshot->'numbers', '[]'::jsonb);

  if v_key is null or v_key !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(v_key) > 80 then
    return 'Use a short key with lowercase letters, numbers, and hyphens only.';
  end if;
  if v_label is null or char_length(v_label) > 120 then
    return 'Please enter a clear destination label.';
  end if;
  if v_bank is null or char_length(v_bank) > 120 then
    return 'Please enter the bank name.';
  end if;
  if v_name is null or char_length(v_name) > 200 then
    return 'Please enter the account name.';
  end if;
  if v_status is null or v_status not in ('draft', 'published', 'disabled') then
    return 'Destination status is not valid.';
  end if;
  if v_swift is not null and v_swift !~ '^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$' then
    return 'SWIFT/BIC must be 8 or 11 letters and numbers.';
  end if;
  if v_url is not null and v_url !~* '^https://' then
    return 'External giving links must start with https://';
  end if;
  if jsonb_typeof(v_numbers) <> 'array' or jsonb_array_length(v_numbers) < 1 then
    return 'Add at least one account number and currency.';
  end if;

  for v_i in 0 .. jsonb_array_length(v_numbers) - 1 loop
    v_item := v_numbers->v_i;
    v_currency := upper(btrim(coalesce(v_item->>'currency', '')));
    v_acct := btrim(coalesce(v_item->>'account_number', ''));
    if v_currency !~ '^[A-Z]{3}$' then
      return 'Currency must be a 3-letter code such as NGN or USD.';
    end if;
    if char_length(v_acct) < 4 or char_length(v_acct) > 34 then
      return 'Account numbers must be between 4 and 34 characters.';
    end if;
    if v_acct !~ '^[A-Za-z0-9][A-Za-z0-9 \-]*$' then
      return 'Account numbers may only use letters, numbers, spaces, and hyphens.';
    end if;
  end loop;

  return null;
end;
$$;

revoke all on function public.giving_validate_snapshot(jsonb) from public;
grant execute on function public.giving_validate_snapshot(jsonb) to authenticated, service_role;

create or replace function public.giving_apply_snapshot(
  p_account_id uuid,
  p_snapshot jsonb,
  p_actor uuid,
  p_expected_version integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_err text;
  v_current int;
  v_new_id uuid := p_account_id;
  v_item jsonb;
  v_i int;
begin
  v_err := public.giving_validate_snapshot(p_snapshot);
  if v_err is not null then
    raise exception '%', v_err using errcode = 'P0001';
  end if;

  if p_account_id is null then
    insert into public.giving_accounts (
      stable_key,
      label,
      description,
      country,
      bank_name,
      account_name,
      swift_bic,
      external_url,
      display_order,
      status,
      version,
      created_by,
      updated_by
    ) values (
      btrim(p_snapshot->>'stable_key'),
      btrim(p_snapshot->>'label'),
      coalesce(btrim(p_snapshot->>'description'), ''),
      nullif(btrim(coalesce(p_snapshot->>'country', '')), ''),
      btrim(p_snapshot->>'bank_name'),
      btrim(p_snapshot->>'account_name'),
      nullif(upper(btrim(coalesce(p_snapshot->>'swift_bic', ''))), ''),
      nullif(btrim(coalesce(p_snapshot->>'external_url', '')), ''),
      coalesce((p_snapshot->>'display_order')::integer, 0),
      (p_snapshot->>'status')::public.giving_account_status,
      1,
      p_actor,
      p_actor
    )
    returning id into v_new_id;
  else
    select version into v_current
    from public.giving_accounts
    where id = p_account_id
    for update;

    if not found then
      raise exception 'That Giving destination no longer exists.' using errcode = 'P0001';
    end if;

    if p_expected_version is null or v_current <> p_expected_version then
      raise exception 'This proposal is out of date. Someone else already changed the live destination. Start a new proposal.'
        using errcode = 'P0001';
    end if;

    update public.giving_accounts
    set
      stable_key = btrim(p_snapshot->>'stable_key'),
      label = btrim(p_snapshot->>'label'),
      description = coalesce(btrim(p_snapshot->>'description'), ''),
      country = nullif(btrim(coalesce(p_snapshot->>'country', '')), ''),
      bank_name = btrim(p_snapshot->>'bank_name'),
      account_name = btrim(p_snapshot->>'account_name'),
      swift_bic = nullif(upper(btrim(coalesce(p_snapshot->>'swift_bic', ''))), ''),
      external_url = nullif(btrim(coalesce(p_snapshot->>'external_url', '')), ''),
      display_order = coalesce((p_snapshot->>'display_order')::integer, 0),
      status = (p_snapshot->>'status')::public.giving_account_status,
      version = version + 1,
      updated_by = p_actor
    where id = p_account_id;

    delete from public.giving_account_numbers
    where giving_account_id = p_account_id;
  end if;

  for v_i in 0 .. jsonb_array_length(p_snapshot->'numbers') - 1 loop
    v_item := (p_snapshot->'numbers')->v_i;
    insert into public.giving_account_numbers (
      giving_account_id,
      currency,
      account_number,
      display_order
    ) values (
      v_new_id,
      upper(btrim(v_item->>'currency')),
      btrim(v_item->>'account_number'),
      coalesce((v_item->>'display_order')::integer, v_i)
    );
  end loop;

  return v_new_id;
end;
$$;

revoke all on function public.giving_apply_snapshot(uuid, jsonb, uuid, integer) from public;
-- Internal only — not granted to authenticated

-- ---------------------------------------------------------------------------
-- Workflow RPCs
-- ---------------------------------------------------------------------------
create or replace function public.submit_giving_change_proposal(p_proposal_id uuid)
returns public.giving_change_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.giving_change_proposals%rowtype;
  v_err text;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Please sign in to the Hub first.' using errcode = 'P0001';
  end if;
  if not public.has_permission('giving.propose') then
    raise exception 'Your account is not allowed to submit Giving changes.' using errcode = 'P0001';
  end if;

  select * into v_row
  from public.giving_change_proposals
  where id = p_proposal_id
  for update;

  if not found then
    raise exception 'That proposal could not be found.' using errcode = 'P0001';
  end if;
  if v_row.proposer_id <> v_uid then
    raise exception 'Only the person who prepared this change can submit it.' using errcode = 'P0001';
  end if;
  if v_row.status <> 'draft' then
    raise exception 'Only draft proposals can be submitted for approval.' using errcode = 'P0001';
  end if;

  v_err := public.giving_validate_snapshot(v_row.proposed_snapshot);
  if v_err is not null then
    raise exception '%', v_err using errcode = 'P0001';
  end if;

  if v_row.target_account_id is not null then
    v_row.base_snapshot := public.giving_snapshot_account(v_row.target_account_id);
    select version into v_row.base_version
    from public.giving_accounts
    where id = v_row.target_account_id;
    if not found then
      raise exception 'That Giving destination no longer exists.' using errcode = 'P0001';
    end if;
  end if;

  update public.giving_change_proposals
  set
    status = 'pending',
    submitted_at = now(),
    base_version = v_row.base_version,
    base_snapshot = v_row.base_snapshot,
    reviewed_by = null,
    reviewed_at = null,
    review_reason = null,
    applied_at = null
  where id = p_proposal_id
  returning * into v_row;

  insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_uid,
    'giving.proposal.submit',
    'giving_change_proposal',
    p_proposal_id::text,
    jsonb_build_object(
      'proposal_id', p_proposal_id,
      'target_account_id', v_row.target_account_id,
      'proposal_type', v_row.proposal_type,
      'base_version', v_row.base_version
    )
  );

  return v_row;
end;
$$;

create or replace function public.withdraw_giving_change_proposal(p_proposal_id uuid)
returns public.giving_change_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.giving_change_proposals%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Please sign in to the Hub first.' using errcode = 'P0001';
  end if;
  if not public.has_permission('giving.propose') then
    raise exception 'Your account is not allowed to change Giving proposals.' using errcode = 'P0001';
  end if;

  select * into v_row
  from public.giving_change_proposals
  where id = p_proposal_id
  for update;

  if not found then
    raise exception 'That proposal could not be found.' using errcode = 'P0001';
  end if;
  if v_row.proposer_id <> v_uid then
    raise exception 'Only the person who prepared this change can withdraw it.' using errcode = 'P0001';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'Only pending proposals can be returned to draft.' using errcode = 'P0001';
  end if;

  update public.giving_change_proposals
  set
    status = 'draft',
    submitted_at = null
  where id = p_proposal_id
  returning * into v_row;

  insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_uid,
    'giving.proposal.withdraw',
    'giving_change_proposal',
    p_proposal_id::text,
    jsonb_build_object('proposal_id', p_proposal_id, 'result', 'draft')
  );

  return v_row;
end;
$$;

create or replace function public.reject_giving_change_proposal(
  p_proposal_id uuid,
  p_review_reason text
)
returns public.giving_change_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.giving_change_proposals%rowtype;
  v_uid uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_review_reason, '')), '');
begin
  if v_uid is null then
    raise exception 'Please sign in to the Hub first.' using errcode = 'P0001';
  end if;
  if not public.has_permission('giving.approve') then
    raise exception 'Your account is not allowed to reject Giving changes.' using errcode = 'P0001';
  end if;
  if v_reason is null or char_length(v_reason) < 3 then
    raise exception 'Please explain why this change is rejected.' using errcode = 'P0001';
  end if;

  select * into v_row
  from public.giving_change_proposals
  where id = p_proposal_id
  for update;

  if not found then
    raise exception 'That proposal could not be found.' using errcode = 'P0001';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'Only pending proposals can be rejected.' using errcode = 'P0001';
  end if;
  if v_row.proposer_id = v_uid then
    raise exception 'You cannot approve or reject your own Giving change. Ask another authorized person.'
      using errcode = 'P0001';
  end if;

  update public.giving_change_proposals
  set
    status = 'rejected',
    reviewed_by = v_uid,
    reviewed_at = now(),
    review_reason = v_reason
  where id = p_proposal_id
  returning * into v_row;

  insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_uid,
    'giving.proposal.reject',
    'giving_change_proposal',
    p_proposal_id::text,
    jsonb_build_object(
      'proposal_id', p_proposal_id,
      'target_account_id', v_row.target_account_id,
      'result', 'rejected'
    )
  );

  return v_row;
end;
$$;

create or replace function public.approve_giving_change_proposal(
  p_proposal_id uuid,
  p_review_reason text default null
)
returns public.giving_change_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.giving_change_proposals%rowtype;
  v_uid uuid := auth.uid();
  v_account_id uuid;
  v_snapshot jsonb;
  v_new_version int;
begin
  if v_uid is null then
    raise exception 'Please sign in to the Hub first.' using errcode = 'P0001';
  end if;
  if not public.has_permission('giving.approve') then
    raise exception 'Your account is not allowed to approve Giving changes.' using errcode = 'P0001';
  end if;

  select * into v_row
  from public.giving_change_proposals
  where id = p_proposal_id
  for update;

  if not found then
    raise exception 'That proposal could not be found.' using errcode = 'P0001';
  end if;

  -- Idempotent: already approved/applied
  if v_row.status = 'approved' and v_row.applied_at is not null then
    return v_row;
  end if;

  if v_row.status <> 'pending' then
    raise exception 'Only pending proposals can be approved.' using errcode = 'P0001';
  end if;
  if v_row.proposer_id = v_uid then
    raise exception 'You cannot approve your own Giving change. Ask another authorized person.'
      using errcode = 'P0001';
  end if;

  v_snapshot := v_row.proposed_snapshot;

  -- Force status for enable/disable types
  if v_row.proposal_type = 'disable' then
    v_snapshot := jsonb_set(v_snapshot, '{status}', '"disabled"'::jsonb, true);
  elsif v_row.proposal_type = 'enable' then
    v_snapshot := jsonb_set(v_snapshot, '{status}', '"published"'::jsonb, true);
  end if;

  v_account_id := public.giving_apply_snapshot(
    v_row.target_account_id,
    v_snapshot,
    v_uid,
    v_row.base_version
  );

  select version into v_new_version
  from public.giving_accounts
  where id = v_account_id;

  update public.giving_change_proposals
  set
    status = 'approved',
    target_account_id = v_account_id,
    proposed_snapshot = v_snapshot,
    reviewed_by = v_uid,
    reviewed_at = now(),
    review_reason = nullif(btrim(coalesce(p_review_reason, '')), ''),
    applied_at = now()
  where id = p_proposal_id
  returning * into v_row;

  -- Supersede other pending proposals for the same destination (stale)
  update public.giving_change_proposals
  set status = 'superseded'
  where target_account_id = v_account_id
    and id <> p_proposal_id
    and status = 'pending';

  insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_uid,
    'giving.proposal.approve',
    'giving_change_proposal',
    p_proposal_id::text,
    jsonb_build_object(
      'proposal_id', p_proposal_id,
      'target_account_id', v_account_id,
      'proposal_type', v_row.proposal_type,
      'result', 'approved_applied',
      'new_version', v_new_version
    )
  );

  insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_uid,
    'giving.account.apply',
    'giving_account',
    v_account_id::text,
    jsonb_build_object(
      'proposal_id', p_proposal_id,
      'version', v_new_version,
      'status', v_snapshot->>'status'
    )
  );

  return v_row;
end;
$$;

revoke all on function public.submit_giving_change_proposal(uuid) from public;
revoke all on function public.withdraw_giving_change_proposal(uuid) from public;
revoke all on function public.reject_giving_change_proposal(uuid, text) from public;
revoke all on function public.approve_giving_change_proposal(uuid, text) from public;

grant execute on function public.submit_giving_change_proposal(uuid) to authenticated, service_role;
grant execute on function public.withdraw_giving_change_proposal(uuid) to authenticated, service_role;
grant execute on function public.reject_giving_change_proposal(uuid, text) to authenticated, service_role;
grant execute on function public.approve_giving_change_proposal(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.giving_accounts enable row level security;
alter table public.giving_account_numbers enable row level security;
alter table public.giving_change_proposals enable row level security;

-- Public may eventually SELECT published rows (cutover later). No writes for anon.
drop policy if exists giving_accounts_anon_select on public.giving_accounts;
create policy giving_accounts_anon_select on public.giving_accounts
  for select to anon
  using (status = 'published');

drop policy if exists giving_accounts_staff_select on public.giving_accounts;
create policy giving_accounts_staff_select on public.giving_accounts
  for select to authenticated
  using (
    status = 'published'
    or public.can_view_giving_admin()
  );

-- No authenticated INSERT/UPDATE/DELETE on live accounts — apply only via approve RPC
drop policy if exists giving_account_numbers_anon_select on public.giving_account_numbers;
create policy giving_account_numbers_anon_select on public.giving_account_numbers
  for select to anon
  using (
    exists (
      select 1 from public.giving_accounts a
      where a.id = giving_account_id
        and a.status = 'published'
    )
  );

drop policy if exists giving_account_numbers_staff_select on public.giving_account_numbers;
create policy giving_account_numbers_staff_select on public.giving_account_numbers
  for select to authenticated
  using (
    exists (
      select 1 from public.giving_accounts a
      where a.id = giving_account_id
        and (
          a.status = 'published'
          or public.can_view_giving_admin()
        )
    )
  );

drop policy if exists giving_proposals_select on public.giving_change_proposals;
create policy giving_proposals_select on public.giving_change_proposals
  for select to authenticated
  using (public.can_view_giving_admin());

drop policy if exists giving_proposals_insert on public.giving_change_proposals;
create policy giving_proposals_insert on public.giving_change_proposals
  for insert to authenticated
  with check (
    public.has_permission('giving.propose')
    and proposer_id = auth.uid()
    and status = 'draft'
  );

-- Makers may edit their own draft proposals only (no silent pending mutation)
drop policy if exists giving_proposals_update_draft on public.giving_change_proposals;
create policy giving_proposals_update_draft on public.giving_change_proposals
  for update to authenticated
  using (
    public.has_permission('giving.propose')
    and proposer_id = auth.uid()
    and status = 'draft'
  )
  with check (
    public.has_permission('giving.propose')
    and proposer_id = auth.uid()
    and status = 'draft'
  );

-- ---------------------------------------------------------------------------
-- Grants (hosted Data API opt-in)
-- ---------------------------------------------------------------------------
revoke all on table
  public.giving_accounts,
  public.giving_account_numbers,
  public.giving_change_proposals
from public, anon, authenticated;

grant select on table public.giving_accounts to anon;
grant select on table public.giving_account_numbers to anon;

grant select on table public.giving_accounts to authenticated;
grant select on table public.giving_account_numbers to authenticated;
grant select, insert, update on table public.giving_change_proposals to authenticated;

grant all on table
  public.giving_accounts,
  public.giving_account_numbers,
  public.giving_change_proposals
to service_role;

-- ---------------------------------------------------------------------------
-- No real KCMI financial seed. No synthetic production defaults.
-- Staging QA fixtures belong in test helpers / explicit staging scripts only.
-- ---------------------------------------------------------------------------
