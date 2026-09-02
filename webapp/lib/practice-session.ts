export type PracticeRoundOutcomes = Record<string, boolean>;

export function getPracticeSessionProgress(historyQuestionIds: string[], poolQuestionIds: string[]) {
  const viewedQuestionIds = new Set(historyQuestionIds);
  const sessionQuestionIds = new Set([...historyQuestionIds, ...poolQuestionIds]);
  return { viewed: viewedQuestionIds.size, total: sessionQuestionIds.size };
}

export function recordPracticeRoundOutcome(outcomes: PracticeRoundOutcomes, questionId: string, correct: boolean): PracticeRoundOutcomes {
  return { ...outcomes, [questionId]: correct };
}

export function isPracticeRoundComplete(questionIds: string[], outcomes: PracticeRoundOutcomes) {
  return questionIds.length > 0 && questionIds.every((questionId) => outcomes[questionId] === true);
}

export function restartPracticeRound<T>(questionPool: T[], select: (questions: T[]) => T | undefined) {
  return {
    currentQuestion: select(questionPool),
    roundOutcomes: {} as PracticeRoundOutcomes,
  };
}
