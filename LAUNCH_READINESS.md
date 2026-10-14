# LagosGo — Pilot launch readiness

## What is now in the codebase

- Driver/fleet pilot-interest form and corporate transport enquiry form.
- Current-location pickup using the browser's permission-based geolocation.
- Route-preview endpoint for road distance, route duration, and turn instructions.
- Interactive Google Map support, with a clear illustrative-map fallback if no browser key is configured.
- Nearby landmark lookup around the destination.
- A clear distinction between **trip ETA** (pickup to destination) and **driver pickup ETA** (available only after a real driver is matched).
- Server-side lead email intake with validation and a fail-closed response when mail credentials are missing.
- CI syntax checks for the front-end and API handlers.

The UI and API scaffolding do not themselves create a driver network, live dispatch, accounts, payments, or production safety operations. The lead forms will not collect applications until email delivery is configured.

## Configure Vercel environment variables

In Vercel, open **LagosGo → Settings → Environment Variables**. Add the variables below to the Production environment and Preview if you want to test preview deployments. Keep server credentials private.

| Variable | Purpose |
|---|---|
| `GOOGLE_MAPS_BROWSER_KEY` | Browser key used to load Google Maps JavaScript. Restrict by allowed website referrers and enable only Maps JavaScript API. |
| `GOOGLE_MAPS_SERVER_KEY` | Server-side key used by the route and nearby-landmark API handlers. Restrict it to Routes API and Places API (New). Never put this key in client code. |
| `RESEND_API_KEY` | Resend API key used to deliver pilot enquiries by email. |
| `LAGOSGO_LEADS_TO` | Inbox address that should receive driver and corporate applications. |
| `LAGOSGO_FROM_EMAIL` | Sender address verified in the Resend account/domain. |

Google Maps Platform must have billing enabled and the required APIs enabled. Use separate browser and server keys. Apply HTTP-referrer restrictions to the browser key and API restrictions to the server key. Do not paste secrets into GitHub, chat messages, source files, or screenshots.

After saving variables, trigger a new Vercel production deployment so the functions receive them. Test both the primary production domain and any custom domain you later add.

## Driver and corporate lead handling

The two forms send to `/api/leads`. Until all three email variables are configured, the API intentionally returns a service-unavailable response and the page tells the user the form is not accepting submissions yet. Once configured, send a test from a real device and confirm it reaches the intended inbox. Set up an operational process for responding to applications; do not collect ID documents through this interest form.

Before onboarding drivers, establish document checks, vehicle inspection/eligibility, driver terms, transparent commission/fees, payout timing, complaint handling, and a driver support channel. Corporate leads need a named sales contact, a service proposal, coverage boundaries, billing terms, and a clear pilot contract.

## Route and landmark behaviour

1. Enter pickup and destination, or use the location button and grant browser location permission.
2. Tap **Calculate route & nearby landmarks**.
3. When Google Maps credentials are configured, the app requests a driving route using the Routes API with traffic-aware routing preference, shows road distance and estimated trip duration, draws the route, and lists route steps.
4. Nearby mapped places are queried around the destination through Places API.
5. The app explicitly labels driver pickup ETA as unavailable until a real driver is matched.

Route estimates are not guarantees; traffic and road conditions change. The current route endpoint is a prototype and should be load-tested, rate-limited, monitored, and checked for abuse before public traffic.

## What must exist before store submission

- [ ] Real passenger and driver authentication, account recovery, and role-based access.
- [ ] Driver onboarding, verification, vehicle eligibility, and support operations.
- [ ] Durable ride database and enforced ride state transitions.
- [ ] Live driver presence and road-ETA matching with atomic assignment.
- [ ] Real pickup ETA based on the assigned driver's current position and route.
- [ ] Driver app experience for accepting/rejecting requests, navigation, arrival, trip start/end, and earnings.
- [ ] Passenger live-trip updates and recovery from lost connectivity.
- [ ] Payments, refunds, driver payout ledger, and reconciliation.
- [ ] Safety escalation, trusted-contact sharing, privacy controls, and incident response.
- [ ] Privacy policy, terms, location permissions disclosures, retention/deletion process, and customer support.
- [ ] Accessibility, device/browser testing, load/security testing, monitoring, and CI passing.
- [ ] A small Lagos pilot with real drivers and invited riders before public bookings.

## PWA install

The PWA is the early access route. Test **Install app** on supported Android browsers and **Safari → Share → Add to Home Screen** on iPhone. The service worker caches the interface shell; it does not make live ride requests work offline. Native Android/iOS builds and store submissions come after end-to-end pilot testing.
