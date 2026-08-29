"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createLearningProgressPersistence, type LearnerAccount, type LearningProgressSyncState } from "@/lib/learning-progress-persistence";
import type { ProgressState } from "@/lib/progress";
import { loadProgress, resetProgress, saveProgress } from "@/lib/storage";
import { createSupabaseLearningProgressGateway } from "@/lib/supabase-learning-progress-gateway";

type LearningProgressContextValue = {
  progress: ProgressState | null;
  account: LearnerAccount | null;
  accountsConfigured: boolean;
  error: string | null;
  syncState: LearningProgressSyncState;
  saveLearningProgress(progress: ProgressState): Promise<void>;
  resetLearningProgress(): void;
  requestEmailCode(email: string): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<void>;
};

const LearningProgressContext = createContext<LearningProgressContextValue | null>(null);

function message() { return "We couldn't complete that request. Please try again."; }

export function LearningProgressProvider({ children }: { children: ReactNode }) {
  const persistence = useMemo(() => createLearningProgressPersistence({ load: loadProgress, save: saveProgress, reset: resetProgress }, createSupabaseLearningProgressGateway()), []);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [account, setAccount] = useState<LearnerAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<LearningProgressSyncState>("local");

  useEffect(() => {
    let active = true;
    const unsubscribe = persistence.subscribe(({ progress: currentProgress, syncState: currentSyncState }) => {
      if (!active) return;
      setProgress(currentProgress);
      setSyncState(currentSyncState);
    });
    const retryWhenOnline = () => { void persistence.retrySynchronization().catch(() => undefined); };
    window.addEventListener("online", retryWhenOnline);
    void persistence.currentLearnerAccount().then(async (currentAccount) => {
      if (!active || !currentAccount) return;
      setAccount(currentAccount);
      await persistence.synchronizeLearningProgress();
    }).catch(() => { if (active) setError(message()); });
    return () => { active = false; unsubscribe(); window.removeEventListener("online", retryWhenOnline); };
  }, [persistence]);

  async function saveLearningProgress(nextProgress: ProgressState) {
    await persistence.save(nextProgress);
    setProgress(nextProgress);
  }

  function resetLearningProgress() {
    persistence.reset();
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

  return <LearningProgressContext.Provider value={{ progress, account, accountsConfigured: persistence.isConfigured(), error, syncState, saveLearningProgress, resetLearningProgress, requestEmailCode, verifyEmailCode }}>{children}</LearningProgressContext.Provider>;
}

export function useLearningProgress() {
  const value = useContext(LearningProgressContext);
  if (!value) throw new Error("useLearningProgress must be used within LearningProgressProvider");
  return value;
}
