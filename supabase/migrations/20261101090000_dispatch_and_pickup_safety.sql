-- LagosGo dispatch ranking and trip-start safety controls.
-- Additive migration; does not enable public bookings or claim emergency response is staffed.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create table if not exists public.ride_pickup_pin_challenges (
  ride_id uuid primary key references public.rides(id) on delete cascade,
  pin_hash text not null, pin_salt uuid not null default gen_random_uuid(),
  attempts integer not null default 0 check (attempts between 0 and 5),
  expires_at timestamptz not null, verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.ride_pickup_pin_challenges enable row level security;
revoke all on public.ride_pickup_pin_challenges from anon, authenticated;
grant all on public.ride_pickup_pin_challenges to service_role;

create or replace function private.lagosgo_issue_pickup_pin_impl(p_ride_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid:=auth.uid(); v_ride public.rides%rowtype; v_pin text; v_salt uuid:=gen_random_uuid(); v_random bytea;
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='28000'; end if;
  select r.* into v_ride from public.rides r where r.id=p_ride_id for update;
  if not found then raise exception 'ride_not_found' using errcode='P0002'; end if;
  if v_uid<>v_ride.passenger_user_id then raise exception 'passenger_only' using errcode='42501'; end if;
  if v_ride.status not in ('accepted','driver_en_route','arrived') or v_ride.driver_user_id is null then
    raise exception 'ride_not_ready_for_pickup_pin' using errcode='55000';
  end if;
  if exists(select 1 from public.ride_pickup_pin_challenges c where c.ride_id=p_ride_id and c.verified_at is not null) then
    raise exception 'pickup_pin_already_verified' using errcode='55000';
  end if;
  v_random:=extensions.gen_random_bytes(2);
  v_pin:=lpad(((get_byte(v_random,0)*256+get_byte(v_random,1)) % 10000)::text,4,'0');
  insert into public.ride_pickup_pin_challenges(ride_id,pin_hash,pin_salt,attempts,expires_at,verified_at,created_at,updated_at)
  values(p_ride_id,encode(extensions.digest(v_pin || v_salt::text,'sha256'),'hex'),v_salt,0,now()+interval '30 minutes',null,now(),now())
  on conflict(ride_id) do update set pin_hash=excluded.pin_hash,pin_salt=excluded.pin_salt,
    attempts=0,expires_at=excluded.expires_at,verified_at=null,created_at=now(),updated_at=now();
  insert into public.ride_events(ride_id,actor_user_id,event_type,details)
  values(p_ride_id,v_uid,'pickup_pin_issued',jsonb_build_object('expires_at',now()+interval '30 minutes'));
  return jsonb_build_object('ride_id',p_ride_id,'pickup_pin',v_pin,'expires_in_seconds',1800);
end;
$$;

create or replace function private.lagosgo_verify_pickup_pin_impl(p_ride_id uuid,p_pin text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid:=auth.uid(); v_ride public.rides%rowtype; v_challenge public.ride_pickup_pin_challenges%rowtype;
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='28000'; end if;
  select r.* into v_ride from public.rides r where r.id=p_ride_id for update;
  if not found then raise exception 'ride_not_found' using errcode='P0002'; end if;
  if v_uid is distinct from v_ride.driver_user_id then raise exception 'assigned_driver_only' using errcode='42501'; end if;
  if v_ride.status<>'arrived' then raise exception 'driver_must_arrive_first' using errcode='55000'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then raise exception 'invalid_pin_format' using errcode='22023'; end if;
  select c.* into v_challenge from public.ride_pickup_pin_challenges c where c.ride_id=p_ride_id for update;
  if not found or v_challenge.expires_at<=now() then raise exception 'pickup_pin_missing_or_expired' using errcode='55000'; end if;
  if v_challenge.verified_at is not null then return jsonb_build_object('ok',true,'already_verified',true); end if;
  if v_challenge.attempts>=5 then raise exception 'pickup_pin_attempt_limit' using errcode='55000'; end if;
  if encode(extensions.digest(p_pin || v_challenge.pin_salt::text,'sha256'),'hex')<>v_challenge.pin_hash then
    update public.ride_pickup_pin_challenges set attempts=attempts+1,updated_at=now() where ride_id=p_ride_id;
    return jsonb_build_object('ok',false,'error','pickup_pin_incorrect','attempts_remaining',greatest(0,4-v_challenge.attempts));
  end if;
  update public.ride_pickup_pin_challenges set verified_at=now(),updated_at=now() where ride_id=p_ride_id;
  insert into public.ride_events(ride_id,actor_user_id,event_type,details)
  values(p_ride_id,v_uid,'pickup_pin_verified','{}'::jsonb);
  return jsonb_build_object('ok',true,'verified',true);
end;
$$;

create or replace function private.lagosgo_require_verified_pickup_pin()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if old.status is distinct from new.status and new.status='in_progress' and not exists (
    select 1 from public.ride_pickup_pin_challenges c
    where c.ride_id=new.id and c.verified_at is not null and c.expires_at>now()
  ) then raise exception 'pickup_pin_verification_required' using errcode='42501'; end if;
  return new;
end;
$$;
drop trigger if exists rides_require_verified_pickup_pin on public.rides;
create trigger rides_require_verified_pickup_pin before update of status on public.rides
for each row execute function private.lagosgo_require_verified_pickup_pin();

create or replace function private.lagosgo_report_safety_incident_impl(p_ride_id uuid,p_incident_type text,p_description text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid:=auth.uid(); v_incident_id uuid; v_severity text;
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='28000'; end if;
  if p_incident_type not in ('emergency','unsafe_driving','harassment','payment_dispute','route_concern','other') then
    raise exception 'invalid_incident_type' using errcode='22023'; end if;
  if length(trim(coalesce(p_description,'')))<1 or length(p_description)>4000 then
    raise exception 'invalid_incident_description' using errcode='22023'; end if;
  if p_ride_id is not null and not exists(select 1 from public.rides r where r.id=p_ride_id
    and (r.passenger_user_id=v_uid or r.driver_user_id=v_uid)) then
    raise exception 'not_a_ride_participant' using errcode='42501'; end if;
  v_severity:=case when p_incident_type='emergency' then 'critical' else 'standard' end;
  insert into public.safety_incidents(ride_id,reporter_user_id,incident_type,severity,description)
  values(p_ride_id,v_uid,p_incident_type,v_severity,left(trim(p_description),4000)) returning id into v_incident_id;
  if p_ride_id is not null then
    insert into public.ride_events(ride_id,actor_user_id,event_type,details)
    values(p_ride_id,v_uid,'safety_incident_reported',jsonb_build_object('incident_id',v_incident_id,'incident_type',p_incident_type,'severity',v_severity));
  end if;
  return jsonb_build_object('ok',true,'incident_id',v_incident_id,'severity',v_severity,'response_status','submitted_not_emergency_dispatch');
end;
$$;

create or replace function public.lagosgo_issue_pickup_pin(p_ride_id uuid)
returns jsonb language sql security invoker set search_path = ''
as $ select private.lagosgo_issue_pickup_pin_impl(p_ride_id); $;
create or replace function public.lagosgo_verify_pickup_pin(p_ride_id uuid,p_pin text)
returns jsonb language sql security invoker set search_path = ''
as $ select private.lagosgo_verify_pickup_pin_impl(p_ride_id,p_pin); $;
create or replace function public.lagosgo_report_safety_incident(p_ride_id uuid,p_incident_type text,p_description text)
returns jsonb language sql security invoker set search_path = ''
as $ select private.lagosgo_report_safety_incident_impl(p_ride_id,p_incident_type,p_description); $;

revoke all on function private.lagosgo_issue_pickup_pin_impl(uuid) from public,anon;
grant execute on function private.lagosgo_issue_pickup_pin_impl(uuid) to authenticated;
revoke all on function private.lagosgo_verify_pickup_pin_impl(uuid,text) from public,anon;
grant execute on function private.lagosgo_verify_pickup_pin_impl(uuid,text) to authenticated;
revoke all on function private.lagosgo_report_safety_incident_impl(uuid,text,text) from public,anon;
grant execute on function private.lagosgo_report_safety_incident_impl(uuid,text,text) to authenticated;
revoke all on function private.lagosgo_require_verified_pickup_pin() from public,anon,authenticated;

revoke all on function public.lagosgo_issue_pickup_pin(uuid) from public,anon;
grant execute on function public.lagosgo_issue_pickup_pin(uuid) to authenticated;
revoke all on function public.lagosgo_verify_pickup_pin(uuid,text) from public,anon;
grant execute on function public.lagosgo_verify_pickup_pin(uuid,text) to authenticated;
revoke all on function public.lagosgo_report_safety_incident(uuid,text,text) from public,anon;
grant execute on function public.lagosgo_report_safety_incident(uuid,text,text) to authenticated;
comment on table public.ride_pickup_pin_challenges is 'Short-lived hashed pickup PIN challenges. Raw PIN is returned only to the passenger when issued.';
comment on function public.lagosgo_report_safety_incident(uuid,text,text) is 'Authenticated participant incident intake; not a live emergency dispatch guarantee.';
