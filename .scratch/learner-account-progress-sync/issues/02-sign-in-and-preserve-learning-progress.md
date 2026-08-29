# 02: Sign in and preserve learning progress

**What to build:** Let a learner use an Account page to request and verify a six-digit email code. After authentication, the learner's browser learning progress and account learning progress merge safely and the merged learning progress is immediately available throughout the app.

**Blocked by:** 01: Provision learner-account cloud foundation.

**Status:** resolved

- [x] Add the Account page to the primary and mobile navigation with a single email flow for account creation and sign-in.
- [x] Let the learner request and verify a six-digit email code with clear, non-enumerating feedback.
- [x] Introduce the single learning-progress persistence seam used by application screens instead of direct browser-storage access.
- [x] On authentication, load any account snapshot, merge it with browser learning progress per theory question, save it locally, and submit it atomically.
- [x] Preserve current learning-progress scheduling and statistics after initial synchronization.
- [x] Test guest use, code verification, newly created learner accounts, returning learner accounts, and idempotent initial merging through observable behaviour.
