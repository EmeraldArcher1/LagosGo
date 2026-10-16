# LagosGo — Product Backlog and Super-App Roadmap

**Status legend:** **Planned** = not implemented; **Prototype** = interface/demo only; **In progress** = implementation underway; **Verified** = implemented and tested in the target environment. Roadmap inclusion is not a claim that a feature is live.

## P0 — Verify the existing product before extending it

- [ ] Confirm current Vercel deployment, deployed commit SHA, runtime logs, provider configuration, and real-device behaviour.
- [ ] Test driver/corporate lead submission end to end and confirm email delivery; add abuse controls and an operational response process.
- [ ] Test Google Maps configuration, route/landmark endpoints, input validation, quotas and API-key restrictions.
- [ ] Add automated handler tests, failure-path tests and meaningful CI assertions; syntax checks alone are insufficient.
- [ ] Record security, privacy, accessibility and release blockers with evidence and acceptance criteria.
- [ ] Confirm Supabase project status and migration application before building ride APIs; never assume a dashboard project means the schema is deployed.

## P1 — Operational ride MVP (priority over optional features)

| Priority | Capability | Acceptance criteria | Status |
|---|---|---|---|
| P1 | Passenger/driver identity | Secure sign-up/sign-in, account recovery, role-based access and server-side authorization. | Planned |
| P1 | Driver/vehicle eligibility | Secure onboarding, required document checks, vehicle eligibility and auditable approval/rejection. | Planned |
| P1 | Durable ride records | Persistent database; validated ride states; ownership checks; auditable transitions and safe retries. | Planned |
| P1 | Driver availability | Authenticated availability/location updates; stale-location expiry; no overlapping assignments. | Planned |
| P1 | Fare and booking | Validated pickup/destination, transparent estimate, confirmed price rules and cancellation states. | Prototype UI / backend planned |
| P1 | Dispatch | Eligible-driver filtering, road ETA, time-bounded offers and atomic assignment; no fabricated driver or ETA. | Planned |
| P1 | Live trip lifecycle | Accepted → en route → arrived → in progress → completed, with recovery and passenger updates. | Planned |
| P1 | Payment and earnings ledger | Server-authoritative records, idempotency, refunds/reconciliation, transparent fees and payout reporting. | Planned |
| P1 | Safety and support | Consent-based trip sharing, incident reporting, staffed escalation, privacy and retention controls. | Planned |
| P1 | Verification and CI | Unit/integration/E2E tests, logs, monitoring, security checks and release gates. | Planned |

## P2 — First customer trust and loyalty release

Implement in this order **after the secure ride lifecycle and ledger foundations are in place**. This is the requested first feature tranche, not a reason to bypass core ride readiness.

| Order | Feature | Acceptance criteria | Status |
|---|---|---|---|
| 1 | Wallet gifting | Recipient identity confirmation, consent and limits; append-only/idempotent ledger; safe failure and reversal handling; no cash-out unless separately approved. | Planned |
| 2 | Pay for Me | Payer explicitly approves ride, amount and payment method; payment status verified server-side; driver sees a truthful guarantee state; cancellation/refunds auditable. | Planned |
| 3 | Ride Streak incentives | Explicit eligibility, expiry, campaign budget/funder, ledger trail and duplicate-claim/abuse prevention. Promotions must not silently reduce driver earnings. | Planned |
| 4 | I Arrived Safely | Voluntary check-in; optional trusted contact; escalation rules and failure states; minimised location exposure and clear consent. | Planned |
| 5 | Two-tap mutual ratings | One rating per eligible participant after a completed trip; structured feedback, abuse reporting, appeal and human review; no unexplained automatic deactivation. | Planned |

## P3 — Everyday mobility and services

| Feature | Scope / acceptance criteria | Status |
|---|---|---|
| Book for someone else | Booker specifies passenger and trip; passenger receives safe trip details; OTP/name check; payer and consent are clear. | Planned |
| Airport transfers | MMIA pickup/drop-off zones, luggage-friendly vehicle categories, scheduled and fixed-corridor pricing after cost validation. | Planned |
| Flight-aware pickup | Flight-number input, trustworthy flight-status provider, delay handling and clear limits; no claim of live flight integration until verified. | Planned |
| Airport queue and meet-and-greet | Driver queue rules, waiting charges, terminal instructions, name-board option and partner operations. | Planned |
| LagosGo Move deliveries | Parcel/errand booking, item restrictions, sender/receiver details, pickup evidence, tracking, delivery OTP/photo proof and receipts. | Planned |
| High-value delivery protection | Explicit coverage terms, item value limits, claims workflow and partner/insurer agreement before selling insurance. | Research required |
| Explore Lagos | Categorised map discovery for fuel/CNG, hospitals, pharmacies, police/emergency resources, mechanics, markets, ATMs, hotels and landmarks. Verify sources, freshness and emergency details. | Planned |
| Corporate and fleet accounts | Roles, authorised bookers, spending limits, cost centres, receipts, reporting, invoicing and support SLAs. | Planned |
| Go Food / merchant marketplace | Verified merchant onboarding, real menus/availability, ordering, payment, courier assignment, refunds and settlements. | Prototype UI; backend planned |
| Referrals and other campaigns | Partner-funded referral, off-peak, birthday/homecoming and wallet bonus campaigns with budgets and fraud controls. | Planned |
| GoShare/shared rides | Only after solo dispatch is reliable; initial guardrails: 2–3 riders, same corridor, detour no more than 5–7 minutes and journey extension capped at 10–15%. | Planned |
| City expansion | Expand beyond Lagos only after zone-level service, driver supply, economics, support and legal requirements are validated. | Planned |

## Essential platform foundation

- [ ] Responsive yellow-and-black passenger and driver experiences.
- [ ] Pickup/destination selection, clear ride categories and fare estimate/itemised pricing.
- [ ] Typed ride lifecycle and server-enforced state transitions.
- [ ] Driver onboarding, document verification, vehicle eligibility and support.
- [ ] Driver availability and atomic offer/assignment locking.
- [ ] Road-ETA matching with fairness-aware ranking.
- [ ] Auditable driver earnings, fees, incentives, refunds and adjustments.
- [ ] Authentication, authorization, rate limiting, consent and privacy controls.
- [ ] CI checks and tests for ride states, matching, ledger integrity and abuse cases.

## Matching and reliability

- [ ] Filter ineligible drivers before scoring.
- [ ] Start at 2–3 km and expand to 5 km when candidate count is insufficient.
- [ ] Use road ETA/traffic from a selected routing provider; shortlist top 10–20 before expensive routing calls.
- [ ] Sequential driver offers with a 20-second acceptance window.
- [ ] Atomically lock driver and ride to prevent duplicate dispatch.
- [ ] Retry/expand for up to 60 seconds, then offer retry or scheduling.
- [ ] Monitor request-to-first-offer, request-to-acceptance, pickup ETA, cancellations, match radius, failed matches by zone/time, earnings per online hour and offer concentration.
- [ ] Keep the planned score explicit: 0.55 × ETA + 0.15 × Quality + 0.15 × Fairness + 0.10 × Reliability + 0.05 × Direction. Normalise components to the same scale; hard eligibility checks come first.

## Competitive feature adaptations — Bolt and inDrive references

These are original LagosGo implementations of common mobility patterns, not copies of third-party branding or proprietary UI.

| Priority | Feature | Acceptance criteria | Status |
|---|---|---|---|
| P1 | Fare choice | Upfront estimate by default; optional rider-suggested offer with bounds, expiry and clear accept/decline states. | Prototype UI |
| P1 | Informed driver choice | Show verified driver, vehicle, plate, pickup ETA and genuine ratings only when real candidate data exists. | Planned; placeholder UI |
| P1 | Trip safety centre | Trusted-contact sharing, arrival check-in, reporting and documented escalation; sharing opt-in and time-limited. | Prototype UI |
| P2 | In-app communication | Privacy-preserving chat/masked calling for matched users, with abuse reporting. | Planned |
| P2 | Payment methods | Cash and supported digital methods, clear pre-trip disclosure, server-verified settlement, idempotent ledger and refunds. | Planned |
| P2 | Safety evidence tools | Audio/evidence collection only after legal/privacy review, explicit consent, secure storage, retention limits and access controls. | Research required |

## Driver-first launch and corporate demand

- [ ] Run an invite-only Lagos pilot with verified independent drivers and fleets before public rider promotion.
- [ ] Publish fee breakdown and earnings-estimator assumptions before commercial terms; do not promise guaranteed rides, earnings or incentives without funded terms.
- [ ] Inspect vehicles for cleanliness, working A/C where required, seat belts, tyres/lights, roadworthiness and valid documents.
- [ ] Create driver support, incident reporting, appeal and payout-reconciliation procedures.
- [ ] Track driver activation, weekly active drivers, completed trips, cancellations, net earnings per online hour and 30/90-day retention.
- [ ] Recruit corporate pilots (employers, hotels, clinics, schools, event organisers and travel operators); define service zones, SLAs, cancellation/no-show rules, invoicing, spending limits, support and privacy.
- [ ] Validate repeat ride volume with 3–5 pilot organisations before scaling consumer acquisition.

## Mapping, PWA and release gates

- [ ] Restrict Google Maps browser/server keys and configure required APIs, billing and quotas before live route tests.
- [ ] Do not show driver pickup ETA until a real eligible driver is matched and current location/road route are available.
- [ ] Use real route/location data for live-trip progress; never substitute sample illustrations for a claimed live route.
- [ ] Test PWA install, iOS Safari home-screen flow, low bandwidth, permission denial, offline shell and accessibility.
- [ ] Push notifications require authenticated subscriptions, durable storage, VAPID secrets, delivery worker, retries and privacy-safe payloads.
- [ ] Before store submission: production authentication, dispatch, payments/receipts, cancellations/refunds, safety escalation, privacy/retention/deletion, driver vetting, monitoring, incident response, load/security tests and store disclosures.

## Release rule

A UI-only interaction is **Prototype**, not **Verified**. Wallet, payments, matching, identity and safety features require server-side enforcement, automated tests, audit logs, and explicit security/privacy review before being offered to real users. Any promotional reward must identify its funding source and must not be silently deducted from driver earnings.

## Existing setup and reference documents

- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) — project and migration setup.
- [LAUNCH_READINESS.md](./LAUNCH_READINESS.md) — Vercel configuration and pilot release gates.
- [INVESTOR_PROPOSAL.md](./INVESTOR_PROPOSAL.md) — launch strategy and illustrative financial scenarios.


## P1 — Cashless payments, driver payouts and traffic-aware pricing

See [PAYMENTS_AND_TRAFFIC.md](./PAYMENTS_AND_TRAFFIC.md) for the full requirements and proposed rollout. These items remain **Planned** until verified in the target environment:

- [ ] Compare Paystack, Flutterwave, Monnify and Paga for LagosGo's approved business model, collection methods, fees, payout APIs, settlement timing, refunds, disputes and marketplace/split-payment permissions.
- [ ] Implement provider-neutral payment adapters; server-side amount/reference creation; signed webhook verification; idempotency; refund and chargeback paths.
- [ ] Keep ride, collection, ledger and driver payout states separate; use integer kobo and append-only balanced ledger entries.
- [ ] Link verified driver identity, vehicle ownership/lease/fleet relationship and approved payout beneficiary; show gross fare, each fee/share and driver net.
- [ ] Do not promise payout within minutes unless the chosen provider's actual transfer capability, account limits, bank processing and end-to-end tests support that claim. Provider collection settlement and driver payout are distinct.
- [ ] Integrate traffic-aware road routing from a selected provider; display quote timestamp/freshness, expected duration, traffic conditions and itemised fare before booking; ask for confirmation on material quote changes.
- [ ] Test webhook replay/out-of-order delivery, duplicate payout prevention, delayed settlement, refunds, failed payouts, stale traffic, provider outages, low connectivity and reconciliation mismatches.
- [ ] Do not launch cashless-only rides until provider approval, security/legal review, support processes and a reconciled end-to-end sandbox/pilot pass are signed off.
