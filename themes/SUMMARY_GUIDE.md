# Class B Summary Authoring Guide

This guide defines the contract for every `summary.md` generated from a chapter's
`questions_class_b.json` file. Summaries are English-language revision aids for
the German Class B theory test. They explain and connect the rules; they do not
repeat the worksheet as an answer key.

## Source priority

Use sources in this order:

1. Current federal law from `gesetze-im-internet.de`, especially the StVO and
   its annexes, FeV, StVG, StVZO, FZV, and BKatV.
2. The official theory-training curricula in Annex 1 and Annex 2.2 of the
   Fahrschüler-Ausbildungsordnung.
3. The chapter's question text, correct answers, and explanations for exam
   coverage and teaching context.

Current law wins whenever the dataset conflicts with an official source. Add a
visible `## Dataset warning` section naming the affected question IDs rather
than silently teaching stale material.

## Required front matter

```yaml
---
license_class: B
question_count: 9
source_file: questions_class_b.json
source_sha256: <sha256 of the exact worksheet file>
law_verified: YYYY-MM-DD
---
```

## Required structure

```markdown
# <Chapter> — Class B Study Summary

## Overview
## Learning goals
## Core rules
## Numbers and formulas        <!-- only when relevant -->
## Situations and exceptions   <!-- only when relevant -->
## Common exam traps
## Remember this
## Sources
```

Use additional third-level headings to group related concepts. Immediately
under each concept heading, add an invisible coverage marker:

```markdown
<!-- questions: 1.2.03-101, 1.2.03-103 -->
```

Across the document, these markers must cover every ID in
`questions_class_b.json` and must not name excluded questions.

## Writing rules

- Explain the reason behind a rule and how to apply it in a traffic situation.
- Put an official inline link beside every legal or numerical legal claim.
- Clearly label exam formulas and mnemonics as rules of thumb when they are not
  statutory rules.
- State conditions and exceptions next to the main rule, not in disconnected
  fine print.
- Prefer short examples and calculations over abstract repetition.
- Do not copy every question or provide a numbered answer key.
- Keep small chapters concise; expand large chapters according to the number of
  distinct concepts, not merely the number of questions.
- End with a short checklist suitable for last-minute revision.

## Review checklist

Before publishing a summary, confirm that:

- its front matter reflects the matching `questions_class_b.json` worksheet;
- every Class B question ID has one coverage marker and no excluded ID appears;
- official sources support legal and numerical claims; and
- the required sections and a concise final checklist are present.

The web app reads the Class B worksheets and summaries directly when it builds
its study catalogue.
