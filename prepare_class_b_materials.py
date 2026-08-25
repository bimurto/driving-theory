#!/usr/bin/env python3
"""Classify questions by licence and build Class B worksheet datasets."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import re
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Callable


ROOT = Path(__file__).resolve().parent
THEMES = ROOT / "themes"
CATALOG = THEMES / "class_b_catalog.json"
CATALOG_SCHEMA_VERSION = 1


class RequestStartLimiter:
    """Space request starts globally, including retries from concurrent workers."""

    def __init__(self, delay: float) -> None:
        self.delay = max(0.0, delay)
        self._lock = threading.Lock()
        self._next_request_at = 0.0

    def wait(self) -> None:
        with self._lock:
            now = time.monotonic()
            wait = max(0.0, self._next_request_at - now)
            if wait:
                time.sleep(wait)
            self._next_request_at = time.monotonic() + self.delay


class _VisibleTextParser(HTMLParser):
    """Extract readable lines while preserving block-level separation."""

    BLOCK_TAGS = {
        "article",
        "br",
        "div",
        "h1",
        "h2",
        "h3",
        "h4",
        "li",
        "main",
        "p",
        "section",
    }

    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        value = " ".join(data.split())
        if value:
            self.parts.extend((value, " "))

    def lines(self) -> list[str]:
        return [" ".join(line.split()) for line in "".join(self.parts).splitlines() if line.strip()]


@dataclass(frozen=True)
class PreparationReport:
    scanned_questions: int
    class_b_questions: int
    written_chapters: int
    unresolved: list[str]


def extract_licenses(html: str) -> list[str]:
    """Extract normalized licence labels from a question page."""
    parser = _VisibleTextParser()
    parser.feed(html)

    for line in parser.lines():
        match = re.search(r"\bLicenses:\s*(.+)$", line, flags=re.IGNORECASE)
        if not match:
            continue
        label = match.group(1).strip()
        normalized_labels: list[str] = []
        folded = label.casefold()
        if "basic material" in folded:
            normalized_labels.append("Basic material")
        if "gm classes" in folded:
            # "GM" is Grundstoff/General Material on the source site. It is
            # the same all-classes theory pool exposed elsewhere as
            # "Basic material"; it is unrelated to the separate Mofa label.
            normalized_labels.append("Basic material")
        if re.search(r"\bmofa\b", folded):
            normalized_labels.append("Mofa")
        licenses = re.findall(r"\b(?:AM|A1|A2|A|B96|BE|B|C1E|CE|C1|C|D1E|DE|D1|D|L|T)\b", label.upper())
        normalized_labels.extend(licenses)
        if normalized_labels:
            return list(dict.fromkeys(normalized_labels))

    raise ValueError("Question page does not contain a recognizable 'Licenses:' field")


def is_class_b(licenses: list[str]) -> bool:
    """Return whether a question belongs to Basic material or licence B."""
    return "Basic material" in licenses or "B" in licenses


def fetch_question_page(
    url: str,
    *,
    before_request: Callable[[], None] | None = None,
    retry_delays: tuple[float, ...] = (1.0, 2.0),
) -> str:
    """Fetch one source page with verified TLS and a descriptive user agent."""
    import requests

    headers = {"User-Agent": "driving-theory-study-materials/1.0 (+personal study project)"}
    last_error: Exception | None = None
    for attempt in range(len(retry_delays) + 1):
        if before_request:
            before_request()
        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            return response.text
        except requests.RequestException as error:
            last_error = error
            if attempt < len(retry_delays):
                time.sleep(retry_delays[attempt])
    assert last_error is not None
    raise last_error


def _load_catalog(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"schema_version": CATALOG_SCHEMA_VERSION, "questions": {}}
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("schema_version") != CATALOG_SCHEMA_VERSION or not isinstance(data.get("questions"), dict):
        raise ValueError(f"Unsupported licence catalog format in {path}")
    return data


def _write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def prepare_class_b_materials(
    themes_dir: Path,
    catalog_path: Path,
    fetch_html: Callable[[str], str],
    *,
    refresh: bool = False,
    chapter_dirs: list[Path] | None = None,
    workers: int = 1,
    progress: Callable[[int, int], None] | None = None,
) -> PreparationReport:
    """Build cached licence metadata and Class B subsets for all chapters."""
    catalog = _load_catalog(catalog_path)
    catalog_questions: dict[str, Any] = catalog["questions"]
    unresolved_by_id: dict[str, str] = {}
    class_b_questions = 0
    written_chapters = 0

    source_paths = (
        [chapter / "questions.json" for chapter in chapter_dirs]
        if chapter_dirs is not None
        else sorted(themes_dir.glob("*/*/questions.json"))
    )
    chapters: list[tuple[Path, list[dict[str, Any]]]] = []
    questions_by_id: dict[str, dict[str, Any]] = {}
    for source_path in source_paths:
        if not source_path.exists():
            unresolved_by_id[str(source_path)] = f"{source_path}: chapter has no questions.json"
            continue
        questions = json.loads(source_path.read_text(encoding="utf-8"))
        chapters.append((source_path, questions))
        for question in questions:
            questions_by_id[question["question_id"]] = question

    to_fetch = {
        question_id: question
        for question_id, question in questions_by_id.items()
        if refresh
        or question_id not in catalog_questions
        or catalog_questions[question_id].get("url") != question["url"]
    }
    catalog_changed = False

    def fetch_entry(item: tuple[str, dict[str, Any]]) -> tuple[str, dict[str, Any] | None, str | None]:
        question_id, question = item
        try:
            licenses = extract_licenses(fetch_html(question["url"]))
        except Exception as error:
            return question_id, None, str(error)
        return (
            question_id,
            {
                "url": question["url"],
                "licenses": licenses,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            },
            None,
        )

    if to_fetch:
        completed = 0
        total_to_fetch = len(to_fetch)
        if workers <= 1:
            results = map(fetch_entry, to_fetch.items())
            for question_id, entry, error in results:
                if error:
                    unresolved_by_id[question_id] = f"{question_id}: {error}"
                elif entry:
                    catalog_questions[question_id] = entry
                    catalog_changed = True
                completed += 1
                if progress:
                    progress(completed, total_to_fetch)
        else:
            with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
                for question_id, entry, error in executor.map(fetch_entry, to_fetch.items()):
                    if error:
                        unresolved_by_id[question_id] = f"{question_id}: {error}"
                    elif entry:
                        catalog_questions[question_id] = entry
                        catalog_changed = True
                    completed += 1
                    if progress:
                        progress(completed, total_to_fetch)

    for source_path, questions in chapters:
        chapter_unresolved = False
        filtered: list[dict[str, Any]] = []
        for question in questions:
            question_id = question["question_id"]
            entry = catalog_questions.get(question_id)
            if question_id in unresolved_by_id:
                chapter_unresolved = True
                continue

            if not entry:
                unresolved_by_id[question_id] = f"{question_id}: licence metadata is missing"
                chapter_unresolved = True
                continue
            licenses = entry.get("licenses")
            if not isinstance(licenses, list) or not licenses:
                unresolved_by_id[question_id] = f"{question_id}: cached entry has no licence labels"
                chapter_unresolved = True
                continue
            if is_class_b(licenses):
                filtered.append(question)
                class_b_questions += 1

        if not chapter_unresolved:
            _write_json(source_path.with_name("questions_class_b.json"), filtered)
            written_chapters += 1

    if catalog_changed:
        catalog["updated_at"] = datetime.now(timezone.utc).isoformat()
    _write_json(catalog_path, catalog)
    unresolved = [unresolved_by_id[key] for key in sorted(unresolved_by_id)]
    return PreparationReport(len(questions_by_id), class_b_questions, written_chapters, unresolved)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="Refetch licence metadata already in the cache")
    parser.add_argument("--offline", action="store_true", help="Use cached metadata only and fail on cache misses")
    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Minimum global delay between request starts (default: 0.5s)",
    )
    parser.add_argument("--workers", type=int, default=8, help="Concurrent metadata requests (default: 8)")
    parser.add_argument(
        "--chapter",
        action="append",
        type=Path,
        help="Prepare one chapter directory; repeat for multiple chapters",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    request_limiter = RequestStartLimiter(args.delay)

    def fetch(url: str) -> str:
        if args.offline:
            raise RuntimeError("licence metadata is not cached (offline mode)")
        return fetch_question_page(url, before_request=request_limiter.wait)

    def show_progress(completed: int, total: int) -> None:
        if completed == total or completed % 100 == 0:
            print(f"Fetched licence metadata: {completed}/{total}", flush=True)

    report = prepare_class_b_materials(
        THEMES,
        CATALOG,
        fetch,
        refresh=args.refresh,
        chapter_dirs=args.chapter,
        workers=max(1, args.workers),
        progress=show_progress,
    )
    print(
        f"Scanned {report.scanned_questions} questions; wrote {report.class_b_questions} "
        f"Class B questions across {report.written_chapters} chapters."
    )
    if report.unresolved:
        print(f"Unresolved questions ({len(report.unresolved)}):")
        for issue in report.unresolved:
            print(f"- {issue}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
