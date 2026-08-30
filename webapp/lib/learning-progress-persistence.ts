import { initialProgress, type ProgressState } from "./progress";

export const synchronizationDelayMs = 60_000;

export type LearnerAccount = { id: string; email: string | null };

export type LocalLearningProgress = {
  load(): ProgressState;
  save(progress: ProgressState): void;
  reset?(): void;
};

export type LearningProgressGateway = {
  isConfigured(): boolean;
  currentLearnerAccount(): Promise<LearnerAccount | null>;
  requestEmailCode(email: string): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<LearnerAccount>;
  mergeLearningProgress(progress: ProgressState): Promise<ProgressState>;
  signOut(): Promise<void>;
  deleteLearnerAccount(): Promise<void>;
};

export type LearningProgressSyncState = "local" | "synchronized" | "pending" | "failed";

export type LearningProgressChange = {
  progress: ProgressState;
  syncState: LearningProgressSyncState;
};

export function createLearningProgressPersistence(local: LocalLearningProgress, gateway: LearningProgressGateway) {
  let learnerAccount: LearnerAccount | null = null;
  let syncState: LearningProgressSyncState = "local";
  let synchronizationTimer: ReturnType<typeof setTimeout> | null = null;
  let synchronizationInFlight: Promise<ProgressState> | null = null;
  let localRevision = 0;
  const listeners = new Set<(change: LearningProgressChange) => void>();

  function notify(progress = local.load()) {
    listeners.forEach((listener) => listener({ progress, syncState }));
  }

  function setSyncState(nextState: LearningProgressSyncState, progress = local.load()) {
    syncState = nextState;
    notify(progress);
  }

  async function synchronize() {
    if (synchronizationInFlight) return synchronizationInFlight;

    if (synchronizationTimer) {
      clearTimeout(synchronizationTimer);
      synchronizationTimer = null;
    }
    setSyncState("pending");
    const submittedProgress = local.load();
    const submittedRevision = localRevision;
    let retryAfterCurrentSynchronization = false;
    synchronizationInFlight = gateway.mergeLearningProgress(submittedProgress)
      .then((merged) => {
        if (localRevision === submittedRevision) {
          local.save(merged);
          setSyncState("synchronized", merged);
        } else {
          retryAfterCurrentSynchronization = true;
        }
        return merged;
      })
      .catch((error: unknown) => {
        retryAfterCurrentSynchronization = true;
        setSyncState("failed");
        throw error;
      })
      .finally(() => {
        synchronizationInFlight = null;
        if (retryAfterCurrentSynchronization) scheduleSynchronization(false);
      });
    return synchronizationInFlight;
  }

  function scheduleSynchronization(announcePending = true) {
    if (!learnerAccount || synchronizationTimer || synchronizationInFlight) return;
    if (announcePending) setSyncState("pending");
    synchronizationTimer = setTimeout(() => {
      synchronizationTimer = null;
      void synchronize().catch(() => undefined);
    }, synchronizationDelayMs);
  }

  function cancelScheduledSynchronization() {
    if (!synchronizationTimer) return;
    clearTimeout(synchronizationTimer);
    synchronizationTimer = null;
  }

  function resetLocalLearningProgress() {
    if (local.reset) local.reset();
    else local.save(initialProgress());
    localRevision += 1;
  }

  return {
    load: () => local.load(),
    save: async (progress: ProgressState) => {
      local.save(progress);
      localRevision += 1;
      scheduleSynchronization();
      notify(progress);
    },
    reset() {
      resetLocalLearningProgress();
      notify();
    },
    isConfigured: () => gateway.isConfigured(),
    async currentLearnerAccount() {
      learnerAccount = gateway.isConfigured() ? await gateway.currentLearnerAccount() : null;
      if (!learnerAccount) setSyncState("local");
      return learnerAccount;
    },
    requestEmailCode: (email: string) => gateway.requestEmailCode(email),
    synchronizeLearningProgress: synchronize,
    retrySynchronization: () => learnerAccount ? synchronize() : Promise.resolve(local.load()),
    syncState: () => syncState,
    isAuthenticated: () => Boolean(learnerAccount),
    subscribe(listener: (change: LearningProgressChange) => void) {
      listeners.add(listener);
      listener({ progress: local.load(), syncState });
      return () => listeners.delete(listener);
    },
    async verifyEmailCode(email: string, code: string) {
      learnerAccount = await gateway.verifyEmailCode(email, code);
      await synchronize();
      return learnerAccount;
    },
    async signOut() {
      await gateway.signOut();
      cancelScheduledSynchronization();
      learnerAccount = null;
      setSyncState("local");
    },
    async deleteLearnerAccount() {
      await gateway.deleteLearnerAccount();
      cancelScheduledSynchronization();
      learnerAccount = null;
      resetLocalLearningProgress();
      setSyncState("local");
    },
  };
}
