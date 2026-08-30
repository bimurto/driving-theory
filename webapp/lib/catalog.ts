import rawCatalog from "@/src/generated/catalog.json";

export type Question = {
  id: string; number: string; text: string; points: string; options: string[];
  correctAnswers: string[]; fixedAnswer: string | null; explanation: string; images: string[]; videos: string[]; sourceUrl: string;
};
export type Chapter = {
  slug: string; themeSlug: string; themeName: string; themeNumber: string;
  chapterName: string; chapterNumber: string; summary: string | null; questions: Question[];
};
export const catalog = rawCatalog as { generatedAt: string; chapters: Chapter[] };
export const allQuestions = catalog.chapters.flatMap((chapter) => chapter.questions.map((question) => ({ ...question, chapter })));
export const chapterBySlug = (slug: string) => catalog.chapters.find((chapter) => chapter.slug === slug);

const numericAnswer = /^\d+(?:\.\d+)?$/;
export const isValidNumericAnswer = (value: string) => numericAnswer.test(value.trim());
export const matchesFixedAnswer = (value: string, answer: string) => isValidNumericAnswer(value) && Number(value.trim()) === Number(answer);
