# LagosGo Privacy & Consent Settings

**Status:** implementation specification; not a statement that a production consent manager or account-deletion workflow is already live. Last reviewed: 19 October 2026.

## Purpose
LagosGo is intended to provide ride-hailing and later mobility services in Nigeria. Privacy controls must be available on the website/PWA and in any future native apps. Ride operations, account security and legally required records must be separated from optional analytics and advertising.

## Privacy settings users should be able to manage
- **Essential service and security — always active:** authentication/session security, abuse prevention, dispatch and trip records when the live ride service is implemented, payment integrity when payments are implemented, and storing the user's consent choice. Explain why each item is necessary.
- **Functional preferences — optional where not necessary:** saved language, accessibility and interface preferences, and map-related preferences. Request device location only when a user invokes a location-dependent feature; provide manual pickup entry as an alternative.
- **Analytics — off until disclosed and consented where required:** product usage measurement and diagnostics beyond strictly necessary security logs.
- **Marketing and advertising — off by default:** ad measurement, remarketing, cross-site tracking and promotional profiling.
- **Manage or withdraw consent:** users can change optional choices later without losing access to essential ride functions.
- **Privacy requests:** provide a clear route to request access, correction, export or deletion, subject to identity checks, legal retention and safety/financial record obligations.

## Data categories requiring a clear notice
Depending on features actually enabled: account/contact details; rider and driver profile/KYC records; pickup, destination and trip/location data; device and diagnostic data; support and dispute records; payment references (not raw card credentials); marketing preferences and consent records. Do not collect a category merely because it appears in this template. Publish the actual categories after a code, vendor and production-configuration audit.

## Service/vendor register
The supplied reference list (for example, AWS, Cloudflare, Sentry, Google Maps, analytics and advertising tools) is not evidence that LagosGo uses those services. Maintain an auditable register of services actually enabled, purpose, data fields, retention, subprocessors and processing location. Do not name a vendor in the public notice until verified in source code, production configuration, contracts or network traffic.

## Implementation and release gates
1. Inventory cookies, local storage, SDKs, APIs, logs, hosting and all data flows.
2. Add a privacy centre linked from every page and account menu; include a readable privacy notice and category-level controls.
3. Persist consent choices with version, timestamp and purpose; honour them on every platform. Do not load optional trackers before consent where consent is required.
4. Add a privacy-request workflow with identity verification, human review, status tracking and documented exceptions.
5. Test keyboard/screen-reader use, mobile layouts, consent withdrawal, storage failure and cross-session behaviour.
6. Review against applicable Nigerian data protection requirements and other laws relevant to launch markets before production release.

## Current limitations
LagosGo's repository describes the product as a front-end prototype with backend scaffolding. This document does not create a working privacy dashboard, prove that tracking is absent, establish a retention schedule, or execute data deletion. Those require implementation and production verification.
