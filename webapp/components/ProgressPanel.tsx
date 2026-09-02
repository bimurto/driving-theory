"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLearningProgress } from "@/components/LearningProgressProvider";
import { allQuestions } from "@/lib/catalog";
import { isFailedQuestion } from "@/lib/progress";
import { FailedQuestionList } from "@/components/FailedQuestionList";
import { StarredQuestionListContent } from "@/components/StarredQuestionList";
import { QuestionNoteListContent } from "@/components/QuestionNoteList";

export function ProgressPanel() {
  const searchParams = useSearchParams();
  const { progress, account, resetLearningProgress } = useLearningProgress();
  const themes = useMemo(() => allQuestions.reduce<Record<string, typeof allQuestions>>((groups, question) => {
    const key = question.chapter.themeName;
    (groups[key] ??= []).push(question);
    return groups;
  }, {}), []);
  if (!progress) return <p className="loading">Loading progress…</p>;
  const values = Object.values(progress.questions);
  const attempts = values.reduce((total, item) => total + item.attempts, 0);
  const correct = values.reduce((total, item) => total + item.correct, 0);
  const failed = allQuestions.filter((question) => isFailedQuestion(progress, question.id)).length;
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState<"overview" | "failed" | "starred" | "notes">(requestedTab === "failed" || requestedTab === "starred" || requestedTab === "notes" ? requestedTab : "overview");
  function clear() { if (window.confirm("Delete all learning progress stored in this browser?")) resetLearningProgress(); }
  return <section className="content page-content"><p className="eyebrow">Your learning</p><h1>Progress</h1><div className="progress-tabs">{(["overview", "failed", "starred", "notes"] as const).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "failed" ? "Failed answers" : item[0].toUpperCase() + item.slice(1)}</button>)}</div>{tab === "overview" && <><div className="stat-grid"><div><strong>{values.length}</strong><span>of {allQuestions.length} studied</span></div><div><strong>{attempts ? `${Math.round(correct / attempts * 100)}%` : "—"}</strong><span>lifetime accuracy</span></div><div><strong>{failed}</strong><span>failed answers</span></div></div><section className="progress-breakdown"><h2>By topic</h2><div className="topic-progress-list">{Object.entries(themes).map(([theme, questions]) => {
    const records = questions.map((question) => progress.questions[question.id]).filter(Boolean);
    const themeAttempts = records.reduce((sum, item) => sum + (item?.attempts ?? 0), 0);
    const themeCorrect = records.reduce((sum, item) => sum + (item?.correct ?? 0), 0);
    return <div className="topic-progress" key={theme}><strong>{theme}</strong><span>{records.length}/{questions.length} studied</span><span>{themeAttempts ? `${Math.round(themeCorrect / themeAttempts * 100)}% lifetime accuracy` : "Not attempted"}</span></div>;
  })}</div></section><section className="notice"><h2>{account ? "Your learning progress can synchronize" : "Your data stays here"}</h2><p>{account ? "Your learning progress is saved on this device and synchronizes with your learner account." : "Progress is saved only in this browser. Create a learner account to save progress across devices."}</p><button className="text-button danger" onClick={clear}>Reset this browser’s progress</button></section></>}{tab === "failed" && <FailedQuestionList progress={progress} />}{tab === "starred" && <StarredQuestionListContent progress={progress} />}{tab === "notes" && <QuestionNoteListContent progress={progress} />}</section>;
}
