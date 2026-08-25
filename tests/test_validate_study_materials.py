import json
import tempfile
import unittest
from pathlib import Path

from validate_study_materials import source_sha256, validate_chapter


class ValidateStudyMaterialsTests(unittest.TestCase):
    def test_accepts_summary_with_current_source_and_complete_coverage(self):
        questions = [
            {"question_id": "1.2.03-101"},
            {"question_id": "1.2.03-102"},
        ]

        with tempfile.TemporaryDirectory() as temp_dir:
            leaf = Path(temp_dir)
            (leaf / "questions.json").write_text(json.dumps(questions) + "\n", encoding="utf-8")
            source = leaf / "questions_class_b.json"
            source.write_text(json.dumps(questions) + "\n", encoding="utf-8")
            catalog_path = leaf / "class_b_catalog.json"
            catalog_path.write_text(
                json.dumps(
                    {
                        "schema_version": 1,
                        "questions": {
                            question["question_id"]: {
                                "url": "https://example.test/question",
                                "licenses": ["Basic material"],
                            }
                            for question in questions
                        },
                    }
                ),
                encoding="utf-8",
            )
            digest = source_sha256(source)
            (leaf / "summary.md").write_text(
                f"""---
license_class: B
question_count: 2
source_file: questions_class_b.json
source_sha256: {digest}
law_verified: 2026-08-25
---
# Speed — Class B Study Summary

## Overview
Overview text.

## Learning goals
- Goal

## Core rules
<!-- questions: 1.2.03-101, 1.2.03-102 -->
Follow the current rule ([StVO §3](https://www.gesetze-im-internet.de/stvo_2013/__3.html)).

## Common exam traps
- Trap

## Remember this
- Remember

## Sources
- [StVO §3](https://www.gesetze-im-internet.de/stvo_2013/__3.html)
""",
                encoding="utf-8",
            )

            self.assertEqual(validate_chapter(leaf, catalog_path=catalog_path), [])

    def test_rejects_non_b_question_from_class_b_dataset(self):
        question = {"question_id": "2.7.01-008", "url": "https://example.test/a"}
        with tempfile.TemporaryDirectory() as temp_dir:
            leaf = Path(temp_dir)
            (leaf / "questions.json").write_text(json.dumps([question]), encoding="utf-8")
            (leaf / "questions_class_b.json").write_text(json.dumps([question]), encoding="utf-8")
            catalog_path = leaf / "class_b_catalog.json"
            catalog_path.write_text(
                json.dumps(
                    {
                        "schema_version": 1,
                        "questions": {
                            question["question_id"]: {
                                "url": question["url"],
                                "licenses": ["A", "A1", "A2"],
                            }
                        },
                    }
                ),
                encoding="utf-8",
            )

            issues = validate_chapter(leaf, catalog_path=catalog_path, require_summary=False)

            self.assertTrue(any("does not match licence catalog" in issue for issue in issues), issues)


if __name__ == "__main__":
    unittest.main()
