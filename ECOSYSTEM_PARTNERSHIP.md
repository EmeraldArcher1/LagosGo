# POSH9JA Group of Companies — Ecosystem Partnership

**Status:** Founder-approved ecosystem partnership direction, recorded 16 October 2026.

## Approved partners

- **LagosGo** — group mobility product, with ride-hailing as its primary service.
- **POSH9JA EXPORT & LOGISTICS** — export, freight, sourcing and logistics enquiries.
- **OJA** — Nigerian local-business discovery and marketplace initiative.

## Product integration status

LagosGo's partner discovery UI is being added on a feature branch. POSH9JA links to its official website, https://posh9jaexport.co.uk. OJA is presented as a marketplace pilot; the current LagosGo card does not offer live marketplace orders.

This is an ecosystem brand/discovery integration, not proof that the businesses share infrastructure or that transactional APIs are connected. OJA's own repository describes merchant verification, payments and delivery as not connected; those must remain clearly marked unavailable until verified.

## Guardrails

1. Rides stay primary. Partner promotion must not block booking, driver acceptance, live-trip tracking, emergency access, fare disclosure or payment.
2. Keep repositories, deployments, databases, credentials, customer support and operational permissions isolated.
3. No automatic transfer of passenger, driver, trip, location or payment data between partners.
4. Future transactional integrations require documented APIs, a defined lawful purpose, privacy notice, least-privilege access, failure handling, audit logs and end-to-end tests.
5. Do not describe a partner workflow as live until its implementation and production deployment are verified.
6. Do not imply government endorsement, regulatory certification, or a completed commercial contract merely from this founder-approved ecosystem designation.

## Release gates

- **Discovery UI:** non-blocking, accessible, and explicit about pilot status.
- **External links:** verified official destinations and safe new-tab behaviour.
- **Transactions:** separate technical and privacy/security review before enabling.
- **Production:** passing automated checks, code review, and confirmed deployment.

## Repositories

- LagosGo: https://github.com/EmeraldArcher1/LagosGo
- POSH9JA EXPORT & LOGISTICS: https://github.com/EmeraldArcher1/posh9ja-export-and-logistics
- OJA marketplace: https://github.com/EmeraldArcher1/Oja-Market-place-
