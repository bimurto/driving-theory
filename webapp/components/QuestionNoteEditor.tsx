"use client";

import { useEffect, useState } from "react";
import { useLearningProgress } from "@/components/LearningProgressProvider";
import { setQuestionNote } from "@/lib/progress";

export function QuestionNoteEditor({ questionId }: { questionId: string }) {
  const { progress, saveLearningProgress } = useLearningProgress();
  const record = progress?.questionNotes?.[questionId];
  const [text, setText] = useState(record?.text ?? "");

  useEffect(() => { setText(record?.text ?? ""); }, [record?.changedAt, record?.text]);

  if (!progress) return null;
  const updateNote = (nextText: string) => {
    setText(nextText);
    void saveLearningProgress(setQuestionNote(progress, questionId, nextText));
  };

  return <section className="question-note-editor">
    <label htmlFor={`question-note-${questionId}`}>My note</label>
    <textarea id={`question-note-${questionId}`} value={text} onChange={(event) => updateNote(event.target.value)} placeholder="Explain this question in your own words…" rows={4} />
  </section>;
}
