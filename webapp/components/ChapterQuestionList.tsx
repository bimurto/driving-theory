"use client";

import { useState } from "react";
import { useLearningProgress } from "@/components/LearningProgressProvider";
import { StarRatingControl } from "@/components/StarRatingControl";
import { QuestionNoteEditor } from "@/components/QuestionNoteEditor";
import { QuestionVideo } from "@/components/QuestionVideo";
import { QuestionImage } from "@/components/QuestionImage";
import { splitQuestionText, type Chapter, type Question } from "@/lib/catalog";
import { getQuestionOutcome, setStarRating, type QuestionProgress, type QuestionOutcome, type StarRating } from "@/lib/progress";

type QuestionStatus = "Correct" | "Failed" | "Studied" | "Unseen";

function getStatus(outcome: QuestionOutcome): QuestionStatus {
  if (outcome === "correct") return "Correct";
  if (outcome === "failed") return "Failed";
  if (outcome === "unknown") return "Studied";
  return "Unseen";
}

function ChapterQuestionItem({ question, status, history, rating, onChangeRating }: { question: Question; status: QuestionStatus | undefined; history: QuestionProgress | undefined; rating: StarRating; onChangeRating: (rating: StarRating) => void }) {
  const [expanded, setExpanded] = useState(false);
  const mediaBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const questionText = splitQuestionText(question.text);

  return <li className="chapter-question-item" id={`question-${question.id}`}>
    <details onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary>
        <span className="question-number">{question.number}</span>
        <p>{questionText.prompt}{questionText.context.map((line) => <span className="question-context" key={line}>{line}</span>)}</p>
        {status && <span className={`question-status ${status.toLowerCase()}`}>{status}</span>}
      </summary>
      <div className="question-review">
        <StarRatingControl rating={rating} onChange={onChangeRating} />
        {history && <p className="question-attempt-history">{history.attempts} lifetime attempt{history.attempts === 1 ? "" : "s"} · {history.correct} correct · {history.attempts - history.correct} incorrect</p>}
        {expanded && <div className="question-review-media">
          {question.images.map((image) => <QuestionImage key={image} src={`${mediaBasePath}/media/${image}`} alt="Diagram for this driving theory question" />)}
          {question.videos.map((video) => <QuestionVideo key={video} src={`${mediaBasePath}/media/${video}`} />)}
        </div>}
        {question.fixedAnswer ? <p className="question-fixed-answer"><strong>Correct answer:</strong> {question.fixedAnswer}</p> : <ol className="question-options">
          {question.options.map((option) => <li className={question.correctAnswers.includes(option) ? "correct-option" : ""} key={option}>{option}</li>)}
        </ol>}
        <p className="question-explanation"><strong>Explanation:</strong> {question.explanation || `Correct answer: ${question.fixedAnswer ?? question.correctAnswers.join(", ")}`}</p>
        <QuestionNoteEditor questionId={question.id} />
      </div>
    </details>
  </li>;
}

export function ChapterQuestionList({ chapter }: { chapter: Chapter }) {
  const { progress, saveLearningProgress } = useLearningProgress();

  return <section className="chapter-questions" id="questions">
    <div className="chapter-questions-heading">
      <div><p className="eyebrow">Question list</p><h2>All {chapter.questions.length} questions</h2></div>
      {!progress && <span className="muted">Loading statuses…</span>}
    </div>
    <ol className="chapter-question-list">
      {chapter.questions.map((question) => {
        const status = progress ? getStatus(getQuestionOutcome(progress, question.id)) : undefined;
        return <ChapterQuestionItem key={question.id} question={question} status={status} history={progress?.questions[question.id]} rating={progress?.starRatings?.[question.id]?.rating ?? 0} onChangeRating={(rating) => {
          if (progress) void saveLearningProgress(setStarRating(progress, question.id, rating));
        }} />;
      })}
    </ol>
  </section>;
}
