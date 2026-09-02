import { describe, expect, it } from "vitest";
import { getAdjacentChapters, getChapterProgress, getDueQuestions, getRecommendedChapter } from "../lib/chapter-progression";
import type { Chapter } from "../lib/catalog";
import { initialProgress, updateProgress } from "../lib/progress";

function chapter(slug: string, questionIds: string[]): Chapter {
  return {
    slug,
    themeSlug: "theme",
    themeName: "Theme",
    themeNumber: "1",
    chapterName: `Chapter ${slug}`,
    chapterNumber: slug,
    summary: "Guide",
    questions: questionIds.map((id) => ({
      id,
      number: id,
      text: id,
      points: "2",
      options: [],
      correctAnswers: [],
      fixedAnswer: null,
      explanation: "",
      images: [],
      videos: [],
      sourceUrl: "https://example.com",
    })),
  };
}

const chapters = [chapter("1.1", ["a", "b"]), chapter("1.3", ["c"]), chapter("2.1", ["d"])];

describe("chapter progression", () => {
  it("starts at the first catalogue chapter and follows catalogue gaps", () => {
    expect(getRecommendedChapter(chapters, initialProgress())).toMatchObject({ kind: "chapter", reason: "start", chapter: { slug: "1.1" } });
    expect(getAdjacentChapters(chapters, "1.1")).toEqual({ previous: null, next: chapters[1] });
    expect(getAdjacentChapters(chapters, "1.3")).toEqual({ previous: chapters[0], next: chapters[2] });
    expect(getAdjacentChapters(chapters, "2.1")).toEqual({ previous: chapters[1], next: null });
  });

  it("keeps scheduled review separate from covered status", () => {
    let progress = updateProgress(initialProgress(), "a", true, new Date("2026-08-20T08:00:00Z"));
    progress = updateProgress(progress, "b", true, new Date("2026-08-20T09:00:00Z"));
    const summary = getChapterProgress(chapters[0], progress, new Date("2026-09-02T08:00:00Z"));

    expect(summary.status).toBe("covered");
    expect(summary.dueCount).toBe(2);
  });

  it("summarizes current outcomes, lifetime attempts, due work, and chapter status separately", () => {
    let progress = updateProgress(initialProgress(), "a", true, new Date("2026-08-20T08:00:00Z"));
    progress = updateProgress(progress, "a", false, new Date("2026-08-21T08:00:00Z"));
    const summary = getChapterProgress(chapters[0], progress, new Date("2026-09-02T08:00:00Z"));

    expect(summary.status).toBe("in-progress");
    expect(summary.questionProgress.outcomes).toEqual({ correct: 0, failed: 1, unseen: 1, unknown: 0 });
    expect(summary.questionProgress.attempts).toBe(2);
    expect(summary.dueCount).toBe(1);
    expect(summary.latestActivityAt).toBe("2026-08-21T08:00:00.000Z");
  });

  it("resumes the most recently active incomplete chapter", () => {
    let progress = updateProgress(initialProgress(), "a", true, new Date("2026-08-20T08:00:00Z"));
    progress = updateProgress(progress, "c", false, new Date("2026-08-21T08:00:00Z"));

    expect(getRecommendedChapter(chapters, progress)).toMatchObject({ kind: "chapter", reason: "resume", chapter: { slug: "1.3" } });
  });

  it("moves forward after coverage and wraps to an earlier uncovered chapter", () => {
    let progress = updateProgress(initialProgress(), "a", true, new Date("2026-08-20T08:00:00Z"));
    progress = updateProgress(progress, "b", true, new Date("2026-08-20T09:00:00Z"));
    expect(getRecommendedChapter(chapters, progress)).toMatchObject({ kind: "chapter", reason: "next", chapter: { slug: "1.3" } });

    progress = updateProgress(progress, "d", true, new Date("2026-08-21T09:00:00Z"));
    expect(getRecommendedChapter(chapters, progress)).toMatchObject({ kind: "chapter", reason: "next", chapter: { slug: "1.3" } });
  });

  it("uses catalogue order for equal activity timestamps and reports all chapters covered", () => {
    let progress = updateProgress(initialProgress(), "a", true, new Date("2026-08-20T08:00:00Z"));
    progress = updateProgress(progress, "c", false, new Date("2026-08-20T08:00:00Z"));
    expect(getRecommendedChapter(chapters, progress)).toMatchObject({ kind: "chapter", reason: "resume", chapter: { slug: "1.1" } });

    progress = updateProgress(progress, "b", true, new Date("2026-08-21T08:00:00Z"));
    progress = updateProgress(progress, "c", true, new Date("2026-08-22T08:00:00Z"));
    progress = updateProgress(progress, "d", true, new Date("2026-08-23T08:00:00Z"));
    expect(getRecommendedChapter(chapters, progress)).toEqual({ kind: "all-covered" });
  });

  it("selects only due theory questions", () => {
    let progress = updateProgress(initialProgress(), "a", true, new Date("2026-08-20T08:00:00Z"));
    progress = updateProgress(progress, "b", true, new Date("2026-09-02T08:00:00Z"));

    expect(getDueQuestions(chapters[0].questions, progress, new Date("2026-09-02T10:00:00Z")).map((question) => question.id)).toEqual(["a"]);
  });
});
