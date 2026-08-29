import type { ProgressState } from "./progress";

export type LearnerAccount = { id: string; email: string | null };

export type LocalLearningProgress = {
  load(): ProgressState;
  save(progress: ProgressState): void;
};

export type LearningProgressGateway = {
  isConfigured(): boolean;
  currentLearnerAccount(): Promise<LearnerAccount | null>;
  requestEmailCode(email: string): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<LearnerAccount>;
  mergeLearningProgress(progress: ProgressState): Promise<ProgressState>;
};

export function createLearningProgressPersistence(local: LocalLearningProgress, gateway: LearningProgressGateway) {
  return {
    load: () => local.load(),
    save: async (progress: ProgressState) => { local.save(progress); },
    isConfigured: () => gateway.isConfigured(),
    currentLearnerAccount: () => gateway.isConfigured() ? gateway.currentLearnerAccount() : Promise.resolve(null),
    requestEmailCode: (email: string) => gateway.requestEmailCode(email),
    async synchronizeLearningProgress() {
      const merged = await gateway.mergeLearningProgress(local.load());
      local.save(merged);
      return merged;
    },
    async verifyEmailCode(email: string, code: string) {
      const account = await gateway.verifyEmailCode(email, code);
      const merged = await this.synchronizeLearningProgress();
      return account;
    },
  };
}
