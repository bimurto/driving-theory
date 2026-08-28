"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { allQuestions, catalog, type Chapter, type Question } from "@/lib/catalog";
import { initialProgress, selectQuestion, updateProgress, type ProgressState } from "@/lib/progress";
import { loadProgress, saveProgress } from "@/lib/storage";

type QuizQuestion = Question & { chapter: Chapter };
type HistoryItem = { question: QuizQuestion; selected: string[]; submitted: boolean };

export function PracticeSession() {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [themeSlug, setThemeSlug] = useState("all");
  const [chapterSlug, setChapterSlug] = useState("all");
  const [chapterQuery, setChapterQuery] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  useEffect(() => {
    const stored = loadProgress();
    setProgress(stored);
    const chosen = new URLSearchParams(window.location.search).get("chapter");
    if (chosen && catalog.chapters.some((chapter) => chapter.slug === chosen)) setChapterSlug(chosen);
  }, []);
  const themes = useMemo(() => [...new Map(catalog.chapters.map((chapter) => [chapter.themeSlug, chapter])).values()], []);
  const filteredChapters = useMemo(() => catalog.chapters.filter((chapter) => (themeSlug === "all" || chapter.themeSlug === themeSlug) && `${chapter.chapterNumber} ${chapter.chapterName}`.toLowerCase().includes(chapterQuery.toLowerCase())), [themeSlug, chapterQuery]);
  const pool = useMemo(() => {
    const chapterSlugs = new Set(chapterSlug === "all" ? catalog.chapters.filter((chapter) => themeSlug === "all" || chapter.themeSlug === themeSlug).map((chapter) => chapter.slug) : [chapterSlug]);
    return allQuestions.filter((item) => chapterSlugs.has(item.chapter.slug));
  }, [chapterSlug, themeSlug]);
  const current = history[historyIndex];

  function startNew(state = progress ?? initialProgress()) {
    const question = selectQuestion(pool, state);
    if (!question) return;
    const item = { question, selected: [], submitted: false };
    setHistory((items) => [...items.slice(0, historyIndex + 1), item]);
    setHistoryIndex((index) => index + 1);
  }
  useEffect(() => { if (progress && !current) startNew(progress); }, [progress, pool]);

  function updateCurrent(update: (item: HistoryItem) => HistoryItem) {
    setHistory((items) => items.map((item, index) => index === historyIndex ? update(item) : item));
  }
  function choose(option: string) {
    if (!current || current.submitted) return;
    updateCurrent((item) => ({ ...item, selected: item.selected.includes(option) ? item.selected.filter((value) => value !== option) : [...item.selected, option] }));
  }
  function submit() {
    if (!current || !current.selected.length || current.submitted) return;
    const correct = current.selected.length === current.question.correctAnswers.length && current.selected.every((answer) => current.question.correctAnswers.includes(answer));
    const state = updateProgress(progress ?? initialProgress(), current.question.id, correct);
    setProgress(state);
    saveProgress(state);
    updateCurrent((item) => ({ ...item, submitted: true }));
  }
  function forward() { if (historyIndex < history.length - 1) setHistoryIndex((index) => index + 1); else startNew(); }
  function resetSession() { setHistory([]); setHistoryIndex(-1); }
  function changeTheme(value: string) { setThemeSlug(value); setChapterSlug("all"); resetSession(); }
  function changeChapter(value: string) { setChapterSlug(value); resetSession(); }
  if (!progress || !current) return <p className="loading">Loading your study session…</p>;
  const { question, selected, submitted } = current;
  const correct = selected.length === question.correctAnswers.length && selected.every((answer) => question.correctAnswers.includes(answer));
  const mediaBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return <section className="practice-layout"><aside className="practice-sidebar"><p className="eyebrow">Practice mode</p><label>Theme<select value={themeSlug} onChange={(event) => changeTheme(event.target.value)}><option value="all">All themes</option>{themes.map((theme) => <option key={theme.themeSlug} value={theme.themeSlug}>{theme.themeNumber} — {theme.themeName}</option>)}</select></label><label>Find a chapter<input type="search" value={chapterQuery} onChange={(event) => setChapterQuery(event.target.value)} placeholder="Search chapters" /></label><label>Question set<select value={chapterSlug} onChange={(event) => changeChapter(event.target.value)}><option value="all">All matching questions</option>{filteredChapters.map((chapter) => <option key={chapter.slug} value={chapter.slug}>{chapter.chapterNumber} — {chapter.chapterName}</option>)}</select></label><p className="muted">Due reviews are always shown before new questions.</p></aside><article className="question-card"><div className="question-meta"><Link href={`/topics/${question.chapter.slug}`}>{question.chapter.themeName}</Link><span>{question.number}</span><span>{question.points}</span></div><h1>{question.text}</h1>{question.videos[0] && <video className="question-media" controls preload="metadata" src={`${mediaBasePath}/media/${question.videos[0]}`} />}{!question.videos[0] && question.images[0] && <img className="question-media" src={`${mediaBasePath}/media/${question.images[0]}`} alt="Diagram for this driving theory question" />}<div className="answers" role="group" aria-label="Answer options">{question.options.map((option, index) => { const isCorrect = question.correctAnswers.includes(option); const state = submitted ? isCorrect ? "correct" : selected.includes(option) ? "incorrect" : "" : selected.includes(option) ? "selected" : ""; return <button className={`answer ${state}`} onClick={() => choose(option)} key={option} aria-pressed={selected.includes(option)} disabled={submitted}><b>{String.fromCharCode(65 + index)}</b><span>{option}</span></button>; })}</div>{submitted && <div className={`feedback ${correct ? "success" : "failure"}`}><strong>{correct ? "Correct" : "Not quite"}</strong><p>{question.explanation || `Correct answer: ${question.correctAnswers.join(", ")}`}</p><a href={question.sourceUrl} target="_blank" rel="noreferrer">View question source</a></div>}<div className="quiz-actions"><button className="button secondary" onClick={() => setHistoryIndex((index) => index - 1)} disabled={historyIndex === 0}>← Previous question</button>{!submitted ? <button className="button" onClick={submit} disabled={!selected.length}>Check answer</button> : <button className="button" onClick={forward}>Next →</button>}<button className="text-button" onClick={forward}>Skip question</button></div><p className="session-position" aria-live="polite">Question {historyIndex + 1} in this session</p></article></section>;
}
