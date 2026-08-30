import { describe, expect, it } from "vitest";
import { allQuestions, isValidNumericAnswer, matchesFixedAnswer } from "../lib/catalog";

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
