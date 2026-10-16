# LagosGo cashless payments, driver payouts and traffic-aware fares

**Status: payment architecture foundation in feature branch; not a live payment or traffic integration.** The branch includes a provider interface and factory, Paystack and Flutterwave adapters, signed-webhook ingress, server-side collection verification, an idempotent webhook inbox, an atomic SQL routine for verified collection-to-ledger posting, integer-kobo ledger validation, payout eligibility gates and a reconciliation service contract. The migration is not applied; payment creation persistence, refund workflows, verified beneficiary onboarding, payout/reconciliation repository wiring and sandbox end-to-end tests remain incomplete. Do not claim money is being collected, held, split, or paid out.

## Product requirements

- Cashless-first: riders choose a supported digital payment method before confirming the ride. Do not offer cash in the pilot unless product owners explicitly reverse this policy.
- Fare shown before booking: display the estimated/quoted fare, currency (NGN), traffic assumption, toll/parking/waiting assumptions if applicable, and a clear indication of whether the amount is fixed or may change.
- Pay before or during the ride: support pre-authorisation/collection before trip start where the chosen provider and product terms permit it; alternatively permit an explicitly disclosed in-trip payment step. Never mark a payment successful based on a browser redirect.
- Driver payout: once the trip is completed and payment is verified, create the driver's payable ledger entry and initiate payout according to the provider's actual settlement/payout capability and LagosGo's risk rules. Show the driver the status and reference. Target prompt payout (minutes where supported), but never promise it until provider terms, account limits, bank processing and production tests prove it. Gateway settlement to LagosGo and payout to the driver are separate events and may take longer.
- Vehicle ownership: collect and verify whether the driver owns, leases or operates a fleet vehicle. Link verified driver identity, approved vehicle, payout beneficiary and applicable fleet/owner split to the account. Do not assume that the driver is the legal vehicle owner or beneficiary.
- Transparent deductions: show gross fare, gateway charge, LagosGo fee, taxes/levies where applicable, fleet/vehicle-owner share, driver net and payout status. No silent deductions or use of driver funds to finance promotions.
- Traffic-aware pricing: calculate a pre-booking estimate using a road-routing/traffic provider, route distance, expected duration, time-of-day and disclosed pricing rules. Show a traffic condition label, estimate range or confidence where appropriate, and an explanation of major congestion effects. Refresh before confirmation; if the route or price changes materially, ask for confirmation rather than silently raising the fare.
- Traffic updates: provide route congestion and incident information with a timestamp and source. If live traffic is unavailable or stale, say so and fall back to a clearly labelled estimate; do not fabricate traffic reports or exact ETAs.

## Payment provider strategy

Build a provider-neutral server-side adapter so LagosGo can compare providers and switch without rewriting ride logic. Evaluate at least:

1. **Paystack** — candidate for Nigerian collections, transfers and a familiar integration workflow.
2. **Flutterwave** — candidate for local and international collection methods and transfer APIs.
3. **Monnify** — candidate to evaluate for bank-transfer and virtual-account-heavy journeys.
4. **Paga** — candidate to evaluate for wallet/payment reach and supported merchant/payout use cases.

These are candidates, not a final selection or a claim that every provider supports the required marketplace split/payout workflow for LagosGo's account. Before choosing, obtain written confirmation from each provider on:
- Nigerian ride-hailing/marketplace business approval and underwriting;
- payment channels, transaction limits, fee caps, VAT, refunds, chargebacks and disputes;
- webhook reliability, idempotency, reconciliation exports and sandbox parity;
- transfer/payout APIs, beneficiary verification, payout limits, fees, cut-off times, weekends/holidays and reversal handling;
- split settlements/subaccounts or platform marketplace capabilities, permitted holding of funds, KYC responsibilities and any regulatory restrictions;
- service-level support and incident escalation.

Do not choose on headline collection fee alone. Compare the total cost per completed trip, including collection fee, transfer fee, tax, failed payments, refunds, chargebacks, reconciliation operations and customer support.

## Suggested payment flow

1. Server computes and stores a versioned fare quote; client cannot set authoritative amounts or beneficiary details.
2. Rider selects an available payment method and explicitly accepts the amount and pricing conditions.
3. Server creates a unique payment attempt with an idempotency key and provider reference. Store only safe references and necessary status metadata; never store raw card details.
4. Provider sends a signed webhook. Verify signature, amount, currency, reference and provider status server-side; deduplicate webhook events and independently query the provider where appropriate.
5. A successful collection changes payment status only after server verification. A redirect or client callback alone is not proof.
6. Trip completion is a separate authenticated ride-state event. Apply the fare policy, eligible adjustments and refund/complaint rules; post balanced append-only ledger entries.
7. Create a payout instruction only when the payment, trip and risk conditions pass. Record requested, processing, paid, failed, reversed and reconciled states. Retry safely with idempotency; never duplicate a payout on webhook retry.
8. Reconcile provider transactions, platform ledger, driver payable balances and bank/payout reports daily. Alert on mismatches and keep a human review path for disputes.
9. Provide rider receipt and driver earnings statement showing each component and payout reference.

### Payment states to model

- Collection: `created`, `pending`, `succeeded`, `failed`, `cancelled`, `refunded_partial`, `refunded_full`, `disputed`.
- Driver payout: `not_eligible`, `queued`, `processing`, `paid`, `failed`, `reversed`, `needs_review`.
- Keep ride status separate from payment and payout status. A completed ride does not by itself prove collection or payout succeeded.

## Driver identity, ownership and settlement controls

- Verify driver identity and payout beneficiary with provider-approved KYC workflows.
- Capture vehicle ownership/lease/fleet relationship and supporting documents; keep access restricted and retention limited.
- If a fleet or third-party owner is involved, require a signed commercial agreement and explicit share rules before splitting earnings.
- A driver's bank account must be verified through the payout provider's supported process. Avoid collecting or exposing bank details unnecessarily.
- Apply payout limits, anomaly detection, account-change cooling-off controls, maker-checker review for sensitive admin actions and auditable manual adjustments.
- Clarify the legal and regulatory structure for marketplace funds, payout timing and any funds held on behalf of drivers with qualified Nigerian counsel and the selected provider. Do not describe the design as escrow unless legally approved.

## Traffic and fare calculation

Use a provider adapter for a traffic-enabled routing service such as Google Maps Platform or HERE Traffic/route services, subject to coverage, licensing, cost and key restrictions. Test in Lagos across peak/off-peak periods, bridge and expressway routes, rain/incident conditions and low-connectivity scenarios before selecting one.

The fare quote should record:
- pickup and destination coordinates/labels and route/provider reference;
- quote timestamp, estimated route distance and duration, traffic state and data freshness;
- base fare, distance/time components, disclosed traffic-related adjustment, tolls/parking only where verified, taxes/fees, discounts and total;
- quote expiry and the policy for rerouting, waiting, rider/driver cancellation and extraordinary delays.

Traffic may influence expected time and the disclosed fare formula, but avoid an opaque surge multiplier. Explain the effect in plain language. Do not double-count congestion by charging both a hidden traffic surcharge and unannounced time increments. If actual route/time differs, apply only a disclosed policy and show the final breakdown before settlement wherever practicable.

## Security, privacy and testing gates

- Provider secret keys remain server-side in Vercel environment variables; never commit them, embed them in browser code or paste them into chat.
- Verify webhook signatures and replay protection; use idempotency for payment creation, webhook handling, ledger posting and payout.
- Use integer kobo for NGN amounts; validate currency and amount server-side. Use balanced, append-only ledger entries and explicit reversal entries instead of editing history.
- Enforce role-based access and row-level policies. Drivers may see only their own earnings/payout records; passengers only their own receipts; support access must be limited and audited.
- Test duplicate/out-of-order webhooks, delayed settlement, pending payments, timeout, under/overpayment, refund, chargeback, failed/duplicate payout, account mismatch, cancellation at each ride stage, traffic provider timeout/stale data and price change before confirmation.
- Use provider sandboxes and test accounts first. Production readiness requires a successful end-to-end test from rider payment to reconciled driver payout, plus operational support and incident response.
- Never use real passenger funds or launch cashless-only public rides until these gates pass.

## Suggested rollout

1. Audit the current repo, Supabase schema/RLS, Vercel project and deployment; identify existing payment/traffic code before adding tables or handlers.
2. Define provider-neutral interfaces and a decision matrix; obtain provider answers on marketplace payout and timing.
3. Implement fare quote snapshots and a ledger/payment state model in a migration after checking existing schema.
4. Integrate one selected provider in sandbox, including signed webhooks, reconciliation and refunds.
5. Integrate verified traffic-aware route quotes and stale-data fallbacks.
6. Test driver payout and finance operations end to end in a controlled pilot; add a second provider only if redundancy or cost justifies it.
7. Enable cashless-only policy only after operational, legal, security and support sign-off.

## Official references to recheck before implementation

- Flutterwave Nigeria pricing: https://flutterwave.com/ng/pricing
- Flutterwave settlement documentation: https://developer.flutterwave.com/docs/settlements
- HERE Traffic API documentation: https://docs.here.com/traffic-api/docs/introduction-to-here-traffic-api-v7
- Paystack: https://paystack.com/docs/
- Monnify: https://developers.monnify.com/
- Paga: https://developer.paga.com/
