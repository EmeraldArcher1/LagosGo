# LagosGo

**Lagos mobility, built around fair fares, safer trips, and driver-first economics.**

LagosGo is a mobile-first ride-hailing product for Lagos State, designed to expand across Nigeria. Its long-term direction is a Lagos mobility and everyday-services super-app: rides remain the core, with trust and loyalty features first, then airport transfers, deliveries, errands, local discovery and business services.

> **Release status:** LagosGo remains a front-end prototype with backend scaffolding. Roadmap items below are proposed or in prototype unless explicitly verified. Do not accept real ride bookings or describe sample drivers, prices, routes, payments, safety workflows or marketplace listings as live services.

## What Makes LagosGo Different

- **Driver-first earnings:** transparent fare breakdowns, visible platform fees, and a focus on sustainable earnings per online hour.
- **Upfront passenger pricing:** show an estimate before a passenger confirms a ride; explain fare changes instead of hiding them.
- **Fair driver matching:** road-route ETA, eligibility checks, reliability and quality signals, and safeguards against concentrating every profitable trip among the same drivers.
- **Wallet gifting and Pay for Me:** planned, auditable ways to fund another user's ride credit or have a third party approve a trip payment.
- **Book for someone else:** arrange a trip for a family member, visitor, or colleague with clear passenger identification and trip details.
- **Ride streaks and loyalty:** opt-in rewards, referrals and off-peak campaigns with transparent eligibility and funding.
- **I Arrived Safely and mutual ratings:** voluntary check-ins, privacy-aware trusted-contact workflows, and fair feedback for riders and drivers.
- **Driver payment protection:** auditable fare, fee, incentive and adjustment records; no silent deductions to fund promotions.
- **Respect Code and fair dispute resolution:** clear conduct expectations, evidence-aware complaints, and human review for serious payment or safety disputes.
- **Beyond rides:** a roadmap for airport transfers, parcel delivery, errands, Explore Lagos, corporate transport and later shared rides.

## Product roadmap and implementation backlog

See [BACKLOG.md](./BACKLOG.md) for priorities, acceptance criteria and status. The delivery order is:

1. **Verify the existing repository, deployment, environment configuration and tests.**
2. **Operational ride MVP:** authentication and driver/vehicle verification; durable ride records; availability and atomic dispatch; road-ETA matching; trip lifecycle; payment/earnings ledger; safety/support; automated tests.
3. **Trust and loyalty tranche:** wallet gifting, Pay for Me, Ride Streak, I Arrived Safely, two-tap mutual ratings—in that order, after the underlying ride and ledger controls are ready.
4. **Everyday services:** book for someone else, airport transfers, LagosGo Move deliveries/errands, Explore Lagos, corporate/fleet accounts and merchant services.
5. **Responsible expansion:** partner-funded incentives, shared rides and other Nigerian cities only after pilot evidence supports expansion.

## Product principles

1. Transparent driver earnings and low, capped platform fees.
2. Fair, upfront passenger pricing.
3. Safety, identity verification, consent and data minimisation.
4. Fleet-friendly operations and accessible mobile-first design.
5. Auditable payments, rewards and dispute handling.
6. Lagos-specific usability first, with responsible expansion.

## Technical direction

- **Frontend:** responsive, mobile-first web experience and PWA.
- **Durable records:** PostgreSQL/Supabase for users, rides, fare components, wallet/payment ledgers and safety events after secure backend integration.
- **Live availability:** a suitable short-lived store for driver presence and offer locks when matching services are introduced.
- **Routing:** a verified road-routing provider selected after checking Lagos coverage, traffic support, pricing and terms.
- **Matching:** sequential offers first; eligibility and approximate proximity shortlist, then road ETA and fairness ranking. Straight-line distance is not a substitute for road ETA.
- **Delivery:** GitHub as source of truth, automated checks and Vercel deployment once configured.

## Driver matching specification

The planned candidate score is:

0.55 × ETA + 0.15 × Quality + 0.15 × Fairness + 0.10 × Reliability + 0.05 × Direction

All component scores must be normalised to the same scale. Hard eligibility checks come first: online, available, correct vehicle, verified documents, permitted service zone and compatible trip preferences. Start with a 2–3 km candidate radius and expand to 5 km when needed. Calculate expensive road ETAs only for the top 10–20 eligible candidates. Send sequential offers with a 20-second acceptance window; atomically lock driver and ride to prevent double assignment. If no driver accepts, expand/retry for up to 60 seconds, then offer a clear retry or scheduling option.

Acceptance rate must not dominate the ranking. Fairness should consider rolling earnings per online hour and monitor offer concentration. Track match time, pickup ETA, cancellations, acceptance, match radius, earnings per online hour and failures by zone/time.

## Backend and Supabase status

The initial schema and setup guide are in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) and [supabase/migrations/001_core_schema.sql](supabase/migrations/001_core_schema.sql). Applying the migration and configuring credentials are separate tasks. The schema alone does not provide a working ride-request API, driver offer/accept workflow, authentication UI or live dispatch.

Keep service-role keys server-only; never commit secrets or expose them in browser code. Verify row-level security with passenger, unapproved-driver, approved-driver and admin test accounts before pilot use.

## Local development and prototype limitations

**Current release status: front-end prototype; not an operational ride-hailing service.** Open `index.html` to inspect the interface. Booking, sample fares, sample driver information, safety controls and marketplace listings may be illustrative. Live driver dispatch, passenger/driver authentication, persistent ride storage, payment processing and production ride tracking are not implemented unless subsequently verified in the target environment.

### PWA pilot access

The PWA shell supports home-screen installation over HTTPS and caches interface assets. Offline mode only reopens the interface; it does not enable bookings, dispatch, tracking, authentication, payments or push alerts.

- Android/Chromium: use **Install LagosGo** when available, or the browser menu.
- iPhone/iPad: open the site in Safari, tap Share, then **Add to Home Screen**.
- Push notifications need authenticated subscriptions, durable storage, VAPID keys and a delivery worker; registering a service worker alone is not sufficient.

### Maps and lead forms

The route-preview and nearby-landmark handlers require correctly restricted Google Maps keys and configuration. Lead email delivery requires the environment variables documented in [LAUNCH_READINESS.md](./LAUNCH_READINESS.md). Until configured and tested end to end, mapping and lead delivery must not be presented as operational services.

A route duration is the estimated drive time from pickup to destination. It is not the time a driver will take to reach the passenger. Driver pickup ETA requires a real matched driver's current location and road route.

### Go Food and competitive references

The Go Food interface is a marketplace concept; merchant names, ratings, menus, ETAs and prices may be illustrative. Merchant onboarding, ordering, delivery dispatch, payment and refunds are not connected. Bolt and inDrive are product references only: LagosGo should use its own brand and original interface, not copy third-party branding or proprietary UI.

## Security and release gates

- Keep API keys and credentials in environment variables; never commit secrets.
- Enforce server-side authorisation for rides, wallets, payment records and safety events.
- Make payment and incentive ledger entries auditable and idempotent.
- Apply role-based access and retention limits to identity and precise location data.
- Add tests for ride-state transitions, eligibility, duplicate assignment, ledger integrity and matching fairness.
- Do not describe a feature as live until its implementation, verification and deployment are confirmed.

## Launch strategy and supporting documents

Recruit and verify an initial driver supply and fleet partners in defined Lagos operating zones, then win corporate transport pilots. Open passenger bookings only after the app can match a real driver, show pickup ETA, update both devices during a trip, complete the trip and reconcile payments and driver earnings.

- [BACKLOG.md](./BACKLOG.md) — feature roadmap and acceptance criteria.
- [Ride-hailing research and product principles](./docs/RIDE_HAILING_RESEARCH_AND_PRODUCT_PRINCIPLES.md) — competitor lessons, Lagos-specific UX, safety, security, architecture, pilot gates and expansion criteria.
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) — database setup and security boundaries.
- [LAUNCH_READINESS.md](./LAUNCH_READINESS.md) — Vercel configuration and release gates.
- [INVESTOR_PROPOSAL.md](./INVESTOR_PROPOSAL.md) — launch strategy and illustrative financial scenarios.

Financial projections and fee examples in planning documents are assumptions, not audited forecasts or guaranteed returns.
