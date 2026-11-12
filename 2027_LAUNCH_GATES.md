# LagosGo — 2027 launch gates

**Target:** prepare for a staged 2027 launch, subject to evidence and readiness gates. A target year is not a promise that unresolved safety, payment, legal, or operational dependencies can be skipped.

## Work that can be advanced without new spending

- [ ] Review existing handlers and ride UI; map each screen to a real API or label it clearly as prototype.
- [ ] Expand automated tests for validation, unsupported methods, missing configuration, duplicate requests, and error handling.
- [ ] Keep the quality workflow green and ensure failures stop a release.
- [ ] Review database migrations and row-level security against the intended rider, driver, and administrator roles.
- [ ] Prepare driver onboarding, support, incident response, complaint handling, and privacy procedures.
- [ ] Test the PWA installation and interface on supported iPhone and Android devices.
- [ ] Keep POSH9JA and OJA discovery links separate from ride booking and do not share customer data automatically.

## External or funding-dependent gates

- [ ] Restore authorized access to the correct Vercel team and verify the deployed commit.
- [ ] Confirm the correct Supabase project before changing its schema or credentials.
- [ ] Configure and test any required Maps, email, push, and payment-provider services; confirm current pricing and usage limits first.
- [ ] Complete secure passenger/driver authentication, driver and vehicle eligibility checks, persistent ride records, and reliable dispatch.
- [ ] Implement and test payment authorization, refunds, reconciliation, driver payouts, and an auditable ledger before handling real money.
- [ ] Establish driver supply, vehicle inspection, insurance, customer support, incident escalation, and a small controlled Lagos pilot.
- [ ] Obtain legal/privacy review and prepare terms, privacy notices, location disclosures, retention/deletion procedures, and any required regulatory approvals.
- [ ] Package and test native apps, complete store privacy disclosures, and submit to Apple and Google after end-to-end pilot acceptance.

## Release rule

No public real-money rides until the core trip lifecycle, identity/eligibility controls, payment and payout accounting, safety operations, support coverage, privacy controls, and recovery paths have been tested end to end. The PWA is an early access route, not evidence that a native app is store-ready.
