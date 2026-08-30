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
  const hasNote = Boolean(record?.text);
  const save = () => { void saveLearningProgress(setQuestionNote(progress, questionId, text)); };

  return <section className="question-note-editor">
    <label htmlFor={`question-note-${questionId}`}>My note</label>
    <textarea id={`question-note-${questionId}`} value={text} onChange={(event) => setText(event.target.value)} placeholder="Explain this question in your own words…" rows={4} />
    <div className="question-note-actions"><button className="button secondary" type="button" onClick={save}>{text.trim() ? "Save note" : hasNote ? "Remove note" : "Save note"}</button>{hasNote && text.trim() && <button className="text-button danger" type="button" onClick={() => setText("")}>Clear</button>}</div>
  </section>;
}
