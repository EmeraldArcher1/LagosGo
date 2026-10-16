# LagosGo Supabase setup

This guide prepares the PostgreSQL/auth foundation. It does not make ride bookings operational by itself.

## 1. Create the Supabase project

1. Open https://supabase.com/dashboard and sign in or create an account.
2. Choose **New project** and name it **LagosGo**.
3. Select a region close to your expected users if available, set a strong database password, and store it in a password manager.
4. Wait until the project is ready. Do not commit the database password or API keys to GitHub.

## 2. Apply the initial schema

1. In the Supabase project, open **SQL Editor** and create a new query.
2. Copy the complete contents of `supabase/migrations/001_core_schema.sql` from this repository.
3. Run it once in the new project and confirm it completes without errors.
4. In **Authentication → Providers**, enable the sign-in method intended for the pilot. For the first private test, email/password is sufficient; configure email confirmation and redirect URLs deliberately before inviting users.

The migration creates passenger profiles, driver verification records, vehicles, rides, and an append-only ride-event timeline. New accounts are passengers by default. Driver approval and ride writes must be performed by trusted server operations.

## 3. Configure Vercel after the project exists

The initial core schema has now been applied to the verified LagosGo project. The database migration list includes `lagosgo_core_schema` and `restrict_trigger_function_execution`. See [AUTH_SETUP.md](./AUTH_SETUP.md) for sign-in UI, protected API verification and required environment variables.

## 4. Configure Vercel only after the project exists

In **Vercel → LagosGo → Settings → Environment Variables**, add these to **Preview** first:

- `SUPABASE_URL`: the project's Project URL.
- `SUPABASE_ANON_KEY`: the publishable/anon key; safe to use in a browser only with correct RLS.
- `SUPABASE_SERVICE_ROLE_KEY`: the service-role secret for server-side handlers only. Never use a `NEXT_PUBLIC_` prefix, place it in `index.html` or `app.js`, or commit it to GitHub.

Add the same values to Production only after preview verification. Redeploy after changing variables. Do not paste keys into chat.

## 5. Important implementation boundary

The current LagosGo app is a static front end with Vercel API handlers. The SQL migration provides the data model and access controls; it does **not** yet provide the ride-request API, driver offer/accept RPC, authentication UI, or live dispatch. Those are the next code changes after the Supabase project is created and the migration is applied.

## 6. Pilot security checklist

- Keep the service-role key on the server only.
- Use a separate restricted Google Maps browser key and server key.
- Create driver/admin roles through a trusted administrative process, never through public signup metadata.
- Do not collect identity documents in the public interest form.
- Verify row-level policies with passenger, unapproved-driver, approved-driver, and admin test accounts before accepting real rides.
- Keep test accounts and test rides clearly marked until an invited pilot is approved.
