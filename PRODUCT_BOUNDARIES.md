# LagosGo product boundaries and business separation

**Status:** Mandatory product rule.

## Product identity
LagosGo is a standalone mobility and ride-hailing product for Lagos and, subject to launch readiness, other Nigerian cities. The product must be about LagosGo only.

## Prohibited cross-business promotion
Do not include another business's name, logo, website, phone number, social handle, products, services, referral, partner card, cross-promotion or external business CTA in LagosGo screens, navigation, onboarding, marketing copy, transactional emails, push notifications or customer-support surfaces. In particular, do not surface POSH9JA EXPORT & LOGISTICS or OJA inside the LagosGo customer experience.

## Technical and data separation
- Keep source repositories, deployments, databases, authentication, credentials, permissions, support queues and release processes independent.
- Do not create automatic customer, driver, identity, precise-location, trip, payment, wallet, incident or support-data sharing across businesses.
- Do not reuse credentials or service-role keys across products.
- Do not add shared authentication, analytics identity stitching, cross-product tracking or partner APIs without explicit separate approval, a documented lawful purpose, data minimisation, security review and user-facing disclosure where required.
- LagosGo's Supabase project and Vercel project must serve LagosGo only. Never alter other businesses' projects when implementing LagosGo changes.

## LagosGo's own roadmap
LagosGo may develop its own city rides, airport transfers, intercity rides, parcel delivery, fleet and corporate mobility services under the LagosGo brand. Each remains a roadmap item until implemented, tested, deployed and operationally supported. Logistics features must not imply that POSH9JA is part of LagosGo.

## Acceptance checks
Before release, search the repository and rendered application for other-business names, URLs, handles, logos, partner/discovery components and cross-promotional CTAs. Remove product-facing references, update tests and verify that core ride booking, active-trip tracking, safety access and payments are unaffected. Keep necessary internal separation documentation factual and non-promotional.
