# LagosGo — Supabase Auth setup

This adds email/password signup and sign-in, a session-aware account page, and a protected server API route. It does not make ride dispatch or payments operational.

## Verified Supabase project

- Project ref: `kzbzbkxeuaxyjmenbgaf`
- Project URL: `https://kzbzbkxeuaxyjmenbgaf.supabase.co`
- Region: `eu-west-2`

The connected Supabase account reports this project as active and healthy. Before setup, its public schema had no tables and its migration list was empty.

## Apply database schema

Apply `supabase/migrations/001_core_schema.sql` to this project using the Supabase migration workflow. The migration creates profiles, driver verification, vehicles, rides and ride events, enables RLS, and gives new accounts the passenger role. Do not run it against a different project.

## Configure Vercel

In Vercel project settings, add the following environment variables to Preview first, then Production after verification:

- `SUPABASE_URL=https://kzbzbkxeuaxyjmenbgaf.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY` = the project's publishable key (`sb_publishable_...`), or use `SUPABASE_ANON_KEY` for a legacy anon key.

Only a publishable/anon key is used by the browser-facing auth client. Never add a `service_role` or secret key to browser code or these public config responses. No service-role key is required for the current sign-in flow.

Redeploy after setting variables. Keep Preview separate from Production until verified.

## Supabase Auth dashboard

1. Open Authentication → Providers and enable Email.
2. Configure email confirmation according to the pilot policy.
3. Under Authentication → URL Configuration, set the Site URL to the deployed LagosGo origin.
4. Add the exact Preview and Production origins you use to the allowed redirect URLs. Do not use a wildcard for unrelated domains.

## Routes

- `/auth.html`: signup and sign-in UI.
- `/account.html`: client session check; redirects signed-out visitors to sign-in.
- `/api/auth/config`: returns only the public project URL and publishable key.
- `/api/auth/me`: verifies the bearer token against Supabase Auth and reads the caller's profile through RLS.

A client-side page redirect is a usability feature, not a security boundary. Any future private data or ride API must call `getAuthenticatedUser` from `api/_lib/supabase-auth.js` and then enforce role/resource authorization on the server. Keep database RLS enabled.

## Smoke tests

1. Create a passenger test account.
2. If email confirmation is enabled, confirm the email and then sign in.
3. Open `/account.html` while signed in; verify the email, user ID and passenger role.
4. Open `/account.html` in a private browser session; it should redirect to `/auth.html`.
5. Call `GET /api/auth/me` without a bearer token; expect HTTP 401.
6. Call the same endpoint with a valid user access token; expect HTTP 200.
7. Confirm a normal user cannot change their own role or approve themselves.
8. Verify Preview before adding the same environment variables to Production.

## Limitations

This work adds the auth foundation only. It does not implement a complete ride request API, driver dispatch, payment processing, admin dashboard authorization or native app login.
