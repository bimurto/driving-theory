# Starred Question Revision

Status: ready-for-agent

## Problem Statement

Learners can practise Class B theory questions and inspect questions in each chapter, but they cannot mark questions they personally want to revisit. They therefore have no focused way to return to difficult, uncertain, or otherwise important theory questions, and their deliberate priorities are not available across devices when they use a learner account.

## Solution

Let a learner assign every theory question a mutable star rating from 1 to 3, or remove its rating to make it unstarred. Make this control available in practice and chapter question lists. Add a primary-navigation Starred page that lists the learner's starred theory questions, supports star-level filtering, and starts a dedicated starred revision session. That session continues to update ordinary learning progress while selecting higher-rated questions first, then applying due-review priority within each rating. Star ratings remain independent of answer history and synchronise as part of learning progress; concurrent device updates use the most recently changed rating, including removal.

## User Stories

1. As a Class B theory learner, I want to give any theory question from one to three stars, so that I can express how strongly I want to revise it.
2. As a learner, I want an unstarred theory question to have no visible rating, so that my saved revision priorities remain intentional.
3. As a learner, I want to change a theory question's star rating later, so that my priorities can evolve as I learn.
4. As a learner, I want to remove a theory question's rating, so that it no longer appears in starred revision.
5. As a learner, I want to rate a theory question while practising it, so that I can capture a revision priority at the moment I notice it.
6. As a learner, I want to rate a theory question from its chapter question list, so that I can mark questions while reading their answers and explanations.
7. As a learner, I want to star a theory question I have not attempted, so that marking a question never requires me to answer it first.
8. As a learner, I want a clearly labelled Starred destination in the main navigation, so that my personal revision set is easy to find on desktop and mobile.
9. As a learner, I want the Starred page to show my starred theory questions, so that I can inspect the revision set before beginning practice.
10. As a learner, I want the Starred page to show the rating of each listed theory question, so that I can understand its priority.
11. As a learner, I want to filter the Starred page by one, two, or three stars, so that I can revise one priority level at a time.
12. As a learner, I want to begin a revision session from the currently selected starred set, so that the practice session matches the list I chose.
13. As a learner, I want starred revision to include only theory questions that match the active star-level filter, so that it does not unexpectedly introduce other questions.
14. As a learner, I want three-star theory questions to appear before lower-rated theory questions, so that my strongest priorities receive attention first.
15. As a learner, I want due reviews to take priority among theory questions with the same star rating, so that deliberate revision does not discard useful review scheduling.
16. As a learner, I want starred revision answers to update my attempts, correctness, and review schedule normally, so that this practice contributes to my learning progress.
17. As a learner, I want an answer to leave my star rating unchanged, so that correctness never silently removes a personal revision priority.
18. As a learner, I want a theory question whose final star I remove during starred revision to be excluded from the remaining session, so that the session always honours my current list.
19. As a learner, I want the currently open theory question to remain understandable when I remove its final star, so that the interaction does not abruptly erase what I was viewing.
20. As a learner with no starred theory questions, I want the Starred page to explain how to add them and link me to practice, so that I know how to begin using the feature.
21. As a learner who filters to a star level with no matches, I want a specific empty state, so that I understand why no revision session can start.
22. As a guest learner, I want star ratings saved in this browser with my learning progress, so that my personal revision set persists without creating an account.
23. As a learner with a learner account, I want star ratings synchronised between devices, so that my revision set follows me.
24. As a learner signing in after rating questions as a guest, I want those ratings retained in the merged learning progress, so that authentication does not discard my local choices.
25. As a learner using two devices, I want the most recently changed star rating for a theory question to win when devices synchronise, so that my latest deliberate action, including unstar, is retained.
26. As a learner resetting browser learning progress, I want browser-local star ratings cleared with that progress, so that the reset performs the stated data removal.
27. As a learner deleting my learner account, I want synced star ratings removed with the account's learning progress, so that account deletion removes my personal study data.
28. As a learner, I want current practice, chapter lists, learning statistics, and scheduled reviews to keep working when I use stars, so that this feature does not disrupt established study behavior.

## Implementation Decisions

- A star rating is a mutable personal mark with four possible states: unstarred (0), 1 star, 2 stars, and 3 stars. A higher value means a stronger desire to revise the theory question. Rating changes and removal are explicit learner actions.
- Store ratings separately from answer-derived per-question learning records. This permits a learner to star an unseen theory question without inventing attempts, correctness, or a review schedule.
- Extend the versioned learning-progress snapshot with a per-theory-question star-rating collection. Each stored rating carries its change time so account synchronization can resolve concurrent updates. Existing browser and cloud version-1 snapshots must migrate safely to the new shape with no ratings.
- Star ratings are independent of attempts, correct answers, ease, intervals, and scheduled review. Answering a question does not alter its rating; clearing a rating does not alter its ordinary learning progress.
- Provide rating controls in both existing question surfaces: the practice question card and the chapter question list. The control must make the active rating, change options, and removal accessible to keyboard and assistive-technology users.
- Add Starred as a top-level destination in both desktop and mobile navigation. Its page is the star-question list, not a replacement for ordinary practice or learning progress.
- The Starred page shows only currently starred theory questions, their rating, and the controls necessary to filter by star level and begin revision for the current selection. Its empty state explains where ratings can be assigned and provides a route to practice.
- Starred revision uses the normal question-answering experience and records ordinary learning progress through the existing learning-progress persistence interface. It receives a starred-only question set from the Starred page rather than creating a second answer-recording path.
- Within a starred revision set, select higher ratings before lower ratings. Within the same rating, preserve the existing due-review priority; any remaining tie-breaking may use the current selection behavior.
- Re-evaluate the active starred set before selecting each next question. If the learner removes the final star from the open theory question, preserve the open question but do not select it again or include it in later session questions.
- Treat ratings as learning-progress data for all existing persistence lifecycle operations: guest browser save, account sign-in merge, background synchronization, reset, and account deletion.
- The atomic account snapshot merge resolves ratings independently from answer progress. For one theory question, the rating whose change time is latest wins; an unstar action participates in the same rule and must not be overwritten by an older nonzero rating.
- Preserve the existing account data boundary: the learner account owns one learning-progress snapshot, with no separate star-rating service or new externally visible API.
- The concurrency rule is governed by ADR-0001: last change wins for star ratings.

## Testing Decisions

- The primary test seam is the existing learning-progress model and persistence interface. Good tests assert observable rating, selection, persistence, and synchronization outcomes rather than component state or framework implementation details.
- Extend the existing pure progress-model tests as prior art. Test rating assignment, replacement, removal, and migration of prior learning progress without ratings.
- Test starred-question-set selection deterministically: it includes only matching ratings, orders higher ratings before lower ratings, respects due-review priority within a rating, and excludes a newly unstarred question from later selections.
- Test that starring unseen theory questions creates no answer-derived learning-progress record, and that answering a starred theory question changes ordinary learning progress without changing its rating.
- Extend persistence-interface tests using the established fake gateway. Cover guest save/load, initial account merge, background synchronization, reset, sign-out behavior, and account deletion with ratings included.
- Test the atomic Supabase snapshot merge as the shared-account boundary. Verify migration validation, independent answer-progress merging, last-change-wins ratings, and a newer unstar action defeating an older nonzero rating. Retain the existing learner-isolation coverage.
- Test the Starred page and practice boundary through visible accessible behavior: navigation exposes Starred; filters alter the displayed and launched set; an empty filter result explains how to add ratings; controls are available in practice and chapter lists; and changing a rating during revision affects subsequent questions.
- Run the existing web-app and Supabase test suites as regression coverage for normal practice, learning progress, account lifecycle, and row-level isolation.

## Out of Scope

- Free-form notes, tags, folders, labels, or other saved-question metadata.
- Automatically inferring a star rating from incorrect answers, answer speed, or review schedule.
- Changing the spaced-repetition algorithm beyond its use as a tie-breaker within the same star rating.
- Shared, public, or account-to-account starred lists.
- Real-time cross-device UI updates, rating history, audit logs, conflict-resolution UI, or manual import/export of star ratings.
- A separate server endpoint, relational table, or standalone synchronization mechanism for ratings.
- Changes to the theory-question catalogue, answers, explanations, or media.

## Further Notes

- Use the glossary terms “theory question,” “learning progress,” “star rating,” “starred question list,” and “starred revision” consistently.
- The star-rating synchronization choice is intentionally documented because a deletion is a meaningful learner action: a newer unstar must win over an older saved rating.
- The existing learning-progress snapshot merge currently validates and merges answer records. Its contract must evolve in step with the snapshot version so older learner data remains readable and account data stays atomic.
