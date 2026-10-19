-- Enforce eligibility and proximity even if a client invokes RPCs directly.
create or replace function public.lagosgo_guard_driver_fare_offer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_ride public.rides%rowtype; v_driver public.driver_profiles%rowtype; v_distance double precision;
begin
  select r.* into v_ride from public.rides r where r.id=new.ride_id;
  if not found then raise exception 'ride_not_found' using errcode='P0002'; end if;
  if exists(select 1 from public.profiles p where p.id=new.offered_by and p.role='driver') then
    select d.* into v_driver from public.driver_profiles d where d.user_id=new.offered_by;
    if not found or v_driver.review_status<>'approved' or not v_driver.is_online
      or v_driver.location_updated_at is null or v_driver.location_updated_at<=now()-interval '3 minutes'
      or not exists(select 1 from public.vehicles v where v.driver_user_id=new.offered_by and v.review_status='approved') then
      raise exception 'driver_not_eligible' using errcode='42501';
    end if;
    v_distance:=6371*acos(least(1,greatest(-1,
      cos(radians(v_driver.last_location_latitude))*cos(radians(v_ride.pickup_latitude))*cos(radians(v_ride.pickup_longitude)-radians(v_driver.last_location_longitude))
      +sin(radians(v_driver.last_location_latitude))*sin(radians(v_ride.pickup_latitude))
    )));
    if v_distance>5 then raise exception 'ride_outside_driver_radius' using errcode='42501'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.lagosgo_guard_ride_driver_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_driver public.driver_profiles%rowtype; v_distance double precision; v_has_offer boolean;
begin
  if new.driver_user_id is not null and old.driver_user_id is null then
    select d.* into v_driver from public.driver_profiles d where d.user_id=new.driver_user_id;
    if not found or v_driver.review_status<>'approved' or not v_driver.is_online
      or v_driver.location_updated_at is null or v_driver.location_updated_at<=now()-interval '3 minutes'
      or not exists(select 1 from public.profiles p where p.id=new.driver_user_id and p.role='driver')
      or not exists(select 1 from public.vehicles v where v.driver_user_id=new.driver_user_id and v.review_status='approved') then
      raise exception 'driver_not_eligible' using errcode='42501';
    end if;
    v_distance:=6371*acos(least(1,greatest(-1,
      cos(radians(v_driver.last_location_latitude))*cos(radians(new.pickup_latitude))*cos(radians(new.pickup_longitude)-radians(v_driver.last_location_longitude))
      +sin(radians(v_driver.last_location_latitude))*sin(radians(new.pickup_latitude))
    )));
    if v_distance>5 then raise exception 'ride_outside_driver_radius' using errcode='42501'; end if;
    if exists(select 1 from public.rides r where r.driver_user_id=new.driver_user_id and r.id<>new.id and r.status in ('accepted','driver_en_route','arrived','in_progress')) then
      raise exception 'driver_already_assigned' using errcode='55000';
    end if;
    select exists(select 1 from public.ride_fare_offers o where o.ride_id=new.id and o.offered_by=new.driver_user_id and o.status='pending' and o.expires_at>now()) into v_has_offer;
    if not v_has_offer and auth.uid() is distinct from new.driver_user_id then
      raise exception 'driver_offer_required_for_passenger_acceptance' using errcode='42501';
    end if;
    if auth.uid() is distinct from new.driver_user_id and auth.uid() is distinct from new.passenger_user_id then
      raise exception 'ride_assignment_actor_not_participant' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists lagosgo_guard_driver_fare_offer on public.ride_fare_offers;
create trigger lagosgo_guard_driver_fare_offer before insert on public.ride_fare_offers
for each row execute function public.lagosgo_guard_driver_fare_offer();

drop trigger if exists lagosgo_guard_ride_driver_assignment on public.rides;
create trigger lagosgo_guard_ride_driver_assignment before update of driver_user_id on public.rides
for each row execute function public.lagosgo_guard_ride_driver_assignment();

revoke all on function public.lagosgo_guard_driver_fare_offer() from public,anon,authenticated;
revoke all on function public.lagosgo_guard_ride_driver_assignment() from public,anon,authenticated;
comment on function public.lagosgo_guard_driver_fare_offer() is 'Enforces approved, online, fresh-location driver eligibility and 5 km radius on driver fare offers.';
comment on function public.lagosgo_guard_ride_driver_assignment() is 'Enforces approved driver/vehicle, 5 km radius, active-trip exclusivity and participant actor on ride assignment.';
