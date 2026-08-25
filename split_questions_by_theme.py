#!/usr/bin/env python3
"""Split the English driving-theory question bank by theme and chapter."""

from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "driving_theory_questions.json"
OUTPUT = ROOT / "themes"


def extract_number(value: str) -> str:
    """Return the dotted catalogue number from labels such as 'Theme 1.1.'."""
    match = re.search(r"\d+(?:\.\d+)+", value)
    if not match:
        raise ValueError(f"Could not extract a catalogue number from {value!r}")
    return match.group(0).rstrip(".")


def slugify(value: str) -> str:
    """Convert a display name into a stable, filesystem-safe slug."""
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")


def render_markdown(questions: list[dict[str, Any]]) -> str:
    """Render one chapter as a self-contained Markdown study document."""
    first = questions[0]
    lines = [
        f"# {first['chapter_number']} — {first['chapter_name']}",
        "",
        f"**Theme:** {first['theme_number']} — {first['theme_name']}",
        "",
        f"**Questions:** {len(questions)}",
        "",
    ]

    for question in questions:
        lines.extend(
            [
                f"## Question {question['question_number']}",
                "",
                f"**Points:** {question['points']}",
                "",
                f"**{question['question_text']}**",
                "",
            ]
        )

        for image_path in question.get("local_image_paths", []):
            lines.extend([f"![Question image](../../../{image_path})", ""])

        for video_path in question.get("local_video_paths", []):
            lines.extend([f"[Question video](../../../{video_path})", ""])

        options = question.get("options", [])
        if options:
            lines.extend(["### Options", ""])
            for option in options:
                lines.append(f"- {option.get('letter', '')} {option.get('text', '')}".rstrip())
            lines.append("")
        else:
            lines.extend(["### Answer field", "", "This question requires a typed answer.", ""])

        lines.extend(["### Correct answer(s)", ""])
        for answer in question.get("correct_answers", []):
            answer_value = answer.get("text") or answer.get("letter", "")
            lines.append(f"- {answer_value}")
        lines.append("")

        if question.get("comment"):
            lines.extend(["### Explanation", "", question["comment"], ""])

        lines.extend([f"[Source]({question['url']})", "", "---", ""])

    return "\n".join(lines).rstrip() + "\n"


def split_questions(source: Path, output: Path) -> tuple[int, int, int]:
    """Write generated chapter files without removing authored study material.

    This module owns only ``questions.json`` and ``questions.md``. Other files
    in a chapter directory, including ``summary.md`` and Class B derivatives,
    are deliberately preserved across regeneration.
    """
    questions = json.loads(source.read_text(encoding="utf-8"))
    if not isinstance(questions, list):
        raise ValueError(f"Expected {source.name} to contain a top-level JSON array")

    grouped: dict[tuple[str, str], dict[tuple[str, str], list[dict[str, Any]]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for question in questions:
        theme = (question["theme_number"], question["theme_name"])
        chapter = (question["chapter_number"], question["chapter_name"])
        grouped[theme][chapter].append(question)

    for (theme_number, theme_name), chapters in grouped.items():
        theme_code = extract_number(theme_number)
        theme_dir = output / f"{theme_code}-{slugify(theme_name)}"

        for (chapter_number, chapter_name), chapter_questions in chapters.items():
            chapter_code = extract_number(chapter_number)
            chapter_dir = theme_dir / f"{chapter_code}-{slugify(chapter_name)}"
            chapter_dir.mkdir(parents=True, exist_ok=True)

            json_path = chapter_dir / "questions.json"
            json_path.write_text(
                json.dumps(chapter_questions, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

            markdown_path = chapter_dir / "questions.md"
            markdown_path.write_text(render_markdown(chapter_questions), encoding="utf-8")

    chapter_count = sum(len(chapters) for chapters in grouped.values())
    return len(questions), len(grouped), chapter_count


def main() -> None:
    question_count, theme_count, chapter_count = split_questions(SOURCE, OUTPUT)
    print(
        f"Wrote {question_count} questions across {theme_count} themes "
        f"and {chapter_count} chapters to {OUTPUT}"
    )


if __name__ == "__main__":
    main()
