# 04: Add learner-account privacy and lifecycle controls

**What to build:** Give a signed-in learner understandable account controls: sign out, read a concise privacy explanation, and permanently delete their learner account. Confirmed deletion removes the cloud learning progress and this device's merged copy, then returns the app to guest practice.

**Blocked by:** 03: Synchronize learning progress in the background.

**Status:** ready-for-agent

- [ ] Allow the learner to sign out from the Account page and continue practising as a guest.
- [ ] Publish and link a privacy page that explains Supabase identity and learning-progress storage, Resend email-code delivery, EU-region hosting, local persistence, and deletion.
- [ ] Require a strong confirmation before permanent account deletion.
- [ ] On confirmed deletion, remove the learner account and cloud snapshot, clear this device's merged learning progress, end the session, and return to guest mode.
- [ ] Revise browser-only learning-progress notices so they accurately distinguish guest and authenticated persistence.
- [ ] Test sign-out, privacy navigation, deletion confirmation, complete remote and local cleanup, and the returned guest state.
