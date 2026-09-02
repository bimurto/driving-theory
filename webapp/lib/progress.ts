export type QuestionProgress = { attempts: number; correct: number; ease: number; intervalDays: number; nextReviewAt: string; lastAnsweredAt: string };
export type StarRating = 0 | 1 | 2 | 3;
export type StarredRatingFilter = 1 | 2 | 3 | "all";
export type StarRatingRecord = { rating: StarRating; changedAt: string };
export type QuestionNoteRecord = { text: string | null; changedAt: string };
export type FailedQuestionRecord = { failed: boolean; changedAt: string };
export type QuestionOutcome = "unseen" | "correct" | "failed" | "unknown";
export type ProgressState = { version: 1 | 2 | 3 | 4; questions: Record<string, QuestionProgress>; starRatings?: Record<string, StarRatingRecord>; questionNotes?: Record<string, QuestionNoteRecord>; failedQuestions?: Record<string, FailedQuestionRecord> };
export type FailedCapableProgress = { version: 4; questions: Record<string, QuestionProgress>; starRatings: Record<string, StarRatingRecord>; questionNotes: Record<string, QuestionNoteRecord>; failedQuestions: Record<string, FailedQuestionRecord> };
export type QuestionSetProgressSummary = {
  outcomes: Record<QuestionOutcome, number>;
  attempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
};

export const initialProgress = (): ProgressState => ({ version: 4, questions: {}, starRatings: {}, questionNotes: {}, failedQuestions: {} });

export function migrateLearningProgress(state: ProgressState): FailedCapableProgress {
  return { version: 4, questions: state.questions, starRatings: state.starRatings ?? {}, questionNotes: state.questionNotes ?? {}, failedQuestions: state.failedQuestions ?? {} };
}

export function setStarRating(state: ProgressState, questionId: string, rating: StarRating, now = new Date()): ProgressState {
  const progress = migrateLearningProgress(state);
  return { ...progress, starRatings: { ...progress.starRatings, [questionId]: { rating, changedAt: now.toISOString() } } };
}

export function setQuestionNote(state: ProgressState, questionId: string, text: string, now = new Date()): ProgressState {
  const progress = migrateLearningProgress(state);
  const normalizedText = text.trim() ? text : null;
  return { ...progress, questionNotes: { ...progress.questionNotes, [questionId]: { text: normalizedText, changedAt: now.toISOString() } } };
}

export function updateProgress(state: ProgressState, questionId: string, isCorrect: boolean, now = new Date()): ProgressState {
  const progress = migrateLearningProgress(state);
  const current = progress.questions[questionId];
  const ease = Math.min(3, Math.max(1.3, (current?.ease ?? 2.5) + (isCorrect ? 0.1 : -0.2)));
  const intervalDays = !current || !isCorrect ? 1 : Math.max(1, Math.floor(current.intervalDays * ease));
  const nextReviewAt = new Date(now.getTime() + intervalDays * 86_400_000).toISOString();
  return { ...progress, questions: { ...progress.questions, [questionId]: {
    attempts: (current?.attempts ?? 0) + 1, correct: (current?.correct ?? 0) + Number(isCorrect), ease, intervalDays,
    nextReviewAt, lastAnsweredAt: now.toISOString()
  } }, failedQuestions: { ...progress.failedQuestions, [questionId]: { failed: !isCorrect, changedAt: now.toISOString() } } };
}

export function getQuestionOutcome(state: ProgressState, questionId: string): QuestionOutcome {
  const history = state.questions[questionId];
  if (!history) return "unseen";

  const latestOutcome = state.failedQuestions?.[questionId];
  if (latestOutcome) return latestOutcome.failed ? "failed" : "correct";

  // Older snapshots did not store the latest answer outcome. Uniform answer
  // histories are unambiguous; mixed histories must be answered again before
  // they can safely be treated as currently correct or failed.
  if (history.correct === 0) return "failed";
  if (history.correct === history.attempts) return "correct";
  return "unknown";
}

export function summarizeQuestionSet<T extends { id: string }>(questions: T[], state: ProgressState): QuestionSetProgressSummary {
  return questions.reduce<QuestionSetProgressSummary>((summary, question) => {
    const outcome = getQuestionOutcome(state, question.id);
    const history = state.questions[question.id];
    summary.outcomes[outcome] += 1;
    summary.attempts += history?.attempts ?? 0;
    summary.correctAttempts += history?.correct ?? 0;
    summary.incorrectAttempts += (history?.attempts ?? 0) - (history?.correct ?? 0);
    return summary;
  }, {
    outcomes: { unseen: 0, correct: 0, failed: 0, unknown: 0 },
    attempts: 0,
    correctAttempts: 0,
    incorrectAttempts: 0,
  });
}

export function isQuestionSetComplete<T extends { id: string }>(questions: T[], state: ProgressState) {
  return questions.length > 0 && questions.every((question) => getQuestionOutcome(state, question.id) === "correct");
}

export function isFailedQuestion(state: ProgressState, questionId: string) { return getQuestionOutcome(state, questionId) === "failed"; }

export function isDue(item: QuestionProgress | undefined, now = new Date()) { return Boolean(item && new Date(item.nextReviewAt) <= now); }
export function selectQuestion<T extends { id: string }>(questions: T[], progress: ProgressState, now = new Date()): T | undefined {
  const due = questions.filter((question) => isDue(progress.questions[question.id], now));
  const unseen = questions.filter((question) => !progress.questions[question.id]);
  const pool = due.length ? due : unseen.length ? unseen : questions;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function parseStarredRatingFilter(value: string | null): StarredRatingFilter | null {
  if (value === "all") return value;
  if (value === "1" || value === "2" || value === "3") return Number(value) as Exclude<StarredRatingFilter, "all">;
  return null;
}

export function selectStarredQuestion<T extends { id: string }>(questions: T[], progress: ProgressState, rating: StarredRatingFilter, now = new Date()): T | undefined {
  const starred = questions.filter((question) => {
    const questionRating = progress.starRatings?.[question.id]?.rating ?? 0;
    return questionRating > 0 && (rating === "all" || questionRating === rating);
  });
  if (!starred.length) return undefined;
  const highestRating = Math.max(...starred.map((question) => progress.starRatings?.[question.id]?.rating ?? 0));
  return selectQuestion(starred.filter((question) => progress.starRatings?.[question.id]?.rating === highestRating), progress, now);
}
