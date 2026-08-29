"use client";
import Link from "next/link";
import { useLearningProgress } from "@/components/LearningProgressProvider";
import { allQuestions, catalog } from "@/lib/catalog";
import { isDue } from "@/lib/progress";
export default function Home() {
  const { progress, account } = useLearningProgress();
  const answered = progress ? Object.keys(progress.questions).length : 0;
  const due = progress ? Object.values(progress.questions).filter((item) => isDue(item)).length : 0;
  const correct = progress ? Object.values(progress.questions).reduce((sum, item) => sum + item.correct, 0) : 0;
  const attempts = progress ? Object.values(progress.questions).reduce((sum, item) => sum + item.attempts, 0) : 0;
  const primaryLabel = progress ? due > 0 ? `Review ${due} due question${due === 1 ? "" : "s"}` : answered > 0 ? "Continue practice" : "Start practice" : "Start practice";
  return <section className="hero"><p className="eyebrow">German driving theory · English · Class B</p><h1>Learn the rules.<br />Drive with confidence.</h1><p className="lede">A focused, visual study companion built around the Class B question catalogue and rule guides.</p><div className="actions"><Link className="button" href="/practice">{primaryLabel}</Link><Link className="button secondary" href="/topics">Browse study guides</Link></div><div className="stat-grid"><div><strong>{allQuestions.length}</strong><span>Class B questions</span></div><div><strong>{catalog.chapters.length}</strong><span>chapters</span></div><div><strong>{progress ? due : "—"}</strong><span>reviews due</span></div><div><strong>{progress && attempts ? `${Math.round((correct / attempts) * 100)}%` : "—"}</strong><span>accuracy</span></div></div><p className="muted">{progress ? account ? `${answered} questions studied and saved to your learner account.` : `${answered} questions studied in this browser. Create a learner account to save progress across devices.` : "Loading your learning progress…"}</p></section>;
}
