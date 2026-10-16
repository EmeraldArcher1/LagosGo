# Ride-Hailing Research and LagosGo Product Principles

**Status:** Research and product requirements; not proof that the listed features are implemented.  
**Pilot:** Lagos State, Nigeria.  
**Product position:** Lagos-rooted, Nigerian-built mobility platform designed for responsible state-by-state expansion.

## 1. Executive direction

LagosGo should learn from the ride-hailing category without copying another company's brand, proprietary interface, or operating assumptions. Our advantage should be a locally grounded experience, reliable operations, transparent driver economics, and accountable safety processes.

The primary product is not a map screen. It is a complete and dependable journey:
1. Passenger can request a ride with a clear pickup point and destination.
2. Passenger sees a comprehensible fare estimate and cancellation rules before confirming.
3. A verified, eligible driver receives an offer and knowingly accepts it.
4. Both parties see the same assigned driver/vehicle and trip status.
5. Pickup is verified; the trip cannot be started by an unrelated driver.
6. Trip progress, support and safety tools remain available throughout the journey.
7. Completion, fare, fees, payment and driver earnings reconcile into an auditable record.
8. Both sides can report problems and receive a trackable resolution.

Never label a feature live until it is implemented, tested in the target environment, and verified after deployment.

## 2. Category lessons to adapt

### Uber: dependable workflow and safety infrastructure
Public Uber safety materials describe GPS trip tracking, PIN trip verification, trusted contacts and trip sharing, in-app safety tools, driver screening, vehicle inspection, support and detection of unusual trip stops. Availability varies by market.

**LagosGo adaptation:** build safety into the normal ride lifecycle, not a hidden settings page. Show the verified driver's photo, vehicle make/model, registration and rating before pickup. Support trip PINs, shareable live trip details, a prominent safety centre, incident reporting and operationally staffed escalation. Irregular-stop or route-deviation alerts must be treated as prompts to check welfare—not proof that an incident occurred.

### Bolt: quick access to practical controls
Bolt's public safety materials describe pickup codes, identity rechecks, trusted contacts, location sharing, emergency assistance, privacy protections and ride checks, with market-dependent availability.

**LagosGo adaptation:** keep the critical actions easy to find with one hand: verify pickup, share trip, call support, report a safety concern. Hide personal phone numbers where feasible, use masked calling or in-app messaging when supported, and make emergency escalation honest about which response service is actually available.

### inDrive: user choice and driver autonomy
inDrive describes peer-to-peer fare negotiation, choice of driver and vehicle, and driver choice over offers. Negotiation can make price formation more transparent, but it can also add friction, delay matching and expose users to inconsistent offers.

**LagosGo adaptation:** default to a clear upfront fare with a transparent breakdown and a sustainable driver payout. Test optional driver-choice or counter-offer experiments only in a controlled pilot, with guardrails against discriminatory selection, unsafe bargaining and bait-and-switch prices. Do not require negotiation as the only way to book a ride.

### Other category patterns to assess
Study scheduled rides, business/fleet accounts, saved places, family booking, accessibility options, multi-stop trips, airport transfers, receipts, refunds, lost-item flows, support case tracking, driver earnings summaries and low-bandwidth performance. Each must be prioritised against actual Lagos user research and operating capacity—not added merely because a competitor has it.

## 3. Lagos-specific product identity

- Use an original LagosGo yellow-and-black visual identity, informed by the city's transport culture without implying government endorsement.
- Build pickup around landmarks, estates, bus stops, gates, junctions and clear pickup notes as well as map pins. Confirm the exact pickup location with the passenger and driver.
- Distinguish **driver pickup ETA** from **trip duration**. Pickup ETA requires the matched driver's current location and a road route; trip duration estimates the journey after pickup.
- Account for traffic, road closures, difficult turns, gated estates, poor GPS, network interruptions and passengers who prefer a voice or phone-assisted flow.
- Use plain English first and validate local-language support through real users. Local names and landmark suggestions must be accurate and editable.
- Optimise for mobile web/PWA and modest devices; make key flows fast, readable, accessible and resilient to temporary connectivity loss.
- Never invent drivers, live availability, route results, ratings, prices or completed trips in a production-facing interface.

## 4. Trust and safety requirements

### Driver and vehicle onboarding
- Verify identity, driving eligibility, vehicle ownership/authorisation, registration, required licences, insurance and vehicle roadworthiness according to applicable law and platform policy.
- Use document review plus liveness/selfie rechecks where lawful and proportionate. Detect duplicate or changed accounts and escalate exceptions for human review.
- Keep approval states explicit: pending, approved, rejected, suspended and expired. Expired mandatory documents should block new trip acceptance.
- Keep identity documents private, encrypted where supported, access-controlled, retained only as long as needed, and excluded from logs and analytics payloads.

### Pickup and in-trip controls
- Generate a trip-specific PIN or pickup code; the backend must reject trip start until the correct code is verified, subject to a safe fallback process.
- Record trip lifecycle events server-side with actor, timestamp and relevant reason: requested, offered, accepted, driver arrived, pickup verified, started, completed, cancelled and disputed.
- Provide trip sharing with limited-duration links and only the information needed for safety.
- Detect unusual long stops, unexpected route deviation, duplicate GPS points and possible loss of connection as signals for review. Avoid false certainty and provide a way for users to say they are safe.
- Give both rider and driver a clear, accessible incident-reporting path. High-severity cases need a defined human escalation and documented follow-up; a button alone is not an emergency response operation.
- Establish incident triage, response ownership, evidence preservation, account restrictions, appeals and appropriate cooperation with emergency services before launch.

### Privacy and abuse prevention
- Collect the minimum personal and precise-location data necessary; explain purpose, access and retention.
- Enforce authorisation on the server for every ride, profile, wallet, payment, document and safety record. A hidden UI button is not access control.
- Use row-level security (RLS), least-privilege service roles, rate limits, abuse detection and audit trails. Never expose a Supabase service-role key in client code.
- Use short-lived, scoped links for trip sharing; do not expose public trip IDs as authorisation.
- Apply controls for account takeover, fake GPS, device/account duplication, promo abuse, payment disputes, fraudulent cancellations and harassment.
- Define a breach-response process and a data-retention/deletion policy before collecting real customer identity and location data.

## 5. Driver economics and fair dispatch

- Show passenger fare, estimated driver payout, platform fee, taxes/levies where applicable, tolls and any other charge before confirmation whenever known.
- Maintain an append-only or otherwise auditable ledger for fares, fees, incentives, refunds, adjustments and payouts. Every correction should have a reason and actor.
- Do not silently deduct incentives or change the fare after the trip. Recalculate only under disclosed rules and keep a before/after record.
- Keep platform fees low and capped only at a level supported by verified unit economics. Model payment fees, support, insurance, taxes, fraud, refunds, maps, hosting, incentives and operations before setting a permanent rate.
- Matching must first apply hard eligibility checks, then rank eligible drivers by road ETA, quality, reliability and fairness. Acceptance rate must not dominate dispatch.
- Monitor earnings per online hour, offers per driver, acceptance, cancellation, pickup ETA and completed trips by zone and time. Detect unfair offer concentration and investigate systematic disadvantages.
- Any driver incentive must have published eligibility, a budget owner, anti-fraud rules and a clear ledger entry.

## 6. Technical architecture and operating infrastructure

### Core services
1. **Identity and access:** passenger, driver, fleet operator, support and administrator roles; secure sessions and role-specific permissions.
2. **Ride API and state machine:** server-authoritative transitions with validation and idempotency.
3. **Dispatch:** candidate discovery, road-ETA calculation, sequential offers, offer expiry, atomic driver/ride assignment and retry policy.
4. **Live presence and trip events:** short-lived driver presence plus durable trip history; never treat an old location as current.
5. **Routing/maps:** provider with verified Lagos coverage, traffic data, cost, usage terms and key restrictions.
6. **Payments and ledger:** payment provider integration, webhook signature verification, idempotency, refunds, reconciliation and payout status.
7. **Notifications:** push/SMS/email as appropriate, delivery status and retry handling; notification delivery must not be the source of truth for trip state.
8. **Safety and support console:** incident queue, severity, ownership, SLA, evidence access controls, case history and resolution audit.
9. **Observability:** structured logs without secrets or unnecessary PII, error tracking, service health, latency and cost monitoring.
10. **Release pipeline:** automated tests, migration review, staging/preview verification, backups and a rollback plan.

### Suggested initial stack boundaries
- Preserve the current mobile-first frontend and PWA until an audit proves a replacement is needed.
- Use PostgreSQL/Supabase for durable records and RLS-protected data. Keep service-role credentials server-only.
- Use a suitable short-lived store for driver presence and offer locks if PostgreSQL alone cannot meet measured dispatch needs. Do not introduce extra infrastructure without a concrete requirement.
- Keep server-side business rules in trusted API/functions; clients must not be able to assign themselves drivers, approve documents, alter fares, mark payments settled or write arbitrary trip states.
- Use signed payment webhooks and reconcile provider records against internal ledger entries.
- Separate development, preview/staging and production credentials and data.

## 7. Required core data and invariants

The implementation will need well-defined records for profiles/roles, driver applications, vehicles/documents, driver presence, ride requests, offers/assignments, trip events, fare quotes/components, payment transactions, ledger entries, refunds, incentives, safety incidents, support cases and audit events.

Required invariants:
- One active assignment per ride and no driver assigned to overlapping active rides unless a supported product explicitly permits it.
- Assignment and acceptance must be atomic to prevent two drivers winning the same ride.
- Only valid state transitions are accepted; retries must not duplicate rides, charges, rewards or payouts.
- The driver assigned to a trip must be approved, eligible and associated with the displayed vehicle.
- A trip cannot start before pickup verification unless a documented, auditable fallback is invoked.
- A fare quote records its inputs, expiry and rules; the completed fare and all adjustments remain explainable.
- Payment-provider success and an internal ledger entry are separate facts until reconciled.
- A passenger or driver may read only records they are authorised to access; administrators' privileged actions are audited.

## 8. Pilot launch gates

Do not open public ride booking until all of these pass in a real test environment:

- Passenger and driver authentication, account recovery and role-based access.
- Driver/vehicle approval and expiry enforcement.
- Real ride request, driver offer, accept/reject/timeout, atomic assignment and cancellation.
- Correct road-based driver pickup ETA and passenger trip duration.
- Verified pickup, trip start, live trip updates, completion and offline/reconnect handling.
- Transparent fare, payment or documented cash workflow, refunds and driver ledger reconciliation.
- Safety sharing, incident intake, support ownership and a tested escalation runbook.
- RLS and negative authorisation tests for passenger, unapproved driver, approved driver, fleet and admin roles.
- Automated tests for state transitions, duplicate requests, double assignment, webhook replay, ledger integrity and privacy boundaries.
- Load, latency, monitoring, backup/restore and rollback checks appropriate to the pilot.
- Operational staffing, driver supply, vehicle standards, complaint handling and applicable local regulatory/compliance review.

## 9. Metrics that define customer experience

Measure the journey, not vanity downloads:
- Request-to-match time; match success rate; driver pickup ETA accuracy.
- Driver arrival punctuality; passenger cancellation and driver cancellation rates.
- Completed rides / requests; trip failure and support contact rates.
- Safety reports per trip, time to acknowledge, time to resolve and repeat incident patterns.
- Fare estimate accuracy; disputed fare rate; refund time.
- Driver net earnings per online hour, payout reliability and offer distribution fairness.
- App start time, failed requests, crash/error rate, data consumption and performance on lower-end devices.
- Passenger repeat rate, driver retention, satisfaction and reasons for churn.

Break metrics down by zone, time, service type and user group where lawful and statistically responsible. Review adverse outcomes instead of optimising a single metric in isolation.

## 10. Phased roadmap

**Phase 0 — Verify and protect:** audit current main branch, deployment, environment configuration, migrations and tests. Preserve working functionality and do not assume backend features are live.

**Phase 1 — Ride reliability:** secure auth and RLS, durable ride records, driver approval, dispatch/assignment, trip lifecycle, location updates, fares and ledger, support/safety, tests and observability.

**Phase 2 — Lagos experience:** landmark-aware pickup, pickup codes, trip sharing, receipts, cancellation clarity, accessibility and support workflows based on pilot feedback.

**Phase 3 — Trust and retention:** mutual ratings, lost-item flow, family booking, ride gifting/Pay for Me and loyalty rewards after payment and fraud controls are ready.

**Phase 4 — New services:** airport transfers, corporate/fleet transport and deliveries/errands after the core ride service is dependable.

**Phase 5 — State expansion:** launch one new state at a time only after local legal review, driver supply, support capacity, routing quality, unit economics and pilot metrics meet agreed thresholds. Use the same core platform with state-specific configuration rather than creating disconnected systems.

## Sources reviewed

- Uber Nigeria, rider safety overview: https://www.uber.com/ng/en/ride/safety/
- Uber Nigeria, Safety Toolkit announcement: https://www.uber.com/ng/en/newsroom/new-safety-toolkit-arrives-nigeria/
- Uber Help, trip PIN verification: https://help.uber.com/riders/article/what-is-verify-your-trip
- Bolt, ride safety overview: https://bolt.eu/en/rides/safety/
- Bolt Nigeria service-provider terms (effective 1 October 2025): https://bolt.eu/en-ng/legal/rides/tnc-service-providers/
- inDrive, company and peer-to-peer pricing model: https://company.indrive.com/
- TechCabal, Bolt's limited Nigerian fare-negotiation pilot (19 May 2025): https://techcabal.com/2025/05/19/bolt-fare-negotiation/

Competitor features and availability vary by market and can change. These public sources are a starting point, not a complete audit of every operator or proof of current Lagos feature availability. LagosGo must validate local legal obligations, operational partners and customer needs before implementing or advertising any safety capability.
