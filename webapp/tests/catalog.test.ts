import { describe, expect, it } from "vitest";
import { allQuestions, matchesCorrectOptions } from "../lib/catalog";

describe("question catalog options", () => {
  it("maps image-only answers to distinct, stable options", () => {
    const question = allQuestions.find((item) => item.id === "1.4.41-175");

    expect(question?.options).toEqual([
      { id: "A.", label: "A", text: "", imageUrl: "https://storage.googleapis.com/theory-svc-production-media/media/de/2025-04-01/1.4.41-175_a1.png" },
      { id: "B.", label: "B", text: "", imageUrl: "https://storage.googleapis.com/theory-svc-production-media/media/de/2025-04-01/1.4.41-175_a2.png" },
      { id: "C.", label: "C", text: "", imageUrl: "https://storage.googleapis.com/theory-svc-production-media/media/de/2025-04-01/1.4.41-175_a3.png" },
    ]);
    expect(question?.correctOptionIds).toEqual(["A."]);
  });

  it("matches multi-correct image answers by their option IDs", () => {
    const question = allQuestions.find((item) => item.id === "1.4.41-174");

    expect(question?.correctOptionIds).toEqual(["A.", "B.", "C."]);
    expect(matchesCorrectOptions(["A.", "B.", "C."], question?.correctOptionIds ?? [])).toBe(true);
    expect(matchesCorrectOptions(["A.", "B."], question?.correctOptionIds ?? [])).toBe(false);
  });

  it("keeps text options free of image URLs", () => {
    const question = allQuestions.find((item) => item.options.length > 0 && item.options.every((option) => option.text) && item.options.every((option) => !option.imageUrl));

    expect(question).toBeDefined();
    expect(question?.options.every((option) => Boolean(option.id && option.label && option.text) && option.imageUrl === null)).toBe(true);
  });
});
