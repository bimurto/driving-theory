"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionPromptedFor, setCompletionPromptedFor] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadProgress();
    setProgress(stored);
    const chosen = new URLSearchParams(window.location.search).get("chapter");
    if (chosen && catalog.chapters.some((chapter) => chapter.slug === chosen)) setChapterSlug(chosen);
  }, []);

  const themes = useMemo(() => [...new Map(catalog.chapters.map((chapter) => [chapter.themeSlug, chapter])).values()], []);
  const filteredChapters = useMemo(() => catalog.chapters.filter((chapter) =>
    (themeSlug === "all" || chapter.themeSlug === themeSlug)
    && `${chapter.chapterNumber} ${chapter.chapterName}`.toLowerCase().includes(chapterQuery.toLowerCase()),
  ), [themeSlug, chapterQuery]);
  const pool = useMemo(() => {
    const chapterSlugs = new Set(chapterSlug === "all"
      ? catalog.chapters.filter((chapter) => themeSlug === "all" || chapter.themeSlug === themeSlug).map((chapter) => chapter.slug)
      : [chapterSlug]);
    return allQuestions.filter((item) => chapterSlugs.has(item.chapter.slug));
  }, [chapterSlug, themeSlug]);
  const studiedCount = useMemo(() => pool.filter((question) => progress?.questions[question.id]).length, [pool, progress]);
  const practiceStats = useMemo(() => pool.reduce((totals, question) => {
    const record = progress?.questions[question.id];
    return {
      correct: totals.correct + (record?.correct ?? 0),
      wrong: totals.wrong + ((record?.attempts ?? 0) - (record?.correct ?? 0)),
      unseen: totals.unseen + Number(!record),
    };
  }, { correct: 0, wrong: 0, unseen: 0 }), [pool, progress]);
  const selectedChapter = chapterSlug === "all" ? undefined : catalog.chapters.find((chapter) => chapter.slug === chapterSlug);
  const chapterComplete = Boolean(selectedChapter?.questions.length && selectedChapter.questions.every((question) => progress?.questions[question.id]?.correct));
  const current = history[historyIndex];

  function startNew(state = progress ?? initialProgress()) {
    const question = selectQuestion(pool, state);
    if (!question) return;
    const item = { question, selected: [], submitted: false };
    setHistory((items) => [...items.slice(0, historyIndex + 1), item]);
    setHistoryIndex((index) => index + 1);
  }

  useEffect(() => {
    if (progress && !current) startNew(progress);
  }, [progress, pool]);

  useEffect(() => {
    if (chapterComplete && selectedChapter && completionPromptedFor !== selectedChapter.slug) {
      setCompletionPromptedFor(selectedChapter.slug);
      setShowCompletion(true);
    }
  }, [chapterComplete, completionPromptedFor, selectedChapter]);

  function updateCurrent(update: (item: HistoryItem) => HistoryItem) {
    setHistory((items) => items.map((item, index) => index === historyIndex ? update(item) : item));
  }

  function choose(option: string) {
    if (!current || current.submitted) return;
    updateCurrent((item) => ({
      ...item,
      selected: item.selected.includes(option) ? item.selected.filter((value) => value !== option) : [...item.selected, option],
    }));
  }

  function submit() {
    if (!current || !current.selected.length || current.submitted) return;
    const correct = current.selected.length === current.question.correctAnswers.length
      && current.selected.every((answer) => current.question.correctAnswers.includes(answer));
    const state = updateProgress(progress ?? initialProgress(), current.question.id, correct);
    setProgress(state);
    saveProgress(state);
    updateCurrent((item) => ({ ...item, submitted: true }));
  }

  function forward() {
    if (historyIndex < history.length - 1) setHistoryIndex((index) => index + 1);
    else startNew();
  }

  function resetSession() {
    setHistory([]);
    setHistoryIndex(-1);
  }

  function changeTheme(value: string) {
    setThemeSlug(value);
    setChapterSlug("all");
    resetSession();
  }

  function changeChapter(value: string) {
    setChapterSlug(value);
    resetSession();
  }

  function reviseChapter() {
    if (!progress || !selectedChapter) return;
    const chapterQuestionIds = new Set(selectedChapter.questions.map((question) => question.id));
    const revisedProgress = {
      ...progress,
      questions: Object.fromEntries(Object.entries(progress.questions).filter(([questionId]) => !chapterQuestionIds.has(questionId))),
    };
    setProgress(revisedProgress);
    saveProgress(revisedProgress);
    setCompletionPromptedFor(null);
    setShowCompletion(false);
    resetSession();
  }

  if (!progress || !current) return <p className="loading">Loading your study session…</p>;

  const { question, selected, submitted } = current;
  const correct = selected.length === question.correctAnswers.length && selected.every((answer) => question.correctAnswers.includes(answer));
  const chapterQuestionPosition = question.chapter.questions.findIndex((item) => item.id === question.id) + 1;
  const mediaBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return <section className="practice-layout">
    <aside className={`practice-sidebar ${filtersOpen ? "is-open" : ""}`}>
      <div className="filter-header">
        <div className="filter-heading"><p className="eyebrow">Practice</p><h2>Question filters</h2></div>
        <button className="filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="practice-filters" aria-label={filtersOpen ? "Hide question filters" : "Show question filters"} title={filtersOpen ? "Hide question filters" : "Show question filters"} onClick={() => setFiltersOpen((open) => !open)}>
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6" /></svg>
        </button>
      </div>
      {filtersOpen && <div className="practice-filters" id="practice-filters">
        <label>Theme
          <select value={themeSlug} onChange={(event) => changeTheme(event.target.value)}>
            <option value="all">All themes</option>
            {themes.map((theme) => <option key={theme.themeSlug} value={theme.themeSlug}>{theme.themeNumber} — {theme.themeName}</option>)}
          </select>
        </label>
        <label>Find a chapter
          <input type="search" value={chapterQuery} onChange={(event) => setChapterQuery(event.target.value)} placeholder="Search chapters" />
        </label>
        <label>Question set
          <select value={chapterSlug} onChange={(event) => changeChapter(event.target.value)}>
            <option value="all">All matching questions</option>
            {filteredChapters.map((chapter) => <option key={chapter.slug} value={chapter.slug}>{chapter.chapterNumber} — {chapter.chapterName}</option>)}
          </select>
        </label>
        <p className="question-set-status"><strong>{pool.length}</strong> questions in this set <span>· {studiedCount} studied</span></p>
        <p className="muted">Due reviews are always shown before new questions.</p>
      </div>}
    </aside>

    <article className="question-card">
      <div className="question-meta">
        <Link href={`/topics/${question.chapter.slug}`}>{question.chapter.themeName}</Link>
        <span>{question.number}</span>
        <span>{question.points}</span>
      </div>
      <Link className="chapter-position" href={`/topics/${question.chapter.slug}#questions`}>Question {chapterQuestionPosition} of {question.chapter.questions.length} in this chapter</Link>
      <h1>{question.text}</h1>
      {question.videos[0] && <video className="question-media" controls preload="metadata" src={`${mediaBasePath}/media/${question.videos[0]}`} />}
      {!question.videos[0] && question.images[0] && <img className="question-media" src={`${mediaBasePath}/media/${question.images[0]}`} alt="Diagram for this driving theory question" />}
      <div className="answers" role="group" aria-label="Answer options">
        {question.options.map((option, index) => {
          const isCorrect = question.correctAnswers.includes(option);
          const state = submitted ? isCorrect ? "correct" : selected.includes(option) ? "incorrect" : "" : selected.includes(option) ? "selected" : "";
          return <button className={`answer ${state}`} onClick={() => choose(option)} key={option} aria-pressed={selected.includes(option)} disabled={submitted}>
            <b>{String.fromCharCode(65 + index)}</b><span>{option}</span>
          </button>;
        })}
      </div>
      {submitted && <div className={`feedback ${correct ? "success" : "failure"}`}><strong>{correct ? "Correct" : "Not quite"}</strong><p>{question.explanation || `Correct answer: ${question.correctAnswers.join(", ")}`}</p><a href={question.sourceUrl} target="_blank" rel="noreferrer">View question source</a></div>}
      <div className="quiz-actions">
        <button className="button secondary" onClick={() => setHistoryIndex((index) => index - 1)} disabled={historyIndex === 0}>← Previous question</button>
        {!submitted ? <button className="button" onClick={submit} disabled={!selected.length}>Check answer</button> : <button className="button" onClick={forward}>Next →</button>}
        <button className="text-button" onClick={forward}>Skip question</button>
      </div>
      <dl className="practice-stats" aria-label="Question-set progress" aria-live="polite">
        <div><dt>Correct</dt><dd>{practiceStats.correct}</dd></div>
        <div><dt>Wrong</dt><dd>{practiceStats.wrong}</dd></div>
        <div><dt>Unseen</dt><dd>{practiceStats.unseen}</dd></div>
      </dl>
    </article>
    {showCompletion && selectedChapter && <div className="completion-overlay" role="presentation">
      <section className="completion-dialog" role="dialog" aria-modal="true" aria-labelledby="completion-title">
        <p className="eyebrow">Chapter complete</p>
        <h2 id="completion-title">You answered every question correctly.</h2>
        <p>{selectedChapter.chapterNumber} — {selectedChapter.chapterName} is complete. Would you like to revise it?</p>
        <div className="completion-actions">
          <button className="button" onClick={reviseChapter}>Revise chapter</button>
          <button className="button secondary" onClick={() => setShowCompletion(false)}>Keep my progress</button>
        </div>
      </section>
    </div>}
  </section>;
}
