# Ride-Hailing Research & LagosGo Product Specification

**Status:** Research-backed requirements, not a claim that features are implemented. Reviewed 16 October 2026.

## Executive decision

LagosGo should compete on trustworthy service, clear prices, dependable pickups, driver economics and responsive human support. Learn from competitors without copying their branding or proprietary interface. Prioritise the complete, safe ride lifecycle before super-app expansion.

The current repository describes a front-end prototype with backend scaffolding. This document is a product and engineering specification, not evidence of a production ride service.

## Representative competitive benchmark

This is a representative landscape, not an exhaustive list of every operator. Availability and feature coverage vary by city and country and must be rechecked before launch.

| Platform / model | Publicly documented pattern | Lesson for LagosGo |
|---|---|---|
| Uber, global reference | Trip PINs, GPS trip tracking, trusted-contact sharing, emergency help, masked calls and route/stop anomaly checks in supported markets | Put safety controls inside the ride lifecycle, not only in a help page |
| Bolt, Nigeria reference | Pickup codes, trusted contacts, emergency assistance, masked numbers, driver identity checks and vehicle standards | Verify people and vehicles, make support accessible and state platform fees clearly |
| inDrive, global/emerging markets | Rider-driver fare negotiation and choice of driver, vehicle and ETA; low-commission positioning | User agency is valuable, but negotiation can increase friction and inconsistent fares; test only after the core ride works |
| Lyft, US reference | Scheduled rides, ride preferences, trip sharing and support/safety journeys in supported markets | Predictability and trip continuity can improve confidence |
| Grab, Southeast Asia reference | Ride categories plus adjacent delivery/payment services | Expand services only after rides, refunds and settlements are dependable |
| DiDi, China and international markets | Large-scale dispatch, pricing, safety and marketplace operations | Supply density and operations are as important as interface design |
| Nigerian/regional mobility, including LagRide, Rida and MAX | Local operating context, fleet/driver supply approaches and market-specific transport needs | Validate vehicle, documentation, fare, payment and road assumptions with local riders and drivers |

## Commercial models and trade-offs

1. **Commission per completed trip:** straightforward, but can squeeze drivers when fuel, maintenance, financing and downtime rise.
2. **Low/capped commission:** supports driver-first positioning but needs sufficient trip volume or other transparent revenue.
3. **Negotiated fares:** offers agency but can create pickup friction, inconsistent pricing, discrimination and off-platform leakage.
4. **Fleet/corporate accounts:** can provide predictable demand but require role controls, invoices, reporting and dispute handling.
5. **Subscriptions/fixed driver fees:** shift demand risk to drivers; do not launch without evidence that the plan is fair for low- and high-volume drivers.
6. **Incentives/referrals:** can seed a marketplace but must be budgeted, time-limited, abuse-resistant and ledger-backed.

**Recommended initial model:** an itemised upfront fare estimate, a disclosed capped platform-fee policy, a completed-trip-based charge, and limited fleet/corporate pilots. Reconcile fare, platform charge, adjustments, incentives and net payout in the driver statement. Do not advertise zero commission or guaranteed earnings unless the commercial terms support it.

## Customer journey requirements

### Before booking
- Secure sign-in and account recovery, with clear privacy and consent information.
- Pickup pin plus editable landmark/instruction text: gate, bus stop, estate entrance or correct road side.
- Destination autocomplete and route-aware fare estimate with assumptions explained.
- Show ride category, pickup ETA, journey-duration estimate, payment options and cancellation rules before confirmation.
- Accessible mobile layout, readable text, low-bandwidth behaviour and clear location-permission handling.
- Never present sample drivers, ratings, fares, routes or availability as live.

### Matching and pickup
- Match only eligible, online, available drivers with verified documents and valid vehicles.
- Use straight-line distance to shortlist only; use road-network ETA for ranking.
- Use time-bounded offers and atomically reserve ride and driver to prevent double assignment.
- Show the matched driver's name/photo, vehicle make/model/colour/plate, pickup ETA and safe contact route.
- Recalculate ETA when conditions change; explain delays and offer a truthful retry/cancellation path.
- Require a pickup PIN before starting the ride.

### During the trip
- Show real trip status and location, including last-update time when GPS is stale.
- Offer revocable, time-limited trusted-contact trip sharing.
- Keep Safety/Help visible, with local emergency guidance and a human escalation route.
- Detect possible route deviation, long unplanned stops, GPS loss or unexpected trip termination; prompt a welfare check rather than automatically accusing anyone.
- Hide personal phone numbers where feasible and restrict precise location to authorised users.
- Support Lagos landmarks, estate gates, pickup sides and local road-access instructions.

### Completion and aftercare
- Enforce completion as an authorised server-side state transition.
- Show the final receipt and fare breakdown; reconcile payment status accurately.
- Offer mutual ratings, conduct reporting and human review for serious disputes.
- Provide trip-specific help for fare, lost items, safety, conduct and refunds.
- Offer an optional “I arrived safely” check-in without implying it replaces emergency services.
- Give each support case a reference, status, next action and accountable owner.

## Driver experience and marketplace health

- Verify identity, licence, vehicle ownership/authorisation, roadworthiness, insurance and other locally required documents; track expiry.
- Protect accounts and sensitive changes; provide recovery when a driver loses a phone.
- Before acceptance, show pickup ETA, relevant trip details, estimated fare, platform fee, deductions, payment type and estimated net earnings.
- Provide daily/weekly earnings, online hours, completed trips, deductions, incentives, settlements and statements.
- Let drivers pause availability, report unsafe pickups, contact support and appeal deactivation.
- Avoid incentives that encourage unsafe speed or excessive driving hours.
- Monitor offer concentration and earnings per online hour; acceptance rate must not dominate ranking or punish drivers for declining unsafe/unprofitable trips.
- Build fleet tooling only after role controls, assignment, statements, document expiry and audit logs are ready.

## Matching specification

The existing repository proposes this normalised candidate score:

- 0.55 × ETA
- 0.15 × Quality
- 0.15 × Fairness
- 0.10 × Reliability
- 0.05 × Direction

Hard eligibility checks come before scoring: online, available, verified, valid documents, correct vehicle/service type and permitted zone. All component scores must use the same scale.

1. Shortlist by approximate proximity (initial proposal: 2–3 km; expand toward 5 km if supply is thin).
2. Compute road ETA only for the top 10–20 eligible candidates.
3. Rank by road ETA, quality, fairness, reliability and direction.
4. Send sequential offers with a bounded response window (initial proposal: 20 seconds); atomically lock driver and ride.
5. Expand/retry for up to about 60 seconds, then show a truthful retry or scheduling option.
6. Log match time, pickup ETA, cancellations, radius expansion, assignment conflicts, driver earnings per online hour and outcomes by zone/time.

Weights and timeouts are pilot hypotheses, not proven optimal values. Establish a baseline and measure outcomes before tuning.

## Reference architecture

- **Client:** preserve the current responsive web/PWA interface; replace illustrative actions incrementally with real services.
- **Identity:** Supabase Auth or equivalent, with explicit passenger, driver, fleet and admin roles.
- **Transactional system of record:** PostgreSQL/Supabase for profiles, rides, fare components, payment/settlement ledger, safety incidents and support cases.
- **Authoritative server operations:** ride request, offer, accept, start, complete, cancel, refund and settlement; validate permissions and transitions on server/database, not only in browser JavaScript.
- **Realtime:** authenticated ride-status and driver-location updates. Persist important trip events; treat high-frequency location as ephemeral and apply retention limits.
- **Dispatch:** start with database-backed sequential offers and atomic locking. Add a short-lived store/queue only when measured traffic and latency justify it.
- **Maps:** server-proxied routing/geocoding with restricted keys, quotas, billing alerts, timeout/fallback handling and Lagos coverage checks.
- **Notifications:** Web Push where supported, with appropriate fallback for critical status updates. Notification delivery is not the source of truth.
- **Payments:** licensed payment provider, signed webhook verification, idempotency and reconciliation. Do not store card data.
- **Operations:** structured logs, metrics, alerts, incident playbooks, backups, restore tests, staging/production separation and controlled releases.

Avoid premature microservices. Begin with a modular backend and split services only when load, reliability or team ownership justifies it.

### Core data concepts
Profiles; driver profiles; vehicles; driver documents; driver presence; rides; ride offers; ride events; fare quotes/components; payment transactions; ledger entries; payouts; safety incidents; support cases; trusted contacts; push subscriptions; audit events.

Reconcile these concepts with the existing SQL migration before adding tables. Use database constraints and transactional operations for state transitions, ledger integrity and assignment locking.

### Ride state machine
Requested → matching → accepted → driver arriving → arrived → in progress → completed.

Side paths include cancelled, no driver found, payment pending, payment failed, refund pending and refunded. Define who may trigger each transition, valid previous states, timestamps, reason codes, idempotency and audit events. Never allow a client to jump directly from requested to completed.

## Security and privacy baseline

- Enable row-level security on every exposed table; use least-privilege grants and policies. Test passenger, unapproved-driver, approved-driver, fleet and admin roles separately.
- Passengers see only their rides and authorised sharing details; drivers see only offer/assigned-trip data; fleet users see only their fleet. Audit privileged support/admin access.
- Keep service-role, payment, maps server keys and VAPID private keys in server-side environment configuration. Never commit them or embed them in client bundles.
- Validate every API payload and enforce object-level and function-level authorisation. Rate-limit sign-up, OTP, fare quotes, ride requests, offer acceptance, referrals, wallet credits and support endpoints.
- Verify webhook signatures and replay protection; never trust client-supplied fares, roles, driver status, payment status or reward amounts.
- Use revocable share-trip links with minimal exposed data. Minimise precise location history, restrict access and define retention/deletion rules for safety evidence.
- Use secure transport, secure sessions, dependency/secret scanning, backups, restore tests and an incident-response process.
- Review compliance with Nigeria's Data Protection Act 2023: lawful purpose/basis, transparent notice, minimisation, retention, data-subject rights, processor contracts and breach response. Obtain qualified Nigerian legal/privacy advice before launch.
- Audio recording or sensitive evidence needs separate legal/privacy review, clear notice/consent where required, encryption, strict access and deletion policy. Never silently record users.

## Reliability and support operations

- Support is reachable from booking, pickup, in-trip and post-trip screens.
- Separate safety emergencies from routine fare/account issues; define escalation owners and response targets.
- Every case has a case ID, trip link, timeline, owner, status and auditable resolution.
- Monitor booking, dispatch, maps, authentication, notifications and payment integrations; alert on failed bookings and unassigned trips.
- Test weak networks, denied GPS permission, stale driver location, app refresh, duplicate taps, delayed webhooks, cancellation races and disconnects.
- If tracking fails, show the last update time and a safe help/contact path instead of a falsely moving marker.

## Customer-experience metrics

| Metric | Purpose |
|---|---|
| Request-to-match time, median and p90 | Measures how quickly a real driver is found |
| Pickup ETA error | Tests whether pickup promises are credible |
| Completion rate | Measures reliability after acceptance |
| Rider/driver cancellation by stage and reason | Reveals friction and supply mismatch |
| Quote-to-final-fare variance | Protects price trust |
| Safety acknowledgement and resolution time | Tests operational readiness |
| Driver net earnings per online hour | Tests driver-first economics |
| 7-day and 30-day repeat booking | Measures retention by cohort |
| Support resolution/reopen rate | Measures aftercare quality |
| Booking/API success and latency | Measures platform reliability |

Set numerical targets after measuring a controlled pilot. Do not improve match time by sacrificing safety, fare accuracy or driver economics.

## Delivery plan and launch gates

### P0 — safe foundation
- Verify the intended Supabase project and migration status; do not migrate an unconfirmed/unrelated project.
- Add authentication and protected server-operation boundaries.
- Review migration roles, RLS, grants, constraints and audit events.
- Keep sample/demo booking clearly labelled until real operations are verified.
- Test ride-state transitions and authorisation.

### P1 — end-to-end ride MVP
- Durable ride request and fare quote.
- Eligible driver presence, sequential offers, atomic acceptance and offer expiry.
- Passenger/driver status updates, pickup ETA, pickup PIN and cancellation.
- Authorised live location and privacy limits.
- Completion, receipt, payment state and driver earnings ledger.
- Basic support case and safety incident records.
- Test end-to-end with test accounts and sandbox payment methods.

### P2 — trust and experience
- Trusted-contact sharing and optional safe-arrival check-in.
- Route-deviation/long-stop prompts and safety escalation.
- Fare-change explanations, mutual ratings and structured post-trip support.
- Driver net earnings dashboard and dispatch-fairness monitoring.
- Reliable notification delivery and retry paths.

### P3 — retention and adjacent services
- Ride Streak and loyalty only after ledger and reward-abuse controls.
- Book for someone else, wallet gifting and Pay for Me only after identity, consent, payments, refunds and fraud controls.
- Airport transfers, fleet/corporate accounts, deliveries and errands after core rides work.
- Expand cities only after Lagos pilot evidence and operational readiness.

Do not open public bookings until real authentication, driver/vehicle verification, unique assignment, pickup PIN, authorised live status, reconciled payments/earnings, support/safety escalation, RLS/API tests, monitoring and real-device mobile tests all pass.

## Sources and further reading

- Uber Safety: https://www.uber.com/us/en/ride/safety/
- Uber trip PIN: https://help.uber.com/riders/article/what-is-verify-your-trip
- Bolt Safety: https://bolt.eu/en/rides/safety/
- Bolt Nigeria customer terms, effective 31 January 2026: https://bolt.eu/en-ng/legal/rides/tnc-services-customer/
- inDrive company and peer-to-peer pricing model: https://indrive.com/company
- BusinessDay, Nigeria ride-hailing safety trends, 23 January 2026: https://businessday.ng/technology/article/nigerias-ride-hailing-apps-shift-focus-from-speed-to-safety-after-10-years-growth/
- Reuters, Uber Nigeria exit, 2 September 2026: https://www.reuters.com/world/africa/uber-exit-nigeria-after-12-years-operations-2026-09-02/
- OWASP API Security Top 10: https://api-security.owasp.org/editions/2023/en/0x11-t10/
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase data security: https://supabase.com/docs/guides/database/secure-data
- Nigeria Data Protection Commission, NDP Act 2023: https://www.ndpc.gov.ng/ndp-act-2023/

Competitor features, legal terms, prices and coverage can change. Re-check official local documentation before launch.
