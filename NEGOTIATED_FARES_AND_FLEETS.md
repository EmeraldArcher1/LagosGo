# LagosGo negotiated fares, fleets and service expansion

This is an original LagosGo design informed by common ride-hailing patterns. It does not copy inDrive's interface, branding, or proprietary implementation.

## Fare negotiation

1. Show a server-calculated suggested fare and a transparent minimum/maximum guardrail before a rider submits an offer.
2. Store all amounts as integer kobo. A rider offer or driver counter-offer expires after a short, visible window (initial target: two minutes).
3. Present eligible drivers with real verified profile/vehicle data, genuine rating only when sufficient completed-trip data exists, and pickup ETA only when derived from current location plus a road route.
4. The rider can accept a counter-offer or keep waiting; drivers can accept, counter, or decline. Never silently change a fare after acceptance.
5. The server must validate guardrails, participant identity, ride state, expiry and idempotency, and atomically accept at most one offer. Do not trust browser-supplied fare, driver ID, rating or ETA.
6. Audit every offer and response. Rate-limit repeated offers and detect collusion, spam, extreme outliers and discriminatory behaviour. Make the suggested range explainable and periodically review it against local operating costs.

## Driver and fleet operations

- Driver controls: offer inbox, accept/counter/decline, disclosed platform fee, net earnings estimate, trip history and dispute path.
- Fleet portal: separate fleet account; owner, manager, dispatcher, finance and driver membership; vehicle-to-fleet assignment; document expiry and approval state.
- Fleet membership, vehicle assignments, payouts and driver approval are privileged operations. Never grant fleet-owner or admin privileges from public sign-up metadata.
- Pilot metrics: active eligible drivers, offer response time, match rate, cancellations, net earnings per online hour, fleet utilisation and complaint rate.

## Safety and trust

- Safety centre should provide trip sharing with explicit consent, a visible emergency contact action, arrival check-in, incident reporting and in-app support.
- An SOS button is not a functioning emergency response unless escalation routing, staffing, monitoring, service hours and fallback channels are operational and tested.
- Share only the minimum trip/location details necessary, expire shared links, record access, and publish retention/deletion rules.
- Safety reports are private. Only the reporter and authorised response personnel should be able to access report content; review policies before a public pilot.

## Service rollout

1. City rides first, after authentication, verified drivers/vehicles, dispatch, trip lifecycle, support and payment reconciliation are production-ready.
2. Airport transfers and intercity rides after route, waiting, cancellation and pricing rules are validated.
3. Parcel delivery and business delivery with restricted-item rules, pickup/delivery proof, OTP, customer support and claims policy.
4. SME/fleet accounts with authorised bookers, cost centres, spending limits, receipts and invoicing.
5. Merchant/food services only after verified onboarding, availability, order, payment/refund, courier and settlement flows work end-to-end.

The database now has a service-type field for city rides, airport transfers, intercity, parcel delivery and business delivery. That is a data-model foundation, not a claim that those services are available to customers.

## Payments and low-data operation

- Initial payment method choices are cash, bank transfer, card and wallet. Availability must be configured per pilot and never displayed as active until the payment provider and reconciliation flow are tested.
- A transfer is not confirmed from a screenshot; verify payment server-side. Use idempotent ledger entries and explicit refund/chargeback handling.
- Keep the PWA shell lightweight, avoid blocking booking on nonessential partner content, use compact payloads and graceful retry states. Offline mode must not pretend that a ride, payment, dispatch or SOS request succeeded.

## Community and regulation

- Start with measurable Lagos driver-safety, road-safety, skills or youth mobility partnerships. Publish eligibility, funding, impact measures and safeguarding requirements before announcing a programme.
- Confirm Lagos State and relevant federal requirements with qualified local counsel/regulators before pilot operations; assess operator/aggregator licensing, driver/vehicle documents, insurance, tax, data protection, payment-provider rules and consumer complaint handling.

## Release gates

No feature is labelled live until it has server-enforced authorisation, automated tests, audit events, abuse/failure-path handling, monitoring and a verified deployment. The new Supabase tables are intentionally not writable directly by clients; implement authenticated server endpoints/RPCs before exposing fare negotiation, fleet management or incident reporting in the UI.
