-- LagosGo secure ride request, fare negotiation and lifecycle RPCs.
-- All mutations are server-validated; authenticated clients must not write protected tables directly.

create or replace function public.lagosgo_request_ride(
  p_pickup_label text, p_pickup_latitude double precision, p_pickup_longitude double precision,
  p_destination_label text, p_destination_latitude double precision, p_destination_longitude double precision,
  p_initial_offer_kobo bigint, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_ride_id uuid; v_offer_id uuid;
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='28000'; end if;
  if not exists(select 1 from public.profiles p where p.id=v_uid and p.role='passenger') then raise exception 'passenger_account_required' using errcode='42501'; end if;
  if length(trim(coalesce(p_pickup_label,'')))<2 or length(trim(coalesce(p_destination_label,'')))<2 or length(p_pickup_label)>240 or length(p_destination_label)>240 then raise exception 'invalid_location_label' using errcode='22023'; end if;
  if p_pickup_latitude is null or p_pickup_longitude is null or p_destination_latitude is null or p_destination_longitude is null
     or p_pickup_latitude not between -90 and 90 or p_destination_latitude not between -90 and 90
     or p_pickup_longitude not between -180 and 180 or p_destination_longitude not between -180 and 180 then raise exception 'invalid_coordinates' using errcode='22023'; end if;
  if p_initial_offer_kobo is null or p_initial_offer_kobo<100000 or p_initial_offer_kobo>10000000 then
    raise exception 'offer_outside_guardrails' using errcode='22023', detail='Initial offers must be between NGN 1,000 and NGN 100,000. This is an absolute safety bound, not a route-based quote.';
  end if;
  if length(trim(coalesce(p_idempotency_key,'')))<12 or length(p_idempotency_key)>120 then raise exception 'invalid_idempotency_key' using errcode='22023'; end if;
  insert into public.rides(passenger_user_id,status,pickup_label,pickup_latitude,pickup_longitude,destination_label,destination_latitude,destination_longitude,idempotency_key)
    values(v_uid,'requested',trim(p_pickup_label),p_pickup_latitude,p_pickup_longitude,trim(p_destination_label),p_destination_latitude,p_destination_longitude,p_idempotency_key)
    on conflict(passenger_user_id,idempotency_key) do nothing returning id into v_ride_id;
  if v_ride_id is null then
    select r.id into v_ride_id from public.rides r where r.passenger_user_id=v_uid and r.idempotency_key=p_idempotency_key;
    if v_ride_id is null then raise exception 'idempotency_conflict' using errcode='23505'; end if;
    select o.id into v_offer_id from public.ride_fare_offers o where o.ride_id=v_ride_id and o.offered_by=v_uid order by o.created_at asc limit 1;
    return jsonb_build_object('ride_id',v_ride_id,'offer_id',v_offer_id,'replayed',true,'status','requested');
  end if;
  insert into public.ride_events(ride_id,actor_user_id,event_type,to_status,details) values(v_ride_id,v_uid,'ride_requested','requested',jsonb_build_object('source','passenger_app'));
  insert into public.ride_fare_offers(ride_id,offered_by,amount_kobo,status,expires_at) values(v_ride_id,v_uid,p_initial_offer_kobo,'pending',now()+interval '2 minutes') returning id into v_offer_id;
  insert into public.ride_events(ride_id,actor_user_id,event_type,details) values(v_ride_id,v_uid,'fare_offer_created',jsonb_build_object('offer_id',v_offer_id,'amount_kobo',p_initial_offer_kobo));
  return jsonb_build_object('ride_id',v_ride_id,'offer_id',v_offer_id,'replayed',false,'status','requested');
end;
$$;

create or replace function public.lagosgo_respond_to_fare_offer(p_offer_id uuid,p_action text,p_counter_amount_kobo bigint default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid:=auth.uid(); v_offer public.ride_fare_offers%rowtype; v_ride public.rides%rowtype; v_role public.lagosgo_user_role; v_new_offer_id uuid; v_assigned_driver uuid;
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='28000'; end if;
  if p_action not in ('accept','decline','counter') then raise exception 'invalid_action' using errcode='22023'; end if;
  select o.* into v_offer from public.ride_fare_offers o where o.id=p_offer_id for update;
  if not found then raise exception 'offer_not_found' using errcode='P0002'; end if;
  select r.* into v_ride from public.rides r where r.id=v_offer.ride_id for update;
  if not found then raise exception 'ride_not_found' using errcode='P0002'; end if;
  select p.role into v_role from public.profiles p where p.id=v_uid;
  if v_role is null then raise exception 'profile_required' using errcode='42501'; end if;
  if v_ride.status<>'requested' then raise exception 'ride_not_negotiable' using errcode='55000'; end if;
  if v_offer.status<>'pending' or v_offer.expires_at<=now() then
    update public.ride_fare_offers set status='expired',responded_at=now() where id=p_offer_id and status='pending' and expires_at<=now();
    raise exception 'offer_expired_or_closed' using errcode='55000';
  end if;
  if (p_action in ('decline','counter') and v_offer.offered_by=v_uid) then raise exception 'cannot_respond_to_own_offer' using errcode='42501'; end if;
  if v_uid<>v_ride.passenger_user_id and not (
    v_role='driver' and exists(select 1 from public.driver_profiles d where d.user_id=v_uid and d.review_status='approved' and d.is_online=true and d.location_updated_at>now()-interval '3 minutes')
    and exists(select 1 from public.vehicles v where v.driver_user_id=v_uid and v.review_status='approved')
  ) then raise exception 'not_authorized_for_ride' using errcode='42501'; end if;

  if p_action='decline' then
    update public.ride_fare_offers set status='declined',responded_at=now() where id=p_offer_id;
    insert into public.ride_events(ride_id,actor_user_id,event_type,details) values(v_ride.id,v_uid,'fare_offer_declined',jsonb_build_object('offer_id',p_offer_id));
    return jsonb_build_object('ok',true,'action','declined','ride_id',v_ride.id);
  end if;
  if p_action='counter' then
    if p_counter_amount_kobo is null or p_counter_amount_kobo<100000 or p_counter_amount_kobo>10000000 then raise exception 'offer_outside_guardrails' using errcode='22023',detail='Counter-offers must be between NGN 1,000 and NGN 100,000; this is not a route-based quote.'; end if;
    update public.ride_fare_offers set status='countered',responded_at=now() where id=p_offer_id;
    insert into public.ride_fare_offers(ride_id,offered_by,amount_kobo,status,parent_offer_id,expires_at) values(v_ride.id,v_uid,p_counter_amount_kobo,'pending',p_offer_id,now()+interval '2 minutes') returning id into v_new_offer_id;
    insert into public.ride_events(ride_id,actor_user_id,event_type,details) values(v_ride.id,v_uid,'fare_counter_offer_created',jsonb_build_object('offer_id',v_new_offer_id,'parent_offer_id',p_offer_id,'amount_kobo',p_counter_amount_kobo));
    return jsonb_build_object('ok',true,'action','countered','ride_id',v_ride.id,'offer_id',v_new_offer_id);
  end if;

  if v_role='passenger' then
    if v_uid<>v_ride.passenger_user_id or v_offer.offered_by=v_uid then raise exception 'passenger_mismatch' using errcode='42501'; end if;
    v_assigned_driver:=v_offer.offered_by;
    if not exists(select 1 from public.driver_profiles d where d.user_id=v_assigned_driver and d.review_status='approved' and d.is_online=true and d.location_updated_at>now()-interval '3 minutes')
      or not exists(select 1 from public.vehicles v where v.driver_user_id=v_assigned_driver and v.review_status='approved') then raise exception 'driver_not_eligible' using errcode='55000'; end if;
  elsif v_role='driver' then
    if v_offer.offered_by<>v_ride.passenger_user_id then raise exception 'driver_can_only_accept_passenger_offer' using errcode='42501'; end if;
    v_assigned_driver:=v_uid;
    if not exists(select 1 from public.driver_profiles d where d.user_id=v_uid and d.review_status='approved' and d.is_online=true and d.location_updated_at>now()-interval '3 minutes')
      or not exists(select 1 from public.vehicles v where v.driver_user_id=v_uid and v.review_status='approved') then raise exception 'driver_not_eligible' using errcode='55000'; end if;
  else raise exception 'role_cannot_accept_fare' using errcode='42501';
  end if;
  if exists(select 1 from public.rides r where r.driver_user_id=v_assigned_driver and r.status in ('accepted','driver_en_route','arrived','in_progress') and r.id<>v_ride.id) then raise exception 'driver_already_assigned' using errcode='55000'; end if;
  update public.rides set driver_user_id=v_assigned_driver,status='accepted',confirmed_fare_kobo=v_offer.amount_kobo,accepted_at=now() where id=v_ride.id and status='requested';
  if not found then raise exception 'ride_already_assigned' using errcode='55000'; end if;
  update public.ride_fare_offers set status='accepted',responded_at=now() where id=p_offer_id;
  update public.ride_fare_offers set status='declined',responded_at=now() where ride_id=v_ride.id and id<>p_offer_id and status='pending';
  insert into public.ride_events(ride_id,actor_user_id,event_type,from_status,to_status,details)
    values(v_ride.id,v_uid,'ride_accepted','requested','accepted',jsonb_build_object('offer_id',p_offer_id,'confirmed_fare_kobo',v_offer.amount_kobo,'driver_user_id',v_assigned_driver));
  return jsonb_build_object('ok',true,'action','accepted','ride_id',v_ride.id,'confirmed_fare_kobo',v_offer.amount_kobo,'driver_user_id',v_assigned_driver);
end;
$$;

create or replace function public.lagosgo_set_driver_presence(p_is_online boolean,p_latitude double precision,p_longitude double precision)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='28000'; end if;
  if not exists(select 1 from public.profiles p where p.id=v_uid and p.role='driver') then raise exception 'driver_account_required' using errcode='42501'; end if;
  if p_latitude is null or p_longitude is null or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'invalid_coordinates' using errcode='22023'; end if;
  if p_is_online and (not exists(select 1 from public.driver_profiles d where d.user_id=v_uid and d.review_status='approved')
    or not exists(select 1 from public.vehicles v where v.driver_user_id=v_uid and v.review_status='approved')) then raise exception 'driver_or_vehicle_not_approved' using errcode='42501'; end if;
  update public.driver_profiles set is_online=p_is_online,last_location_latitude=p_latitude,last_location_longitude=p_longitude,location_updated_at=now(),updated_at=now() where user_id=v_uid;
  if not found then raise exception 'driver_profile_not_found' using errcode='P0002'; end if;
  return jsonb_build_object('ok',true,'is_online',p_is_online,'location_updated_at',now());
end;
$$;

create or replace function public.lagosgo_advance_ride(p_ride_id uuid,p_next_status text,p_reason text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid:=auth.uid(); v_ride public.rides%rowtype; v_next public.ride_status;
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='28000'; end if;
  begin v_next:=p_next_status::public.ride_status; exception when others then raise exception 'invalid_ride_status' using errcode='22023'; end;
  select r.* into v_ride from public.rides r where r.id=p_ride_id for update;
  if not found then raise exception 'ride_not_found' using errcode='P0002'; end if;
  if v_uid=v_ride.passenger_user_id then
    if v_next<>'cancelled' or v_ride.status not in ('requested','accepted') then raise exception 'passenger_transition_not_allowed' using errcode='42501'; end if;
  elsif v_uid=v_ride.driver_user_id then
    if not ((v_ride.status='accepted' and v_next='driver_en_route') or (v_ride.status='driver_en_route' and v_next='arrived') or (v_ride.status='arrived' and v_next='in_progress') or (v_ride.status='in_progress' and v_next='completed') or (v_ride.status in ('accepted','driver_en_route','arrived') and v_next='cancelled')) then raise exception 'driver_transition_not_allowed' using errcode='42501'; end if;
  else raise exception 'not_a_ride_participant' using errcode='42501';
  end if;
  update public.rides set status=v_next,
    arrived_at=case when v_next='arrived' then now() else arrived_at end,
    started_at=case when v_next='in_progress' then now() else started_at end,
    completed_at=case when v_next='completed' then now() else completed_at end,
    cancelled_at=case when v_next='cancelled' then now() else cancelled_at end,
    cancellation_reason=case when v_next='cancelled' then left(coalesce(p_reason,'Cancelled by participant'),240) else cancellation_reason end
    where id=p_ride_id;
  insert into public.ride_events(ride_id,actor_user_id,event_type,from_status,to_status,details)
    values(p_ride_id,v_uid,'ride_status_changed',v_ride.status,v_next,jsonb_build_object('reason',left(coalesce(p_reason,''),240)));
  return jsonb_build_object('ok',true,'ride_id',p_ride_id,'status',v_next);
end;
$$;

revoke update on table public.profiles from authenticated;
revoke update on table public.driver_profiles from authenticated;
revoke update on table public.vehicles from authenticated;
revoke insert,update,delete on table public.rides from authenticated;
revoke insert,update,delete on table public.ride_fare_offers from authenticated;
revoke insert,update,delete on table public.ride_events from authenticated;
revoke insert,update,delete on table public.safety_incidents from authenticated;

revoke all on function public.lagosgo_request_ride(text,double precision,double precision,text,double precision,double precision,bigint,text) from public,anon;
grant execute on function public.lagosgo_request_ride(text,double precision,double precision,text,double precision,double precision,bigint,text) to authenticated;
revoke all on function public.lagosgo_respond_to_fare_offer(uuid,text,bigint) from public,anon;
grant execute on function public.lagosgo_respond_to_fare_offer(uuid,text,bigint) to authenticated;
revoke all on function public.lagosgo_set_driver_presence(boolean,double precision,double precision) from public,anon;
grant execute on function public.lagosgo_set_driver_presence(boolean,double precision,double precision) to authenticated;
revoke all on function public.lagosgo_advance_ride(uuid,text,text) from public,anon;
grant execute on function public.lagosgo_advance_ride(uuid,text,text) to authenticated;

comment on function public.lagosgo_request_ride(text,double precision,double precision,text,double precision,double precision,bigint,text) is 'Authenticated atomic ride request and initial fare offer. Absolute offer bounds only; no route-based fare quote.';
comment on function public.lagosgo_respond_to_fare_offer(uuid,text,bigint) is 'Authenticated atomic accept/decline/counter flow with approved-driver checks.';
comment on function public.lagosgo_set_driver_presence(boolean,double precision,double precision) is 'Driver presence update requiring server-approved driver and vehicle records.';
comment on function public.lagosgo_advance_ride(uuid,text,text) is 'Enforces participant-only, ordered ride lifecycle transitions.';
