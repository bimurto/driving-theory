import { describe, expect, it } from "vitest";
import { initialProgress, selectQuestion, updateProgress } from "../lib/progress";
describe("spaced repetition", () => {
  it("schedules first attempts for the next day", () => { const now = new Date("2026-08-28T10:00:00Z"); const result = updateProgress(initialProgress(), "a", true, now); expect(result.questions.a.intervalDays).toBe(1); expect(result.questions.a.nextReviewAt).toBe("2026-08-29T10:00:00.000Z"); });
  it("resets an incorrect repeat to one day", () => { const now = new Date("2026-08-28T10:00:00Z"); let state = updateProgress(initialProgress(), "a", true, now); state = updateProgress(state, "a", false, now); expect(state.questions.a.intervalDays).toBe(1); expect(state.questions.a.ease).toBe(2.4); });
  it("chooses due questions before unseen ones", () => { const state = initialProgress(); state.questions.due = { attempts:1, correct:1, ease:2.5, intervalDays:1, lastAnsweredAt:"2026-08-20T00:00:00.000Z", nextReviewAt:"2026-08-21T00:00:00.000Z" }; expect(selectQuestion([{id:"due"},{id:"new"}], state, new Date("2026-08-28"))?.id).toBe("due"); });
});
