-- Keep existing ride-start flows working until a pickup PIN has been issued.
-- Once a challenge exists, only the assigned driver can start after successful verification.
create or replace function private.lagosgo_require_verified_pickup_pin()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if old.status is distinct from new.status
    and new.status = 'in_progress'
    and exists (
      select 1 from public.ride_pickup_pin_challenges c
      where c.ride_id = new.id
    )
    and not exists (
      select 1 from public.ride_pickup_pin_challenges c
      where c.ride_id = new.id
        and c.verified_at is not null
        and c.expires_at > now()
    )
  then
    raise exception 'pickup_pin_verification_required' using errcode = '42501';
  end if;
  return new;
end;
$$;
