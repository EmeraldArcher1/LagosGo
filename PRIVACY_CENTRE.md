# LagosGo Privacy Centre — implementation plan

**Status:** Draft for product and legal review. This document is not proof that every control is implemented, nor a final legal privacy notice. Confirm the deployed app, SDKs, processors, retention periods and legal basis before publication.

## Privacy settings users should be able to control

- **Essential service data:** account/session security, ride requests, trip status, fraud prevention and support. These cannot be switched off while using core ride services.
- **Location:** ask permission at the point it is needed; explain whether location is used for pickup, dispatch, navigation or trip safety. Offer manual pickup entry where practical. Stop background collection when the trip/service no longer requires it.
- **Notifications:** separate ride-critical updates from optional product/marketing notifications. Provide an opt-out for marketing.
- **Analytics and diagnostics:** optional, off until consent where required; avoid sending precise trip routes, phone numbers or identity documents to analytics.
- **Personalised marketing/advertising:** optional and off by default; do not sell personal data.
- **Cookies/local storage:** explain necessary session/security storage separately from optional analytics/advertising storage on the website.
- **Access, correction, deletion and export requests:** provide a clear request channel and verify identity proportionately. Explain lawful exceptions and retention obligations.
- **Consent history:** record policy version, purpose, choice and timestamp; allow withdrawal as easily as consent.

## Data inventory — verify before release

| Data/purpose | Likely data | Handling rule |
|---|---|---|
| Account and support | contact details, profile, messages | restrict access; define deletion/retention |
| Ride fulfilment | pickup/drop-off, timestamps, trip status | use only for ride operations, safety and lawful dispute handling |
| Driver onboarding | identity, licence, vehicle and verification evidence | restrict to authorised reviewers; never expose publicly |
| Payments | provider references, amounts, settlement status | use a payment provider; do not store raw card credentials |
| Push alerts | push subscription endpoint and preferences | retain only while subscribed; support unsubscribe |
| Reliability/security | error logs, IP/device/security events | minimise and set retention limits |
| Analytics/marketing | only if actually installed and enabled | document each SDK and obtain consent where required |

**Do not copy another company's vendor list.** The categories shown in the inDrive screenshots (e.g. AppsFlyer, TikTok, Hotjar, Google Ads, Rollbar) are not evidence that LagosGo uses those vendors. List a processor only after confirming it exists in the deployed build/configuration.

## Acceptance criteria for the in-app Privacy Settings screen

1. Separate Essential, Functional, Analytics and Marketing purposes; explain each in plain language.
2. Essential controls are labelled as required, not presented as optional toggles.
3. Optional categories default off until valid consent where required; Reject optional and Accept selected are equally easy to use.
4. Users can reopen settings from the app footer/account menu and change choices at any time.
5. Consent is stored server-side or in a suitably durable, auditable store, with policy version and timestamp; no UI-only pretend consent.
6. No non-essential tags/SDKs fire before consent when consent is required.
7. Privacy requests and contact details are configured and tested before public launch.
8. Provide a cookie banner and preference centre on the website if non-essential cookies are used.

## Release blockers

- Confirm legal entity/controller, privacy contact, lawful bases, retention schedule and processors.
- Review against Nigeria's data-protection requirements and applicable laws in every launch market with qualified counsel.
- Implement and test controls in the actual app and deployed website.
- Complete data-flow/SDK audit, security review, incident response and deletion/access request procedures.
- Publish only after product and legal review; do not claim compliance from this draft alone.
