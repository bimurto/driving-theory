"use client";
import { initialProgress, migrateLearningProgress, type ProgressState } from "./progress";
const KEY = "driving-theory-progress-v1";
export function loadProgress(): ProgressState {
  try {
    const value = window.localStorage.getItem(KEY);
    const data = value && JSON.parse(value);
    return data?.questions && (data.version === 1 || data.version === 2) ? migrateLearningProgress(data) : initialProgress();
  }
  catch { return initialProgress(); }
}
export function saveProgress(value: ProgressState) { window.localStorage.setItem(KEY, JSON.stringify(value)); }
export function resetProgress() { window.localStorage.removeItem(KEY); }
