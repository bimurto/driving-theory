# 03: Synchronize star ratings with learner accounts

**What to build:** Star ratings are migrated into the versioned learning-progress snapshot and synchronize through existing learner accounts. Concurrent changes resolve by most-recent rating change, including unstar actions; reset and account deletion remove ratings with learning progress.

**Blocked by:** 01 — Persist local star ratings.

**Status:** resolved

- [ ] Existing browser and cloud learning-progress snapshots migrate to the rating-capable version without losing ordinary learning progress.
- [ ] Guest ratings merge into a learner account on sign-in and synchronize across devices through the existing learning-progress lifecycle.
- [ ] Atomic snapshot merging preserves answer progress independently and chooses the star rating with the latest change time for the same theory question.
- [ ] A newer unstar action defeats an older nonzero rating during a cross-device merge.
- [ ] Browser reset and learner-account deletion clear star ratings together with learning progress.
- [ ] Persistence and database-boundary tests cover migration, last-change-wins behavior, unstar conflicts, lifecycle removal, and learner isolation.
