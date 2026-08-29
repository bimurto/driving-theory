# Supabase learner-account foundation

This directory contains the version-controlled foundation for learner accounts:

- a single account-owned learning-progress JSON snapshot;
- an atomic database merge operation for independently updated snapshots; and
- Row Level Security policies that restrict direct snapshot access to its learner account.

## Local verification

Start the local Supabase stack, apply migrations, then run the database tests:

```bash
npx supabase start
npx supabase db reset
npx supabase test db
```

The tests create two learner accounts and verify initial snapshot creation, atomic merge behaviour, and cross-account read/delete isolation.

## Production handoff

These steps require access to the Supabase, Resend, DNS, and GitHub settings; no credentials belong in this repository.

1. Create the Supabase project in an EU region, preferably Frankfurt.
2. Link the local project to that Supabase project and apply the version-controlled migration with `supabase db push`.
3. In Supabase Authentication URL configuration, set the site URL to `https://bimurto.github.io/driving-theory/` and allow that URL plus the local development URL.
4. Enable email sign-up and passwordless email OTPs, with six-character codes and a one-hour expiry. Keep CAPTCHA disabled for this release.
5. Verify `bimurto.io` in Resend and configure Supabase Auth custom SMTP to send from `auth@bimurto.io`. Store the Resend credential only in Supabase's SMTP settings.
6. Set appropriate Auth email and verification rate limits before public release.

The static application will later receive only the Supabase project URL and publishable key. The Supabase secret key, database password, Resend credential, and any administrative service credential must never be exposed to the browser, GitHub build output, or repository.
