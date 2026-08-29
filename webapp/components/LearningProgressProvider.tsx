"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createLearningProgressPersistence, type LearnerAccount } from "@/lib/learning-progress-persistence";
import { initialProgress, type ProgressState } from "@/lib/progress";
import { loadProgress, resetProgress, saveProgress } from "@/lib/storage";
import { createSupabaseLearningProgressGateway } from "@/lib/supabase-learning-progress-gateway";

type LearningProgressContextValue = {
  progress: ProgressState | null;
  account: LearnerAccount | null;
  accountsConfigured: boolean;
  error: string | null;
  saveLearningProgress(progress: ProgressState): Promise<void>;
  resetLearningProgress(): void;
  requestEmailCode(email: string): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<void>;
};

const LearningProgressContext = createContext<LearningProgressContextValue | null>(null);

function message() { return "We couldn't complete that request. Please try again."; }

export function LearningProgressProvider({ children }: { children: ReactNode }) {
  const persistence = useMemo(() => createLearningProgressPersistence({ load: loadProgress, save: saveProgress }, createSupabaseLearningProgressGateway()), []);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [account, setAccount] = useState<LearnerAccount | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setProgress(persistence.load());
    void persistence.currentLearnerAccount().then(async (currentAccount) => {
      if (!active || !currentAccount) return;
      setAccount(currentAccount);
      const merged = await persistence.synchronizeLearningProgress();
      if (active) setProgress(merged);
    }).catch(() => { if (active) setError(message()); });
    return () => { active = false; };
  }, [persistence]);

  async function saveLearningProgress(nextProgress: ProgressState) {
    await persistence.save(nextProgress);
    setProgress(nextProgress);
  }

  function resetLearningProgress() {
    resetProgress();
    setProgress(initialProgress());
  }

  async function requestEmailCode(email: string) {
    setError(null);
    try { await persistence.requestEmailCode(email); }
    catch { const nextError = message(); setError(nextError); throw new Error(nextError); }
  }

  async function verifyEmailCode(email: string, code: string) {
    setError(null);
    try {
      const nextAccount = await persistence.verifyEmailCode(email, code);
      setAccount(nextAccount);
      setProgress(persistence.load());
    } catch {
      const recoveredAccount = await persistence.currentLearnerAccount();
      if (recoveredAccount) setAccount(recoveredAccount);
      const nextError = "You are signed in, but we couldn't merge your learning progress yet. Please try again shortly.";
      setError(nextError);
      throw new Error(nextError);
    }
  }

  return <LearningProgressContext.Provider value={{ progress, account, accountsConfigured: persistence.isConfigured(), error, saveLearningProgress, resetLearningProgress, requestEmailCode, verifyEmailCode }}>{children}</LearningProgressContext.Provider>;
}

export function useLearningProgress() {
  const value = useContext(LearningProgressContext);
  if (!value) throw new Error("useLearningProgress must be used within LearningProgressProvider");
  return value;
}
