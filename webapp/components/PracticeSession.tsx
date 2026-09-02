"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLearningProgress } from "@/components/LearningProgressProvider";
import { ChapterCompletionDialog } from "@/components/ChapterCompletionDialog";
import { StarRatingControl } from "@/components/StarRatingControl";
import { QuestionNoteEditor } from "@/components/QuestionNoteEditor";
import { QuestionVideo } from "@/components/QuestionVideo";
import { QuestionImage } from "@/components/QuestionImage";
import { allQuestions, catalog, isValidNumericAnswer, matchesFixedAnswer, splitQuestionText, type Chapter, type Question } from "@/lib/catalog";
import { getDueQuestions, getRecommendedChapter, type ChapterRecommendation } from "@/lib/chapter-progression";
import { getPracticeSessionProgress } from "@/lib/practice-session";
import { initialProgress, isDue, isFailedQuestion, isQuestionSetComplete, parseStarredRatingFilter, selectQuestion, selectStarredQuestion, setStarRating, summarizeQuestionSet, updateProgress, type StarRating, type StarredRatingFilter } from "@/lib/progress";

type QuizQuestion = Question & { chapter: Chapter };
type HistoryItem = { question: QuizQuestion; selected: string[]; numericAnswer: string; submitted: boolean };
type CompletionDetails = { recommendation: ChapterRecommendation; dueCount: number };
export function PracticeSession() {
  const { progress, saveLearningProgress } = useLearningProgress();
  const [themeSlug, setThemeSlug] = useState("all");
  const [chapterSlug, setChapterSlug] = useState("all");
  const [chapterQuery, setChapterQuery] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionDetails, setCompletionDetails] = useState<CompletionDetails | null>(null);
  const [starredRating, setStarredRating] = useState<StarredRatingFilter | null>(null);
  const [noteRevision, setNoteRevision] = useState(false);
  const [failedRevision, setFailedRevision] = useState(false);
  const [dueRevision, setDueRevision] = useState(false);
  const [reviewedDueIds, setReviewedDueIds] = useState<string[]>([]);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const chosen = new URLSearchParams(window.location.search).get("chapter");
    if (chosen && catalog.chapters.some((chapter) => chapter.slug === chosen)) setChapterSlug(chosen);
    setStarredRating(parseStarredRatingFilter(new URLSearchParams(window.location.search).get("stars")));
    setNoteRevision(new URLSearchParams(window.location.search).get("notes") === "1");
    setFailedRevision(new URLSearchParams(window.location.search).get("failed") === "1");
    setDueRevision(new URLSearchParams(window.location.search).get("due") === "1");
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
    if (dueRevision) return chapterQuestions.filter((item) => progress && isDue(progress.questions[item.id]) && !reviewedDueIds.includes(item.id));
    if (starredRating) return chapterQuestions.filter((item) => {
      const rating = progress?.starRatings?.[item.id]?.rating ?? 0;
      return rating > 0 && (starredRating === "all" || rating === starredRating);
    });
    if (noteRevision) return chapterQuestions.filter((item) => Boolean(progress?.questionNotes?.[item.id]?.text));
    if (failedRevision) return chapterQuestions.filter((item) => progress && isFailedQuestion(progress, item.id));
    return chapterQuestions;
  }, [chapterSlug, dueRevision, failedRevision, noteRevision, progress, reviewedDueIds, starredRating, themeSlug]);
  const studiedCount = useMemo(() => pool.filter((question) => progress?.questions[question.id]).length, [pool, progress]);
  const practiceStats = useMemo(() => summarizeQuestionSet(pool, progress ?? initialProgress()), [pool, progress]);
  const selectedChapter = chapterSlug === "all" ? undefined : catalog.chapters.find((chapter) => chapter.slug === chapterSlug);
  const current = history[historyIndex];

  function startNew(state = progress ?? initialProgress(), questionPool = pool) {
    const requestedQuestionId = new URLSearchParams(window.location.search).get("question");
    const requestedQuestion = questionPool.find((item) => item.id === requestedQuestionId);
    if (requestedQuestion) {
      const url = new URL(window.location.href);
      url.searchParams.delete("question");
      window.history.replaceState(null, "", url);
    }
    const viewedQuestionIds = new Set(history.map((item) => item.question.id));
    const unviewedQuestions = questionPool.filter((item) => !viewedQuestionIds.has(item.id));
    const selectionPool = unviewedQuestions.length ? unviewedQuestions : questionPool;
    const question = requestedQuestion ?? (starredRating ? selectStarredQuestion(selectionPool, state, starredRating) : selectQuestion(selectionPool, state));
    if (!question) return;
    const item = { question, selected: [], numericAnswer: "", submitted: false };
    setHistory((items) => [...items.slice(0, historyIndex + 1), item]);
    setHistoryIndex((index) => index + 1);
  }

  useEffect(() => {
    if (progress && sessionReady && !current) startNew(progress);
  }, [progress, pool, sessionReady]);

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
    const currentProgress = progress ?? initialProgress();
    const wasChapterComplete = selectedChapter ? isQuestionSetComplete(selectedChapter.questions, currentProgress) : false;
    const state = updateProgress(currentProgress, current.question.id, correct);
    const chapterBecameComplete = selectedChapter
      ? !wasChapterComplete && isQuestionSetComplete(selectedChapter.questions, state)
      : false;
    void saveLearningProgress(state);
    updateCurrent((item) => ({ ...item, submitted: true }));
    if (dueRevision) setReviewedDueIds((ids) => ids.includes(current.question.id) ? ids : [...ids, current.question.id]);
    if (chapterBecameComplete) {
      setCompletionDetails({
        recommendation: getRecommendedChapter(catalog.chapters, state),
        dueCount: getDueQuestions(allQuestions, state).length,
      });
      setShowCompletion(true);
    }
  }

  function changeStarRating(rating: StarRating) {
    if (!progress || !current) return;
    void saveLearningProgress(setStarRating(progress, current.question.id, rating));
  }

  function forward() {
    if (historyIndex < history.length - 1) setHistoryIndex((index) => index + 1);
    else if (dueRevision && current?.submitted && pool.length === 0) resetSession();
    else if (dueRevision && current && !current.submitted) {
      const otherDueQuestions = pool.filter((question) => question.id !== current.question.id);
      startNew(progress ?? initialProgress(), otherDueQuestions.length ? otherDueQuestions : pool);
    } else startNew();
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

  function practiseChapterAgain() {
    if (!selectedChapter) return;
    setShowCompletion(false);
    setCompletionDetails(null);
    resetSession();
  }

  function closeCompletion() {
    setShowCompletion(false);
    setCompletionDetails(null);
  }

  if (!progress || !sessionReady) return <p className="loading">Loading your study session…</p>;
  const recommendation = getRecommendedChapter(catalog.chapters, progress);
  const recommendedChapter = recommendation.kind === "chapter" ? recommendation.chapter : null;
  if (!current) return dueRevision ? <section className="notice review-complete"><p className="eyebrow">Due review</p><h1>You’re caught up.</h1><p>No theory questions are currently due. Continue with your recommended chapter or check your overall learning progress.</p><div className="actions">{recommendedChapter && <Link className="button" href={`/topics/${recommendedChapter.slug}`}>Continue learning</Link>}<Link className="button secondary" href="/progress">View progress</Link></div></section> : <p className="notice">{starredRating ? "No starred questions match this revision set." : noteRevision ? "No noted questions match this revision set." : failedRevision ? "No failed questions match this revision set." : "No questions match this practice set."}</p>;

  const { question, selected, numericAnswer, submitted } = current;
  const correct = question.fixedAnswer ? matchesFixedAnswer(numericAnswer, question.fixedAnswer) : selected.length === question.correctAnswers.length && selected.every((answer) => question.correctAnswers.includes(answer));
  const numericAnswerValid = isValidNumericAnswer(numericAnswer);
  const sessionProgress = getPracticeSessionProgress(history.map((item) => item.question.id), pool.map((item) => item.id));
  const practiceModeLabel = dueRevision ? "Due review" : starredRating ? "Starred revision" : noteRevision ? "Notes revision" : failedRevision ? "Failed answers" : "Practice";
  const mediaBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const questionText = splitQuestionText(question.text);

  return <section className="practice-layout">
    <aside className={`practice-sidebar ${filtersOpen ? "is-open" : ""}`}>
      <div className="filter-header">
        <div className="filter-heading"><p className="eyebrow">{practiceModeLabel}</p><h2>{dueRevision ? "Scheduled questions" : "Question filters"}</h2></div>
        {!dueRevision && <button className="filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="practice-filters" aria-label={filtersOpen ? "Hide question filters" : "Show question filters"} title={filtersOpen ? "Hide question filters" : "Show question filters"} onClick={() => setFiltersOpen((open) => !open)}>
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6" /></svg>
        </button>}
      </div>
      {dueRevision ? <div className="practice-filters"><p className="question-set-status"><strong>{pool.length}</strong> due question{pool.length === 1 ? "" : "s"} remaining</p><p className="muted">This focused review keeps earlier chapters fresh without interrupting your next study guide.</p></div> : filtersOpen && <div className="practice-filters" id="practice-filters">
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
        <p className="question-set-status"><strong>{pool.length}</strong> {starredRating ? "starred questions" : noteRevision ? "noted questions" : failedRevision ? "failed questions" : "questions"} in this set <span>· {studiedCount} studied</span></p>
        <p className="muted">Questions are selected to support effective practice.</p>
      </div>}
    </aside>

    <article className="question-card">
      <div className="question-meta">
        <Link href={`/topics/${question.chapter.slug}`}>{question.chapter.themeName}</Link>
        <span className="meta-divider" aria-hidden="true">·</span>
        <Link href={`/topics/${question.chapter.slug}`}>{question.chapter.chapterNumber} — {question.chapter.chapterName}</Link>
        <span className="meta-divider" aria-hidden="true">·</span>
        <a href={question.sourceUrl} target="_blank" rel="noreferrer" title="Open question source">{question.number}</a>
        <span className="meta-divider" aria-hidden="true">·</span>
        <span className="session-position">{dueRevision ? `${pool.length} due remaining` : `Viewed ${sessionProgress.viewed}/${sessionProgress.total}`}</span>
        <span className="meta-divider" aria-hidden="true">·</span>
        <span>{question.points}</span>
      </div>
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
        {!submitted ? <button className="button" onClick={submit} disabled={question.fixedAnswer ? !numericAnswerValid : !selected.length}>Check answer</button> : <button className="button" onClick={forward} data-completion-return-focus>Next →</button>}
        <button className="text-button" onClick={forward}>Skip question</button>
      </div>
      {!dueRevision && <><dl className="practice-stats" aria-label="Question-set progress" aria-live="polite">
        <div><dt>Correct now</dt><dd>{practiceStats.outcomes.correct}</dd></div>
        <div><dt>Failed now</dt><dd>{practiceStats.outcomes.failed}</dd></div>
        <div><dt>Unseen</dt><dd>{practiceStats.outcomes.unseen}</dd></div>
        {practiceStats.outcomes.unknown > 0 && <div><dt>Studied</dt><dd>{practiceStats.outcomes.unknown}</dd></div>}
      </dl>
      <p className="practice-history">{practiceStats.attempts
        ? <>{practiceStats.attempts} lifetime attempt{practiceStats.attempts === 1 ? "" : "s"} · {practiceStats.correctAttempts} correct · {practiceStats.incorrectAttempts} incorrect · {Math.round(practiceStats.correctAttempts / practiceStats.attempts * 100)}% lifetime accuracy</>
        : "No lifetime attempts in this question set yet."}</p></>}
      {dueRevision && <p className="due-review-progress" aria-live="polite"><strong>{pool.length}</strong> scheduled question{pool.length === 1 ? "" : "s"} remaining in this review.</p>}
    </article>
    {showCompletion && selectedChapter && completionDetails && <ChapterCompletionDialog chapter={selectedChapter} recommendation={completionDetails.recommendation} dueCount={completionDetails.dueCount} onPractiseAgain={practiseChapterAgain} onClose={closeCompletion} />}
  </section>;
}
