# 01: Provision learner-account cloud foundation

**What to build:** Establish a production-ready, EU-hosted learner-account foundation that can authenticate a learner by six-digit email code and safely hold one account-owned learning-progress JSON snapshot. A verified learner can use only their own snapshot; concurrent device updates merge atomically without exposing another learner's data.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Provision the Supabase project in an EU region, preferably Frankfurt, and configure the static app's public authentication origin.
- [x] Configure Supabase passwordless email codes with Resend delivering from `auth@bimurto.io`; do not introduce CAPTCHA.
- [x] Provide an account-owned, versioned learning-progress JSON snapshot protected by Row Level Security.
- [x] Provide an atomic merge operation that preserves valid per-theory-question learning progress from independent devices.
- [x] Verify with integration tests that one learner account cannot read, merge into, or delete another learner account's snapshot.
- [x] Keep administrative Supabase and Resend credentials out of the static application and repository.

## Comments

- Repository-owned migration, atomic merge operation, Row Level Security, local Supabase configuration, production handoff documentation, and integration tests are complete and verified locally.
- External provisioning was completed through the learner-account foundation wizard: the EU-hosted Supabase project is configured, the migration is applied, GitHub Pages Auth settings are configured, `bimurto.io` is verified in Resend, and custom SMTP sends from `auth@bimurto.io`.

## Answer

Ticket 01 is complete. The account-owned learning-progress snapshot, atomic merge operation, and Row Level Security are deployed; Supabase Auth is configured for passwordless six-digit email codes; and Resend custom SMTP is configured from `auth@bimurto.io`. No credentials are recorded in this tracker.
