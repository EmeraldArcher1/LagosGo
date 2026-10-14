# LagosGo — Phase 1 Backlog

Status legend: **Planned** = not implemented; **Prototype** = interface/demo only; **In progress** = implementation underway; **Verified** = implemented and tested in the target environment.

## Five Phase 1 customer-facing features

| Priority | Feature | MVP acceptance criteria | Status |
|---|---|---|---|
| P1 | Wallet gifting | Sender selects recipient and amount; recipient is confirmed; limits and consent are enforced server-side; every debit/credit is an idempotent ledger entry; insufficient balance and failed transfers are handled safely. | Planned |
| P2 | Pay for Me | Rider can designate a payer; payer sees ride, amount/estimate, and pickup context and explicitly approves; no charge before approval; cancellation/refund states are auditable. | Planned |
| P3 | Ride streak incentives | Rules and progress are visible; eligibility and expiry are explicit; rewards have a defined funding source and ledger trail; abuse and duplicate claims are prevented. | Planned |
| P4 | I Arrived Safely | Rider can voluntarily check in at arrival; trusted-contact sharing is opt-in; location exposure is minimised; failed or delayed check-ins have clear, non-alarmist handling. | Planned |
| P5 | Two-tap mutual ratings | Passenger and driver can each rate after a completed trip; one rating per eligible participant; ratings are private until submission or policy-defined release; abuse reporting is available. | Planned |

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