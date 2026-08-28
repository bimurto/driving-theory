"use client";

import { useEffect, useState } from "react";
import type { Chapter, Question } from "@/lib/catalog";
import type { ProgressState } from "@/lib/progress";
import { loadProgress } from "@/lib/storage";

type QuestionStatus = "Correct" | "Wrong" | "Mixed" | "Unseen";

function getStatus(record: ProgressState["questions"][string] | undefined): QuestionStatus {
  if (!record) return "Unseen";
  if (record.correct === record.attempts) return "Correct";
  if (record.correct === 0) return "Wrong";
  return "Mixed";
}

function ChapterQuestionItem({ question, status }: { question: Question; status: QuestionStatus | undefined }) {
  const [expanded, setExpanded] = useState(false);
  const mediaBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return <li className="chapter-question-item">
    <details onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary>
        <span className="question-number">{question.number}</span>
        <p>{question.text}</p>
        {status && <span className={`question-status ${status.toLowerCase()}`}>{status}</span>}
      </summary>
      <div className="question-review">
        {expanded && <div className="question-review-media">
          {question.images.map((image) => <img key={image} src={`${mediaBasePath}/media/${image}`} alt="Diagram for this driving theory question" />)}
          {question.videos.map((video) => <video key={video} controls playsInline autoPlay={false} preload="metadata" src={`${mediaBasePath}/media/${video}`} />)}
        </div>}
        <ol className="question-options">
          {question.options.map((option) => <li className={question.correctAnswers.includes(option) ? "correct-option" : ""} key={option}>{option}</li>)}
        </ol>
        <p className="question-explanation"><strong>Explanation:</strong> {question.explanation || `Correct answer: ${question.correctAnswers.join(", ")}`}</p>
      </div>
    </details>
  </li>;
}

export function ChapterQuestionList({ chapter }: { chapter: Chapter }) {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  useEffect(() => setProgress(loadProgress()), []);

  return <section className="chapter-questions" id="questions">
    <div className="chapter-questions-heading">
      <div><p className="eyebrow">Question list</p><h2>All {chapter.questions.length} questions</h2></div>
      {!progress && <span className="muted">Loading statuses…</span>}
    </div>
    <ol className="chapter-question-list">
      {chapter.questions.map((question) => {
        const status = progress ? getStatus(progress.questions[question.id]) : undefined;
        return <ChapterQuestionItem key={question.id} question={question} status={status} />;
      })}
    </ol>
  </section>;
}
