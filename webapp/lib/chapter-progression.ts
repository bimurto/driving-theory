import type { Chapter } from "@/lib/catalog";
import { isDue, isQuestionSetComplete, summarizeQuestionSet, type ProgressState, type QuestionSetProgressSummary } from "@/lib/progress";

export type ChapterLearningStatus = "not-started" | "in-progress" | "covered";

export type ChapterProgressSummary = {
  status: ChapterLearningStatus;
  questionProgress: QuestionSetProgressSummary;
  dueCount: number;
  latestActivityAt: string | null;
};

export type ChapterRecommendation =
  | { kind: "chapter"; chapter: Chapter; reason: "start" | "resume" | "next" }
  | { kind: "all-covered" };

export function getChapterProgress(chapter: Chapter, progress: ProgressState, now = new Date()): ChapterProgressSummary {
  const questionProgress = summarizeQuestionSet(chapter.questions, progress);
  const latestActivityAt = chapter.questions.reduce<string | null>((latest, question) => {
    const answeredAt = progress.questions[question.id]?.lastAnsweredAt;
    return answeredAt && (!latest || answeredAt > latest) ? answeredAt : latest;
  }, null);
  const dueCount = chapter.questions.filter((question) => isDue(progress.questions[question.id], now)).length;
  const status = questionProgress.attempts === 0
    ? "not-started"
    : isQuestionSetComplete(chapter.questions, progress) ? "covered" : "in-progress";

  return { status, questionProgress, dueCount, latestActivityAt };
}

export function getRecommendedChapter(chapters: Chapter[], progress: ProgressState, now = new Date()): ChapterRecommendation {
  if (!chapters.length) return { kind: "all-covered" };

  const summaries = chapters.map((chapter) => getChapterProgress(chapter, progress, now));
  const activeIndex = summaries.reduce((latestIndex, summary, index) => {
    if (!summary.latestActivityAt) return latestIndex;
    if (latestIndex === -1) return index;
    return summary.latestActivityAt > (summaries[latestIndex].latestActivityAt ?? "") ? index : latestIndex;
  }, -1);

  if (activeIndex === -1) return { kind: "chapter", chapter: chapters[0], reason: "start" };
  if (summaries[activeIndex].status !== "covered") {
    return { kind: "chapter", chapter: chapters[activeIndex], reason: "resume" };
  }

  for (let offset = 1; offset < chapters.length; offset += 1) {
    const candidateIndex = (activeIndex + offset) % chapters.length;
    if (summaries[candidateIndex].status !== "covered") {
      return { kind: "chapter", chapter: chapters[candidateIndex], reason: "next" };
    }
  }

  return { kind: "all-covered" };
}

export function getAdjacentChapters(chapters: Chapter[], chapterSlug: string) {
  const index = chapters.findIndex((chapter) => chapter.slug === chapterSlug);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: index > 0 ? chapters[index - 1] : null,
    next: index < chapters.length - 1 ? chapters[index + 1] : null,
  };
}

export function getDueQuestions<T extends { id: string }>(questions: T[], progress: ProgressState, now = new Date()) {
  return questions.filter((question) => isDue(progress.questions[question.id], now));
}
