# LagosGo preview deployment recovery — 1 November 2026

**Scope:** PR #20, `feature/ride-safety-dispatch-foundation`  
**Status:** Diagnostic snapshot; preview deployment remains blocked.  
**Safety boundary:** This runbook does not authorise a merge, production deployment, production setting change, billing change, public-booking activation or Supabase migration.

## Verified repository state

- Repository: `EmeraldArcher1/LagosGo`
- Pull request: #20 (open, draft, unmerged)
- Branch head at review: `9b4ea9263c695bd7f69828dfc5871df1256aee26`
- GitHub Actions on that head: LagosGo checks and Quality checks both completed successfully.
- Keep all follow-up commits on the feature branch. Do not force-push or merge as part of preview recovery.

## Vercel diagnosis

Project: `lagosgo` (`prj_J29sdcffYekzZ6D5yOrx7bbgnBiI`).

The latest deployment inspected during this review was for older commit `e7219dacc9250a5063c2bea068f0c0f839ad8a5a`, not the current PR head. Vercel reported:

- State: `ERROR`
- Error code: `BUILD_FAILED`
- Error message: `Resource provisioning failed`
- Build event endpoint returned no events for that deployment.
- GitHub's Vercel status contexts reported build-rate-limit failures.

These signals do not establish a source-code compilation failure. Treat the current incident as a Vercel deployment/resource or quota problem until a fresh deployment provides actionable build logs. Do not repeatedly retry or create duplicate projects to work around a provider limit.

Vercel's published Hobby limits include 100 deployments per day and 32 builds per hour. Confirm the team's current usage and the exact refusal returned by Vercel before scheduling a retry.

## Preview environment prerequisites

The project environment-variable inventory was checked without decrypting values. The following required worker keys were not present in that inventory:

- `GOOGLE_MAPS_SERVER_KEY`
- `LAGOSGO_DISPATCH_CRON_SECRET`

The dispatch workflow also expects these GitHub Actions repository secrets:

- `LAGOSGO_DISPATCH_URL`
- `LAGOSGO_DISPATCH_CRON_SECRET`

Configure secrets only through the appropriate Vercel/GitHub secret-management interfaces. Never commit values, print them in CI logs, or copy them into this document. The dispatch URL must be an HTTPS endpoint reachable by GitHub Actions; a preview protected by SSO is not a suitable scheduler target unless an explicitly approved access path is configured.

The dispatch worker also needs the server-side Supabase URL and service-role key. Keep service-role credentials server-only and never expose them to browser bundles.

## Recovery sequence

1. Check Vercel project/team usage and the latest deployment status without creating another deployment.
2. When Vercel permits a build, deploy the exact current feature-branch head and capture its build logs.
3. If the build reaches READY, verify its Git SHA equals the intended branch head; a READY deployment of an older SHA is not validation of this branch.
4. Add the missing preview-only server configuration and GitHub scheduler secrets through their secret-management UIs, after confirming the endpoint and access model. Do not alter production targets as part of preview setup.
5. Manually invoke the scheduler only against a non-production preview endpoint after configuration is complete. Confirm authentication, expected 503 behavior when dependencies are absent, and no duplicate offer creation.
6. Run passenger and driver acceptance tests on the preview deployment. Keep public bookings disabled until separately approved.

## Supabase boundary

Project `kzbzbkxeuaxyjmenbgaf` remains untouched by this recovery. Its migration status was reported as `MIGRATIONS_FAILED`; the ledger and driver-presence migration `20261101120000_ledger_and_driver_presence.sql` has not been applied. Diagnose migration history and validate that migration in a disposable database before any production application is considered.

## Release guardrails

- Do not merge PR #20.
- Do not apply or repair production migrations.
- Do not enable public bookings, payments, payouts, or automated location-retention jobs.
- Do not change Vercel plan, billing, production environment variables, deployment protection, or domains.
- Do not report the preview as deployed until Vercel reports READY for the exact intended commit and smoke tests pass.
