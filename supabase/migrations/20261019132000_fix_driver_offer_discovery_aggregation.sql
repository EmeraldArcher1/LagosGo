create or replace function public.lagosgo_list_driver_offers(p_radius_km double precision default 5)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid:=auth.uid(); v_lat double precision; v_lng double precision; v_result jsonb;
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='28000'; end if;
  if not exists(select 1 from public.profiles p where p.id=v_uid and p.role='driver') then raise exception 'driver_account_required' using errcode='42501'; end if;
  if p_radius_km is null or p_radius_km<1 or p_radius_km>5 then raise exception 'invalid_radius' using errcode='22023'; end if;
  select d.last_location_latitude,d.last_location_longitude into v_lat,v_lng from public.driver_profiles d
  where d.user_id=v_uid and d.review_status='approved' and d.is_online=true and d.location_updated_at>now()-interval '3 minutes';
  if v_lat is null or v_lng is null then raise exception 'driver_location_stale_or_offline' using errcode='55000'; end if;
  if not exists(select 1 from public.vehicles v where v.driver_user_id=v_uid and v.review_status='approved') then raise exception 'vehicle_not_approved' using errcode='42501'; end if;
  if exists(select 1 from public.rides r where r.driver_user_id=v_uid and r.status in ('accepted','driver_en_route','arrived','in_progress')) then
    return jsonb_build_object('offers','[]'::jsonb,'radius_km',p_radius_km,'generated_at',now(),'reason','driver_has_active_trip');
  end if;
  select coalesce(jsonb_agg(to_jsonb(candidate) order by candidate.distance_km asc,candidate.created_at asc),'[]'::jsonb) into v_result
  from (
    select scored.* from (
      select r.id as ride_id,o.id as offer_id,r.pickup_label,r.pickup_latitude,r.pickup_longitude,
        r.destination_label,r.destination_latitude,r.destination_longitude,o.amount_kobo,o.created_at,
        round((6371 * acos(least(1,greatest(-1,
          cos(radians(v_lat))*cos(radians(r.pickup_latitude))*cos(radians(r.pickup_longitude)-radians(v_lng))
          +sin(radians(v_lat))*sin(radians(r.pickup_latitude))
        ))))::numeric,2) as distance_km
      from public.rides r join public.ride_fare_offers o on o.ride_id=r.id
      where r.status='requested' and r.driver_user_id is null and o.status='pending' and o.expires_at>now() and o.offered_by=r.passenger_user_id
    ) scored
    where scored.distance_km<=p_radius_km
    order by scored.distance_km asc,scored.created_at asc
    limit 25
  ) candidate;
  return jsonb_build_object('offers',v_result,'radius_km',p_radius_km,'generated_at',now());
end;
$$;
revoke all on function public.lagosgo_list_driver_offers(double precision) from public,anon;
grant execute on function public.lagosgo_list_driver_offers(double precision) to authenticated;