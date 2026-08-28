"use client";

import { useEffect, useState } from "react";
import type { Chapter } from "@/lib/catalog";
import type { ProgressState } from "@/lib/progress";
import { loadProgress } from "@/lib/storage";

type QuestionStatus = "Correct" | "Wrong" | "Mixed" | "Unseen";

function getStatus(record: ProgressState["questions"][string] | undefined): QuestionStatus {
  if (!record) return "Unseen";
  if (record.correct === record.attempts) return "Correct";
  if (record.correct === 0) return "Wrong";
  return "Mixed";
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
        return <li key={question.id} className="chapter-question-item">
          <details>
            <summary>
              <span className="question-number">{question.number}</span>
              <p>{question.text}</p>
              {status && <span className={`question-status ${status.toLowerCase()}`}>{status}</span>}
            </summary>
            <div className="question-review">
              <ol className="question-options">
                {question.options.map((option) => <li className={question.correctAnswers.includes(option) ? "correct-option" : ""} key={option}>{option}</li>)}
              </ol>
              <p className="question-explanation"><strong>Explanation:</strong> {question.explanation || `Correct answer: ${question.correctAnswers.join(", ")}`}</p>
            </div>
          </details>
        </li>;
      })}
    </ol>
  </section>;
}
