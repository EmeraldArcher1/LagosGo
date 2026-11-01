# LagosGo Fare-Estimation Service Design

**Status:** Design proposal for review; not an activated fare policy or live pricing service  
**Scope:** LagosGo ride requests, fare estimates and bounded passenger/driver offers  
**Working context:** PR #20 — `feature/ride-safety-dispatch-foundation`  
**Release boundary:** This document authorises documentation on this branch only. It does not authorise a production migration, public booking activation, provider billing change, fare-policy activation or PR merge.

## 1. Objective and current-state boundary

Produce a route-grounded, explainable passenger estimate and a matching driver-facing fare breakdown. The server—not the browser—must calculate, validate, version and persist the quote.

The current PR #20 dispatch path already obtains road ETA and route distance for shortlisted drivers through Google Routes `computeRouteMatrix`. The dispatch offer record stores those metrics. Driver acceptance currently confirms the latest pending passenger fare offer (`ride_fare_offers.amount_kobo`); the existing absolute NGN 1,000–100,000 guardrail is not a route-based quote. This design does not misrepresent that guardrail as a fare engine.

**Important distinction:** passenger trip route (pickup → destination) determines the trip estimate. Driver-to-pickup route (driver → pickup) is a dispatch/pickup ETA input and must not silently be added to the passenger's trip distance or fare.

## 2. Service boundary and request flow

Proposed server endpoint: `POST /api/fare-estimate`.

1. Client submits pickup and destination place/landmark labels and coordinates, service type, and any required accessibility/vehicle preferences.
2. Server validates authentication, coordinate ranges, service-zone eligibility, request size and rate limits. Client-supplied distance, duration, fare, multiplier and driver identity are ignored.
3. Server normalises the two endpoints and requests a driving route from Google Routes API (traffic-aware where supported and justified).
4. Server validates the provider response, route distance, duration, status and bounds; records provider/source metadata and a correlation ID.
5. Fare engine loads the active, versioned zone/service fare configuration and calculates itemised components in integer kobo.
6. Server persists an immutable estimate with its inputs, route evidence, fare-rule version, component breakdown, expiry and status.
7. Client displays the estimate and conditions. Passenger confirmation submits the estimate ID—not a client-recalculated amount—to an authenticated RPC.
8. The RPC verifies ownership, expiry, status, zone, service and policy version, then creates the bounded passenger fare offer linked to that estimate.
9. Dispatch continues to rank eligible drivers by driver-to-pickup road ETA and the approved score. The driver offer must show the exact passenger offer and its fare breakdown/terms before acceptance.
10. Driver acceptance atomically accepts the linked offer and confirms that same amount. No client can change the amount between display and acceptance.

The endpoint and RPC names above are proposed interfaces, not claims that these endpoints/RPCs currently exist.

## 3. Fare model and arithmetic

Use integer kobo throughout; do not use floating-point naira for persisted monetary calculations.

Proposed configurable components:

- **Base fare:** fixed start charge for the service class/zone.
- **Distance component:** billable trip kilometres × configured rate per kilometre.
- **Time component:** billable route minutes × configured rate per minute, if enabled.
- **Minimum fare:** floor applied to eligible base + distance + time components.
- **Explicit pass-throughs:** approved tolls or other charges, itemised and attributable.
- **Demand adjustment:** disabled by default. If later approved, show the multiplier and adjusted amount before confirmation and enforce the published ceiling server-side.
- **Discount/credit:** separate, funded and identified by source; never silently reduce driver gross entitlement.
- **Tax/levy:** only when legally validated, correctly classified and explicitly disclosed.

Illustrative formula (the actual values must come from approved configuration):

`raw = base_kobo + distance_km × rate_per_km_kobo + duration_min × rate_per_min_kobo`

`trip_subtotal = max(minimum_fare_kobo, round_by_policy(raw))`

`passenger_estimate = trip_subtotal + disclosed_pass_throughs + approved_tax - applied_discount`

Rounding mode, distance/time units, treatment of partial units and the exact order of operations must be specified in the fare-rule version. Use decimal-safe or integer arithmetic with explicit rounding; never rely on binary floating-point.

Do not add driver pickup distance/time to the passenger trip subtotal. Any driver incentive or deadhead support must be separately funded and recorded, not hidden in passenger distance.

## 4. Quote integrity and bounded negotiation

Each quote should persist at least:

- immutable quote ID and passenger ID;
- pickup/destination coordinates and user-visible landmark labels;
- route distance (metres), route duration (seconds), traffic/routing preference and provider response timestamp;
- provider and route calculation version, plus a non-secret correlation/reference ID;
- zone, service class, fare-rule version and currency;
- every fare component in kobo, total estimate and any permitted negotiation bounds;
- creation, expiry and lifecycle status;
- idempotency key and audit timestamps.

Recommended initial quote lifetime: **5 minutes**, subject to product testing. Expired quotes must be recalculated; clients cannot extend them.

The existing passenger fare-offer RPC should be extended only after review so it accepts a valid quote ID and enforces quote-linked bounds. The current broad absolute amount guardrail remains a secondary abuse check, never the pricing source. A passenger may propose a different amount only within a separately approved, transparent negotiation band. A driver must see and explicitly accept the exact offered amount. Any counter-offer creates a new immutable offer/version; it must not mutate the original record.

At acceptance, lock the ride, quote and fare-offer rows in a consistent transaction order. Enforce one accepted driver, one accepted fare and idempotent replay handling. If the quote/offer expires or a fare rule is superseded before acceptance, require a fresh estimate or an explicitly documented grandfathering rule.

## 5. Relationship to dispatch and Google Routes

Keep two separate routing jobs:

**Passenger trip route**
- pickup → destination;
- drives the passenger's route estimate and fare components;
- calculated once per quote, then reused for display and acceptance validation while valid.

**Driver candidate route**
- each shortlisted driver → pickup;
- drives dispatch ranking, offer ordering and pickup ETA;
- use `computeRouteMatrix` only for the bounded top 10–20 eligible candidates after hard eligibility and proximity filtering;
- matrix elements are origins × destinations, so cap candidates and avoid per-keystroke or per-screen-refresh calls.

The dispatch worker must validate returned route metrics before passing them to the service-role-only offer-creation RPC. The database already bounds dispatch ETA and distance; keep those checks and add tests for missing, zero, negative, implausible and provider-error results. Do not accept a straight-line distance as a substitute for road routing.

## 6. Failure handling and degraded operation

Provider failure must not create a fabricated live route or an ungrounded fare.

- **Before passenger confirms:** show that a live estimate is temporarily unavailable; allow retry or a clearly labelled manual/scheduled enquiry if operations supports it. Do not present stale data as a live traffic quote.
- **After a ride is accepted:** a temporary map-provider outage must not invalidate the accepted fare or block trip-state transitions. Use the stored accepted quote and fare-rule version for the trip record and receipt.
- **Provider timeout/rate limit:** bounded retries with jitter, request deadlines, circuit breaker and per-user/IP rate limits. Avoid retry storms.
- **Cached corridor fallback:** only use a separately approved, field-validated fixed corridor table with zone, direction, time/validity window, fare version and clear “fixed corridor estimate” label. Do not call it a live traffic route.
- **No route / ambiguous landmark:** ask the passenger to confirm a landmark and draggable pin; do not guess coordinates.
- **Audit:** record provider failure category, fallback type and correlation ID without logging API keys or unnecessary precise-location data.

A corridor fallback must not be activated until Operations and Finance approve its corridors, values, disclosure and expiry.

## 7. Security, privacy and cost controls

- Keep the Google server key in server-side environment configuration; restrict it by API and hosting/network controls where supported. Keep the browser key separate and HTTP-referrer restricted.
- Never send server credentials to the browser, logs, analytics or Git.
- Validate all inputs server-side; apply authentication, authorisation, rate limits, request size limits and abuse monitoring.
- Keep precise location access limited to the trip purpose and authorised participants. Apply presence TTL and documented retention/deletion rules.
- Minimise retention of raw provider payloads; store only fields required for fare evidence, support and legal/accounting purposes.
- Use autocomplete session tokens in the client flow where Places Autocomplete is used; debounce input and do not call Routes on each keystroke.
- Set hard per-API quotas and alerts in Google Cloud; alerts alone do not cap spend. Monitor requests, matrix elements, error rates and cost per estimate/trip.
- Cache only data and for durations permitted by the applicable Google Maps Platform terms. Recheck current terms and SKU pricing before launch; do not assume a blanket cache period.
- Lazy-load maps and avoid reinitialising the map on ordinary UI state changes.

## 8. API and database contracts to implement after review

**Proposed estimate response** (illustrative contract, not a current API response):

```json
{
  "quote_id": "uuid",
  "currency": "NGN",
  "pickup": { "label": "confirmed landmark", "latitude": 6.0, "longitude": 3.0 },
  "destination": { "label": "confirmed landmark", "latitude": 6.1, "longitude": 3.2 },
  "route": {
    "distance_meters": 12500,
    "duration_seconds": 2400,
    "traffic_aware": true
  },
  "fare": {
    "base_kobo": 0,
    "distance_kobo": 0,
    "time_kobo": 0,
    "pass_through_kobo": 0,
    "discount_kobo": 0,
    "tax_kobo": 0,
    "total_kobo": 0
  },
  "fare_rule_version": "zone-service-version",
  "expires_at": "ISO-8601 timestamp"
}
```

Zero values above are schema placeholders, not proposed prices. Production responses must return actual server-calculated values and must not include secrets or internal provider credentials.

Recommended persistence additions for a later reviewed migration:
- immutable `ride_fare_quotes` table with passenger ownership, route evidence, versioned breakdown, expiry and idempotency;
- foreign key from each passenger fare offer to the quote it derives from;
- server-only insert/update permissions for quote creation and status transitions;
- participant-scoped read policy exposing only the relevant passenger/driver fare details;
- indexes for passenger history, expiry cleanup and ride/offer lookup;
- append-only fare calculation/audit events with no raw sensitive provider payloads.

Do not create a second source of truth for accepted fare. The accepted amount on the ride, accepted fare offer, quote and eventual ledger settlement must reconcile exactly.

## 9. Tests and acceptance criteria

Before any live fare estimate is enabled, automate:

1. Correct base, distance, time, minimum, pass-through, discount, tax and rounding calculations.
2. Boundary cases: zero/negative/out-of-range coordinates, very short/long routes, missing duration, impossible provider values and unsupported zones.
3. Quote expiry, replay, duplicate idempotency key, stale fare-rule version and passenger ownership.
4. Attempts to submit client-inflated distance, duration, multiplier, tax, discount or total.
5. Concurrent passenger confirmations and concurrent driver acceptances; only one accepted driver/fare.
6. Decline, timeout, retry, counter-offer and quote-expiry races.
7. Provider timeout, quota exhaustion, invalid key, no route and circuit-breaker recovery.
8. Fare estimate remains auditable after provider outage and later fare-rule changes.
9. Passenger and driver see consistent itemised values; final receipt and future ledger entries reconcile.
10. No live trip is blocked by a transient map outage after the fare has been accepted.

Pilot acceptance requires field validation in each launch zone across rush-hour and off-peak conditions, comparing route estimate distance/time with actual trips. Establish error thresholds from measured data before opening the pilot; do not invent a claimed accuracy percentage.

## 10. Delivery sequence and approval gates

1. Review this design with product, engineering, operations and finance.
2. Confirm fare components, zone/service configuration, negotiation bounds, rounding, taxes and passenger/driver disclosure. No rate is approved by this document.
3. Implement server-side route quote endpoint and immutable quote persistence on a feature branch.
4. Add quote-linked bounded-offer RPC and concurrency/idempotency tests.
5. Connect the passenger UI and driver offer details; keep booking in demo/disabled mode until verified.
6. Add cost/quota monitoring, privacy review, support procedures and field validation.
7. Complete end-to-end acceptance and a separate pilot-readiness decision before activating bookings.

**Definition of done:** a test passenger can obtain a server-calculated, versioned route estimate; confirm it through an authorised quote-linked RPC; a verified eligible driver sees and accepts the exact amount; the accepted fare remains immutable and auditable through trip completion, receipt and eventual ledger settlement—including retries, provider failures and disputes.

**No production activation, live fare policy, production migration or PR merge is authorised by this design.**
