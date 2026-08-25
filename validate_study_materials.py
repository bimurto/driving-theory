#!/usr/bin/env python3
"""Validate Class B worksheet data and authored chapter summaries."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse

from prepare_class_b_materials import is_class_b


ROOT = Path(__file__).resolve().parent
THEMES = ROOT / "themes"
REQUIRED_SECTIONS = (
    "Overview",
    "Learning goals",
    "Core rules",
    "Common exam traps",
    "Remember this",
    "Sources",
)
APPROVED_SOURCE_DOMAINS = (
    "gesetze-im-internet.de",
    "bast.de",
    "bmdv.bund.de",
)


def source_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _front_matter(markdown: str) -> dict[str, str]:
    if not markdown.startswith("---\n"):
        return {}
    try:
        block = markdown.split("---\n", 2)[1]
    except IndexError:
        return {}
    values: dict[str, str] = {}
    for line in block.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            values[key.strip()] = value.strip()
    return values


def _is_approved_source(url: str) -> bool:
    hostname = (urlparse(url).hostname or "").lower()
    return any(hostname == domain or hostname.endswith(f".{domain}") for domain in APPROVED_SOURCE_DOMAINS)


def validate_chapter(
    leaf: Path,
    *,
    require_summary: bool = True,
    catalog_path: Path | None = None,
) -> list[str]:
    """Return human-readable validation issues for one chapter directory."""
    issues: list[str] = []
    raw_path = leaf / "questions.json"
    class_b_path = leaf / "questions_class_b.json"
    summary_path = leaf / "summary.md"

    if not raw_path.exists():
        return [f"{leaf}: missing questions.json"]
    if not class_b_path.exists():
        return [f"{leaf}: missing questions_class_b.json"]

    try:
        raw_questions = json.loads(raw_path.read_text(encoding="utf-8"))
        class_b_questions = json.loads(class_b_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as error:
        return [f"{leaf}: invalid question JSON: {error}"]

    raw_by_id = {question["question_id"]: question for question in raw_questions}
    for question in class_b_questions:
        question_id = question.get("question_id")
        if question_id not in raw_by_id or raw_by_id[question_id] != question:
            issues.append(f"{leaf}: Class B question {question_id!r} is not an exact raw-data subset")

    if catalog_path is not None:
        if not catalog_path.exists():
            issues.append(f"{leaf}: missing licence catalog {catalog_path}")
        else:
            try:
                catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
                entries = catalog["questions"]
            except (json.JSONDecodeError, KeyError, TypeError, OSError) as error:
                issues.append(f"{leaf}: invalid licence catalog: {error}")
            else:
                expected_class_b_questions: list[dict] = []
                for question in raw_questions:
                    question_id = question["question_id"]
                    entry = entries.get(question_id)
                    licenses = entry.get("licenses") if isinstance(entry, dict) else None
                    if not isinstance(licenses, list) or not licenses:
                        issues.append(f"{leaf}: unresolved licence metadata for {question_id}")
                    elif is_class_b(licenses):
                        expected_class_b_questions.append(question)
                if class_b_questions != expected_class_b_questions:
                    issues.append(
                        f"{leaf}: questions_class_b.json is not the exact source-order filter from the licence catalog"
                    )

    if not class_b_questions:
        if summary_path.exists():
            issues.append(f"{leaf}: summary.md exists although the Class B dataset is empty")
        return issues

    if not summary_path.exists():
        if require_summary:
            issues.append(f"{leaf}: missing summary.md for {len(class_b_questions)} Class B questions")
        return issues

    markdown = summary_path.read_text(encoding="utf-8")
    metadata = _front_matter(markdown)
    expected_metadata = {
        "license_class": "B",
        "question_count": str(len(class_b_questions)),
        "source_file": "questions_class_b.json",
        "source_sha256": source_sha256(class_b_path),
    }
    for key, expected in expected_metadata.items():
        if metadata.get(key) != expected:
            issues.append(f"{summary_path}: {key} must be {expected!r}")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", metadata.get("law_verified", "")):
        issues.append(f"{summary_path}: law_verified must be an ISO date")

    for section in REQUIRED_SECTIONS:
        if not re.search(rf"^## {re.escape(section)}\s*$", markdown, flags=re.MULTILINE):
            issues.append(f"{summary_path}: missing '## {section}' section")

    expected_ids = {question["question_id"] for question in class_b_questions}
    covered_ids: set[str] = set()
    for value in re.findall(r"<!--\s*questions:\s*([^>]+?)\s*-->", markdown):
        covered_ids.update(item.strip() for item in value.split(",") if item.strip())
    for question_id in sorted(expected_ids - covered_ids):
        issues.append(f"{summary_path}: question {question_id} is not mapped to a summary section")
    for question_id in sorted(covered_ids - expected_ids):
        issues.append(f"{summary_path}: coverage references non-Class-B question {question_id}")

    for block in re.split(r"(?=^#{2,3} )", markdown, flags=re.MULTILINE):
        if "<!-- questions:" not in block:
            continue
        if not re.search(r"\[[^]]+\]\(https?://[^)]+\)", block):
            heading = block.splitlines()[0] if block.splitlines() else "covered concept"
            issues.append(f"{summary_path}: covered concept has no inline source: {heading}")

    urls = re.findall(r"\[[^]]+\]\((https?://[^)]+)\)", markdown)
    if not any(_is_approved_source(url) for url in urls):
        issues.append(f"{summary_path}: no approved official source link found")

    return issues


def validate_study_materials(themes_dir: Path, *, require_all_summaries: bool = True) -> list[str]:
    issues: list[str] = []
    catalog_path = themes_dir / "class_b_catalog.json"
    for source_path in sorted(themes_dir.glob("*/*/questions.json")):
        issues.extend(
            validate_chapter(
                source_path.parent,
                require_summary=require_all_summaries,
                catalog_path=catalog_path,
            )
        )
    return issues


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chapter", type=Path, help="Validate only one chapter directory")
    parser.add_argument(
        "--allow-missing-summaries",
        action="store_true",
        help="Validate prepared data without requiring every eligible summary during batching",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.chapter:
        issues = validate_chapter(args.chapter, catalog_path=args.chapter.parents[1] / "class_b_catalog.json")
    else:
        issues = validate_study_materials(THEMES, require_all_summaries=not args.allow_missing_summaries)

    if issues:
        print(f"Validation failed with {len(issues)} issue(s):")
        for issue in issues:
            print(f"- {issue}")
        return 1
    print("Study materials are valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
