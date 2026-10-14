# LagosGo — Master Project Checkpoint
**Checkpoint date:** 14 October 2026  
**Source of truth:** https://github.com/EmeraldArcher1/LagosGo  
**Purpose:** Preserve product decisions, verified repository facts, outstanding work, and the agreed next steps. Update this document as evidence changes.

## 1. Working agreement
- Stop creating further mock-ups or demo features as a substitute for a working product.
- Review the existing app, repository, deployment, configuration, workflows, security and user journeys before making changes.
- Make no assumptions about functionality, costs, traction, driver numbers, investor returns, integrations or readiness. Mark every item **Verified**, **Needs work**, or **Proposed** and record evidence.
- Prefer small, testable changes to the existing app. Preserve working features and keep secrets out of source control.
- Do not launch public rides or claim production readiness until the complete ride lifecycle is verified end to end.

## 2. Product vision
LagosGo is a Lagos-first, driver-first ride-hailing platform intended to expand across Nigeria. Its goals are fair and transparent driver earnings, clear upfront passenger pricing, safe and dependable trips, professional vehicle standards, and fleet/corporate-friendly operations. Brand direction: modern, friendly, mobile-first, yellow and black. Working tagline: **LagosGo — Move Lagos. Move Nigeria.**

Core principles:
1. Transparent driver earnings and disclosed, capped platform fees.
2. Fair, upfront passenger pricing.
3. Strong identity, vehicle and safety checks with privacy minimisation.
4. Reliable dispatch and pickup ETA based on real drivers and road routes.
5. Auditable payment, commission, incentive, refund and payout records.
6. Lagos operations first; expansion only when reliability and economics justify it.

## 3. Repository facts observed on 14 October 2026
Repository: https://github.com/EmeraldArcher1/LagosGo  
Default branch: `main`; repository is public; GitHub connection reported push/admin permission.

Files present in root:
- `README.md`
- `BACKLOG.md`
- `LAUNCH_READINESS.md`
- `INVESTOR_PROPOSAL.md`
- `index.html`, `styles.css`, `app.js`
- `package.json`
- `manifest.webmanifest`, `sw.js`
- `icons/`
- `api/leads.js`, `api/maps/`, `api/push/`
- `.github/workflows/quality.yml`

The repository README explicitly describes the product as a static front-end prototype. It states that live driver dispatch, payment processing, authentication, persistent ride database and production map integration are not yet implemented. The PWA provides an installable shell, not a production ride service. UI-only interactions must not be labelled verified functionality.

The package test script currently performs JavaScript syntax checks on `app.js`, `api/maps/config.js`, `api/maps/route.js`, `api/maps/landmarks.js`, and `api/leads.js`. GitHub Actions also checks that core files exist. These checks are useful but do not prove end-to-end functionality, security, accessibility, deployment configuration or production readiness. The actual latest workflow run and deployed website still need to be checked.

## 4. Current status ledger

### Verified from repository content
- A responsive front-end/PWA shell and yellow/black design assets exist.
- README, backlog, launch-readiness checklist and investor proposal are present.
- Basic CI runs JavaScript syntax checks and core-file existence checks.
- Route-preview, landmarks and driver/fleet/corporate interest UI/code are described in the repository.
- README says maps and lead delivery require Vercel environment configuration: `GOOGLE_MAPS_BROWSER_KEY` (restricted browser key), `GOOGLE_MAPS_SERVER_KEY` (server-only), `RESEND_API_KEY`, `LAGOSGO_LEADS_TO`, and `LAGOSGO_FROM_EMAIL`.
- Push API routes are deliberately fail-closed pending authentication, durable subscription storage and delivery worker.
- Driver earnings calculator is illustrative only. The 12% default is not an approved public tariff and results are before fuel, maintenance, insurance, downtime and tax.
- Investor proposal and financial scenarios are explicitly discussion drafts and assumptions, not validated forecasts or guaranteed returns.

### Needs fresh verification
- Latest GitHub Actions run and exact test results.
- Current deployed URL, domain, build status and whether the deployed commit matches `main`.
- Vercel environment variables, runtime logs and all external provider configuration.
- Form submission and lead delivery end to end.
- Map routes, place/landmark search, API-key restrictions and usage/billing controls.
- Responsive behaviour, iOS Safari/PWA install and Android installation on real devices.
- Accessibility, privacy notices, consent, data retention, security headers, rate limiting and abuse handling.
- Whether the existing app contains unexpected placeholders, dead links, console errors, invalid interactions or stale claims.
- Whether there are any production backend, database, authentication or payment integrations not documented in README.

### Not production-ready unless new evidence proves otherwise
- Passenger and driver authentication/recovery.
- Verified driver/vehicle onboarding and document management.
- Online/offline driver availability and live location ingestion.
- Real ride requests, candidate matching, offer acceptance, atomic assignment and timeout/retry.
- Driver-based pickup ETA and live trip tracking.
- Server-authoritative trip lifecycle and cancellation handling.
- Real payment capture, refunds, commission ledger, payout reconciliation and receipts.
- Authenticated push subscriptions and ride-event notification delivery.
- Incident response, safety escalation, support operations, ratings and dispute workflow.

## 5. Mandatory technical audit before new features
1. Inspect the entire repository and its history; confirm framework, build/deploy model and current production entry point.
2. Run all existing checks; inspect workflow logs; add meaningful automated tests rather than only syntax checks.
3. Test the deployed app on mobile and desktop; inspect browser console/network failures and each form/action.
4. Verify environment variables and service-provider configuration without exposing secret values.
5. Review security, privacy, input validation, authentication/authorization, API abuse/rate limits, CORS, secrets, logs and location/document retention.
6. Create an evidence-based issue list with severity, reproduction steps, expected result and acceptance criteria.
7. Fix blockers in priority order and retest after each change.
8. Keep a release checklist and deployment rollback plan. Never represent a prototype as a live ride-hailing service.

## 6. MVP build order
P0 — reliability/security/configuration audit and CI baseline.  
P1 — server-side identity and role permissions; driver onboarding and vehicle eligibility; persistent users/rides; driver availability/location; pickup/destination; fare estimate and clear pricing; ride-state machine; matching/atomic assignment; road-based pickup ETA; live trip updates; cancellation and recovery; payment/payout ledger; support and safety workflows; logs and monitoring.  
P2 — driver earnings statements, fleet operations, corporate accounts, admin tooling, payouts/reconciliation, ratings and reporting.  
P3 — wallet gifting, Pay for Me, ride streaks, I Arrived Safely, two-tap ratings, airport rides, parcels/errands, shared rides and additional cities only when core ride service is stable.

Do not build speculative marketplace screens or additional demos before core functionality is verified.

## 7. Dispatch principles — proposed until implemented and tested
- Filter out drivers who are offline, unavailable, unverified, improperly documented, ineligible for the vehicle/service, outside allowed zones, or already assigned.
- Use real road ETA and traffic where available; straight-line distance is not a substitute.
- Initial candidate radius 2–3 km, expanding up to 5 km only if supply is insufficient, subject to pilot evidence.
- Calculate detailed road ETA for a shortlist of eligible candidates.
- Sequential offers and a proposed 20-second acceptance window.
- Atomic driver/ride locking prevents double assignment.
- Retry/expand for a proposed maximum of 60 seconds, then explain the result and offer retry/scheduling.
- The draft score (ETA 0.55, quality 0.15, fairness 0.15, reliability 0.10, direction 0.05) is not final; define normalisation, measurement, bias checks and lower-is-better/higher-is-better semantics before implementation.
- Monitor match time, pickup ETA, acceptance, cancellations, match radius, failed matches by zone/time, driver earnings per online hour and offer concentration.

## 8. Driver recruitment and corporate demand — after readiness gates
Driver acquisition should be the first growth priority, but only through transparent pilot recruitment; do not imply live trip volume or guaranteed earnings.
- Define launch zones and driver eligibility.
- Publish proposed fee, payout timing, deductions, dispute and support rules before signing drivers.
- Securely verify driver identity, licences, vehicle documents and appropriate insurance; do not collect sensitive ID uploads through an unprotected interest form.
- Inspect roadworthiness, tyres, lights, seat belts, cleanliness and air conditioning for vehicle categories that promise it.
- Establish training, incident escalation, complaints and payout reconciliation.
- Recruit independent drivers and fleet partners through driver associations, referrals, fleet operators and direct outreach.
- Seek corporate pilot discussions with employers, hotels, clinics, schools, event organisers and travel operators. Contract service hours, zones, SLAs, cancellation/no-show rules, billing, authorised bookers, privacy and escalation before accepting operational commitments.
- Track verified sign-ups, activated drivers, weekly active drivers, acceptance/completion, cancellations, net earnings per online hour, driver retention, corporate pipeline and repeat demand.
- Open public passenger bookings only after end-to-end rides have passed controlled testing.

## 9. Investor approach — after evidence pack is credible
The existing investor proposal requests ₦350 million for an 18-month Lagos-first, asset-light plan. This is a **draft funding target**, not a validated valuation or approved raise. The model's fare, take rate, ride volumes, operating costs, return examples and allocations are assumptions and must be independently rebuilt and validated before circulation as forecasts.

Prepare an evidence-based data room:
- Product demo clearly labelled as prototype where applicable, with verified live features separated from roadmap.
- Technical architecture, security/privacy posture, audit findings, CI results and deployment evidence.
- Lagos market sizing with cited sources, competitor comparison and launch-zone rationale.
- Driver interview/survey results and signed or documented expressions of interest.
- Corporate pipeline with permission to disclose, letters of intent or pilot agreements only when real.
- Unit economics: fare/GMV, effective take rate, driver share, payment costs, incentives, support cost, contribution margin, retention and acquisition cost.
- Milestone-based use of funds, cash runway, downside case, cap table and financing terms reviewed by qualified advisers.
- Risk register covering safety, regulation, insurance, data protection, payments, competition and operational execution.
- No invented traction, signed partners, active drivers, completed rides or guaranteed investor returns.

## 10. Budget and growth assumptions
Previous working materials include a ₦350m seed discussion target and illustrative three-year financial scenarios. They are not validated financial projections. Earlier conversations also discussed alternative funding ranges and possible small owned-fleet costs; do not mix these scenarios or present them as final. Obtain supplier quotes and rebuild a single scenario model before making financial claims. Default strategic preference is platform-led with driver-owned vehicles/fleet partners; only buy/lease vehicles if contracted demand and verified unit economics justify it.

A proposed 10% clean-vehicle fee and 15% conventional fee, 12% calculator default, pilot driver counts, corporate-partner counts and ride-volume targets are all unapproved assumptions/targets until formally decided and evidenced.

## 11. Proposed launch gates
- Gate A: CI passes; no critical security/privacy defects; configuration and logs reviewed.
- Gate B: all driver, rider and trip flows pass automated and manual tests.
- Gate C: dispatch, driver-based pickup ETA, live updates, cancellation, payment, receipts and ledger reconciliation work end to end in a controlled test.
- Gate D: insurance/legal/privacy/support procedures and driver standards reviewed by qualified advisers.
- Gate E: limited pilot with verified drivers and invited riders; report real reliability, safety, retention and economics.
- Gate F: scale only when evidence supports it and there are no unresolved critical safety/payment defects.

Targets such as 150 verified pilot drivers, five corporate pilots, 2,500 completed rides/month and 90% completion after acceptance are proposed targets only, not current results.

## 12. Immediate next actions
1. Save and maintain this checkpoint.
2. Inspect `LAUNCH_READINESS.md`, API routes, frontend event handlers, service worker, package configuration, CI and recent Actions logs in detail.
3. Verify the current deployment and configuration, then run real tests.
4. Produce a ranked, evidence-based gap report; do not create new UI demonstrations.
5. Implement the highest-priority blocker in the existing app, add tests and verify the result.
6. Once readiness gates are met, build a driver recruitment pipeline and investor evidence pack in parallel with corporate pilot outreach.

## 13. Change log
- 2026-10-14: Initial master checkpoint created from repository inspection and existing LagosGo project decisions. The repository's own README describes the product as a prototype; deployment and end-to-end behaviour have not been freshly verified by this checkpoint.
