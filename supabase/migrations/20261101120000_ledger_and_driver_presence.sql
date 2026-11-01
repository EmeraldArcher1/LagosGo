-- LagosGo financial ledger and driver-presence foundation.
-- Review-only feature-branch migration. Do not apply to production until the
-- existing Supabase migration failure is diagnosed and a disposable branch is available.
-- No payment provider integration, fare policy, payout, realtime publication or public access is enabled here.

begin;

-- Financial records are deliberately isolated from the exposed public schema.
create schema if not exists private;

create table if not exists private.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  account_code text not null,
  account_name text not null check (length(btrim(account_name)) between 2 and 120),
  account_class text not null check (account_class in ('asset','liability','equity','revenue','expense')),
  account_scope text not null default 'system' check (account_scope in ('system','user')),
  owner_user_id uuid references public.profiles(id) on delete restrict,
  currency char(3) not null default 'NGN' check (currency='NGN'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint ledger_account_scope_owner_check check (
    (account_scope='system' and owner_user_id is null)
    or (account_scope='user' and owner_user_id is not null)
  )
);
create unique index if not exists ledger_accounts_system_code_uidx
  on private.ledger_accounts(account_code) where account_scope='system';
create unique index if not exists ledger_accounts_user_code_uidx
  on private.ledger_accounts(owner_user_id,account_code) where account_scope='user';

create table if not exists private.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (length(btrim(idempotency_key)) between 8 and 200),
  transaction_type text not null check (transaction_type in (
    'ride_collection','cash_fee_accrual','driver_payout','platform_fee',
    'refund','adjustment','incentive','provider_settlement','reversal'
  )),
  source_type text not null check (length(btrim(source_type)) between 2 and 80),
  source_id text not null check (length(btrim(source_id)) between 1 and 200),
  ride_id uuid references public.rides(id) on delete restrict,
  provider text check (provider is null or provider in ('paystack','flutterwave','cash','internal')),
  provider_reference text,
  reversal_of_transaction_id uuid references private.ledger_transactions(id) on delete restrict,
  currency char(3) not null default 'NGN' check (currency='NGN'),
  status text not null default 'draft' check (status in ('draft','posted')),
  description text check (description is null or length(description)<=500),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  constraint ledger_reversal_not_self check (
    reversal_of_transaction_id is null or reversal_of_transaction_id<>id
  ),
  constraint ledger_posted_timestamp_check check (
    (status='draft' and posted_at is null) or (status='posted' and posted_at is not null)
  )
);
create unique index if not exists ledger_one_reversal_per_transaction_uidx
  on private.ledger_transactions(reversal_of_transaction_id)
  where reversal_of_transaction_id is not null;
create index if not exists ledger_transactions_ride_recent_idx
  on private.ledger_transactions(ride_id,created_at desc) where ride_id is not null;
create index if not exists ledger_transactions_provider_reference_idx
  on private.ledger_transactions(provider,provider_reference)
  where provider_reference is not null;

create table if not exists private.ledger_entries (
  id bigint generated always as identity primary key,
  transaction_id uuid not null references private.ledger_transactions(id) on delete restrict,
  account_id uuid not null references private.ledger_accounts(id) on delete restrict,
  debit_kobo bigint not null default 0 check (debit_kobo>=0),
  credit_kobo bigint not null default 0 check (credit_kobo>=0),
  memo text check (memo is null or length(memo)<=240),
  created_at timestamptz not null default now(),
  constraint ledger_entry_one_sided_amount check (
    (debit_kobo>0 and credit_kobo=0) or (credit_kobo>0 and debit_kobo=0)
  )
);
create index if not exists ledger_entries_transaction_idx
  on private.ledger_entries(transaction_id);
create index if not exists ledger_entries_account_recent_idx
  on private.ledger_entries(account_id,created_at desc);

-- Provider event inbox gives future webhook handlers a durable idempotency boundary.
-- Signature verification must happen in the trusted server handler before insertion.
create table if not exists private.payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('paystack','flutterwave')),
  provider_event_id text not null check (length(btrim(provider_event_id)) between 1 and 200),
  provider_reference text,
  event_type text not null check (length(btrim(event_type)) between 1 and 120),
  signature_verified_at timestamptz not null,
  processing_status text not null default 'received'
    check (processing_status in ('received','processing','processed','failed','review_required')),
  ledger_transaction_id uuid references private.ledger_transactions(id) on delete restrict,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_code text check (error_code is null or length(error_code)<=120),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  unique(provider,provider_event_id)
);
create index if not exists payment_provider_events_review_idx
  on private.payment_provider_events(received_at)
  where processing_status in ('failed','review_required');

-- Prevent edits to journal lines once their parent transaction is posted.
create or replace function private.lagosgo_guard_posted_ledger_entry()
returns trigger
language plpgsql
set search_path=''
as $$
declare
  v_transaction_id uuid;
  v_status text;
begin
  if tg_op='DELETE' then
    v_transaction_id:=old.transaction_id;
  else
    v_transaction_id:=new.transaction_id;
  end if;

  select t.status into v_status
  from private.ledger_transactions t
  where t.id=v_transaction_id
  for update;

  if v_status is null then
    raise exception 'ledger_transaction_not_found' using errcode='23503';
  end if;
  if v_status<>'draft' then
    raise exception 'posted_ledger_entries_are_immutable' using errcode='55000';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists ledger_entries_guard_posted on private.ledger_entries;
create trigger ledger_entries_guard_posted
before insert or update or delete on private.ledger_entries
for each row execute function private.lagosgo_guard_posted_ledger_entry();

-- Deferred balance check permits a journal to be assembled within one transaction,
-- but rejects commit unless every posted journal has at least two balanced lines.
create or replace function private.lagosgo_assert_ledger_transaction_balanced()
returns trigger
language plpgsql
set search_path=''
as $$
declare
  v_transaction_id uuid;
  v_status text;
  v_count bigint;
  v_debits numeric;
  v_credits numeric;
begin
  if tg_table_name='ledger_transactions' then
    v_transaction_id:=new.id;
  elsif tg_op='DELETE' then
    v_transaction_id:=old.transaction_id;
  else
    v_transaction_id:=new.transaction_id;
  end if;

  select t.status into v_status
  from private.ledger_transactions t
  where t.id=v_transaction_id;

  if v_status='posted' then
    select count(*),coalesce(sum(e.debit_kobo),0),coalesce(sum(e.credit_kobo),0)
      into v_count,v_debits,v_credits
    from private.ledger_entries e
    where e.transaction_id=v_transaction_id;

    if v_count<2 or v_debits<=0 or v_debits<>v_credits then
      raise exception 'ledger_transaction_not_balanced'
        using errcode='23514',
        detail=format('transaction=%s entries=%s debits=%s credits=%s',
          v_transaction_id,v_count,v_debits,v_credits);
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists ledger_entries_balance_check on private.ledger_entries;
create constraint trigger ledger_entries_balance_check
after insert or update or delete on private.ledger_entries
deferrable initially deferred
for each row execute function private.lagosgo_assert_ledger_transaction_balanced();

drop trigger if exists ledger_transactions_balance_check on private.ledger_transactions;
create constraint trigger ledger_transactions_balance_check
after insert or update of status on private.ledger_transactions
deferrable initially deferred
for each row execute function private.lagosgo_assert_ledger_transaction_balanced();

-- Once posted, transaction header data is immutable. Corrections use a new
-- linked reversal/adjustment transaction rather than rewriting history.
create or replace function private.lagosgo_guard_posted_ledger_transaction()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if old.status='posted' then
    raise exception 'posted_ledger_transactions_are_immutable'
      using errcode='55000';
  end if;
  if new.status='posted' and new.posted_at is null then
    new.posted_at:=now();
  end if;
  return new;
end;
$$;

drop trigger if exists ledger_transactions_guard_immutable on private.ledger_transactions;
create trigger ledger_transactions_guard_immutable
before update or delete on private.ledger_transactions
for each row execute function private.lagosgo_guard_posted_ledger_transaction();

-- Ephemeral latest driver location. The server owns writes; clients receive
-- only explicitly scoped data through a future authenticated RPC.
create table if not exists private.driver_presence (
  driver_user_id uuid primary key references public.driver_profiles(user_id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_meters numeric(7,2) not null check (accuracy_meters between 0 and 50),
  heading_degrees numeric(6,2) check (heading_degrees is null or heading_degrees>=0 and heading_degrees<360),
  speed_meters_per_second numeric(7,2) check (
    speed_meters_per_second is null or speed_meters_per_second between 0 and 80
  ),
  active_ride_id uuid references public.rides(id) on delete set null,
  recorded_at timestamptz not null,
  received_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint driver_presence_expiry_check check (expires_at>received_at)
);
create index if not exists driver_presence_expiry_idx
  on private.driver_presence(expires_at);
create index if not exists driver_presence_active_ride_idx
  on private.driver_presence(active_ride_id) where active_ride_id is not null;

-- Downsampled, quality-filtered trip trace. Raw high-frequency GPS should not
-- be retained here; server ingestion should reject accuracy >50m and speed jumps.
create table if not exists private.driver_location_samples (
  id bigint generated always as identity primary key,
  driver_user_id uuid not null references public.driver_profiles(user_id) on delete cascade,
  ride_id uuid not null references public.rides(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_meters numeric(7,2) not null check (accuracy_meters between 0 and 50),
  heading_degrees numeric(6,2) check (heading_degrees is null or heading_degrees>=0 and heading_degrees<360),
  speed_meters_per_second numeric(7,2) check (
    speed_meters_per_second is null or speed_meters_per_second between 0 and 80
  ),
  recorded_at timestamptz not null,
  received_at timestamptz not null default now()
);
create index if not exists driver_location_samples_ride_time_idx
  on private.driver_location_samples(ride_id,recorded_at);
create index if not exists driver_location_samples_driver_time_idx
  on private.driver_location_samples(driver_user_id,recorded_at desc);

-- Service-role maintenance task. Schedule externally/with pg_cron only after
-- the operational schedule and retention policy are approved.
create or replace function private.lagosgo_prune_expired_presence()
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_presence_deleted bigint;
  v_samples_deleted bigint;
begin
  delete from private.driver_presence where expires_at<=now();
  get diagnostics v_presence_deleted=row_count;

  delete from private.driver_location_samples
  where received_at<now()-interval '90 days';
  get diagnostics v_samples_deleted=row_count;

  return jsonb_build_object(
    'presence_deleted',v_presence_deleted,
    'location_samples_deleted',v_samples_deleted,
    'retention_days',90,
    'pruned_at',now()
  );
end;
$$;

-- Defence in depth: no browser role can read or write financial or precise-location tables.
alter table private.ledger_accounts enable row level security;
alter table private.ledger_transactions enable row level security;
alter table private.ledger_entries enable row level security;
alter table private.payment_provider_events enable row level security;
alter table private.driver_presence enable row level security;
alter table private.driver_location_samples enable row level security;

revoke all on private.ledger_accounts,private.ledger_transactions,
  private.ledger_entries,private.payment_provider_events,
  private.driver_presence,private.driver_location_samples
  from public,anon,authenticated;

grant usage on schema private to service_role;
grant all on private.ledger_accounts,private.ledger_transactions,
  private.ledger_entries,private.payment_provider_events,
  private.driver_presence,private.driver_location_samples
  to service_role;
grant execute on function private.lagosgo_prune_expired_presence() to service_role;

revoke all on function private.lagosgo_guard_posted_ledger_entry() from public,anon,authenticated;
revoke all on function private.lagosgo_assert_ledger_transaction_balanced() from public,anon,authenticated;
revoke all on function private.lagosgo_guard_posted_ledger_transaction() from public,anon,authenticated;
revoke all on function private.lagosgo_prune_expired_presence() from public,anon,authenticated;

comment on schema private is 'LagosGo server-only operational and financial records; never expose directly through the client Data API.';
comment on table private.ledger_accounts is 'NGN chart-of-accounts foundation. Balances are derived from immutable posted ledger entries.';
comment on table private.ledger_transactions is 'Idempotent journal headers. Posted records are immutable; corrections use linked reversal/adjustment journals.';
comment on table private.ledger_entries is 'Double-entry journal lines in integer kobo. Deferred constraint triggers enforce at least two balanced lines before commit.';
comment on table private.payment_provider_events is 'Signature-verified Paystack/Flutterwave webhook inbox; provider event IDs are unique for idempotent processing.';
comment on table private.driver_presence is 'Short-lived latest driver GPS snapshot. Server-only access; expires_at must be maintained by the ingestion service.';
comment on table private.driver_location_samples is 'Quality-filtered, downsampled ride GPS trace. Maintenance function deletes samples older than 90 days.';
comment on function private.lagosgo_prune_expired_presence() is 'Service-role maintenance routine for expired live presence and 90-day location trace retention.';

commit;
