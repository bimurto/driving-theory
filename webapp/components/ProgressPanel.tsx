"use client";
import { useEffect, useMemo, useState } from "react";
import { allQuestions } from "@/lib/catalog";
import { isDue, initialProgress, type ProgressState } from "@/lib/progress";
import { loadProgress, resetProgress } from "@/lib/storage";

export function ProgressPanel() {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  useEffect(() => setProgress(loadProgress()), []);
  const themes = useMemo(() => allQuestions.reduce<Record<string, typeof allQuestions>>((groups, question) => {
    const key = question.chapter.themeName;
    (groups[key] ??= []).push(question);
    return groups;
  }, {}), []);
  if (!progress) return <p className="loading">Loading progress…</p>;
  const values = Object.values(progress.questions);
  const attempts = values.reduce((total, item) => total + item.attempts, 0);
  const correct = values.reduce((total, item) => total + item.correct, 0);
  const due = values.filter((item) => isDue(item)).length;
  const next = values.filter((item) => !isDue(item)).sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))[0];
  const nextReview = due ? "Ready now" : next ? new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date(next.nextReviewAt)) : "—";
  function clear() { if (window.confirm("Delete all learning progress stored in this browser?")) { resetProgress(); setProgress(initialProgress()); } }
  return <section className="content page-content"><p className="eyebrow">Your learning</p><h1>Progress</h1><div className="stat-grid"><div><strong>{values.length}</strong><span>of {allQuestions.length} studied</span></div><div><strong>{attempts ? `${Math.round(correct / attempts * 100)}%` : "—"}</strong><span>accuracy</span></div><div><strong>{due}</strong><span>reviews due</span></div><div><strong>{nextReview}</strong><span>next review</span></div></div><section className="progress-breakdown"><h2>By topic</h2><div className="topic-progress-list">{Object.entries(themes).map(([theme, questions]) => {
    const records = questions.map((question) => progress.questions[question.id]).filter(Boolean);
    const themeAttempts = records.reduce((sum, item) => sum + (item?.attempts ?? 0), 0);
    const themeCorrect = records.reduce((sum, item) => sum + (item?.correct ?? 0), 0);
    const themeDue = records.filter((item) => item && isDue(item)).length;
    return <div className="topic-progress" key={theme}><strong>{theme}</strong><span>{records.length}/{questions.length} studied</span><span>{themeAttempts ? `${Math.round(themeCorrect / themeAttempts * 100)}% correct` : "Not attempted"}</span>{themeDue > 0 && <span className="due-badge">{themeDue} due</span>}</div>;
  })}</div></section><section className="notice"><h2>Your data stays here</h2><p>Progress is saved only in this browser and cannot be restored on another device.</p><button className="text-button danger" onClick={clear}>Reset this browser’s progress</button></section></section>;
}
