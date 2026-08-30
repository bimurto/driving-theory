"use client";
import { initialProgress, migrateLearningProgress, type ProgressState } from "./progress";
const KEY = "driving-theory-progress-v1";

export function parseStoredProgress(data: unknown): ProgressState {
  const progress = data as ProgressState | null;
  return progress?.questions && (progress.version === 1 || progress.version === 2 || progress.version === 3) ? migrateLearningProgress(progress) : initialProgress();
}

export function loadProgress(): ProgressState {
  try {
    const value = window.localStorage.getItem(KEY);
    return parseStoredProgress(value && JSON.parse(value));
  }
  catch { return initialProgress(); }
}
export function saveProgress(value: ProgressState) { window.localStorage.setItem(KEY, JSON.stringify(value)); }
export function resetProgress() { window.localStorage.removeItem(KEY); }
