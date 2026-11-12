# LagosGo live trip sharing — product and security specification

Status: proposed implementation specification; not yet implemented or enabled.

## Product outcome
Let a passenger or assigned driver share a time-limited, read-only trip link with a trusted person. The recipient follows the trip in a mobile browser without installing LagosGo or creating an account. This adopts the useful shared-trip pattern demonstrated by inDrive while using original LagosGo UX, copy and implementation.

## Share journey
1. A ride participant opens the active-trip panel and taps **Share trip**.
2. LagosGo explains what the recipient can see and for how long.
3. The participant uses the iOS/Android share sheet, WhatsApp, SMS or copy-link action.
4. The recipient opens a responsive, no-login tracking page.
5. The page shows trip state, last location update, map position, route progress and ETA only when a reliable routing ETA is available.
6. Sharing ends automatically when the trip is completed/cancelled or the link expires. The participant can revoke it sooner.

## Recipient view
Show only what is needed to identify and follow the journey:
- Trip state: driver en route, arrived, in progress, completed or cancelled.
- Live vehicle position and route progress while location updates are fresh.
- Pickup and destination labels, with precise address detail limited to what is needed.
- Driver display name and profile photo, only if verified and approved for disclosure.
- Vehicle make/model, colour and registration number, matching the details shown to the passenger.
- ETA only when supplied by a working routing service; otherwise say **ETA unavailable**.
- A clear **Last updated** timestamp and stale/offline state when updates stop.

Never expose passenger/driver email, phone number, account IDs, authentication tokens, internal database IDs, fare/payment data or unrelated ride history. Do not expose a home address by default after trip completion.

## Participant controls
- Share trip from passenger and assigned-driver active-trip views.
- Use the native share sheet; do not require contact-book upload or persistent address-book permission.
- Show link expiry and **Stop sharing** / **Revoke link**.
- Allow a participant to generate a replacement link and revoke the previous one.
- Warn clearly when location permission is off, GPS is stale, network is unavailable or the trip is no longer active.

## Secure implementation requirements
1. Generate a cryptographically random, high-entropy opaque share token. Store only a secure hash server-side.
2. Scope the token to one ride; make it read-only, revocable, rate-limited and short-lived. Proposed default: active trip lifetime plus a short completion grace period, with an absolute expiry cap. Confirm exact durations during implementation review.
3. Only the authenticated passenger or currently assigned driver may create/revoke a token for that ride. Validate participation and assignment server-side on every mutation.
4. The public tracking endpoint returns a purpose-built allowlisted DTO, never a raw Supabase row or broad authenticated session.
5. Do not rely on client-side hiding, obscured IDs or RLS alone as the public-link security boundary. Validate token hash, expiry, revocation, ride state and rate limits server-side.
6. Stream updates through an authenticated, narrowly scoped channel or poll a read-only endpoint. A public token must not grant access to private Supabase Realtime tables or other rides.
7. Minimise retention: expire/delete share-token records and stop location publication when sharing ends. Audit create, revoke, expiry and abuse events without logging bearer tokens.
8. Apply `Cache-Control: no-store, private` to token responses; use HTTPS; prevent token leakage through analytics, referrers, logs and third-party scripts. Set a restrictive Referrer-Policy and noindex/nofollow on the public tracking page.
9. Validate location freshness and accuracy; label stale data instead of presenting the last known position as live.
10. Add abuse controls: throttling, token rotation, generic invalid/expired responses and monitoring for repeated token guessing.

## Safety and Nigeria-specific handling
- The share page is a visibility aid, not an emergency response service.
- Do not claim 24/7 monitoring, insurance, police dispatch or staffed SOS unless those services are contracted, staffed and tested.
- Design SOS separately for Lagos/Nigeria, verifying the emergency contact pathway and offline fallback.
- Pickup PIN verification remains separate: trip sharing does not replace checking the correct driver, vehicle or pickup PIN.

## Acceptance criteria
- Passenger and assigned driver can create/revoke a share link only for their own active ride.
- Recipient opens the link on iPhone/Android browsers without an account.
- Recipient sees driver and vehicle identity, trip state and live location only when explicitly shared.
- A recipient cannot enumerate rides, infer sequential IDs or access another trip by editing the URL.
- Revoked, expired, completed and cancelled links stop returning live location.
- Stale GPS, lost connectivity and unavailable ETA are clearly labelled.
- No phone/email/account identifiers or payment information appear in the public response.
- Automated tests cover authorization, token entropy/hash handling, expiry, revocation, rate limits, allowlisted response fields, stale locations and cross-ride isolation.
- Manual acceptance tests cover WhatsApp/SMS sharing and mobile browser viewing.

## Delivery sequence
1. Review this specification alongside the existing pickup-PIN and active-trip work in PR #20.
2. Implement the database migration and server-side token lifecycle in an isolated development Supabase project only.
3. Implement participant controls and a public, read-only tracking page.
4. Add automated security tests and mobile browser acceptance tests.
5. Keep preview and production ride mutations disabled until existing LagosGo launch blockers are resolved and separately approved.

## Scope boundaries
This is a specification only. It does not add database migrations, create share tokens, expose live location, enable public bookings, configure billing, alter Supabase, change Vercel or deploy LagosGo.
