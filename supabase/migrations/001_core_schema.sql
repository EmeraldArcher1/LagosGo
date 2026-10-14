-- LagosGo core schema, migration 001
-- Apply through Supabase SQL Editor or Supabase CLI after creating the project.
-- All money amounts are integer kobo. Never trust client-supplied fare or driver identity.

create extension if not exists pgcrypto;

create type public.lagosgo_user_role as enum ('passenger', 'driver', 'admin');
create type public.driver_review_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.ride_status as enum (
  'requested', 'accepted', 'driver_en_route', 'arrived',
  'in_progress', 'completed', 'cancelled', 'no_driver'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.lagosgo_user_role not null default 'passenger',
  display_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.driver_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  review_status public.driver_review_status not null default 'pending',
  is_online boolean not null default false,
  last_location_latitude double precision,
  last_location_longitude double precision,
  location_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_latitude_range check (
    last_location_latitude is null or last_location_latitude between -90 and 90
  ),
  constraint driver_longitude_range check (
    last_location_longitude is null or last_location_longitude between -180 and 180
  ),
  constraint driver_location_pair check (
    (last_location_latitude is null and last_location_longitude is null)
    or (last_location_latitude is not null and last_location_longitude is not null)
  )
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  driver_user_id uuid not null references public.driver_profiles(user_id) on delete cascade,
  make text not null,
  model text not null,
  model_year integer,
  colour text not null,
  registration_number text not null,
  review_status public.driver_review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_year_range check (model_year is null or model_year between 1980 and 2100),
  constraint vehicle_registration_nonempty check (length(trim(registration_number)) > 0)
);

create unique index vehicles_registration_normalized_uq
  on public.vehicles (upper(regexp_replace(registration_number, '\\s+', '', 'g')));

create table public.rides (
  id uuid primary key default gen_random_uuid(),
  passenger_user_id uuid not null references public.profiles(id),
  driver_user_id uuid references public.driver_profiles(user_id),
  status public.ride_status not null default 'requested',
  pickup_label text not null,
  pickup_latitude double precision not null,
  pickup_longitude double precision not null,
  destination_label text not null,
  destination_latitude double precision not null,
  destination_longitude double precision not null,
  currency char(3) not null default 'NGN',
  estimated_fare_kobo bigint,
  confirmed_fare_kobo bigint,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ride_pickup_latitude_range check (pickup_latitude between -90 and 90),
  constraint ride_pickup_longitude_range check (pickup_longitude between -180 and 180),
  constraint ride_destination_latitude_range check (destination_latitude between -90 and 90),
  constraint ride_destination_longitude_range check (destination_longitude between -180 and 180),
  constraint ride_fare_nonnegative check (
    (estimated_fare_kobo is null or estimated_fare_kobo >= 0)
    and (confirmed_fare_kobo is null or confirmed_fare_kobo >= 0)
  ),
  constraint ride_currency_ngn check (currency = 'NGN'),
  constraint ride_idempotency_per_passenger unique (passenger_user_id, idempotency_key)
);

create index rides_passenger_recent_idx on public.rides (passenger_user_id, requested_at desc);
create index rides_driver_status_idx on public.rides (driver_user_id, status, requested_at desc);
create index rides_dispatch_queue_idx on public.rides (status, requested_at) where status = 'requested';

create table public.ride_events (
  id bigint generated always as identity primary key,
  ride_id uuid not null references public.rides(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  from_status public.ride_status,
  to_status public.ride_status,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index ride_events_ride_timeline_idx on public.ride_events (ride_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger driver_profiles_set_updated_at before update on public.driver_profiles
for each row execute function public.set_updated_at();
create trigger vehicles_set_updated_at before update on public.vehicles
for each row execute function public.set_updated_at();
create trigger rides_set_updated_at before update on public.rides
for each row execute function public.set_updated_at();

-- New sign-ups always begin as passengers. Driver/admin privileges are never taken from user metadata.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    'passenger',
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Ride events are generated by database triggers, not directly by client input.
create or replace function public.record_ride_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
begin
  v_actor := auth.uid();

  if tg_op = 'INSERT' then
    insert into public.ride_events (ride_id, actor_user_id, event_type, to_status)
    values (new.id, v_actor, 'ride_created', new.status);
    return new;
  end if;

  if new.status is distinct from old.status or new.driver_user_id is distinct from old.driver_user_id then
    insert into public.ride_events (ride_id, actor_user_id, event_type, from_status, to_status, details)
    values (
      new.id,
      v_actor,
      case
        when new.status is distinct from old.status then 'status_changed'
        else 'driver_assigned'
      end,
      old.status,
      new.status,
      jsonb_build_object('driver_changed', new.driver_user_id is distinct from old.driver_user_id)
    );
  end if;
  return new;
end;
$$;

create trigger rides_record_event
after insert or update on public.rides
for each row execute function public.record_ride_event();

-- Prevent clients from changing a ride's identity, ownership, price, or lifecycle directly.
create or replace function public.guard_ride_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;
  raise exception 'ride changes must go through an authorized server operation'
    using errcode = '42501';
end;
$$;

create trigger rides_guard_client_mutation
before insert or update or delete on public.rides
for each row execute function public.guard_ride_mutation();

alter table public.profiles enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.rides enable row level security;
alter table public.ride_events enable row level security;

create policy "profiles_select_self" on public.profiles
for select to authenticated using (id = (select auth.uid()));

create policy "profiles_update_self" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "driver_profiles_select_self" on public.driver_profiles
for select to authenticated using (user_id = (select auth.uid()));

create policy "driver_profiles_insert_self" on public.driver_profiles
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'driver'
  )
);

create policy "driver_profiles_update_self" on public.driver_profiles
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "vehicles_select_owner" on public.vehicles
for select to authenticated using (driver_user_id = (select auth.uid()));

create policy "vehicles_insert_owner" on public.vehicles
for insert to authenticated
with check (
  driver_user_id = (select auth.uid())
  and exists (
    select 1 from public.driver_profiles d
    where d.user_id = (select auth.uid())
  )
);

create policy "vehicles_update_owner" on public.vehicles
for update to authenticated
using (driver_user_id = (select auth.uid()))
with check (driver_user_id = (select auth.uid()));

create policy "rides_select_participant" on public.rides
for select to authenticated
using (
  passenger_user_id = (select auth.uid())
  or driver_user_id = (select auth.uid())
);

create policy "ride_events_select_participant" on public.ride_events
for select to authenticated
using (
  exists (
    select 1 from public.rides r
    where r.id = ride_events.ride_id
      and (r.passenger_user_id = (select auth.uid()) or r.driver_user_id = (select auth.uid()))
  )
);

-- Explicit grants: a user cannot promote themselves, approve themselves, or alter fares.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, phone) on public.profiles to authenticated;

revoke all on public.driver_profiles from anon, authenticated;
grant select, insert on public.driver_profiles to authenticated;
grant update (is_online, last_location_latitude, last_location_longitude, location_updated_at)
  on public.driver_profiles to authenticated;

revoke all on public.vehicles from anon, authenticated;
grant select, insert on public.vehicles to authenticated;
grant update (make, model, model_year, colour, registration_number) on public.vehicles to authenticated;

revoke all on public.rides from anon, authenticated;
grant select on public.rides to authenticated;

revoke all on public.ride_events from anon, authenticated;
grant select on public.ride_events to authenticated;

-- Service-role writes are used only by trusted server endpoints; never expose this key to a browser.
grant all on public.profiles, public.driver_profiles, public.vehicles, public.rides, public.ride_events to service_role;
grant usage, select on sequence public.ride_events_id_seq to service_role;
