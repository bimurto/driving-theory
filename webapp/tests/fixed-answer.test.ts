import { describe, expect, it } from "vitest";
import { allQuestions, isValidNumericAnswer, matchesFixedAnswer, splitQuestionText } from "../lib/catalog";

describe("fixed numeric answers", () => {
  it("keeps no-option theory questions as dot-decimal fixed answers", () => {
    const question = allQuestions.find((item) => item.id === "2.7.05-108");

    expect(question?.options).toEqual([]);
    expect(question?.fixedAnswer).toBe("1.6");
  });

  it("accepts dot-decimal numeric equivalents but rejects commas and text", () => {
    expect(matchesFixedAnswer("1.60", "1.6")).toBe(true);
    expect(matchesFixedAnswer(" 1.6 ", "1.6")).toBe(true);
    expect(isValidNumericAnswer("1,6")).toBe(false);
    expect(isValidNumericAnswer("one point six")).toBe(false);
  });
});

describe("multi-line question text", () => {
  it("keeps a question prompt separate from its contextual continuation", () => {
    const question = allQuestions.find((item) => item.id === "1.1.02-040-M");

    expect(splitQuestionText(question?.text ?? "")).toEqual({
      prompt: "What must you be aware of?",
      context: ["The cyclist in front of me will"]
    });
  });
});
