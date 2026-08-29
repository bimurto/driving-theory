"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { catalog } from "@/lib/catalog";
import { isDue, type ProgressState } from "@/lib/progress";
import { loadProgress } from "@/lib/storage";

export function TopicsCatalog() {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  useEffect(() => setProgress(loadProgress()), []);
  const themes = useMemo(() => catalog.chapters.reduce<Record<string, typeof catalog.chapters>>((groups, chapter) => {
    const key = `${chapter.themeNumber} ${chapter.themeName}`;
    (groups[key] ??= []).push(chapter);
    return groups;
  }, {}), []);
  return <section className="content page-content"><p className="eyebrow">Study guides</p><h1>Learn by topic</h1><p className="lede">Read a guide, then immediately practise its questions.</p><Link className="full-guide-card" href="/topics/study-guide/"><span>All Class B topics</span><h2>Class B Theory Study Guide</h2><p>Read the complete rule guide in one place, with practical examples, common traps and an exam cheat sheet.</p><strong>Open the full guide →</strong></Link><Link className="full-guide-card cheat-sheet-card" href="/topics/cheat-sheet/"><span>Fast revision</span><h2>Quick exam cheat sheet</h2><p>Review the key priorities, formulas, distances, signs, emergencies and vehicle checks at a glance.</p><strong>Open the cheat sheet →</strong></Link>{Object.entries(themes).map(([theme, chapters]) => <section className="theme-group" key={theme}><h2>{theme}</h2><div className="chapter-grid">{chapters.map((chapter) => {
    const records = chapter.questions.map((question) => progress?.questions[question.id]).filter(Boolean);
    const attempts = records.reduce((sum, record) => sum + (record?.attempts ?? 0), 0);
    const correct = records.reduce((sum, record) => sum + (record?.correct ?? 0), 0);
    const due = records.filter((record) => record && isDue(record)).length;
    return <Link className="chapter-card" key={chapter.slug} href={`/topics/${chapter.slug}`}><span>{chapter.chapterNumber}</span><h3>{chapter.chapterName}</h3><p>{chapter.questions.length} questions · {chapter.summary ? "Study guide available" : "Guide coming soon"}</p><div className="chapter-progress"><span>{progress ? `${records.length}/${chapter.questions.length} studied` : "Loading progress…"}</span>{attempts > 0 && <span>{Math.round(correct / attempts * 100)}% correct</span>}{due > 0 && <span className="due-badge">{due} due</span>}</div></Link>;
  })}</div></section>)}</section>;
}
