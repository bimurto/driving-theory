# driving-theory

All of TÜV and DEKRA German driving theory exam questions and answers in English

## Question Banks

- [English Questions](./driving_theory_questions.md) - Complete set of driving theory questions in English
- [German Questions](./driving_theory_questions_de.md) - Complete set of driving theory questions in German (Deutsch)

## Class B Study Materials

The English question bank is split into theme and chapter folders under
[`themes/`](./themes/). Every chapter contains the complete source worksheet as
`questions.json`, a readable `questions.md`, and a licence-filtered
`questions_class_b.json`. Chapters relevant to Class B can additionally contain
an English `summary.md` grounded in current German rules.

Regenerate the theme/chapter split without deleting authored summaries:

```bash
python3 split_questions_by_theme.py
```

Refresh licence metadata and Class B worksheet files:

```bash
UV_CACHE_DIR=/tmp/driving-theory-uv-cache uv run python prepare_class_b_materials.py
```

Validate prepared data while summaries are being written in batches:

```bash
python3 validate_study_materials.py --allow-missing-summaries
```

See [`themes/SUMMARY_GUIDE.md`](./themes/SUMMARY_GUIDE.md) for the summary
template, source policy, and per-chapter validation workflow.
