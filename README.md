# LagosGo

**Lagos mobility, built around fair fares, safer trips, and driver-first economics.**

LagosGo is a mobile-first ride-hailing product concept for Lagos State, designed to expand across Nigeria. It aims to give passengers clear prices and safer journeys while helping drivers keep more of what they earn.

## What Makes LagosGo Different

- **Driver-first earnings:** transparent fare breakdowns, visible platform fees, and a focus on sustainable earnings per online hour.
- **Upfront passenger pricing:** show an estimate before a passenger confirms a ride; explain fare changes instead of hiding them.
- **Fair driver matching:** road-route ETA, eligibility checks, reliability and quality signals, and safeguards against concentrating every profitable trip among the same drivers.
- **Wallet gifting:** let a user send ride credit to another person, with clear consent and transaction records.
- **Pay for Me:** allow a passenger to request a ride while another person pays, with payer approval before charging.
- **Book for someone else:** arrange a trip for a family member, visitor, or colleague while making pickup and trip details clear to the rider.
- **Ride streaks and loyalty:** opt-in streaks, referral rewards, off-peak offers, and bonuses with transparent eligibility and funding.
- **I Arrived Safely:** a voluntary arrival check-in and trusted-contact workflow, with careful controls over location sharing.
- **Two-tap mutual ratings:** a quick, balanced feedback flow for both passengers and drivers.
- **Driver payment protection:** auditable fare, fee, incentive, and adjustment records; no silent deductions to fund promotions.
- **Respect Code and dispute resolution:** clear conduct expectations, evidence-aware complaints, and human review for serious payment or safety disputes.
- **Beyond rides:** a roadmap for airport transfers, errands and parcel delivery, Explore Lagos, and later shared rides.

## Phase 1 MVP backlog

The first five customer-facing features are recorded in BACKLOG.md:

1. Wallet gifting
2. Pay for Me
3. Ride streak incentives
4. I Arrived Safely
5. Two-tap mutual ratings

These features sit alongside the essential ride-booking foundation: pickup and destination, ride categories, fare estimates, ride states, driver eligibility and matching, and auditable earnings records. The backlog marks what is planned versus implemented; a feature is not considered production-ready until its backend, security, and tests are complete.

## Product principles

1. Transparent driver earnings and low, capped platform fees.
2. Fair, upfront passenger pricing.
3. Safety, identity verification, and data minimisation.
4. Fleet-friendly operations and accessible mobile-first design.
5. Auditable payments and dispute handling.
6. Lagos-specific usability first, with an architecture that can expand responsibly.

## Technical direction

- **Frontend:** responsive, mobile-first web experience.
- **Durable records:** PostgreSQL for users, rides, fare components, and payment ledgers when backend integration begins.
- **Live availability:** Redis or an equivalent short-lived store for driver presence and offer locks when matching services are introduced.
- **Routing:** a verified road-routing provider selected after checking Lagos coverage, traffic support, pricing, and terms.
- **Matching:** sequential offers first; shortlist by eligibility and approximate proximity, then rank with road ETA and fairness signals. Never use straight-line distance as a substitute for road ETA.
- **Delivery:** GitHub as source of truth, automated checks, and Vercel deployment once configured.

## Driver matching specification

The planned candidate score is:

0.55 × ETA + 0.15 × Quality + 0.15 × Fairness + 0.10 × Reliability + 0.05 × Direction

All component scores must be normalised to the same scale. Hard eligibility checks come first: online, available, correct vehicle, verified documents, permitted service zone, and compatible trip preferences. Start with a 2–3 km candidate radius and expand to 5 km when needed. Calculate expensive road ETAs only for the top 10–20 eligible candidates. Send sequential offers with a 20-second acceptance window; atomically lock the driver and transition the ride to prevent double assignment. If no driver accepts, expand/retry for up to 60 seconds, then give the passenger a clear retry or scheduling option.

Acceptance rate must not dominate the ranking. Fairness should use rolling earnings per online hour and monitor offer concentration. Track match time, pickup ETA, cancellations, acceptance, match radius, earnings per online hour, and failures by zone/time. Batch matching and shared rides are later-stage work, not Phase 1 assumptions.

## Local development

This repository currently starts as a static front-end prototype. Open index.html in a browser to inspect the interface. The booking interactions are demonstrative only: there is no live driver dispatch, payment processing, authentication, persistent database, or production map integration yet.

## Security and release gates

- Keep API keys and credentials in environment variables; never commit secrets.
- Enforce server-side authorisation for rides, wallets, payment records, and safety events.
- Make payment and incentive ledger entries auditable and idempotent.
- Apply access controls and retention limits to identity and precise location data.
- Add automated tests for ride-state transitions, eligibility, duplicate assignment, ledger integrity, and matching fairness before live launch.
- Do not describe a feature as live until its service, verification, and deployment are confirmed.
## PWA pilot access

LagosGo now includes a basic Progressive Web App shell for direct home-screen installation over HTTPS. The manifest, branded SVG icons, service worker, install button, and iPhone Safari instructions provide an installable shell and cached interface assets. Offline mode is limited to reopening the interface; live bookings, dispatch, tracking, authentication, payments, and push alerts are not implemented by this shell.

- Android/Chromium: use the **Install LagosGo** button when the browser exposes its install prompt, or use the browser menu.
- iPhone/iPad: open the site in Safari, tap Share, then **Add to Home Screen**.
- Push notifications require a separate backend endpoint, stored subscription, VAPID keys, and event delivery; they are not enabled merely by registering the service worker.
- Test installation on target devices before pilot distribution. Add raster PNG icons if required by browser compatibility or store-packaging tools.

## Go Food marketplace concept

The interface now includes an original LagosGo food-discovery section inspired by common food-delivery marketplace patterns: search, cuisine/category filters, restaurant cards, sample delivery windows, and menu entry points. It uses LagosGo's own yellow/black visual identity and does not use Bolt's logo or claim an affiliation. All merchant names, ratings, ETAs, menus and prices shown in the concept are illustrative; merchant onboarding, delivery dispatch, ordering, payment and refunds are not connected.

## Ride-alert push architecture

The client now checks `/api/push/status` before requesting browser notification permission. The current status, VAPID-key and subscription API routes intentionally fail closed because LagosGo does not yet have connected authentication, durable subscription storage, or a push delivery worker. This prevents the prototype from asking users to grant notification permission for a service that cannot save subscriptions or deliver ride events.

The service worker has push-display and notification-click handlers ready for integration. To enable real ride alerts, the next backend work must include:
- authenticated passenger/driver sessions and server-side account association;
- VAPID key generation and secure environment-variable storage;
- durable storage for subscription endpoint, public key and auth secret, with ownership and device management;
- a delivery worker using a Web Push library, expiry handling (remove subscriptions on 404/410), retries, rate limits and event audit records;
- ride-event integration for offers, driver acceptance, arrival, trip status and safety alerts;
- tests for permission denial, duplicate subscriptions, unauthenticated writes, expired endpoints, and notification payload privacy.

Do not send sensitive trip or identity data in notification payloads. Keep the push subscription endpoint and keys private, and do not enable the service status flag until storage, authentication and delivery are tested end to end.

## Competitive feature direction: Bolt + inDrive

LagosGo uses these apps as product references, not templates to copy:
- Bolt's ride experience informs a simple booking journey, clear ride categories, driver onboarding and a path toward a broader city-services marketplace.
- inDrive's fare-choice model informs an optional rider-suggested fare and more informed driver choice. LagosGo keeps upfront fare estimates as the default and should never present an offer as accepted until a driver actually accepts it.
- Safety patterns inform opt-in trip sharing, arrival check-in, reporting and privacy-preserving support workflows.

The interface now includes prototype screens for fare mode selection, suggested-fare preview, driver transparency and a safety hub. They are not connected to live driver matching, identity records, location sharing, emergency response or dispatch. The safety controls explicitly disclose these limitations. See BACKLOG.md for priorities and acceptance criteria.

## Driver recruitment, corporate contracts, and route preview

The current interface adds driver/fleet pilot interest and corporate transport enquiry forms, current-location pickup, a road-route preview API, trip duration/distance, turn-by-turn instructions, and nearby destination landmarks. See [LAUNCH_READINESS.md](./LAUNCH_READINESS.md) for required Vercel environment variables, setup steps, and release gates.

**Configuration required:** set `GOOGLE_MAPS_BROWSER_KEY` (restricted browser key), `GOOGLE_MAPS_SERVER_KEY` (server-only key with Routes API and Places API enabled), `RESEND_API_KEY`, `LAGOSGO_LEADS_TO`, and `LAGOSGO_FROM_EMAIL` in Vercel, then redeploy. Until these are set, mapping and lead delivery are deliberately not presented as working services.

A route duration is the estimated drive time from pickup to destination. It is not the time a driver will take to reach the passenger. Pickup ETA must be computed from a real assigned/eligible driver's current location and road route after dispatch is implemented.

## Driver-first launch strategy

Recruit and verify an initial driver supply and fleet partners in defined Lagos operating zones, then win corporate transport pilots with agreed service windows, support, billing and reporting. Open passenger bookings only after the app can match a real driver, show pickup ETA, update both devices during a trip, complete the trip and reconcile payment and driver earnings. The PWA is a pilot-access channel, not a substitute for that end-to-end ride service.


## Driver earnings estimator

The driver/fleet section includes a client-side weekly earnings estimator. Rides per day, average fare, working days and platform-fee assumption are editable. Results are gross driver share before fuel, maintenance, insurance, downtime and tax. The default 12% fee is explicitly a planning assumption, not an approved public tariff or earnings promise. Validate fee caps and unit economics with real pilot data before publishing marketing claims.


## Investor proposal

See [INVESTOR_PROPOSAL.md](./INVESTOR_PROPOSAL.md) for the Lagos-first launch plan, driver recruitment and corporate-sales strategy, quality standards, product/store-readiness gates, state-brand expansion plan, ₦350m capital request, and explicitly illustrative three-year financial scenarios. Projections are assumptions for discussion, not audited forecasts or promised investor returns.
