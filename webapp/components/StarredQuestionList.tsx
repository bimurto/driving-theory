"use client";

import Link from "next/link";
import { useState } from "react";
import { useLearningProgress } from "@/components/LearningProgressProvider";
import { allQuestions } from "@/lib/catalog";
import type { ProgressState, StarredRatingFilter } from "@/lib/progress";

export function starredQuestions(progress: ProgressState, filter: StarredRatingFilter) {
  return allQuestions.filter((question) => {
    const rating = progress.starRatings?.[question.id]?.rating ?? 0;
    return rating > 0 && (filter === "all" || rating === filter);
  });
}

export function StarredQuestionList() {
  const { progress } = useLearningProgress();

  if (!progress) return <p className="loading">Loading your starred questions…</p>;

  return <StarredQuestionListContent progress={progress} />;
}

export function StarredQuestionListContent({ progress }: { progress: ProgressState }) {
  const [filter, setFilter] = useState<StarredRatingFilter>("all");
  const questions = starredQuestions(progress, filter);

  return <section className="content page-content">
    <p className="eyebrow">Personal revision</p>
    <h1>Starred questions</h1>
    <p className="lede">Choose the theory questions you want to revisit, then practise them in priority order.</p>
    <fieldset className="starred-filter">
      <legend>Show questions with</legend>
      {(["all", 1, 2, 3] as StarredRatingFilter[]).map((value) => {
        const active = filter === value;
        const label = value === "all" ? "All stars" : "★".repeat(value);
        return <button className={active ? "active" : ""} type="button" key={value} aria-pressed={active} onClick={() => setFilter(value)}>{label}</button>;
      })}
    </fieldset>
    {questions.length ? <>
      <div className="starred-list-actions"><p><strong>{questions.length}</strong> theory question{questions.length === 1 ? "" : "s"} ready to revise</p><Link className="button" href={`/practice?stars=${filter}`}>Revise starred questions</Link></div>
      <ol className="starred-question-list">{questions.map((question) => {
        const rating = progress.starRatings?.[question.id]?.rating ?? 0;
        return <li key={question.id}><Link href={`/practice?stars=all&question=${encodeURIComponent(question.id)}`}><span>{question.chapter.themeName} · {question.number}</span><strong>{question.text}</strong><em aria-label={`${rating}-star revision priority`}>{"★".repeat(rating)}</em></Link></li>;
      })}</ol>
    </> : <section className="notice"><h2>No starred questions here yet</h2><p>Set a 1–3-star revision priority while practising or reviewing a chapter, then return here to revise those theory questions.</p><Link className="button secondary" href="/practice">Start practice</Link></section>}
  </section>;
}
