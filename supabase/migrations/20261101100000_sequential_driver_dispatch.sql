-- LagosGo sequential driver dispatch foundation.
-- The cron worker uses service-role credentials; drivers interact only through authenticated RPCs.

create or replace function private.lagosgo_extend_passenger_offer_expiry()
returns trigger language plpgsql set search_path=''
as $
declare v_passenger uuid; v_ride_status public.ride_status;
begin
  select r.passenger_user_id,r.status into v_passenger,v_ride_status
    from public.rides r where r.id=new.ride_id;
  if v_ride_status='requested' and new.offered_by=v_passenger and new.status='pending' then
    new.expires_at:=greatest(coalesce(new.expires_at,now()),now()+interval '20 minutes');
  end if;
  return new;
end;
$;
drop trigger if exists ride_fare_offer_dispatch_expiry on public.ride_fare_offers;
create trigger ride_fare_offer_dispatch_expiry
before insert on public.ride_fare_offers
for each row execute function private.lagosgo_extend_passenger_offer_expiry();
revoke all on function private.lagosgo_extend_passenger_offer_expiry() from public,anon,authenticated;

create table if not exists public.ride_dispatch_offers (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  driver_user_id uuid not null references public.driver_profiles(user_id) on delete restrict,
  road_eta_seconds integer not null check (road_eta_seconds between 1 and 7200),
  route_distance_meters integer not null check (route_distance_meters between 1 and 200000),
  dispatch_score numeric(8,6) not null check (dispatch_score between 0 and 1),
  status text not null default 'offered' check (status in ('offered','accepted','declined','expired','superseded')),
  offered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ride_dispatch_offers_ride_recent_idx
  on public.ride_dispatch_offers(ride_id,created_at desc);
create index if not exists ride_dispatch_offers_driver_open_idx
  on public.ride_dispatch_offers(driver_user_id,expires_at)
  where status='offered';
create unique index if not exists ride_dispatch_one_open_offer_per_ride
  on public.ride_dispatch_offers(ride_id) where status='offered';

alter table public.ride_dispatch_offers enable row level security;
revoke all on public.ride_dispatch_offers from anon,authenticated;
grant all on public.ride_dispatch_offers to service_role;

create or replace function public.lagosgo_dispatch_create_offer(
  p_ride_id uuid,
  p_driver_user_id uuid,
  p_road_eta_seconds integer,
  p_route_distance_meters integer,
  p_dispatch_score numeric
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_ride public.rides%rowtype;
  v_driver public.driver_profiles%rowtype;
  v_offer_id uuid;
  v_existing public.ride_dispatch_offers%rowtype;
  v_attempt integer;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'service_role_required' using errcode='42501';
  end if;
  if p_road_eta_seconds is null or p_road_eta_seconds<1 or p_road_eta_seconds>7200
    or p_route_distance_meters is null or p_route_distance_meters<1 or p_route_distance_meters>200000
    or p_dispatch_score is null or p_dispatch_score<0 or p_dispatch_score>1 then
    raise exception 'invalid_dispatch_metrics' using errcode='22023';
  end if;

  select r.* into v_ride from public.rides r where r.id=p_ride_id for update;
  if not found then raise exception 'ride_not_found' using errcode='P0002'; end if;
  if v_ride.status<>'requested' or v_ride.driver_user_id is not null then
    return jsonb_build_object('created',false,'reason','ride_not_dispatchable');
  end if;

  select o.* into v_existing from public.ride_dispatch_offers o
    where o.ride_id=p_ride_id and o.status='offered' and o.expires_at>now()
    limit 1 for update;
  if found then return jsonb_build_object('created',false,'reason','offer_already_open','offer_id',v_existing.id); end if;

  update public.ride_dispatch_offers set status='expired',responded_at=coalesce(responded_at,now())
    where ride_id=p_ride_id and status='offered' and expires_at<=now();

  if exists(select 1 from public.ride_dispatch_offers o where o.ride_id=p_ride_id and o.driver_user_id=p_driver_user_id) then
    return jsonb_build_object('created',false,'reason','driver_already_attempted');
  end if;

  select d.* into v_driver from public.driver_profiles d
    where d.user_id=p_driver_user_id and d.review_status='approved' and d.is_online=true
      and d.location_updated_at>now()-interval '3 minutes'
    for update;
  if not found or v_driver.last_location_latitude is null or v_driver.last_location_longitude is null then
    return jsonb_build_object('created',false,'reason','driver_not_eligible');
  end if;
  if not exists(select 1 from public.profiles p where p.id=p_driver_user_id and p.role='driver')
    or not exists(select 1 from public.vehicles v where v.driver_user_id=p_driver_user_id and v.review_status='approved') then
    return jsonb_build_object('created',false,'reason','driver_or_vehicle_not_approved');
  end if;
  if exists(select 1 from public.rides r where r.driver_user_id=p_driver_user_id
    and r.status in ('accepted','driver_en_route','arrived','in_progress')) then
    return jsonb_build_object('created',false,'reason','driver_busy');
  end if;

  if not exists(select 1 from public.ride_fare_offers f where f.ride_id=p_ride_id
    and f.offered_by=v_ride.passenger_user_id and f.status='pending') then
    return jsonb_build_object('created',false,'reason','passenger_fare_offer_missing');
  end if;

  select count(*)+1 into v_attempt from public.ride_dispatch_offers where ride_id=p_ride_id;
  insert into public.ride_dispatch_offers(ride_id,driver_user_id,road_eta_seconds,route_distance_meters,dispatch_score,expires_at)
    values(p_ride_id,p_driver_user_id,p_road_eta_seconds,p_route_distance_meters,p_dispatch_score,now()+interval '90 seconds')
    returning id into v_offer_id;

  update public.ride_fare_offers set expires_at=greatest(expires_at,now()+interval '10 minutes')
    where ride_id=p_ride_id and offered_by=v_ride.passenger_user_id and status='pending';

  insert into public.ride_events(ride_id,actor_user_id,event_type,details)
    values(p_ride_id,null,'driver_dispatch_offer_sent',
      jsonb_build_object('dispatch_offer_id',v_offer_id,'attempt',v_attempt,'road_eta_seconds',p_road_eta_seconds,'route_distance_meters',p_route_distance_meters));

  return jsonb_build_object('created',true,'offer_id',v_offer_id,'expires_at',now()+interval '90 seconds','attempt',v_attempt);
end;
$$;

create or replace function public.lagosgo_list_my_dispatch_offers()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid(); v_result jsonb;
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='28000'; end if;
  if not exists(select 1 from public.profiles p where p.id=v_uid and p.role='driver') then
    raise exception 'driver_account_required' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'offer_id',o.id,'ride_id',r.id,'pickup_label',r.pickup_label,
    'pickup_latitude',r.pickup_latitude,'pickup_longitude',r.pickup_longitude,
    'destination_label',r.destination_label,'destination_latitude',r.destination_latitude,
    'destination_longitude',r.destination_longitude,'passenger_offer_kobo',f.amount_kobo,
    'road_eta_seconds',o.road_eta_seconds,'route_distance_meters',o.route_distance_meters,
    'expires_at',o.expires_at,'offered_at',o.offered_at
  ) order by o.offered_at desc),'[]'::jsonb) into v_result
  from public.ride_dispatch_offers o
  join public.rides r on r.id=o.ride_id
  join lateral (select x.amount_kobo from public.ride_fare_offers x
    where x.ride_id=r.id and x.offered_by=r.passenger_user_id and x.status='pending'
    order by x.created_at desc limit 1) f on true
  where o.driver_user_id=v_uid and o.status='offered' and o.expires_at>now()
    and r.status='requested' and r.driver_user_id is null;
  return jsonb_build_object('offers',v_result,'generated_at',now());
end;
$$;

create or replace function public.lagosgo_respond_to_dispatch_offer(p_offer_id uuid,p_action text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_offer public.ride_dispatch_offers%rowtype;
  v_ride public.rides%rowtype;
  v_fare public.ride_fare_offers%rowtype;
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='28000'; end if;
  if p_action not in ('accept','decline') then raise exception 'invalid_action' using errcode='22023'; end if;

  select r.* into v_ride from public.rides r
    join public.ride_dispatch_offers o on o.ride_id=r.id
    where o.id=p_offer_id for update of r;
  if not found then raise exception 'dispatch_offer_not_found' using errcode='P0002'; end if;
  select o.* into v_offer from public.ride_dispatch_offers o where o.id=p_offer_id for update;
  if v_offer.driver_user_id is distinct from v_uid then raise exception 'assigned_driver_only' using errcode='42501'; end if;
  if v_offer.status<>'offered' or v_offer.expires_at<=now() or v_ride.status<>'requested' or v_ride.driver_user_id is not null then
    update public.ride_dispatch_offers set status='expired',responded_at=now()
      where id=p_offer_id and status='offered' and expires_at<=now();
    raise exception 'dispatch_offer_expired_or_closed' using errcode='55000';
  end if;

  if p_action='decline' then
    update public.ride_dispatch_offers set status='declined',responded_at=now() where id=p_offer_id;
    insert into public.ride_events(ride_id,actor_user_id,event_type,details)
      values(v_ride.id,v_uid,'driver_dispatch_offer_declined',jsonb_build_object('dispatch_offer_id',p_offer_id));
    return jsonb_build_object('ok',true,'action','declined','ride_id',v_ride.id);
  end if;

  select f.* into v_fare from public.ride_fare_offers f
    where f.ride_id=v_ride.id and f.offered_by=v_ride.passenger_user_id and f.status='pending' and f.expires_at>now()
    order by f.created_at desc limit 1 for update;
  if not found then raise exception 'passenger_fare_offer_expired' using errcode='55000'; end if;

  update public.rides set driver_user_id=v_uid,status='accepted',
    confirmed_fare_kobo=v_fare.amount_kobo,accepted_at=now()
    where id=v_ride.id and status='requested' and driver_user_id is null;
  if not found then raise exception 'ride_already_assigned' using errcode='55000'; end if;

  update public.ride_dispatch_offers set status='accepted',responded_at=now() where id=p_offer_id;
  update public.ride_dispatch_offers set status='superseded',responded_at=now()
    where ride_id=v_ride.id and id<>p_offer_id and status='offered';
  update public.ride_fare_offers set status='accepted',responded_at=now() where id=v_fare.id;
  update public.ride_fare_offers set status='declined',responded_at=now()
    where ride_id=v_ride.id and id<>v_fare.id and status='pending';

  insert into public.ride_events(ride_id,actor_user_id,event_type,from_status,to_status,details)
    values(v_ride.id,v_uid,'ride_accepted_by_dispatch','requested','accepted',
      jsonb_build_object('dispatch_offer_id',p_offer_id,'confirmed_fare_kobo',v_fare.amount_kobo));
  return jsonb_build_object('ok',true,'action','accepted','ride_id',v_ride.id,
    'confirmed_fare_kobo',v_fare.amount_kobo,'status','accepted');
end;
$$;

revoke all on function public.lagosgo_dispatch_create_offer(uuid,uuid,integer,integer,numeric) from public,anon,authenticated;
grant execute on function public.lagosgo_dispatch_create_offer(uuid,uuid,integer,integer,numeric) to service_role;
revoke all on function public.lagosgo_list_my_dispatch_offers() from public,anon;
grant execute on function public.lagosgo_list_my_dispatch_offers() to authenticated;
revoke all on function public.lagosgo_respond_to_dispatch_offer(uuid,text) from public,anon;
grant execute on function public.lagosgo_respond_to_dispatch_offer(uuid,text) to authenticated;

comment on table public.ride_dispatch_offers is 'Sequential, time-limited driver dispatch offers. Passenger and driver identities are not exposed in the driver offer payload.';
comment on function public.lagosgo_dispatch_create_offer(uuid,uuid,integer,integer,numeric) is 'Service-role-only atomic creation of one active dispatch offer per ride.';
comment on function public.lagosgo_list_my_dispatch_offers() is 'Returns active dispatch offers belonging only to the authenticated driver.';
comment on function public.lagosgo_respond_to_dispatch_offer(uuid,text) is 'Driver-only atomic accept/decline for a dispatch offer; acceptance assigns the driver and locks the passenger fare.';
