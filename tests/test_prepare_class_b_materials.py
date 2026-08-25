import json
import tempfile
import unittest
from pathlib import Path

from prepare_class_b_materials import extract_licenses, is_class_b, prepare_class_b_materials


class PrepareClassBMaterialsTests(unittest.TestCase):
    def test_understands_general_material_and_mofa_source_labels(self):
        gm = extract_licenses("<div><span>Licenses:</span><span>GM classes</span></div>")
        mofa = extract_licenses("<div><span>Licenses:</span><span>Mofa</span></div>")

        self.assertEqual(gm, ["GM classes"])
        self.assertTrue(is_class_b(gm))
        self.assertEqual(mofa, ["Mofa"])
        self.assertFalse(is_class_b(mofa))

    def test_writes_only_basic_and_explicit_class_b_questions(self):
        questions = [
            self.question("1.2.03-101", "https://example.test/basic"),
            self.question("2.7.01-110", "https://example.test/b"),
            self.question("2.7.01-008", "https://example.test/a"),
        ]
        pages = {
            "https://example.test/basic": "<div>Licenses: Basic material</div><h2>Question</h2>",
            "https://example.test/b": "<div>Licenses: B BE</div><h2>Question</h2>",
            "https://example.test/a": "<div>Licenses: A A1 A2</div><h2>Question</h2>",
        }

        with tempfile.TemporaryDirectory() as temp_dir:
            themes = Path(temp_dir) / "themes"
            leaf = themes / "theme" / "chapter"
            leaf.mkdir(parents=True)
            (leaf / "questions.json").write_text(json.dumps(questions), encoding="utf-8")

            report = prepare_class_b_materials(
                themes,
                themes / "class_b_catalog.json",
                fetch_html=lambda url: pages[url],
            )

            filtered = json.loads((leaf / "questions_class_b.json").read_text(encoding="utf-8"))
            self.assertEqual([item["question_id"] for item in filtered], ["1.2.03-101", "2.7.01-110"])
            self.assertEqual(report.class_b_questions, 2)
            self.assertEqual(report.unresolved, [])

    def test_cached_catalog_supports_offline_regeneration(self):
        question = self.question("1.2.03-101", "https://example.test/basic")

        with tempfile.TemporaryDirectory() as temp_dir:
            themes = Path(temp_dir) / "themes"
            leaf = themes / "theme" / "chapter"
            leaf.mkdir(parents=True)
            (leaf / "questions.json").write_text(json.dumps([question]), encoding="utf-8")
            catalog = {
                "schema_version": 1,
                "updated_at": "2026-08-25T00:00:00+00:00",
                "questions": {
                    question["question_id"]: {
                        "url": question["url"],
                        "licenses": ["Basic material"],
                        "fetched_at": "2026-08-25T00:00:00+00:00",
                    }
                },
            }
            catalog_path = themes / "class_b_catalog.json"
            catalog_path.write_text(json.dumps(catalog), encoding="utf-8")

            def unexpected_fetch(url: str) -> str:
                self.fail(f"Cache hit unexpectedly fetched {url}")

            report = prepare_class_b_materials(themes, catalog_path, unexpected_fetch)

            self.assertEqual(report.class_b_questions, 1)
            self.assertEqual(report.unresolved, [])
            regenerated_catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
            self.assertEqual(regenerated_catalog["updated_at"], "2026-08-25T00:00:00+00:00")
            self.assertEqual(
                json.loads((leaf / "questions_class_b.json").read_text(encoding="utf-8")),
                [question],
            )

    def test_unresolved_metadata_does_not_overwrite_existing_chapter_output(self):
        question = self.question("2.7.01-999", "https://example.test/missing")
        with tempfile.TemporaryDirectory() as temp_dir:
            themes = Path(temp_dir) / "themes"
            leaf = themes / "theme" / "chapter"
            leaf.mkdir(parents=True)
            (leaf / "questions.json").write_text(json.dumps([question]), encoding="utf-8")
            output = leaf / "questions_class_b.json"
            output.write_text('[{"preserved": true}]\n', encoding="utf-8")

            report = prepare_class_b_materials(
                themes,
                themes / "class_b_catalog.json",
                fetch_html=lambda url: (_ for _ in ()).throw(RuntimeError("unavailable")),
            )

            self.assertEqual(json.loads(output.read_text(encoding="utf-8")), [{"preserved": True}])
            self.assertEqual(report.written_chapters, 0)
            self.assertEqual(len(report.unresolved), 1)

    @staticmethod
    def question(question_id: str, url: str) -> dict:
        return {"question_id": question_id, "url": url, "question_text": question_id}


if __name__ == "__main__":
    unittest.main()
