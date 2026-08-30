import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuestionNoteListContent, notedQuestions } from "../components/QuestionNoteList";
import { allQuestions } from "../lib/catalog";
import { createLearningProgressPersistence, type LearningProgressGateway } from "../lib/learning-progress-persistence";
import { initialProgress, setQuestionNote } from "../lib/progress";

describe("question note list", () => {
  it("explains where a learner can add their first note", () => {
    const html = renderToStaticMarkup(<QuestionNoteListContent progress={initialProgress()} />);

    expect(html).toContain("No notes here yet");
    expect(html).toContain("After you check an answer in practice");
    expect(html).toContain('href="/practice"');
  });

  it("groups noted theory questions and omits deleted notes", () => {
    const noted = allQuestions[0];
    const deleted = allQuestions[1];
    let progress = setQuestionNote(initialProgress(), noted.id, "Yield before entering.", new Date("2026-08-28T08:00:00Z"));
    progress = setQuestionNote(progress, deleted.id, "Temporary", new Date("2026-08-28T08:00:00Z"));
    progress = setQuestionNote(progress, deleted.id, "", new Date("2026-08-28T09:00:00Z"));

    expect(notedQuestions(progress)).toEqual([noted]);
    const html = renderToStaticMarkup(<QuestionNoteListContent progress={progress} />);
    expect(html).toContain("Yield before entering.");
    expect(html).toContain(`href="/practice?notes=1&amp;question=${noted.id}"`);
    expect(html).not.toContain("Temporary");
  });

  it("keeps a saved question note visible to the Notes selector", async () => {
    let saved = initialProgress();
    const gateway: LearningProgressGateway = {
      isConfigured: () => false, currentLearnerAccount: async () => null, requestEmailCode: async () => undefined,
      verifyEmailCode: async () => ({ id: "learner", email: null }), mergeLearningProgress: async (progress) => progress,
      signOut: async () => undefined, deleteLearnerAccount: async () => undefined,
    };
    const persistence = createLearningProgressPersistence({ load: () => saved, save: (progress) => { saved = progress; } }, gateway);
    const question = allQuestions[0];

    await persistence.save(setQuestionNote(persistence.load(), question.id, "Use the sign as the priority cue."));

    expect(notedQuestions(persistence.load())).toEqual([question]);
  });
});
