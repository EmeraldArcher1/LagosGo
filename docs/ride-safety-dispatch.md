# Ride dispatch and safety foundation

## Implemented in this change
- Pure deterministic candidate scoring: 55% road ETA, 15% quality, 15% fairness, 10% reliability and 5% direction.
- Eligibility gates: online, available, approved driver and vehicle, current documents, allowed service zone, and location freshness within three minutes.
- Passenger-issued four-digit pickup PIN stored as a salted SHA-256 hash, expiring after 30 minutes, with a five-attempt limit.
- Database trigger blocks transition to in_progress until the assigned driver verifies the pickup PIN after arrival.
- Authenticated incident intake for ride participants. Emergency reports are marked critical; submission is not emergency dispatch.

## Integration contract
The ranking module is a primitive, not a live dispatcher. A trusted server worker must fetch eligible candidates, calculate road ETAs with the configured routing provider, provide normalised quality/fairness/reliability/direction values, rank candidates, then send sequential offers with a 20-second response window and atomic assignment. Never substitute straight-line distance for road ETA.

## New Supabase RPCs
- lagosgo_issue_pickup_pin(p_ride_id): passenger only; returns PIN and rotates any previous challenge.
- lagosgo_verify_pickup_pin(p_ride_id, p_pin): assigned driver only; ride must be in arrived.
- lagosgo_report_safety_incident(p_ride_id, p_incident_type, p_description): authenticated participant intake.

## Deployment safety
This additive migration is committed to GitHub only; it has not been applied to Supabase. Apply only after confirming the linked project and reviewing the SQL. Vercel deployment does not apply database migrations.

## Not enabled
Live dispatch worker, sequential push notifications, route ETA orchestration, payment capture/settlement, trusted-contact notifications, staffed emergency response or police integration. This change does not make public ride booking operational.
