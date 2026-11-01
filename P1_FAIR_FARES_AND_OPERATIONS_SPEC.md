# LagosGo P1 — Fair Fares, Driver Earnings and World-Standard Operations

**Status:** Proposed implementation specification  
**Applies to:** LagosGo only  
**Scope:** PR #20 planning and subsequent P1 delivery  
**Release boundary:** This document does not authorise production changes, public ride bookings, payment activation, driver guarantees, plan/billing changes, or PR merge.

## 1. Product outcome

Deliver a verifiable, invite-only Lagos ride pilot in which passengers receive clear and defensible prices, drivers receive correctly calculated and auditable earnings, and LagosGo earns a sustainable fee without shifting undisclosed costs onto either side.

The pilot is not ready merely because screens or database tables exist. A capability is **Verified** only after server-side enforcement, automated tests, operational procedures and end-to-end evidence in the intended environment.

## 2. Trip economics and fare disclosure

For each completed or cancelled trip, the system must be able to reconcile:

`Passenger charge = Driver gross entitlement + Platform fee + Explicitly disclosed third-party charges/taxes + Separately funded incentives or adjustments`

The fare engine must define each component and its payer/beneficiary. No unexplained residual, hidden deduction or double counting is permitted.

### Passenger and driver disclosure

Before passenger confirmation, show the estimated total and itemised components, including applicable base fare, distance/time components, waiting/cancellation charges, tolls or other pass-through charges, taxes/levies where applicable, discounts and estimate conditions. State when an estimate may change and why.

Before a driver accepts, show the expected driver gross amount, platform fee or other authorised deduction, any funded bonus, and the rules governing adjustments. After the trip, both parties receive a receipt/earnings statement consistent with the ledger.

### Fee policy

- Adopt a publicly stated platform-fee ceiling as a product policy only after financial, tax and legal validation. The proposed 15–20% range is a decision to validate, not a live fee or approved rate.
- Calculate the fee from a documented basis (for example, eligible fare components), disclose exclusions and rounding, and enforce the ceiling server-side.
- No fee, levy, commission or deduction may be introduced by a client-only calculation.
- Fare rules must be versioned so historical trips can be reconciled against the rules in force when they were accepted.

### Demand pricing

- Prefer route- and traffic-aware estimates grounded in a real routing response; never use straight-line distance as a live route quote.
- If demand multipliers are introduced, show the multiplier and resulting price before confirmation, enforce a published ceiling, log the applied rule, and test boundary cases. A 1.5x ceiling is a proposal for pilot validation, not an existing guarantee.
- Keep rider-suggested fare negotiation bounded, time-limited and explicit; never disguise it as a guaranteed quote.
- Evaluate fixed-price airport corridors only after field-validated routes, waiting rules, tolls, driver costs and cancellation terms are modelled.

## 3. Driver earnings protection and incentives

Track net driver earnings per online hour using an explicitly defined denominator and auditable inputs. Distinguish online/available time, engaged trip time, unpaid waiting, deadhead travel, expenses and cash/digital settlement so the metric cannot be gamed or misrepresented.

Any minimum-earnings top-up or campaign incentive must:
- be funded by a named, approved campaign/platform budget or external sponsor;
- have a budget ceiling, eligibility window, zone/time scope and expiry;
- be recorded as a separate ledger credit with campaign/funder reference;
- be idempotent and protected against duplicate claims;
- never be funded by silently reducing another driver's fare or payout;
- not be advertised as guaranteed until funding, terms and operational capacity are approved.

No earnings guarantee is active under this specification.

## 4. Payments, earnings and payout ledger

Build a server-authoritative, append-only, auditable ledger. Corrections use linked reversal/adjustment entries; historical entries are not overwritten or silently deleted.

Minimum capabilities:
- unique idempotency keys for ride settlement, provider webhooks, refunds, adjustments and payout instructions;
- explicit ledger accounts and balanced postings for passenger charges, driver payable, platform revenue, taxes/pass-through amounts, incentive funding, refunds and payment-provider clearing;
- immutable references to ride, fare-rule version, payment intent/provider event, campaign and operator action where applicable;
- reconciliation between quoted/accepted fare, final trip state, provider settlement, cash declaration where supported, driver payable and payout status;
- partial/full refunds, failed/late/duplicate webhooks, chargebacks and payout reversals with auditable state transitions;
- role-restricted access, least privilege, sensitive-data minimisation and tamper-evident audit history;
- driver-visible statements showing gross fare, each deduction/adjustment, incentive credits, net payable, payout reference and status.

Payout frequency and any instant/same-day promise must be selected only after provider availability, fees, settlement windows, fraud controls, liquidity and support capacity are verified. Do not claim instant payouts until proven.

## 5. Dispatch reliability and marketplace fairness

Retain hard eligibility gates before ranking: approved driver and vehicle, current required documents, online/available status, fresh location, permitted service zone and trip compatibility.

For each dispatch attempt:
- use real road ETA/traffic for eligible candidates after a bounded shortlist;
- atomically reserve the ride and driver so neither can receive conflicting assignments;
- use expiring, sequential offers with clear accept/decline/timeout handling;
- make retry, expansion and no-match states explicit to the passenger;
- propagate the authoritative trip state to both passenger and driver clients, with safe reconnect/recovery behaviour;
- never display fabricated driver identity, location, rating or pickup ETA.

Instrument the agreed matching score components (ETA, quality, fairness, reliability, direction) separately. Record the inputs and score version used for each decision. Acceptance rate must not dominate ranking.

### Anti-concentration and fairness monitoring

Measure, by zone and time window:
- offers and completed trips per eligible/online driver;
- share of offers and completed trips received by the top drivers;
- driver offer acceptance, decline, timeout and cancellation rates;
- net earnings per online hour, median and distribution;
- pickup ETA accuracy, empty/deadhead distance where available, and driver idle time;
- new/low-volume driver access to opportunities.

Set fairness thresholds only after a baseline pilot dataset exists. Detect disproportionate concentration and investigate causes; do not automatically punish drivers or guarantee equal trip allocation. Changes to ranking weights require offline evaluation, regression tests and documented approval.

## 6. Safety, support and dispute operations

Support and dispute operations are a first-class P1 capability, not a post-launch add-on.

Required operational workflow:
1. Passenger or driver can submit a trip-linked issue with category, description and optional evidence.
2. The API authenticates the reporter, checks trip participation, rate-limits submissions and applies evidence size/type restrictions.
3. A case receives a durable ID, severity, owner/queue, timestamps, status, response target and audit trail.
4. Trained support staff can review relevant trip, fare, payment and safety events under role-based access.
5. Serious safety reports follow a documented escalation tree with named on-call responsibility and local emergency-service guidance; the app must not imply emergency response is staffed unless it is.
6. Fare/payment disputes support evidence review, ledger reconciliation, reasoned decisions, refunds/adjustments and appeal.
7. Drivers and passengers can appeal moderation or account decisions; serious action requires human review and recorded rationale.
8. Case closure records outcome, customer communication, actions taken and any follow-up.

Before pilot, publish support hours, channels, expected response targets, urgent-safety limitations, evidence retention periods and appeal process. Targets must be resourced and tested; do not publish fictional SLAs.

Safety requirements include identity/vehicle verification, consent-based and time-limited trip sharing, privacy-aware location access, incident reporting, least-privilege staff access, retention/deletion rules and a rehearsed escalation process. Prototype controls are not live safety services.

## 7. Pilot sequencing and gates

### Gate A — operational foundations
- Authentication and role authorization verified for passenger, driver and support roles.
- Driver and vehicle onboarding, document expiry/review and approval/rejection are auditable.
- Durable ride lifecycle and atomic dispatch pass concurrency, retry and recovery tests.
- Road ETA and pickup ETA are based on verified routing/location data.
- No sample driver, route, rating, price or safety state is presented as live.

### Gate B — fare and money integrity
- Fare calculation is deterministic, versioned, bounded and itemised.
- Ledger postings balance and are idempotent under duplicate/reordered events.
- Refunds, failed payments, cash settlement where supported, reconciliation and payout reporting pass tests.
- Driver statement reconciles to the ledger.
- Incentives have an approved funder and budget; no cross-driver subsidy or silent deduction exists.

### Gate C — support and safety readiness
- Case management, ownership, response targets and escalation are operational.
- Staff roles and access are tested; audit records are reviewable.
- Passenger/driver incident and payment-dispute scenarios are rehearsed.
- Privacy, consent, retention and deletion controls are verified.

### Gate D — controlled pilot
- Invite-only pilot in a bounded Lagos service zone with a verified driver cohort.
- Validate real demand, pickup ETA, completion/cancellation, driver net earnings per online hour, offer concentration, support volume and retention.
- Run 3–5 corporate/fleet pilots only when service levels, invoicing, spending limits and support processes are ready.
- Expand zones or passenger acquisition only when evidence supports supply, service quality and unit economics.

Do not invent numerical launch thresholds. Establish baseline data, agree thresholds with operations and finance, and record them before the pilot gate review.

## 8. Required metrics

**Driver:** net earnings per online hour, active/retained drivers, offer acceptance, trip completion, cancellation, payout timeliness and payout failure.

**Passenger:** request-to-match time, pickup ETA accuracy, completion rate, cancellation, fare estimate variance, refund rate and support cases per 100 trips.

**Marketplace:** eligible supply by zone/time, offer concentration, unmatched demand, deadhead distance, dispatch retries and road-ETA coverage.

**Finance/operations:** contribution per trip, platform fee as a share of eligible fare, payment-provider cost, incentive spend by funder/campaign, refund/chargeback loss, reconciliation breaks and support cost per trip.

Metrics must have written definitions, data owners, reporting windows and safeguards against misleading averages.

## 9. Engineering and release requirements

- Server-side validation and authorization are authoritative; client values are untrusted.
- Use database constraints/transactions for ledger balance, idempotency and assignment locks.
- Add unit, integration, concurrency, security and end-to-end tests for failure paths, not only happy paths.
- Add structured logs, correlation IDs, monitoring and alerting without leaking secrets or unnecessary personal/location data.
- Review database migrations for RLS, grants, indexes, rollback/forward-fix plan and production impact.
- Keep provider credentials server-side and verify API restrictions, quotas and billing.
- Maintain accessibility, low-bandwidth and iOS Safari/PWA testing.
- Any production migration, payment activation, public booking enablement, pricing-policy activation or billing change requires separate explicit approval.

## 10. Immediate implementation order

1. Baseline and verify current ride, dispatch, routing, auth and safety foundations; resolve document-verification gaps.
2. Design and review ledger schema, account model, posting invariants and idempotency contract.
3. Implement fare calculation and versioned fare breakdown against the ledger model.
4. Implement settlement, refunds, reconciliation and driver statements.
5. Add support case/dispute workflow and operational playbooks.
6. Instrument driver fairness and offer concentration; evaluate ranking changes with pilot data.
7. Complete end-to-end pilot gates before activating live rides.

**Definition of done:** one controlled trip can be traced from authenticated request through eligible road-ETA match, passenger/driver state transitions, fare calculation, payment/settlement, balanced ledger, driver payable/payout record and support case history—with tests and evidence for normal, retry, failure and dispute paths.
