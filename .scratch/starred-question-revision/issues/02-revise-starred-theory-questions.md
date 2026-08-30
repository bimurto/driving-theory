# 02: Revise starred theory questions

**What to build:** Learners can open the main-navigation Starred page, filter their starred question list by rating, and start a starred revision session. The session prioritizes higher ratings, respects due reviews within each rating, and immediately excludes newly unstarred questions from subsequent selections.

**Blocked by:** 01 — Persist local star ratings.

**Status:** ready-for-agent

- [ ] Desktop and mobile navigation expose a Starred destination that lists only the learner's currently starred theory questions and their ratings.
- [ ] A learner can filter the list by star level and start a revision session containing only the matching theory questions.
- [ ] The Starred page explains how to add ratings and links to practice when no theory questions match.
- [ ] Starred revision records normal attempts, correctness, and review scheduling while serving higher ratings first and due reviews first within a rating.
- [ ] Removing an open theory question's final star preserves the open question but prevents it from appearing later in the active revision session.
- [ ] Focused model and page-boundary tests cover filtering, ordering, empty states, and dynamic removal behavior.
