# LagosGo — Phase 1 Backlog

Status legend: **Planned** = not implemented; **Prototype** = interface/demo only; **In progress** = implementation underway; **Verified** = implemented and tested in the target environment.

## P0 — Close the verification gaps

- [ ] Confirm current production deployment, commit SHA, runtime logs, provider configuration, and real-device behaviour.
- [ ] Test driver/corporate lead submission end to end and confirm email delivery; add abuse controls and an operational response process.
- [ ] Test Google Maps configuration, route/landmark endpoints, input validation, quotas and API-key restrictions.
- [ ] Add automated handler tests, failure-path tests and meaningful CI assertions; syntax checks alone are insufficient.
- [ ] Record security, privacy, accessibility and release blockers with evidence and acceptance criteria.

## P1 — Operational ride MVP (priority over optional features)

| Priority | Capability | Acceptance criteria | Status |
|---|---|---|---|
| P1 | Passenger/driver identity | Secure sign-up/sign-in, account recovery, role-based access and server-side authorization. | Planned |
| P1 | Driver/vehicle eligibility | Secure onboarding, required document checks, vehicle eligibility and an auditable approval/rejection process. | Planned |
| P1 | Durable ride records | Persistent database; validated ride states; ownership checks; auditable transitions and safe retry handling. | Planned |
| P1 | Driver availability | Authenticated availability and location updates; stale-location expiry; drivers cannot accept overlapping assignments. | Planned |
| P1 | Fare and booking | Validated pickup/destination, transparent estimate, confirmed price rules and clear booking/cancellation states. | Prototype UI / backend planned |
| P1 | Dispatch | Eligible-driver filtering, road ETA, time-bounded offers and atomic assignment; no fabricated driver or ETA. | Planned |
| P1 | Live trip lifecycle | Driver accepted → en route → arrived → in progress → completed, with cancellation/error recovery and passenger updates. | Planned |
| P1 | Payment and earnings ledger | Server-authoritative records, idempotency, refunds/reconciliation, transparent commission and payout reporting. | Planned |
| P1 | Safety and support | Consent-based trip sharing, incident reporting, staffed escalation path, privacy and retention controls. | Planned |
| P1 | Verification and CI | Unit/integration tests, end-to-end pilot tests, logs, monitoring, security checks and documented release gates. | Planned |

## P2 — Optional customer-facing features after core rides work

| Priority | Feature | Acceptance criteria | Status |
|---|---|---|---|
| P2 | Wallet gifting | Recipient confirmation, limits/consent, idempotent ledger entries, and safe insufficient-balance/failure handling. | Planned |
| P2 | Pay for Me | Payer explicitly approves ride context and amount before any charge; cancellation/refunds auditable. | Planned |
| P2 | Ride streak incentives | Explicit eligibility/expiry, defined funding source, ledger trail, and abuse/duplicate-claim prevention. | Planned |
| P2 | I Arrived Safely | Voluntary check-in, opt-in trusted contact, minimised location exposure and clear failure handling. | Planned |
| P2 | Two-tap mutual ratings | One rating per eligible participant after a completed trip, with abuse reporting and release rules. | Planned |

## Essential platform foundation

- [ ] Responsive yellow-and-black passenger booking experience.
- [ ] Pickup and destination selection with clear ride categories.
- [ ] Fare estimate and itemised pricing before confirmation.
- [ ] Typed ride lifecycle and server-side state transition rules.
- [ ] Driver onboarding, document verification, and vehicle eligibility.
- [ ] Driver availability and atomic offer/assignment locking.
- [ ] Road-ETA matching with a fairness-aware ranking model.
- [ ] Auditable driver earnings, fees, incentives, and adjustments.
- [ ] Authentication, authorisation, rate limiting, and privacy controls.
- [ ] CI checks and tests for ride states, matching, and ledger integrity.

## Matching and reliability

- [ ] Filter ineligible drivers before scoring.
- [ ] Start at 2–3 km and expand to 5 km when candidate count is insufficient.
- [ ] Use road ETA/traffic from a selected routing provider; shortlist top 10–20 before expensive routing calls.
- [ ] Sequential driver offers with a 20-second acceptance window.
- [ ] Atomically lock a driver and assign a ride to prevent duplicate dispatch.
- [ ] Retry/expand for up to 60 seconds, then offer retry or scheduling.
- [ ] Monitor request-to-first-offer, request-to-acceptance, pickup ETA, cancellation rates, match radius, failed matches by zone/time, earnings per online hour, and offer concentration.

## Later roadmap — not Phase 1

- Airport-first transfer packages.
- Parcel delivery and errands.
- Explore Lagos.
- Wallet bonuses, referrals, off-peak offers, and birthday/homecoming campaigns beyond the initial streak feature.
- GoShare/shared rides after solo dispatch is reliable; initial guardrails: 2–3 riders maximum, same corridor, detour no more than 5–7 minutes, total journey extension capped at 10–15%.
- Batch matching with 3–5 second request batching and an optimisation solver, only after reliable operational data exists.

## Release rule

A UI-only interaction is **Prototype**, not **Verified**. Payment, wallet, matching, identity, and safety features require server-side enforcement, automated tests, logging, and an explicit security review before being offered to real users.
## Competitive feature adaptations — Bolt and inDrive references

These are original LagosGo implementations of common mobility-product patterns, not copies of third-party branding or proprietary UI. Every row must pass the release rule above before being described as live.

| Priority | Feature | LagosGo adaptation | Status |
|---|---|---|---|
| P1 | Fare choice | Upfront fare estimate as default, with optional rider-suggested offer and clear driver acceptance/decline states. Add bounds, expiry and no hidden fees. | Prototype UI |
| P1 | Informed driver choice | Show verified driver identity, vehicle, plate, pickup ETA, completed trips and verified ratings when real candidates exist. Never show fabricated profiles or ratings. | Planned; placeholder UI |
| P1 | Trip safety centre | Share trip with a trusted contact, arrival check-in, safety help/reporting and documented escalation paths. Location sharing is opt-in and time-limited. | Prototype UI |
| P1 | Live trip lifecycle | Driver acceptance, approach, arrival, trip started/completed, cancellation and receipt updates, with push alerts after backend integration. | Planned |
| P2 | In-app communication | Privacy-preserving chat or masked calling between matched rider and driver, with abuse reporting. | Planned |
| P2 | Multiple payment methods | Cash and supported digital payments with clear pre-trip disclosure, server-verified status, idempotent ledger and refund handling. | Planned |
| P2 | Delivery expansion | Go Send parcel/errand bookings, courier offers, delivery status and proof of delivery after ride dispatch is reliable. | Planned |
| P2 | Merchant marketplace | Go Food merchant onboarding, real menus, availability, checkout, courier assignment, order tracking, refunds and settlements. | Prototype UI; backend planned |
| P3 | Intercity and scheduled trips | Scheduled rides and longer-distance travel after zone coverage, driver availability and pricing are validated. | Planned |
| P3 | Safety evidence tools | Evaluate any audio/evidence feature only after legal/privacy review, explicit consent, secure storage, retention limits and access controls. | Research required |

## Driver-first launch and corporate demand

### Driver acquisition — first priority
- [ ] Run an invite-only Lagos pilot with verified independent drivers and fleet operators before public rider promotion.
- [ ] Publish the driver earnings calculator and platform-fee breakdown before acceptance of any commercial terms.
- [ ] Onboard vehicle details, licence and required documents through a secure verified workflow; do not collect identity-document uploads through the public interest form.
- [ ] Inspect vehicle condition before activation: clean exterior/interior, working air conditioning for eligible car categories, seat belts, tyres/lights/roadworthiness, and valid documents.
- [ ] Create driver support, incident reporting, appeal and payout-reconciliation procedures.
- [ ] Track driver activation, weekly active drivers, acceptance rate, completed trips, cancellations, net earnings per online hour, and 30/90-day retention.
- [ ] Do not promise guaranteed rides, earnings or incentives unless funded and contractually defined.

### Corporate and fleet sales — second priority
- [ ] Recruit anchor accounts: employers with shift workers, hotels, clinics, schools/universities, event organisers, property managers and travel operators.
- [ ] Offer scheduled employee rides, airport transfers, visitor transport, recurring routes and approved fleet bookings.
- [ ] Corporate pilot terms should define service hours, service zones, response SLAs, cancellation/no-show rules, invoicing cadence, spending limits, authorised bookers, support escalation and privacy responsibilities.
- [ ] Add business account roles, cost centres, trip approvals, downloadable trip reports, receipts and monthly invoicing only after authentication and ledger controls exist.
- [ ] Secure at least 3–5 pilot organisations and validate repeat ride volume before scaling consumer acquisition.

### Quality, mapping and store release gates
- [ ] Keep Google Maps browser/server keys restricted and configure Maps JavaScript, Places and Routes APIs with billing/quotas before live route tests.
- [ ] Confirm destination/place selection uses exact coordinates when available; do not show a pickup ETA until a real driver is matched and its location is available.
- [ ] During a live trip, show driver location, route progress, ETA refresh, rerouting, arrival and destination landmarks using real location and map data.
- [ ] Add a clear "map not configured" fallback; never substitute the sample illustration for a claimed live route.
- [ ] Add device/browser QA for PWA install, iOS Safari home-screen flow, low bandwidth, permission denial, offline shell, and accessibility.
- [ ] Before store submission: production authentication, dispatch, payments/receipts, cancellation/refunds, safety escalation, privacy policy/data retention, driver vetting, monitoring, incident response, load/security testing and store-specific disclosures.
