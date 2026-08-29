# Class B Theory Study Guide

Status: ready-for-agent

## Problem Statement

The learner currently has to study 92 separate chapter summaries containing roughly 70,000 words. Repeated topics are spread across multiple chapters, important rules are difficult to revise quickly, and five question-bank chapters have no chapter summary. The learner needs one concise, understandable reference that provides question coverage for all 1,592 Class B theory questions without reproducing the question bank or its media.

## Solution

Create one Class B Theory Study Guide that consolidates and deduplicates the chapter summaries, fills question-bank coverage gaps, and explains the rules needed to answer every theory question when the question's own media is available. Organize the guide by major theory themes, use plain English with important German terms in parentheses, and target approximately 15,000–20,000 words. Include clear rules, exceptions, formulas, brief examples, memory tips, common exam traps, and a final cheat sheet. Do not include media or citations.

## User Stories

1. As a Class B theory learner, I want one study document, so that I do not need to open dozens of chapter summaries.
2. As a Class B theory learner, I want the guide to cover every theory question, so that I can use it as my primary revision reference.
3. As a Class B theory learner, I want the five chapters without summaries to be covered, so that the guide has no known question-bank gaps.
4. As a Class B theory learner, I want repeated material merged, so that I do not study the same rule several times.
5. As a Class B theory learner, I want the guide organized by major themes, so that related rules appear together.
6. As a Class B theory learner, I want a table of contents, so that I can jump directly to a topic.
7. As a Class B theory learner, I want concise explanations, so that the guide remains practical to revise.
8. As a Class B theory learner, I want difficult rules explained clearly, so that brevity does not make them ambiguous.
9. As a Class B theory learner, I want rules distinguished from exceptions, so that I know when the normal answer does not apply.
10. As a Class B theory learner, I want numerical rules and formulas shown explicitly, so that I can calculate exam answers correctly.
11. As a Class B theory learner, I want short worked examples for complex calculations, so that I understand how to use each formula.
12. As a Class B theory learner, I want situational examples for easily confused traffic rules, so that I can apply them rather than merely memorize them.
13. As a Class B theory learner, I want memory tips near difficult concepts, so that important distinctions are easier to retain.
14. As a Class B theory learner, I want memory tips clearly separated from legal rules, so that a mnemonic is never mistaken for the rule itself.
15. As a Class B theory learner, I want common exam traps identified, so that I recognize tempting but incorrect answers.
16. As a Class B theory learner, I want positive and negative obligations stated precisely, so that I know what I must, may, and must not do.
17. As a Class B theory learner, I want safety priorities explained, so that I can resolve questions where several actions seem plausible.
18. As a Class B theory learner, I want visual recognition cues described in words, so that I know what to inspect in a question's image or video.
19. As a Class B theory learner, I want road-sign meanings explained without embedding sign images, so that the guide stays compact and text-only.
20. As a Class B theory learner, I want video-scenario rules described without embedding videos, so that I can interpret the media supplied with a question.
21. As a Class B theory learner, I want plain English throughout, so that legal and technical concepts remain approachable.
22. As a Class B theory learner, I want important German exam terms shown in parentheses, so that I can connect the English explanation to official terminology.
23. As a Class B theory learner, I want overlapping summaries reconciled into one consistent rule, so that contradictions do not remain in the guide.
24. As a Class B theory learner, I want important qualifications preserved during compression, so that a short statement does not become misleading.
25. As a Class B theory learner, I want the guide to focus on answerable knowledge rather than copied questions, so that I learn transferable rules.
26. As a Class B theory learner, I want a final cheat sheet, so that I can rapidly revise formulas, signals, priorities, and major exceptions.
27. As a Class B theory learner, I want the cheat sheet to summarize material already explained in the guide, so that it does not introduce unexplained facts.
28. As a Class B theory learner, I want the document to render cleanly as standard Markdown, so that it is readable locally and on GitHub.
29. As a Class B theory learner, I want headings and lists to be consistent, so that I can scan the guide efficiently.
30. As a Class B theory learner, I want the final guide to stay near the agreed length, so that comprehensive coverage remains manageable.
31. As a project maintainer, I want every chapter summary included in the consolidation process, so that source material is not silently omitted.
32. As a project maintainer, I want every correct question response audited against the guide, so that question coverage is evidence-based.
33. As a project maintainer, I want conflicts checked against authoritative rules during authoring, so that the final explanation is dependable.
34. As a project maintainer, I want citations omitted from the learner-facing guide, so that the document remains focused and uncluttered.
35. As a project maintainer, I want source chapter summaries left unchanged, so that the consolidated guide does not disrupt existing chapter pages.

## Implementation Decisions

- The deliverable is a single root-level Markdown document titled “Class B Theory Study Guide.”
- The guide will synthesize all 92 existing chapter summaries and audit all 1,592 Class B theory questions.
- The five question-bank chapters without chapter summaries will be synthesized from their questions, correct responses, explanations, and authoritative rules where clarification is necessary.
- Question coverage means that the guide explains enough rules and recognition cues to determine every correct response when the question's own media is available.
- The guide will not enumerate or copy every theory question.
- The target length is approximately 15,000–20,000 words. Completeness of rules and exceptions takes priority over hitting an exact word count.
- The guide will use a table of contents and major curriculum themes. Repeated chapter topics will be merged under the most natural theme instead of retained as duplicate chapter sections.
- Each topic will favor a predictable learning sequence: core rule, essential exceptions or conditions, useful example or formula, common exam trap, and a short memory aid where one adds value.
- Explanations will use plain English and retain important German exam or legal terms in parentheses.
- Memory aids will be presented as learning tools, never as substitutes for the governing rule.
- Media will not be embedded, linked, or reproduced. Image- and video-dependent questions will be supported through textual descriptions of relevant cues and decision rules.
- Citations, footnotes, and source links will not appear in the learner-facing guide.
- During authoring, overlapping or conflicting material will be reconciled against correct question-bank responses and authoritative legal sources. Only the resulting concise rule will appear in the guide.
- The final cheat sheet will consolidate formulas, distances, speed rules, light and signal meanings, priority rules, emergency behavior, and easily confused exceptions already explained in the main guide.
- Existing chapter summaries, question files, web application behavior, and Android application behavior will remain unchanged.

## Testing Decisions

- The primary test seam is the completed Markdown guide as one externally observable learning artifact.
- A good acceptance test asks whether a learner can determine the correct response to each theory question from the guide and the media supplied by that question. It does not test individual paragraphs, headings, or authoring mechanics in isolation.
- Audit all 1,592 correct question responses against the finished guide and record any response whose governing rule or recognition cue cannot be found. Acceptance requires no uncovered responses.
- Confirm that all 92 chapter summaries contributed their distinct rules, exceptions, formulas, or traps. Acceptance requires no silently omitted chapter summary.
- Explicitly audit the five chapters without summaries to confirm their question-bank knowledge is represented.
- Perform document-level structural checks for a table of contents, major thematic sections, common exam traps, contextual examples or memory tips, and a final cheat sheet.
- Verify that the guide contains no embedded media, media links, citations, footnotes, or source links.
- Verify that important German terms appear in parentheses while the surrounding prose remains plain English.
- Check that duplicated rules are consolidated and that conflicting statements do not survive in separate sections.
- Measure the final word count against the 15,000–20,000-word target. A small overrun is acceptable only when required for question coverage or an essential exception.
- Render or preview the Markdown to verify readable heading hierarchy, lists, tables, formulas, and internal table-of-contents links.
- Reuse the existing question-catalogue boundary as prior art for locating and enumerating all chapter summaries and theory questions. No lower-level per-chapter test seam is needed.

## Out of Scope

- Embedding, copying, or linking question images and videos.
- Adding citations, legal footnotes, bibliographies, or source links to the finished guide.
- Copying all question wording or answer choices into the guide.
- Creating one guide per chapter or producing multiple output documents.
- Changing existing chapter summaries or question-bank files.
- Integrating the new guide into the web application or Android wrapper.
- Translating the guide into German or another language.
- Replacing practice mode, progress tracking, or chapter browsing.
- Guaranteeing that the guide alone can identify hazards hidden in media that is not available to the learner.

## Further Notes

- The source inventory currently contains 92 chapter summaries totaling roughly 70,000 words and 1,592 Class B theory questions across 97 question files.
- The known summary gaps are alcohol/drugs/medication, driving and rest periods, EC monitoring devices, trailer coupling systems, and receipt/transport/delivery of goods within the numbered Class B question catalogue.
- “Short” means highly compressed relative to the source corpus, not omission of rules needed for question coverage.
- The domain glossary defines the canonical terms “theory question,” “chapter summary,” “Class B Theory Study Guide,” and “question coverage.”
