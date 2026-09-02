export function getPracticeSessionProgress(historyQuestionIds: string[], poolQuestionIds: string[]) {
  const viewedQuestionIds = new Set(historyQuestionIds);
  const sessionQuestionIds = new Set([...historyQuestionIds, ...poolQuestionIds]);
  return { viewed: viewedQuestionIds.size, total: sessionQuestionIds.size };
}
