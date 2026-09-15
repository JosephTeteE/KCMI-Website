-- Giving bootstrap: human-reconfirmed seed destinations → structured tables.
-- Provenance: platform/src/content/seed/giving.ts (exact values).
-- This is baseline migration of already-public content, NOT a maker/checker change.
-- Staging only application in this pass; future edits require dual approval.
--
-- Currency note: seed destinations with a single accountNumber (General, Care Group)
-- had no explicit currency field. NGN is used only as the structured carrier for that
-- unchanged account number so giving_account_numbers can store the row. Public
-- rendering maps those back to the seed shape (plain "Account number", not "NGN …").

-- ---------------------------------------------------------------------------
-- Preserve visitor-facing notes from seed (separate from description)
-- ---------------------------------------------------------------------------
alter table public.giving_accounts
  add column if not exists visitor_note text;

comment on column public.giving_accounts.visitor_note is
  'Optional visitor instruction from verified public Giving content (seed note).';

-- Update snapshot helpers to include visitor_note
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
    'visitor_note', v_account.visitor_note,
    'display_order', v_account.display_order,
    'status', v_account.status::text,
    'numbers', v_numbers
  );
end;
$$;

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
  v_note text;
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
  v_note := nullif(btrim(coalesce(p_snapshot->>'visitor_note', '')), '');
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
  if v_note is not null and char_length(v_note) > 500 then
    return 'Please shorten the visitor note.';
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
      visitor_note,
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
      nullif(btrim(coalesce(p_snapshot->>'visitor_note', '')), ''),
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
      visitor_note = nullif(btrim(coalesce(p_snapshot->>'visitor_note', '')), ''),
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

-- ---------------------------------------------------------------------------
-- Remove synthetic STAGING QA management fixtures (not public content)
-- ---------------------------------------------------------------------------
delete from public.giving_change_proposals
where proposed_snapshot->>'stable_key' like 'staging-qa-%'
   or base_snapshot->>'stable_key' like 'staging-qa-%'
   or target_account_id in (
     select id from public.giving_accounts where stable_key like 'staging-qa-%'
   );

delete from public.giving_accounts
where stable_key like 'staging-qa-%';

-- ---------------------------------------------------------------------------
-- Bootstrap verified seed destinations (exact values from giving.ts)
-- Idempotent on stable_key
-- ---------------------------------------------------------------------------
insert into public.giving_accounts (
  stable_key,
  label,
  description,
  country,
  bank_name,
  account_name,
  swift_bic,
  external_url,
  visitor_note,
  display_order,
  status,
  version
) values (
  'general-ecobank',
  'General Giving',
  'For tithes, offerings, and seed gifts to support the general ministry work.',
  null,
  'ECOBANK',
  'KINGDOM COVENANT MINISTRIES INTERNATIONAL',
  null,
  null,
  'Please title your payment description accordingly.',
  10,
  'published',
  1
)
on conflict (stable_key) do update
set
  label = excluded.label,
  description = excluded.description,
  country = excluded.country,
  bank_name = excluded.bank_name,
  account_name = excluded.account_name,
  swift_bic = excluded.swift_bic,
  external_url = excluded.external_url,
  visitor_note = excluded.visitor_note,
  display_order = excluded.display_order,
  status = excluded.status,
  version = 1,
  updated_at = now();

insert into public.giving_accounts (
  stable_key,
  label,
  description,
  country,
  bank_name,
  account_name,
  swift_bic,
  external_url,
  visitor_note,
  display_order,
  status,
  version
) values (
  'care-union',
  'Care Group Giving',
  'For welfare, prisoner, needy, and less-privileged support.',
  null,
  'UNION BANK',
  'KINGDOM COVENANT MINISTRIES INTERNATIONAL',
  null,
  null,
  'Please include "Care Group" in your payment description.',
  20,
  'published',
  1
)
on conflict (stable_key) do update
set
  label = excluded.label,
  description = excluded.description,
  country = excluded.country,
  bank_name = excluded.bank_name,
  account_name = excluded.account_name,
  swift_bic = excluded.swift_bic,
  external_url = excluded.external_url,
  visitor_note = excluded.visitor_note,
  display_order = excluded.display_order,
  status = excluded.status,
  version = 1,
  updated_at = now();

insert into public.giving_accounts (
  stable_key,
  label,
  description,
  country,
  bank_name,
  account_name,
  swift_bic,
  external_url,
  visitor_note,
  display_order,
  status,
  version
) values (
  'international-zenith',
  'International Giving',
  'For donations in foreign currencies (USD, GBP, EUR) from outside Nigeria.',
  null,
  'ZENITH BANK',
  'KINGDOM COVENANT MINISTRIES INTERNATIONAL',
  'ZEIBNGLA',
  null,
  'Please title your payment description accordingly.',
  30,
  'published',
  1
)
on conflict (stable_key) do update
set
  label = excluded.label,
  description = excluded.description,
  country = excluded.country,
  bank_name = excluded.bank_name,
  account_name = excluded.account_name,
  swift_bic = excluded.swift_bic,
  external_url = excluded.external_url,
  visitor_note = excluded.visitor_note,
  display_order = excluded.display_order,
  status = excluded.status,
  version = 1,
  updated_at = now();

-- Replace numbers for bootstrapped accounts (exact seed)
delete from public.giving_account_numbers n
using public.giving_accounts a
where n.giving_account_id = a.id
  and a.stable_key in ('general-ecobank', 'care-union', 'international-zenith');

insert into public.giving_account_numbers (giving_account_id, currency, account_number, display_order)
select a.id, 'NGN', '1602002211', 0
from public.giving_accounts a where a.stable_key = 'general-ecobank';

insert into public.giving_account_numbers (giving_account_id, currency, account_number, display_order)
select a.id, 'NGN', '0055484937', 0
from public.giving_accounts a where a.stable_key = 'care-union';

insert into public.giving_account_numbers (giving_account_id, currency, account_number, display_order)
select a.id, v.currency, v.account_number, v.display_order
from public.giving_accounts a
cross join (
  values
    ('USD', '5074346861', 0),
    ('GBP', '5061372275', 1),
    ('EUR', '5081098025', 2)
) as v(currency, account_number, display_order)
where a.stable_key = 'international-zenith';

-- Provenance audit (no fake maker/checker actors)
insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
values (
  null,
  'giving.bootstrap.seed',
  'giving_accounts',
  'seed:giving.ts',
  jsonb_build_object(
    'source', 'platform/src/content/seed/giving.ts',
    'human_reconfirmed', true,
    'maker_checker', false,
    'reason', 'Baseline migration of already-public human-reconfirmed destinations',
    'stable_keys', jsonb_build_array(
      'general-ecobank',
      'care-union',
      'international-zenith'
    ),
    'synthetic_qa_removed', true
  )
);

comment on table public.giving_accounts is
  'Giving destinations under dual-approval governance. Initial rows bootstrapped from verified seed (giving.ts); future changes require maker/checker. Public /giving reads published rows only.';
