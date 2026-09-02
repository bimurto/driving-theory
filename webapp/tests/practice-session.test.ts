import { describe, expect, it } from "vitest";
import { getPracticeSessionProgress, isPracticeRoundComplete, recordPracticeRoundOutcome, restartPracticeRound } from "../lib/practice-session";

describe("practice session progress", () => {
  it("counts unique theory questions viewed and keeps removed filtered questions in the session total", () => {
    expect(getPracticeSessionProgress(["a", "a", "b"], ["a", "b"])).toEqual({ viewed: 2, total: 2 });
    expect(getPracticeSessionProgress(["a", "b"], ["b"])).toEqual({ viewed: 2, total: 2 });
  });

  it("completes every new practice round independently of saved chapter coverage", () => {
    let round = {};
    round = recordPracticeRoundOutcome(round, "a", true);
    expect(isPracticeRoundComplete(["a", "b"], round)).toBe(false);

    round = recordPracticeRoundOutcome(round, "b", true);
    expect(isPracticeRoundComplete(["a", "b"], round)).toBe(true);

    const retryRound = recordPracticeRoundOutcome({}, "a", true);
    expect(isPracticeRoundComplete(["a", "b"], retryRound)).toBe(false);
    expect(isPracticeRoundComplete(["a", "b"], recordPracticeRoundOutcome(retryRound, "b", true))).toBe(true);
  });

  it("requires the latest round answer for every question to be correct", () => {
    let round = recordPracticeRoundOutcome({}, "a", true);
    round = recordPracticeRoundOutcome(round, "b", false);
    expect(isPracticeRoundComplete(["a", "b"], round)).toBe(false);

    round = recordPracticeRoundOutcome(round, "b", true);
    expect(isPracticeRoundComplete(["a", "b"], round)).toBe(true);

    round = recordPracticeRoundOutcome(round, "a", false);
    expect(isPracticeRoundComplete(["a", "b"], round)).toBe(false);
  });

  it("starts a question immediately when a covered chapter is practised again", () => {
    const questions = [{ id: "a" }, { id: "b" }];
    const restarted = restartPracticeRound(questions, (available) => available[0]);

    expect(restarted).toEqual({
      currentQuestion: questions[0],
      roundOutcomes: {},
    });
  });
});
