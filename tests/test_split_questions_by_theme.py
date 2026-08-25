import json
import tempfile
import unittest
from pathlib import Path

from split_questions_by_theme import split_questions


class SplitQuestionsTests(unittest.TestCase):
    def test_regeneration_preserves_authored_summary(self):
        question = {
            "theme_number": "Theme 1.1.",
            "theme_name": "Danger Teaching",
            "chapter_number": "1.1.01 Chapter",
            "chapter_name": "Basic Forms Of Traffic Behavior",
            "question_id": "1.1.01-001",
            "question_number": "1.1.01-001",
            "points": "4 Points",
            "question_text": "What should you understand by defensive driving?",
            "options": [],
            "correct_answers": [{"letter": "A.", "text": "Take care"}],
            "comment": "Drive defensively.",
            "local_image_paths": [],
            "local_video_paths": [],
            "url": "https://example.test/question",
        }

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source = root / "questions.json"
            output = root / "themes"
            source.write_text(json.dumps([question]), encoding="utf-8")

            split_questions(source, output)
            leaf = output / "1.1-danger-teaching" / "1.1.01-basic-forms-of-traffic-behavior"
            summary = leaf / "summary.md"
            summary.write_text("# Authored summary\n", encoding="utf-8")

            question["comment"] = "Updated explanation."
            source.write_text(json.dumps([question]), encoding="utf-8")
            split_questions(source, output)

            self.assertEqual(summary.read_text(encoding="utf-8"), "# Authored summary\n")
            rendered = (leaf / "questions.md").read_text(encoding="utf-8")
            self.assertIn("Updated explanation.", rendered)


if __name__ == "__main__":
    unittest.main()
