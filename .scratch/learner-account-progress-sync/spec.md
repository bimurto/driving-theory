# Learner Account Progress Sync

Status: ready-for-agent

## Problem Statement

Learners can currently practise without friction, but their learning progress exists only in the browser where it was recorded. It cannot be recovered on a second device, survives neither a browser-data reset nor device loss, and provides no account-level privacy controls. Learners need an optional learner account that securely stores and synchronises their learning progress without making an account mandatory for practice.

## Solution

Keep guest practice and browser-local learning progress, while adding optional passwordless learner accounts backed by Supabase. A learner enters an email address and verifies a six-digit code delivered by Resend from `auth@bimurto.io`. The Account page then lets the learner view authentication and sync state, sign out, read the privacy notice, and permanently delete the learner account and its synced data.

After the learner authenticates, the app merges browser-local and cloud learning progress per theory question, stores the resulting account-owned progress as one JSON snapshot, and keeps the device responsive through local-first saves and background sync. Supabase must perform snapshot merging atomically so independent devices cannot overwrite each other's valid learning progress.

## User Stories

1. As a Class B theory learner, I want to begin practising without creating a learner account, so that I can use the app immediately.
2. As a guest learner, I want my learning progress to remain in this browser, so that existing practice behaviour continues before I choose to authenticate.
3. As a learner, I want an Account page in the app navigation, so that account and privacy controls are easy to find.
4. As a learner, I want to enter my email address on the Account page, so that I can create or access my learner account.
5. As a learner, I want one email flow for both account creation and sign-in, so that I do not need to determine whether I already have an account.
6. As a learner, I want to receive a six-digit sign-in code at my email address, so that I do not need to create or remember a password.
7. As a learner, I want authentication emails sent from `auth@bimurto.io`, so that I can recognize their source.
8. As a learner, I want to enter the code on the Account page, so that I can verify my email address and authenticate.
9. As a learner who creates an account after practising as a guest, I want my existing browser learning progress uploaded, so that my earlier study effort is preserved.
10. As a learner who signs in on another device, I want the account learning progress downloaded, so that I can continue studying where I left off.
11. As a learner with progress on both this browser and my learner account, I want them merged per theory question, so that neither device silently erases valid study history.
12. As a learner who answers a theory question while signed in, I want the answer reflected in the app immediately, so that practice never waits for the network.
13. As a learner who temporarily loses connectivity, I want local learning progress retained and synchronized when connectivity returns, so that I can keep studying offline.
14. As a learner, I want the Account page to show whether learning progress is synchronized, pending, or unable to sync, so that I understand the safety of my current progress.
15. As a learner, I want the app to retry a failed background sync, so that a transient connection failure does not require manual recovery.
16. As a learner, I want to sign out of my learner account, so that another person using the device cannot access my synced learning progress.
17. As a learner, I want to continue as a guest after signing out, so that signing out does not prevent further practice.
18. As a learner, I want a privacy page linked from the Account page, so that I know that Supabase stores my email address and learning progress and Resend delivers authentication codes.
19. As a learner, I want the privacy page to explain account deletion and current-device deletion, so that I can make an informed choice about removing my data.
20. As a learner, I want to permanently delete my learner account from the Account page, so that I can remove my cloud-stored personal data without contacting support.
21. As a learner deleting my learner account, I want a strong confirmation step, so that accidental deletion does not erase my learning progress.
22. As a learner whose deletion is confirmed, I want the cloud learning progress and the merged browser copy on this device cleared, so that account deletion removes my synced data as promised.
23. As a learner, I want theory-question scheduling and statistics to remain correct after a merge, so that sync does not change what I should study next incorrectly.
24. As a learner, I want progress on one learner account inaccessible to other learners, so that my study history remains private.
25. As a project maintainer, I want learner data hosted in an EU Supabase region, preferably Frankfurt, so that the data location fits this German-focused app.
26. As a project maintainer, I want the app to remain hosted at `bimurto.github.io/driving-theory`, so that accounts do not require a hosting migration.
27. As a project maintainer, I want authentication-email delivery configured through Resend and no CAPTCHA in this release, so that the agreed sign-in experience remains lightweight.

## Implementation Decisions

- A learner account is optional. Guest practice remains available and browser-local learning progress remains the immediate persistence layer for every learner.
- Add an Account page to the primary and mobile navigation. It owns authentication, account state, sync state, sign-out, deletion, and the privacy-page link; practice pages do not own those responsibilities.
- Use Supabase Auth with passwordless email one-time passwords. A single email entry flow serves both account creation and sign-in; successful code verification creates the learner account if necessary.
- Use six-digit email codes, not passwords or clickable magic links. Authentication emails are delivered by Resend from `auth@bimurto.io` after verifying `bimurto.io` as the sending domain.
- Keep the public application at `https://bimurto.github.io/driving-theory`. Configure Supabase's application and permitted authentication URLs for this deployed origin and local development as required by the code flow.
- Provision the Supabase project in an EU region, preferably Frankfurt. The only account-associated application data is the learner's email identity held by Supabase Auth and the learner's learning-progress snapshot.
- Store one learning-progress JSON snapshot per learner account, including the existing progress-state version and per-theory-question records. Do not normalize learning progress into one database row per theory question in this release.
- Protect the snapshot with Supabase Row Level Security so an authenticated learner can only access their own snapshot. Never expose administrative credentials in the static application.
- Replace the direct browser-storage dependency with one learning-progress persistence interface. It is the single application seam for loading, saving, resetting, initial account synchronization, background synchronization, and observable sync state. Existing practice, topic, home, and progress screens consume that seam rather than Supabase directly.
- On first authentication, load the cloud snapshot if present, merge it with the current browser snapshot, persist the merged result locally, and atomically submit it to Supabase. A newly created learner account therefore receives existing browser learning progress instead of beginning empty.
- Merge by theory-question ID. Preserve the greatest attempt count and correct-answer count; use the most recently answered record for the current scheduling fields and timestamps, retaining a valid scheduled review. The merged snapshot must preserve the existing progress-state version.
- Implement the merge as an atomic Supabase database operation over the account-owned JSON snapshot. Browsers may calculate their local view but must not rely on download-merge-overwrite as the conflict-resolution mechanism.
- Save learning progress locally before background synchronization. Coalesce saves shortly after answer events, retry failed synchronization when connectivity returns or a later save occurs, and expose pending or failed sync state on the Account page.
- Supabase is the durable shared copy for authenticated learners; browser storage remains the offline cache and guest persistence. Signing out ends the authenticated session but does not stop future guest practice.
- Account deletion requires a deliberate confirmation. It permanently deletes the learner account and cloud learning-progress snapshot, clears the current device's merged browser copy, ends the session, and returns the app to guest mode.
- Include a concise privacy page linked from the Account page. It explains Supabase's storage of authentication identity and learning progress, Resend's delivery of sign-in codes, EU-region hosting, local browser persistence, and the effect of account deletion.
- Do not add CAPTCHA protection in this release. Use Supabase and email-provider rate limits and surface safe, non-enumerating feedback for code-request failures.

## Testing Decisions

- The primary test seam is the learning-progress persistence interface. A good test verifies observable persistence and synchronization behaviour, not component internals or Supabase SDK calls.
- Reuse the existing pure progress scheduling tests as prior art. Continue to test learning-progress updates, due selection, and merged scheduling values deterministically with explicit timestamps.
- Unit-test loading, local saving, reset, guest mode, authenticated initial synchronization, pending synchronization, retry, sign-out, and confirmed deletion through the persistence interface using a fake remote snapshot service.
- Unit-test the per-question merge contract: it must preserve independent progress from two devices, retain valid attempts/correct counts, choose the newest scheduling fields, preserve the state version, and be idempotent when the same snapshot is synchronized twice.
- Integration-test the atomic Supabase merge operation and Row Level Security with two distinct learner accounts. Acceptance requires that one learner cannot read, merge into, or delete another learner's snapshot.
- Test the account flow at the page boundary: email-code request, code verification, authenticated state, visible sync state, sign-out, deletion confirmation, and privacy-page navigation. Assert accessible user-visible outcomes rather than framework state.
- Test offline behaviour by simulating unavailable remote persistence: answering remains locally visible, sync becomes pending or failed, and a later successful connection synchronizes the merged snapshot.
- Test deletion end-to-end against a test Supabase project: confirmation removes the remote snapshot and authentication identity, clears the current local snapshot, ends the session, and exposes guest state.
- Verify deployment configuration uses public Supabase values only, supports the GitHub Pages base path, and never emits Resend credentials or Supabase administrative credentials into the generated static application.
- Run the existing web-app test suite as a regression check for current practice, topic, home, and progress behaviour.

## Out of Scope

- Password-based authentication, password reset, social login, phone authentication, MFA, or CAPTCHA.
- User profiles, display names, subscriptions, payments, roles, or social features.
- Synchronizing settings, bookmarks, notes, media, question-bank content, or any data other than learning progress.
- Replacing GitHub Pages hosting or moving the application to server-side rendering.
- Custom-domain hosting for the app; `bimurto.io` is used for authentication-email delivery only in this release.
- Per-theory-question relational progress rows, realtime multi-device updates, conflict-resolution UI, progress-history audit logs, or manual backup/export.
- Account recovery beyond requesting a new email code.
- Importing learning progress from other driving-theory applications.

## Further Notes

- The existing progress state is versioned and already represents per-theory-question attempts, correctness, ease, interval, next review time, and last answer time. The cloud snapshot preserves that model.
- The current browser-only notice must be revised wherever it appears so learners understand guest versus authenticated persistence accurately.
- Supabase email and custom SMTP configuration must use the production project settings; Resend credentials are operational secrets and are not committed to the repository.
- The domain glossary defines “learning progress” and “learner account”; use those terms consistently instead of “user profile” or “subscription.”
