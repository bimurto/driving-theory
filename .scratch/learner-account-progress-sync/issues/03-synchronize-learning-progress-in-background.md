# 03: Synchronize learning progress in the background

**What to build:** Let a signed-in learner keep practising at full speed while learning progress saves locally first and synchronizes to the learner account in the background. The Account page clearly communicates synchronized, pending, and failed state, including recovery after offline use.

**Blocked by:** 02: Sign in and preserve learning progress.

**Status:** ready-for-agent

- [ ] Save every answered theory question to the device immediately, then coalesce and synchronize the account snapshot shortly afterward.
- [ ] Retry pending or failed synchronization after connectivity returns or the learner makes another progress update.
- [ ] Ensure every existing learning-progress view uses the same persistence seam and reflects the current locally available learning progress.
- [ ] Show synchronized, pending, and failed sync state on the Account page without interrupting practice.
- [ ] Test offline practice, retry, and two-device merge behaviour with deterministic progress records and timestamps.
- [ ] Preserve friction-free guest practice and the existing browser-local progress experience.
