export type QuestionProgress = { attempts: number; correct: number; ease: number; intervalDays: number; nextReviewAt: string; lastAnsweredAt: string };
export type ProgressState = { version: 1; questions: Record<string, QuestionProgress> };
export const initialProgress = (): ProgressState => ({ version: 1, questions: {} });

export function updateProgress(state: ProgressState, questionId: string, isCorrect: boolean, now = new Date()): ProgressState {
  const current = state.questions[questionId];
  const ease = Math.min(3, Math.max(1.3, (current?.ease ?? 2.5) + (isCorrect ? 0.1 : -0.2)));
  const intervalDays = !current || !isCorrect ? 1 : Math.max(1, Math.floor(current.intervalDays * ease));
  const nextReviewAt = new Date(now.getTime() + intervalDays * 86_400_000).toISOString();
  return { ...state, questions: { ...state.questions, [questionId]: {
    attempts: (current?.attempts ?? 0) + 1, correct: (current?.correct ?? 0) + Number(isCorrect), ease, intervalDays,
    nextReviewAt, lastAnsweredAt: now.toISOString()
  } } };
}

export function isDue(item: QuestionProgress | undefined, now = new Date()) { return Boolean(item && new Date(item.nextReviewAt) <= now); }
export function selectQuestion<T extends { id: string }>(questions: T[], progress: ProgressState, now = new Date()): T | undefined {
  const due = questions.filter((question) => isDue(progress.questions[question.id], now));
  const unseen = questions.filter((question) => !progress.questions[question.id]);
  const pool = due.length ? due : unseen.length ? unseen : questions;
  return pool[Math.floor(Math.random() * pool.length)];
}
