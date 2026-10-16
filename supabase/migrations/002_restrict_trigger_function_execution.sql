-- Trigger functions are invoked by PostgreSQL triggers, not through the public RPC API.
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.record_ride_event() from public, anon, authenticated;
