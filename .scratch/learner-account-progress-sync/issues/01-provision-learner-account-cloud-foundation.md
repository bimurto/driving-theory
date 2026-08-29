# 01: Provision learner-account cloud foundation

**What to build:** Establish a production-ready, EU-hosted learner-account foundation that can authenticate a learner by six-digit email code and safely hold one account-owned learning-progress JSON snapshot. A verified learner can use only their own snapshot; concurrent device updates merge atomically without exposing another learner's data.

**Blocked by:** None (can start immediately).

**Status:** claimed

- [ ] Provision the Supabase project in an EU region, preferably Frankfurt, and configure the static app's public authentication origin.
- [ ] Configure Supabase passwordless email codes with Resend delivering from `auth@bimurto.io`; do not introduce CAPTCHA.
- [ ] Provide an account-owned, versioned learning-progress JSON snapshot protected by Row Level Security.
- [ ] Provide an atomic merge operation that preserves valid per-theory-question learning progress from independent devices.
- [ ] Verify with integration tests that one learner account cannot read, merge into, or delete another learner account's snapshot.
- [ ] Keep administrative Supabase and Resend credentials out of the static application and repository.
