-- LagosGo payment foundation. Apply only to the confirmed LagosGo Supabase project.
-- Amounts are integer NGN kobo. Gateway secrets must remain server-side.
create type public.payment_provider as enum ('paystack', 'flutterwave');
create type public.payment_collection_status as enum ('created', 'pending', 'succeeded', 'failed', 'cancelled', 'refunded_partial', 'refunded_full', 'disputed');
create type public.driver_payout_status as enum ('not_eligible', 'queued', 'processing', 'paid', 'failed', 'reversed', 'needs_review');

create table public.payment_collections (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id),
  passenger_user_id uuid not null references public.profiles(id),
  provider public.payment_provider not null,
  provider_reference text not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  driver_payable_kobo bigint not null check (driver_payable_kobo >= 0),
  platform_revenue_kobo bigint not null check (platform_revenue_kobo >= 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  status public.payment_collection_status not null default 'created',
  idempotency_key text not null,
  gateway_transaction_id text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference),
  unique (passenger_user_id, idempotency_key),
  constraint payment_allocation_equals_gross check (driver_payable_kobo + platform_revenue_kobo = amount_kobo)
);

create table public.payment_webhook_events (
  id bigint generated always as identity primary key,
  provider public.payment_provider not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  verified_transaction jsonb,
  signature_verified boolean not null default false check (signature_verified),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique (provider, event_id)
);

create table public.payment_ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid references public.rides(id),
  provider public.payment_provider,
  source_reference text,
  idempotency_key text not null unique,
  kind text not null check (kind in ('collection', 'refund', 'driver_payout', 'gateway_fee', 'adjustment', 'reversal')),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  created_at timestamptz not null default now()
);

create table public.payment_ledger_entries (
  id bigint generated always as identity primary key,
  transaction_id uuid not null references public.payment_ledger_transactions(id),
  account text not null check (account in ('gateway_clearing', 'driver_payable', 'platform_revenue', 'gateway_fee_expense', 'refund_payable', 'adjustment', 'cash_reserve')),
  direction text not null check (direction in ('debit', 'credit')),
  amount_kobo bigint not null check (amount_kobo > 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  created_at timestamptz not null default now()
);

create table public.driver_payout_instructions (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id),
  driver_user_id uuid not null references public.driver_profiles(user_id),
  provider public.payment_provider not null,
  beneficiary_reference text not null,
  provider_reference text,
  amount_kobo bigint not null check (amount_kobo > 0),
  status public.driver_payout_status not null default 'not_eligible',
  idempotency_key text not null unique,
  failure_code text,
  provider_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table public.payment_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  provider public.payment_provider not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  local_count integer not null default 0,
  gateway_count integer not null default 0,
  discrepancy_count integer not null default 0,
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (window_end > window_start)
);

create index payment_collections_ride_idx on public.payment_collections(ride_id, created_at desc);
create index payment_webhook_pending_idx on public.payment_webhook_events(received_at) where processed_at is null;
create index payout_driver_recent_idx on public.driver_payout_instructions(driver_user_id, created_at desc);
create index ledger_entries_transaction_idx on public.payment_ledger_entries(transaction_id);

alter table public.payment_collections enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.payment_ledger_transactions enable row level security;
alter table public.payment_ledger_entries enable row level security;
alter table public.driver_payout_instructions enable row level security;
alter table public.payment_reconciliation_runs enable row level security;

revoke all on public.payment_collections, public.payment_webhook_events,
  public.payment_ledger_transactions, public.payment_ledger_entries,
  public.driver_payout_instructions, public.payment_reconciliation_runs
from anon, authenticated;

grant select on public.payment_collections to authenticated;
create policy payment_collections_passenger_read on public.payment_collections
for select to authenticated using (passenger_user_id = (select auth.uid()));

grant select on public.driver_payout_instructions to authenticated;
create policy driver_payouts_driver_read on public.driver_payout_instructions
for select to authenticated using (driver_user_id = (select auth.uid()));

grant all on public.payment_collections, public.payment_webhook_events,
  public.payment_ledger_transactions, public.payment_ledger_entries,
  public.driver_payout_instructions, public.payment_reconciliation_runs to service_role;
grant usage, select on sequence public.payment_webhook_events_id_seq,
  public.payment_ledger_entries_id_seq to service_role;

create trigger payment_collections_set_updated_at before update on public.payment_collections
for each row execute function public.set_updated_at();
create trigger payout_instructions_set_updated_at before update on public.driver_payout_instructions
for each row execute function public.set_updated_at();


-- Atomically apply a verified successful collection to ride payment state and the double-entry ledger.
-- The endpoint first verifies the provider API response and stores the signed webhook inbox row.
create or replace function public.process_payment_webhook(p_provider public.payment_provider, p_event_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.payment_webhook_events%rowtype;
  v_collection public.payment_collections%rowtype;
  v_verified jsonb;
  v_ledger_id uuid;
  v_reference text;
  v_amount bigint;
  v_currency text;
begin
  select * into v_event
  from public.payment_webhook_events
  where provider = p_provider and event_id = p_event_id
  for update;

  if not found then
    raise exception 'verified webhook event not found' using errcode = 'P0002';
  end if;

  if v_event.signature_verified is not true then
    raise exception 'webhook signature not verified' using errcode = '42501';
  end if;

  if v_event.processed_at is not null then
    return jsonb_build_object('processed', true, 'duplicate', true);
  end if;

  v_verified := v_event.verified_transaction;
  if v_verified is null or v_verified ->> 'status' <> 'succeeded' then
    update public.payment_webhook_events set processed_at = now(), processing_error = null
    where id = v_event.id;
    return jsonb_build_object('processed', true, 'payment_applied', false);
  end if;

  v_reference := v_verified ->> 'reference';
  v_amount := (v_verified ->> 'amountKobo')::bigint;
  v_currency := v_verified ->> 'currency';

  if coalesce(v_reference, '') = '' or v_amount <= 0 or v_currency <> 'NGN' then
    raise exception 'verified payment data invalid' using errcode = '22023';
  end if;

  select * into v_collection
  from public.payment_collections
  where provider = p_provider and provider_reference = v_reference
  for update;

  if not found then
    raise exception 'payment collection not found for verified reference' using errcode = 'P0002';
  end if;

  if v_collection.amount_kobo <> v_amount or v_collection.currency <> v_currency then
    raise exception 'verified payment amount or currency mismatch' using errcode = '22023';
  end if;

  if v_collection.status = 'succeeded' then
    update public.payment_webhook_events set processed_at = now(), processing_error = null
    where id = v_event.id;
    return jsonb_build_object('processed', true, 'duplicate', true);
  end if;

  update public.payment_collections
  set status = 'succeeded',
      gateway_transaction_id = coalesce(v_verified ->> 'gatewayTransactionId', gateway_transaction_id),
      verified_at = now(),
      updated_at = now()
  where id = v_collection.id;

  insert into public.payment_ledger_transactions
    (ride_id, provider, source_reference, idempotency_key, kind, currency)
  values
    (v_collection.ride_id, p_provider, v_reference, 'collection:' || p_provider::text || ':' || v_reference, 'collection', 'NGN')
  on conflict (idempotency_key) do nothing
  returning id into v_ledger_id;

  if v_ledger_id is not null then
    insert into public.payment_ledger_entries (transaction_id, account, direction, amount_kobo, currency)
    values (v_ledger_id, 'gateway_clearing', 'debit', v_collection.amount_kobo, 'NGN');

    if v_collection.driver_payable_kobo > 0 then
      insert into public.payment_ledger_entries (transaction_id, account, direction, amount_kobo, currency)
      values (v_ledger_id, 'driver_payable', 'credit', v_collection.driver_payable_kobo, 'NGN');
    end if;

    if v_collection.platform_revenue_kobo > 0 then
      insert into public.payment_ledger_entries (transaction_id, account, direction, amount_kobo, currency)
      values (v_ledger_id, 'platform_revenue', 'credit', v_collection.platform_revenue_kobo, 'NGN');
    end if;
  end if;

  update public.payment_webhook_events set processed_at = now(), processing_error = null
  where id = v_event.id;

  return jsonb_build_object('processed', true, 'payment_applied', true, 'collection_id', v_collection.id);
end;
$$;

revoke all on function public.process_payment_webhook(public.payment_provider, text) from public, anon, authenticated;
grant execute on function public.process_payment_webhook(public.payment_provider, text) to service_role;
