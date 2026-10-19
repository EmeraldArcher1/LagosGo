-- LagosGo competitive mobility foundation: negotiated fares, fleets, service types and safety reports.
-- Monetary amounts are integer kobo. Offer/assignment/payment writes must go through trusted server handlers.
create type public.ride_service_type as enum ('city_ride', 'airport_transfer', 'intercity', 'parcel_delivery', 'business_delivery');
alter table public.rides add column service_type public.ride_service_type not null default 'city_ride';
alter table public.rides add column payment_method text not null default 'cash'
  check (payment_method in ('cash','bank_transfer','card','wallet'));

create table public.ride_fare_offers (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  offered_by uuid not null references public.profiles(id) on delete restrict,
  amount_kobo bigint not null check (amount_kobo > 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  status text not null default 'pending' check (status in ('pending','accepted','countered','declined','expired','withdrawn')),
  parent_offer_id uuid references public.ride_fare_offers(id) on delete set null,
  note text check (note is null or length(note) <= 240),
  expires_at timestamptz not null default (now() + interval '2 minutes'),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
create index ride_fare_offers_ride_recent_idx on public.ride_fare_offers (ride_id, created_at desc);
create index ride_fare_offers_pending_expiry_idx on public.ride_fare_offers (expires_at) where status = 'pending';

create table public.fleet_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  business_registration text,
  status text not null default 'pending' check (status in ('pending','approved','suspended')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.fleet_memberships (
  fleet_id uuid not null references public.fleet_accounts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null check (member_role in ('owner','manager','dispatcher','finance','driver')),
  status text not null default 'invited' check (status in ('invited','active','revoked')),
  created_at timestamptz not null default now(),
  primary key (fleet_id, user_id)
);
create table public.fleet_vehicle_assignments (
  fleet_id uuid not null references public.fleet_accounts(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (fleet_id, vehicle_id)
);
create table public.safety_incidents (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid references public.rides(id) on delete set null,
  reporter_user_id uuid not null references public.profiles(id) on delete restrict,
  incident_type text not null check (incident_type in ('emergency','unsafe_driving','harassment','payment_dispute','route_concern','other')),
  severity text not null default 'standard' check (severity in ('standard','urgent','critical')),
  description text not null check (length(trim(description)) between 1 and 4000),
  status text not null default 'open' check (status in ('open','under_review','resolved','closed')),
  trusted_contact_notified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index safety_incidents_open_idx on public.safety_incidents (status, severity, created_at) where status in ('open','under_review');

alter table public.ride_fare_offers enable row level security;
create policy "participants read ride fare offers" on public.ride_fare_offers for select to authenticated using (exists (
  select 1 from public.rides r where r.id = ride_fare_offers.ride_id
  and (r.passenger_user_id = (select auth.uid()) or r.driver_user_id = (select auth.uid()))
));
-- No client-side offer mutations: trusted server functions validate offers and use service-role access.

alter table public.fleet_accounts enable row level security;
alter table public.fleet_memberships enable row level security;
alter table public.fleet_vehicle_assignments enable row level security;
create policy "active fleet members read fleet account" on public.fleet_accounts for select to authenticated using (exists (
  select 1 from public.fleet_memberships m where m.fleet_id = fleet_accounts.id and m.user_id = (select auth.uid()) and m.status = 'active'
));
create policy "members read own fleet memberships" on public.fleet_memberships for select to authenticated using (
  user_id = (select auth.uid()) or exists (
    select 1 from public.fleet_memberships m where m.fleet_id = fleet_memberships.fleet_id and m.user_id = (select auth.uid())
    and m.status = 'active' and m.member_role in ('owner','manager')
  )
);
create policy "fleet members read assigned vehicles" on public.fleet_vehicle_assignments for select to authenticated using (exists (
  select 1 from public.fleet_memberships m where m.fleet_id = fleet_vehicle_assignments.fleet_id and m.user_id = (select auth.uid()) and m.status = 'active'
));
-- Fleet writes and membership changes are restricted to trusted server/admin operations.

alter table public.safety_incidents enable row level security;
create policy "reporter reads own safety reports" on public.safety_incidents for select to authenticated using (reporter_user_id = (select auth.uid()));
-- Incident creation, triage and status changes require authenticated server workflows and a staffed response process.

create trigger fleet_accounts_set_updated_at before update on public.fleet_accounts for each row execute function public.set_updated_at();
create trigger safety_incidents_set_updated_at before update on public.safety_incidents for each row execute function public.set_updated_at();

comment on table public.ride_fare_offers is 'Negotiated fare offers and counter-offers. Server validates guardrails, expiry, eligibility and atomic acceptance.';
comment on table public.fleet_accounts is 'Fleet operator accounts; approval and membership changes require trusted server/admin workflows.';
comment on table public.safety_incidents is 'Private safety/support reports. This table alone is not a staffed emergency response service.';
