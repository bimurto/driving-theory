"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLearningProgress } from "@/components/LearningProgressProvider";
import { catalog } from "@/lib/catalog";
import { getChapterProgress, getRecommendedChapter } from "@/lib/chapter-progression";

export function TopicsCatalog() {
  const { progress } = useLearningProgress();
  const recommendation = progress ? getRecommendedChapter(catalog.chapters, progress) : null;
  const recommendedSlug = recommendation?.kind === "chapter" ? recommendation.chapter.slug : null;
  const themes = useMemo(() => catalog.chapters.reduce<Record<string, typeof catalog.chapters>>((groups, chapter) => {
    const key = `${chapter.themeNumber} ${chapter.themeName}`;
    (groups[key] ??= []).push(chapter);
    return groups;
  }, {}), []);

  return <section className="content page-content">
    <p className="eyebrow">Study guides</p>
    <h1>Learn by topic</h1>
    <p className="lede">Read a guide, then immediately practise its questions.</p>
    <Link className="full-guide-card" href="/topics/study-guide/"><span>All Class B topics</span><h2>Class B Theory Study Guide</h2><p>Read the complete rule guide in one place, with practical examples, common traps and an exam cheat sheet.</p><strong>Open the full guide →</strong></Link>
    <Link className="full-guide-card cheat-sheet-card" href="/topics/cheat-sheet/"><span>Fast revision</span><h2>Quick exam cheat sheet</h2><p>Review the key priorities, formulas, distances, signs, emergencies and vehicle checks at a glance.</p><strong>Open the cheat sheet →</strong></Link>
    {Object.entries(themes).map(([theme, chapters]) => <section className="theme-group" key={theme}>
      <h2>{theme}</h2>
      <div className="chapter-grid">{chapters.map((chapter) => {
        const chapterProgress = progress ? getChapterProgress(chapter, progress) : null;
        const statusLabel = chapterProgress?.status === "covered" ? "Covered" : chapterProgress?.status === "in-progress" ? "In progress" : "Not started";
        const outcomes = chapterProgress?.questionProgress.outcomes;
        const attempts = chapterProgress?.questionProgress.attempts ?? 0;
        const isRecommended = chapter.slug === recommendedSlug;

        return <Link className={`chapter-card${isRecommended ? " is-recommended" : ""}`} key={chapter.slug} href={`/topics/${chapter.slug}`}>
          <div className="chapter-card-heading"><span className="chapter-number">{chapter.chapterNumber}</span>{isRecommended && <span className="recommendation-badge">Recommended next</span>}</div>
          <h3>{chapter.chapterName}</h3>
          <p>{chapter.questions.length} questions · {chapter.summary ? "Study guide available" : "Guide coming soon"}</p>
          <div className="chapter-progress">
            {progress ? <>
              <span className={`chapter-state ${chapterProgress?.status}`}>{statusLabel}</span>
              <span>{outcomes?.correct ?? 0}/{chapter.questions.length} correct now</span>
              {Boolean(outcomes?.failed) && <span>{outcomes?.failed} failed</span>}
              {Boolean(outcomes?.unseen) && <span>{outcomes?.unseen} unseen</span>}
              {Boolean(outcomes?.unknown) && <span>{outcomes?.unknown} to recheck</span>}
              {Boolean(chapterProgress?.dueCount) && <span className="due-badge">{chapterProgress?.dueCount} due</span>}
            </> : <span>Loading progress…</span>}
          </div>
          {attempts > 0 && <p className="chapter-history">{attempts} lifetime attempt{attempts === 1 ? "" : "s"}</p>}
        </Link>;
      })}</div>
    </section>)}
  </section>;
}
