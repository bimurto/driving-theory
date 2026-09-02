import { describe, expect, it } from "vitest";
import { getPracticeSessionProgress } from "../lib/practice-session";

describe("practice session progress", () => {
  it("counts unique theory questions viewed and keeps removed filtered questions in the session total", () => {
    expect(getPracticeSessionProgress(["a", "a", "b"], ["a", "b"])).toEqual({ viewed: 2, total: 2 });
    expect(getPracticeSessionProgress(["a", "b"], ["b"])).toEqual({ viewed: 2, total: 2 });
  });
});
