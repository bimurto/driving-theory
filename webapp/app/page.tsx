"use client";
import Link from "next/link";
import { useLearningProgress } from "@/components/LearningProgressProvider";
import { allQuestions, catalog } from "@/lib/catalog";
import { getChapterProgress, getDueQuestions, getRecommendedChapter } from "@/lib/chapter-progression";
export default function Home() {
  const { progress, account } = useLearningProgress();
  const answered = progress ? Object.keys(progress.questions).length : 0;
  const correct = progress ? Object.values(progress.questions).reduce((sum, item) => sum + item.correct, 0) : 0;
  const attempts = progress ? Object.values(progress.questions).reduce((sum, item) => sum + item.attempts, 0) : 0;
  const recommendation = progress ? getRecommendedChapter(catalog.chapters, progress) : null;
  const dueCount = progress ? getDueQuestions(allQuestions, progress).length : 0;
  const recommendedProgress = progress && recommendation?.kind === "chapter" ? getChapterProgress(recommendation.chapter, progress) : null;
  const recommendationLabel = recommendation?.kind === "chapter"
    ? recommendation.reason === "resume" ? "Continue chapter" : recommendation.reason === "next" ? "Study next chapter" : "Start learning"
    : "Learning path";
  const primaryLabel = recommendation?.kind === "chapter"
    ? recommendation.reason === "resume" ? "Continue this chapter" : recommendation.reason === "next" ? "Study next chapter" : "Start first chapter"
    : "View your progress";

  return <section className="hero">
    <p className="eyebrow">German driving theory · English · Class B</p>
    <h1>Learn the rules.<br />Drive with confidence.</h1>
    <p className="lede">A focused, visual study companion built around the Class B question catalogue and rule guides.</p>
    {progress && recommendation && <section className="next-chapter-card" aria-labelledby="next-chapter-title">
      <p className="eyebrow">{recommendationLabel}</p>
      {recommendation.kind === "chapter" ? <>
        <h2 id="next-chapter-title">{recommendation.chapter.chapterNumber} — {recommendation.chapter.chapterName}</h2>
        <p>{recommendedProgress?.status === "not-started"
          ? `${recommendation.chapter.questions.length} theory questions · ${recommendation.chapter.summary ? "Study guide available" : "Guide coming soon"}`
          : `${recommendedProgress?.questionProgress.outcomes.correct ?? 0}/${recommendation.chapter.questions.length} correct now · ${recommendedProgress?.questionProgress.outcomes.failed ?? 0} failed · ${(recommendedProgress?.questionProgress.outcomes.unseen ?? 0) + (recommendedProgress?.questionProgress.outcomes.unknown ?? 0)} to revisit`}</p>
        <div className="actions">
          <Link className="button" href={`/topics/${recommendation.chapter.slug}`}>{primaryLabel}</Link>
          {dueCount > 0 && <Link className="button secondary" href="/practice?due=1">Review {dueCount} due question{dueCount === 1 ? "" : "s"}</Link>}
          <Link className="text-link" href="/topics">Browse all chapters</Link>
        </div>
      </> : <>
        <h2 id="next-chapter-title">Every chapter is covered.</h2>
        <p>Keep the material fresh with scheduled review and track your current outcomes in Progress.</p>
        <div className="actions">
          <Link className="button" href="/progress">{primaryLabel}</Link>
          {dueCount > 0 && <Link className="button secondary" href="/practice?due=1">Review {dueCount} due question{dueCount === 1 ? "" : "s"}</Link>}
          <Link className="text-link" href="/topics">Browse all chapters</Link>
        </div>
      </>}
    </section>}
    {!progress && <p className="loading" aria-live="polite">Loading your learning path…</p>}
    <div className="stat-grid"><div><strong>{allQuestions.length}</strong><span>Class B questions</span></div><div><strong>{catalog.chapters.length}</strong><span>chapters</span></div><div><strong>{progress && attempts ? `${Math.round((correct / attempts) * 100)}%` : "—"}</strong><span>lifetime accuracy</span></div></div>
    <p className="muted">{progress ? account ? `${answered} questions studied on this device and connected to your learner account.` : `${answered} questions studied in this browser. Create a learner account to save progress across devices.` : "Loading your learning progress…"}</p>
  </section>;
}
