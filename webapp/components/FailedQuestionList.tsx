"use client";
import Link from "next/link";
import { allQuestions } from "@/lib/catalog";
import { isFailedQuestion, type ProgressState } from "@/lib/progress";
export function FailedQuestionList({ progress }: { progress: ProgressState }) {
  const questions = allQuestions.filter((q) => isFailedQuestion(progress, q.id));
  const groups = questions.reduce<Record<string, typeof allQuestions>>((a, q) => ((a[q.chapter.themeName] ??= []).push(q), a), {});
  return <section><h2>Failed answers</h2><p className="lede">Questions whose most recent checked answer was incorrect.</p>{questions.length ? <><div className="starred-list-actions"><p><strong>{questions.length}</strong> questions to revisit</p><Link className="button" href="/practice?failed=1">Practise failed answers</Link></div>{Object.entries(groups).map(([theme, items]) => <section className="notes-topic" key={theme}><h3>{theme}</h3><ol className="question-note-list">{items.map((q) => <li key={q.id}><Link href={`/practice?failed=1&question=${encodeURIComponent(q.id)}`}><span>{q.number}</span><strong>{q.text}</strong></Link></li>)}</ol></section>)}</> : <section className="notice"><h3>No failed answers</h3><p>Incorrect answers will appear here until you answer them correctly.</p><Link className="button secondary" href="/practice">Start practice</Link></section>}</section>;
}
