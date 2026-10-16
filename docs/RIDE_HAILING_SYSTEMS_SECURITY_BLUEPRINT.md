# LagosGo Ride-Hailing Systems, Security and Operations Blueprint

**Status:** engineering guidance and audit checklist; not proof that systems are implemented. Reviewed 16 October 2026.

## How ride-hailing platforms work
Ride-hailing is a real-time two-sided marketplace, not merely a booking screen. A production operator needs passenger and driver apps, identity and vehicle compliance, dispatch, maps/routing, payments, support, fraud controls, insurance, incident response and regulatory reporting.

Typical trip lifecycle:
1. Authenticate passenger; verify driver identity, licence, applicable certification, vehicle, inspection, insurance and required documents.
2. Resolve pickup/destination and calculate a road-route fare estimate. Show price components and cancellation terms.
3. Create a durable ride with server-generated ID and idempotency key.
4. Filter eligible drivers, estimate road ETA for a shortlist, send expiring offers and atomically assign one driver.
5. Verify pickup against driver, vehicle, plate and preferably a PIN.
6. Deliver authorised trip updates and safety tools; monitor unusual stops and route anomalies.
7. Complete only through a server-validated state transition. Reconcile payment and calculate earnings from auditable records.
8. Support ratings, complaints, refunds, incidents, lost property and insurance claims.

Never trust the frontend alone to declare a driver approved, trip complete, payment successful or fare authoritative.

## Global and Nigerian patterns to study
- **Uber:** driver screening, trip sharing, privacy controls, unusual-trip monitoring and safety support. Reuters reported Uber ended Nigerian operations on 2 September 2026, so LagosGo must not assume Uber remains a local competitor.
- **Bolt:** pickup codes, trusted contacts, location sharing, emergency assist, ride checks and driver identity re-verification. Bolt publishes Nigeria-specific ride-hailing insurance information; confirm policy limits and exclusions directly.
- **Lyft:** pre-trip verification, in-ride monitoring, emergency assistance and dedicated safety support; availability varies by region.
- **inDrive:** negotiation-led pricing shows an alternative to fully algorithmic fares, but negotiation alone does not guarantee fairness.
- **Local and fleet-led operators:** study leasing, corporate transport, airport operations, local payments and driver supply. Verify every feature and compliance claim in the actual launch city.

Adopt proven safety and marketplace principles, not third-party code, branding or proprietary UI. LagosGo should differentiate through transparent driver net earnings, reliable pickup ETA, Lagos-aware landmarks, fair support and fleet operations.

## Compliance and local operations
Before commercial launch, confirm current rules with relevant authorities, transport counsel and insurers. Maintain a state-by-state matrix for operator registration, trip reporting, driver identity/licence/certification, vehicle registration and inspection, insurance, document expiry, incident records, lawful authority requests and privacy/retention requirements. Airport pickups, interstate rides and delivery services may have separate requirements.

Lagos officials were reported in August 2025 to have ordered vehicle inspections and stressed driver certification and reliable operator databases. Verify current official rules; this report is not legal advice. Abuja has a separate FCTA e-hailing operator licensing process, so expansion requires local review.

## Recommended architecture
Keep the first system simple; do not start with microservices without a demonstrated need.

- **Passenger PWA:** destination search, quote, booking, matched driver/vehicle, pickup PIN, trip status, safety, trusted contact/share, receipt and support.
- **Driver app/PWA:** onboarding, document status, online/offline, offers, trip controls, navigation handoff, earnings and incident reporting.
- **Operations console:** review documents, approve/suspend drivers, inspect trip timelines, resolve disputes and audit privileged actions. Require MFA and least privilege.
- **Supabase Auth:** identity and sessions. Never trust user-editable metadata for role or approval.
- **PostgreSQL:** users, driver applications/documents, vehicles, rides, offers, ride events, fare quotes, payments, ledger, incidents, consents and admin audit.
- **Trusted server endpoints / Edge Functions:** quote validation, ride creation, dispatch, accept/decline, state transitions, payment webhooks, refunds and admin actions.
- **Realtime:** send only the minimum authorised trip updates to passenger, assigned driver and authorised operations staff.
- **Presence/dispatch store:** add later if needed for frequent location updates, expiring offers and locks; PostgreSQL remains durable source of truth.
- **Maps/routing:** Lagos road routes, geocoding and traffic-aware ETA. Restrict keys by API/origin; proxy privileged calls server-side; confirm coverage, price, data terms and fallback.
- **Payments:** licensed provider, signed webhooks, idempotency, reconciliation and auditable ledger. Never store card credentials or trust a client redirect as proof of payment.
- **Messaging and operations:** rate-limited SMS/voice OTP, push/email, structured logs, metrics, alerts, crash reporting, uptime checks, tested backups and incident runbook.

Use integer kobo for NGN. Separate identity documents and precise location histories from broadly accessible tables and logs.

## Security requirements
**Identity and access**
- Driver and vehicle approval must precede dispatch eligibility. New users default to passenger; driver approval/admin promotion must use privileged workflows.
- Enforce least privilege with RLS and explicit grants. Test anonymous, passenger A, passenger B, pending driver, approved driver and admin.
- Users must not read other users' rides, phone numbers, exact addresses, documents or safety cases.
- Keep service-role, payment, SMS and private VAPID keys server-side. Never commit secrets or paste them into chat.
- Protect admin accounts with MFA and audit trails.

**Ride integrity**
- Validate state transitions server-side. Use atomic transactions/conditional updates so two drivers cannot accept one ride.
- Use idempotency keys for booking, payments, refunds and webhooks. Expire offers server-side; reject stale driver locations.
- Derive identity from the authenticated session, not request-body IDs. Never trust client-supplied fare, role, approval, trip status, payment status or incentive.
- Rate-limit OTP, login, booking, accept/decline, cancellation and support endpoints.

**Privacy and safety**
- Collect location only when needed; explain tracking and restrict live location to trip participants and authorised staff.
- Define retention for precise location, with documented safety/dispute/legal exceptions. Use TLS, encryption at rest, secret rotation and access logs.
- Do not log OTPs, tokens, identity documents, payment secrets or unnecessary coordinates.
- Trusted contacts and location sharing must be opt-in and revocable. Do not promise emergency response without a staffed, tested escalation process.
- Provide severity levels, support ownership, evidence access controls and tested incident drills. Run an independent penetration test before public launch.

**Payments and fraud**
- Separate fare, platform fee, taxes/levies, driver earnings, incentives, refunds and chargebacks.
- Keep ledger entries append-only; use reversing entries rather than silent edits.
- Verify webhook signatures/timestamps/event IDs, process idempotently and reconcile provider reports daily.
- Monitor account takeover, GPS spoofing, fake trips, collusion, promo abuse, reversals and suspicious cancellations. Provide human review and appeal.

## Dispatch and driver-first economics
1. Apply hard eligibility filters first: approved driver, valid vehicle/documents, online, available, service-zone eligibility and ride compatibility.
2. Use proximity to shortlist, then road ETA; straight-line distance is not pickup ETA.
3. Keep the planned LagosGo score: 0.55 ETA, 0.15 quality, 0.15 fairness, 0.10 reliability, 0.05 direction. Normalise inputs, version the algorithm and log ranking reasons.
4. Use expiring offers and atomic acceptance. Monitor dispatch latency, pickup ETA, acceptance, cancellations and offer concentration by zone/time.
5. Show fare assumptions and rules for traffic, waiting, tolls and route changes.
6. Show drivers gross fare, platform fee, deductions and expected net before acceptance.
7. Measure net earnings per online hour after fuel/energy, maintenance, financing/lease, insurance and unpaid waiting—not gross fare alone.
8. Do not let acceptance rate dominate ranking; audit outcomes across zones, times and driver cohorts.

## Pilot release gates
Do not accept public rides until all pass:
- [ ] Intended Supabase project and migration history confirmed; backups inspected.
- [ ] Auth, recovery and role-escalation tests pass.
- [ ] Driver/vehicle approval, expiry and suspension work.
- [ ] Booking and server-calculated quote work end-to-end.
- [ ] Only eligible drivers receive offers; assignment is atomic and duplicate-safe.
- [ ] Both devices receive authorised live trip updates.
- [ ] Pickup verification, cancellation, completion, receipt and support work.
- [ ] Payment test transactions, signed webhooks, ledger and reconciliation pass.
- [ ] Safety reporting, trusted contacts and escalation drills are tested.
- [ ] RLS and server authorisation prove cross-user isolation.
- [ ] Alerts, rate limits, restore tests, outage handling and incident runbook are ready.
- [ ] Licensing, inspection, insurance, legal and privacy approvals are documented.
- [ ] Closed pilot with trained drivers and staffed support is signed off.

## Repository-specific audit findings
Based on the repository files inspected; this does not prove the live database or deployment has the same state.

- README correctly describes a front-end prototype with backend scaffolding and warns against treating sample rides as live.
- Migration 001 has useful foundation tables, event triggers, RLS, restricted grants and a guard against direct client ride mutation.
- **High-priority driver onboarding issue:** the auth trigger creates profiles with role passenger, while the driver profile insert policy requires the profile role to be driver. The shown migration does not provide a safe application/promotion workflow, so a normal new user cannot create a driver profile under that policy. Do not fix this by letting users set their own role. Add a driver application table and privileged approval operation.
- **Approval-policy review:** the driver self-update policy checks ownership; current column grants restrict updates, but verify no later grant or RPC lets a driver change review status. Approval fields must remain server/admin-only.
- Test vehicle registration normalisation against real plate formats.
- **Dispatch gap:** migration 001 has no dedicated offer/lock table. Add transactional offer/acceptance before real bookings.
- **Financial gap:** migration 001 has no payment/webhook records or earnings ledger. Add these before accepting money.
- Applying migration 001 is not confirmed by this review. Confirm the exact intended Supabase project and migration history before database changes; never apply to a similarly named or unrelated project.

## References
- Uber Nigeria safety: https://www.uber.com/ng/en/safety/
- Reuters, Uber Nigeria exit, 2 September 2026: https://www.reuters.com/world/africa/uber-exit-nigeria-after-12-years-operations-2026-09-02/
- Bolt ride safety: https://bolt.eu/en/rides/safety/
- Bolt Nigeria insurance: https://bolt.eu/en-ng/insurance/other/insurance-information-document/
- Lyft rider safety: https://help.lyft.com/hc/en-us/all/articles/7229653855-Safety-info-for-riders
- Lagos e-hailing inspection/compliance reporting, Channels Television, 10 August 2025: https://www.channelstv.com/2025/08/10/lagos-orders-mandatory-checks-for-e-hailing-drivers/
- FCTA e-hailing licensing: https://www.aiitis.fcta.gov.ng/e_hailing_passenger_service.php
- Supabase database security: https://supabase.com/docs/guides/database/secure-data
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP API Security Top 10: https://owasp.org/www-project-api-security/

These are starting points, not legal advice or proof that a feature is available in every launch location.
