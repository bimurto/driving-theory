import { describe, expect, it } from "vitest";
import { initialProgress, migrateLearningProgress, parseStarredRatingFilter, selectQuestion, selectStarredQuestion, setQuestionNote, setStarRating, updateProgress } from "../lib/progress";
import { parseStoredProgress } from "../lib/storage";
describe("spaced repetition", () => {
  it("schedules first attempts for the next day", () => { const now = new Date("2026-08-28T10:00:00Z"); const result = updateProgress(initialProgress(), "a", true, now); expect(result.questions.a.intervalDays).toBe(1); expect(result.questions.a.nextReviewAt).toBe("2026-08-29T10:00:00.000Z"); });
  it("resets an incorrect repeat to one day", () => { const now = new Date("2026-08-28T10:00:00Z"); let state = updateProgress(initialProgress(), "a", true, now); state = updateProgress(state, "a", false, now); expect(state.questions.a.intervalDays).toBe(1); expect(state.questions.a.ease).toBe(2.4); });
  it("chooses due questions before unseen ones", () => { const state = initialProgress(); state.questions.due = { attempts:1, correct:1, ease:2.5, intervalDays:1, lastAnsweredAt:"2026-08-20T00:00:00.000Z", nextReviewAt:"2026-08-21T00:00:00.000Z" }; expect(selectQuestion([{id:"due"},{id:"new"}], state, new Date("2026-08-28"))?.id).toBe("due"); });
  it("stars an unseen theory question without creating answer progress", () => {
    const result = setStarRating(initialProgress(), "unseen", 3, new Date("2026-08-28T10:00:00Z"));

    expect(result.questions).toEqual({});
    expect(result.starRatings?.unseen).toEqual({ rating: 3, changedAt: "2026-08-28T10:00:00.000Z" });
  });
  it("replaces and removes a star rating without changing answer progress", () => {
    const answered = updateProgress(initialProgress(), "question", true, new Date("2026-08-28T09:00:00Z"));
    const rerated = setStarRating(answered, "question", 2, new Date("2026-08-28T10:00:00Z"));
    const unstarred = setStarRating(rerated, "question", 0, new Date("2026-08-28T11:00:00Z"));

    expect(unstarred.questions.question).toEqual(answered.questions.question);
    expect(unstarred.starRatings?.question).toEqual({ rating: 0, changedAt: "2026-08-28T11:00:00.000Z" });
  });
  it("migrates version-one learning progress to a note-capable state", () => {
    const result = migrateLearningProgress({ version: 1, questions: { question: { attempts: 1, correct: 1, ease: 2.6, intervalDays: 1, nextReviewAt: "2026-08-29T10:00:00.000Z", lastAnsweredAt: "2026-08-28T10:00:00.000Z" } } });

    expect(result).toEqual({ version: 4, questions: { question: { attempts: 1, correct: 1, ease: 2.6, intervalDays: 1, nextReviewAt: "2026-08-29T10:00:00.000Z", lastAnsweredAt: "2026-08-28T10:00:00.000Z" } }, starRatings: {}, questionNotes: {}, failedQuestions: {} });
  });
  it("adds and clears a question note without changing answer progress", () => {
    const answered = updateProgress(initialProgress(), "question", true, new Date("2026-08-28T09:00:00Z"));
    const noted = setQuestionNote(answered, "question", " Keep right after turning. ", new Date("2026-08-28T10:00:00Z"));
    const cleared = setQuestionNote(noted, "question", " ", new Date("2026-08-28T11:00:00Z"));

    expect(noted.questionNotes?.question).toEqual({ text: "Keep right after turning.", changedAt: "2026-08-28T10:00:00.000Z" });
    expect(cleared.questionNotes?.question).toEqual({ text: null, changedAt: "2026-08-28T11:00:00.000Z" });
    expect(cleared.questions.question).toEqual(answered.questions.question);
  });
  it("restores a version-three snapshot containing a question note", () => {
    const saved = setQuestionNote(initialProgress(), "question", "Look for the yield sign.", new Date("2026-08-28T10:00:00Z"));

    expect(parseStoredProgress(saved)).toEqual(saved);
  });
  it("selects the highest starred questions before lower starred due reviews", () => {
    let state = setStarRating(initialProgress(), "lowDue", 1, new Date("2026-08-28T08:00:00Z"));
    state = setStarRating(state, "highDue", 3, new Date("2026-08-28T08:00:00Z"));
    state = updateProgress(state, "lowDue", true, new Date("2026-08-20T08:00:00Z"));
    state = updateProgress(state, "highDue", true, new Date("2026-08-20T08:00:00Z"));

    expect(selectStarredQuestion([{ id: "lowDue" }, { id: "highDue" }, { id: "highNew" }], state, "all", new Date("2026-08-28T08:00:00Z"))?.id).toBe("highDue");
  });
  it("filters starred selection and excludes an unstarred theory question from later selection", () => {
    let state = setStarRating(initialProgress(), "oneStar", 1, new Date("2026-08-28T08:00:00Z"));
    state = setStarRating(state, "threeStar", 3, new Date("2026-08-28T08:00:00Z"));

    expect(selectStarredQuestion([{ id: "oneStar" }, { id: "threeStar" }], state, 1)?.id).toBe("oneStar");

    state = setStarRating(state, "threeStar", 0, new Date("2026-08-28T09:00:00Z"));
    expect(selectStarredQuestion([{ id: "threeStar" }], state, "all")).toBeUndefined();
  });
  it("accepts only starred-revision query filters", () => {
    expect(parseStarredRatingFilter("3")).toBe(3);
    expect(parseStarredRatingFilter("0")).toBeNull();
    expect(parseStarredRatingFilter("other")).toBeNull();
  });
});
