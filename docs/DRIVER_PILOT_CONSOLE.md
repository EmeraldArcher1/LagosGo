# LagosGo driver pilot console

## Scope delivered in this branch

This is the first executable driver-side slice for the existing Supabase-backed prototype. It does not claim that LagosGo is ready for public ride operations.

### Included
- Dedicated `/driver.html` sign-in and driver console.
- Reads the authenticated user's role from `public.profiles`; does not trust editable user metadata.
- Requires an approved driver profile and at least one approved vehicle before enabling driver controls.
- Uses browser geolocation with explicit permission to update presence through `lagosgo_set_driver_presence`.
- Lists current nearby requests through `lagosgo_list_driver_offers`.
- Allows a verified driver to accept, decline, or counter a passenger fare through `lagosgo_respond_to_fare_offer`.
- Uses textContent/createElement for untrusted ride labels rather than injecting HTML.
- Refreshes offers every 20 seconds while online; includes manual refresh and sign-out.

### Explicit limitations
- The current database has zero rows in the inspected LagosGo public tables; no real pilot drivers or rides were present during the audit.
- Driver account creation, identity document upload/review, vehicle registration UI, and administrator approval UI are not included.
- The offer list uses the existing database function's straight-line distance, not traffic-aware road ETA. Do not present that distance as a pickup ETA.
- This console does not start or complete trips. The current lifecycle RPC does not implement a pickup PIN; a secure PIN migration and UI must be added before enabling trip start.
- Push notifications, payment collection, refunds, commission ledger, payouts, and staffed emergency escalation remain unimplemented.
- Keep the page restricted to approved pilot accounts. Do not advertise it as a public driver app.

## Verification

Run `npm test` in the repository. The existing test script checks JavaScript syntax and runs the Node test suite. Also verify on a real iPhone/Android device with an approved test driver and vehicle, geolocation permission enabled, and the configured Supabase project.

## Production safety

This branch intentionally does not apply database migrations, modify production Supabase data, change Vercel environment variables, or deploy to the production alias. Review the pull request and its Vercel Preview deployment first.
