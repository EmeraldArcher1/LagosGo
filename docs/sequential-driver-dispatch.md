# LagosGo sequential driver dispatch

## Flow
1. A passenger creates a ride request and a pending passenger fare offer through the existing secure ride-request RPC.
2. The Vercel cron invokes `GET /api/dispatch/run` every minute using `Authorization: Bearer <LAGOSGO_DISPATCH_CRON_SECRET>`.
3. The worker selects requested rides with a live passenger fare offer, filters approved online drivers with approved vehicles, fresh GPS (under three minutes), no active ride and a pickup radius no greater than 5 km.
4. Google Routes API `computeRouteMatrix` supplies traffic-aware road ETAs. Candidates above 25 minutes or without a route are excluded.
5. The existing 55/15/15/10/5 scorer ranks candidates. One driver receives a 90-second offer at a time; a driver already tried for that ride is not offered it again.
6. The driver polls `lagosgo_list_my_dispatch_offers`, then accepts or declines using `lagosgo_respond_to_dispatch_offer`.
7. Acceptance locks the ride row, verifies the driver and passenger fare, assigns the driver, confirms the fare and closes competing offers in one transaction.

## Score inputs and current limitations
- ETA is traffic-aware road ETA from Google Routes.
- Fairness currently uses recent dispatch exposure (fewer recent offers scores higher).
- No driver rating or completion-reliability dataset is currently present in the schema. Until those datasets exist, quality and reliability use neutral midpoint priors (3/5 and 0.5). Direction uses a neutral 0.5 because driver heading is not collected. These are explicit neutral priors, not claimed measured ratings.
- The current route candidate cap is 25 per ride and 20 rides per worker invocation.

## Required Vercel environment variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose to browser)
- `GOOGLE_MAPS_SERVER_KEY` (server-only, Routes API enabled)
- `LAGOSGO_DISPATCH_CRON_SECRET` (long random secret)

The Supabase migration must be applied to the confirmed LagosGo project before this worker can operate. Add the cron secret and verify the other server-only environment variables in the Vercel project before enabling production cron execution.

## Safety boundaries
- The worker only creates a time-limited offer; it does not auto-accept or auto-charge.
- Driver acceptance is atomic and server-validated. Competing offers are closed after acceptance.
- If no driver qualifies, the ride remains requested; this worker does not fabricate an ETA or silently assign a driver.
- Push notifications are not configured in the current project. Driver clients must poll the authenticated offers RPC while online; push can be added once durable device subscriptions are implemented.
- Do not treat this as production-ready until migration, environment configuration, staging acceptance tests and driver UI integration are complete.
