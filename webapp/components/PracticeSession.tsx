"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLearningProgress } from "@/components/LearningProgressProvider";
import { StarRatingControl } from "@/components/StarRatingControl";
import { QuestionNoteEditor } from "@/components/QuestionNoteEditor";
import { QuestionVideo } from "@/components/QuestionVideo";
import { QuestionImage } from "@/components/QuestionImage";
import { allQuestions, catalog, isValidNumericAnswer, matchesFixedAnswer, splitQuestionText, type Chapter, type Question } from "@/lib/catalog";
import { initialProgress, parseStarredRatingFilter, selectQuestion, selectStarredQuestion, setStarRating, updateProgress, type StarRating, type StarredRatingFilter } from "@/lib/progress";

type QuizQuestion = Question & { chapter: Chapter };
type HistoryItem = { question: QuizQuestion; selected: string[]; numericAnswer: string; submitted: boolean };
export function PracticeSession() {
  const { progress, saveLearningProgress } = useLearningProgress();
  const [themeSlug, setThemeSlug] = useState("all");
  const [chapterSlug, setChapterSlug] = useState("all");
  const [chapterQuery, setChapterQuery] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionPromptedFor, setCompletionPromptedFor] = useState<string | null>(null);
  const [starredRating, setStarredRating] = useState<StarredRatingFilter | null>(null);
  const [noteRevision, setNoteRevision] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const chosen = new URLSearchParams(window.location.search).get("chapter");
    if (chosen && catalog.chapters.some((chapter) => chapter.slug === chosen)) setChapterSlug(chosen);
    setStarredRating(parseStarredRatingFilter(new URLSearchParams(window.location.search).get("stars")));
    setNoteRevision(new URLSearchParams(window.location.search).get("notes") === "1");
    setSessionReady(true);
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
    const chapterQuestions = allQuestions.filter((item) => chapterSlugs.has(item.chapter.slug));
    if (starredRating) return chapterQuestions.filter((item) => {
      const rating = progress?.starRatings?.[item.id]?.rating ?? 0;
      return rating > 0 && (starredRating === "all" || rating === starredRating);
    });
    if (noteRevision) return chapterQuestions.filter((item) => Boolean(progress?.questionNotes?.[item.id]?.text));
    return chapterQuestions;
  }, [chapterSlug, noteRevision, progress, starredRating, themeSlug]);
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
    const requestedQuestionId = new URLSearchParams(window.location.search).get("question");
    const requestedQuestion = pool.find((item) => item.id === requestedQuestionId);
    if (requestedQuestion) {
      const url = new URL(window.location.href);
      url.searchParams.delete("question");
      window.history.replaceState(null, "", url);
    }
    const question = requestedQuestion ?? (starredRating ? selectStarredQuestion(pool, state, starredRating) : selectQuestion(pool, state));
    if (!question) return;
    const item = { question, selected: [], numericAnswer: "", submitted: false };
    setHistory((items) => [...items.slice(0, historyIndex + 1), item]);
    setHistoryIndex((index) => index + 1);
  }

  useEffect(() => {
    if (progress && sessionReady && !current) startNew(progress);
  }, [progress, pool, sessionReady]);

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

  function setNumericAnswer(value: string) {
    if (!current || current.submitted) return;
    updateCurrent((item) => ({ ...item, numericAnswer: value }));
  }

  function submit() {
    if (!current || current.submitted) return;
    const correct = current.question.fixedAnswer
      ? matchesFixedAnswer(current.numericAnswer, current.question.fixedAnswer)
      : current.selected.length === current.question.correctAnswers.length && current.selected.every((answer) => current.question.correctAnswers.includes(answer));
    if (current.question.fixedAnswer ? !isValidNumericAnswer(current.numericAnswer) : !current.selected.length) return;
    const state = updateProgress(progress ?? initialProgress(), current.question.id, correct);
    void saveLearningProgress(state);
    updateCurrent((item) => ({ ...item, submitted: true }));
  }

  function changeStarRating(rating: StarRating) {
    if (!progress || !current) return;
    void saveLearningProgress(setStarRating(progress, current.question.id, rating));
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
    void saveLearningProgress(revisedProgress);
    setCompletionPromptedFor(null);
    setShowCompletion(false);
    resetSession();
  }

  if (!progress || !sessionReady) return <p className="loading">Loading your study session…</p>;
  if (!current) return <p className="notice">{starredRating ? "No starred questions match this revision set." : noteRevision ? "No noted questions match this revision set." : "No questions match this practice set."}</p>;

  const { question, selected, numericAnswer, submitted } = current;
  const correct = question.fixedAnswer ? matchesFixedAnswer(numericAnswer, question.fixedAnswer) : selected.length === question.correctAnswers.length && selected.every((answer) => question.correctAnswers.includes(answer));
  const numericAnswerValid = isValidNumericAnswer(numericAnswer);
  const chapterQuestionPosition = question.chapter.questions.findIndex((item) => item.id === question.id) + 1;
  const mediaBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const questionText = splitQuestionText(question.text);

  return <section className="practice-layout">
    <aside className={`practice-sidebar ${filtersOpen ? "is-open" : ""}`}>
      <div className="filter-header">
        <div className="filter-heading"><p className="eyebrow">{starredRating ? "Starred revision" : noteRevision ? "Notes revision" : "Practice"}</p><h2>Question filters</h2></div>
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
        <p className="question-set-status"><strong>{pool.length}</strong> {starredRating ? "starred questions" : noteRevision ? "noted questions" : "questions"} in this set <span>· {studiedCount} studied</span></p>
        <p className="muted">{starredRating ? "Higher ratings are shown first; due reviews lead within each rating." : noteRevision ? "Due reviews are shown before other noted questions." : "Due reviews are always shown before new questions."}</p>
      </div>}
    </aside>

    <article className="question-card">
      <div className="question-meta">
        <Link href={`/topics/${question.chapter.slug}`}>{question.chapter.themeName}</Link>
        <a href={question.sourceUrl} target="_blank" rel="noreferrer" title="Open question source">{question.number}</a>
        <span>{question.points}</span>
      </div>
      <Link className="chapter-position" href={`/topics/${question.chapter.slug}#questions`}>Question {chapterQuestionPosition} of {question.chapter.questions.length} in this chapter</Link>
      <StarRatingControl rating={progress.starRatings?.[question.id]?.rating ?? 0} onChange={changeStarRating} />
      <h1>{questionText.prompt}</h1>
      {questionText.context.map((line) => <p className="question-context" key={line}>{line}</p>)}
      {question.videos[0] && <QuestionVideo className="question-media" src={`${mediaBasePath}/media/${question.videos[0]}`} />}
      {!question.videos[0] && question.images[0] && <QuestionImage className="question-media" src={`${mediaBasePath}/media/${question.images[0]}`} alt="Diagram for this driving theory question" />}
      {question.fixedAnswer ? <div className="numeric-answer">
        <label htmlFor={`numeric-answer-${question.id}`}>Your numeric answer</label>
        <input id={`numeric-answer-${question.id}`} value={numericAnswer} onChange={(event) => setNumericAnswer(event.target.value)} inputMode="decimal" autoComplete="off" placeholder="Use a dot, for example 1.6" disabled={submitted} aria-describedby={`numeric-answer-help-${question.id}`} />
        <p id={`numeric-answer-help-${question.id}`} className={numericAnswer && !numericAnswerValid ? "numeric-answer-error" : "muted"}>{numericAnswer && !numericAnswerValid ? "Enter a non-negative number using a dot as the decimal separator." : "Use a dot as the decimal separator, for example 1.6."}</p>
      </div> : <div className="answers" role="group" aria-label="Answer options">
        {question.options.map((option, index) => {
          const isCorrect = question.correctAnswers.includes(option);
          const state = submitted ? isCorrect ? "correct" : selected.includes(option) ? "incorrect" : "" : selected.includes(option) ? "selected" : "";
          return <button className={`answer ${state}`} onClick={() => choose(option)} key={option} aria-pressed={selected.includes(option)} disabled={submitted}>
            <b>{String.fromCharCode(65 + index)}</b><span>{option}</span>
          </button>;
        })}
      </div>}
      {submitted && <><div className={`feedback ${correct ? "success" : "failure"}`}><strong>{correct ? "Correct" : "Not quite"}</strong><p>{question.explanation || `Correct answer: ${question.correctAnswers.join(", ")}`}</p><a href={question.sourceUrl} target="_blank" rel="noreferrer">View question source</a></div><QuestionNoteEditor questionId={question.id} /></>}
      <div className="quiz-actions">
        <button className="button secondary" onClick={() => setHistoryIndex((index) => index - 1)} disabled={historyIndex === 0}>← Previous question</button>
        {!submitted ? <button className="button" onClick={submit} disabled={question.fixedAnswer ? !numericAnswerValid : !selected.length}>Check answer</button> : <button className="button" onClick={forward}>Next →</button>}
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
