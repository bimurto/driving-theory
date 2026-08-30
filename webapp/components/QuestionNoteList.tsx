"use client";

import Link from "next/link";
import { useLearningProgress } from "@/components/LearningProgressProvider";
import { allQuestions } from "@/lib/catalog";
import type { ProgressState } from "@/lib/progress";

export function notedQuestions(progress: ProgressState) {
  return allQuestions.filter((question) => Boolean(progress.questionNotes?.[question.id]?.text));
}

export function QuestionNoteList() {
  const { progress } = useLearningProgress();
  if (!progress) return <p className="loading">Loading your notes…</p>;
  return <QuestionNoteListContent progress={progress} />;
}

export function QuestionNoteListContent({ progress }: { progress: ProgressState }) {
  const byTheme = notedQuestions(progress).reduce<Record<string, typeof allQuestions>>((groups, question) => {
    (groups[question.chapter.themeName] ??= []).push(question);
    return groups;
  }, {});
  return <section className="content page-content">
    <p className="eyebrow">Personal explanations</p>
    <h1>Notes</h1>
    <p className="lede">Your explanations for theory questions, grouped by topic.</p>
    {Object.keys(byTheme).length ? Object.entries(byTheme).map(([theme, questions]) => <section className="notes-topic" key={theme}><h2>{theme}</h2><ol className="question-note-list">{questions.map((question) => <li key={question.id}><Link href={`/practice?notes=1&question=${encodeURIComponent(question.id)}`}><span>{question.number}</span><strong>{question.text}</strong><p>{progress.questionNotes?.[question.id]?.text}</p></Link></li>)}</ol></section>) : <section className="notice"><h2>No notes here yet</h2><p>After you check an answer in practice, add your own explanation. You can also add one while reviewing a chapter’s questions.</p><Link className="button secondary" href="/practice">Start practice</Link></section>}
  </section>;
}
