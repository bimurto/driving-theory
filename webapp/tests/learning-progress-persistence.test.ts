import { afterEach, describe, expect, it, vi } from "vitest";
import { createLearningProgressPersistence, type LearningProgressGateway } from "../lib/learning-progress-persistence";
import { initialProgress, type ProgressState } from "../lib/progress";

function gateway(overrides: Partial<LearningProgressGateway> = {}): LearningProgressGateway {
  return {
    isConfigured: () => true,
    currentLearnerAccount: async () => null,
    requestEmailCode: async () => undefined,
    verifyEmailCode: async () => ({ id: "learner-1", email: "learner@example.test" }),
    mergeLearningProgress: async (progress) => progress,
    signOut: async () => undefined,
    deleteLearnerAccount: async () => undefined,
    ...overrides,
  };
}

describe("learning-progress persistence", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps guest learning progress local", async () => {
    let saved = initialProgress();
    const persistence = createLearningProgressPersistence({ load: () => saved, save: (progress) => { saved = progress; } }, gateway({ isConfigured: () => false }));
    const progress: ProgressState = { version: 1, questions: { question: { attempts: 1, correct: 1, ease: 2.6, intervalDays: 1, nextReviewAt: "2026-09-01T10:00:00.000Z", lastAnsweredAt: "2026-08-31T10:00:00.000Z" } } };

    await persistence.save(progress);

    expect(saved).toEqual(progress);
    expect(await persistence.currentLearnerAccount()).toBeNull();
  });

  it("resets browser learning progress through the persistence seam", () => {
    const progress: ProgressState = { version: 1, questions: { question: { attempts: 1, correct: 1, ease: 2.6, intervalDays: 1, nextReviewAt: "2026-09-01T10:00:00.000Z", lastAnsweredAt: "2026-08-31T10:00:00.000Z" } } };
    let saved = progress;
    const persistence = createLearningProgressPersistence({ load: () => saved, save: (nextProgress) => { saved = nextProgress; }, reset: () => { saved = initialProgress(); } }, gateway({ isConfigured: () => false }));

    persistence.reset();

    expect(saved).toEqual(initialProgress());
    expect(persistence.load()).toEqual(initialProgress());
  });

  it("signs out while preserving browser learning progress for guest practice", async () => {
    const progress: ProgressState = { version: 1, questions: { question: { attempts: 1, correct: 1, ease: 2.6, intervalDays: 1, nextReviewAt: "2026-09-01T10:00:00.000Z", lastAnsweredAt: "2026-08-31T10:00:00.000Z" } } };
    let saved = progress;
    let signedOut = false;
    const persistence = createLearningProgressPersistence({ load: () => saved, save: (nextProgress) => { saved = nextProgress; } }, gateway({ currentLearnerAccount: async () => ({ id: "learner-1", email: "learner@example.test" }), signOut: async () => { signedOut = true; } }));

    await persistence.currentLearnerAccount();
    await persistence.signOut();

    expect(signedOut).toBe(true);
    expect(persistence.isAuthenticated()).toBe(false);
    expect(persistence.load()).toEqual(progress);
  });

  it("deletes the learner account and clears the merged browser learning progress", async () => {
    const progress: ProgressState = { version: 1, questions: { question: { attempts: 1, correct: 1, ease: 2.6, intervalDays: 1, nextReviewAt: "2026-09-01T10:00:00.000Z", lastAnsweredAt: "2026-08-31T10:00:00.000Z" } } };
    let saved = progress;
    let deleted = false;
    const persistence = createLearningProgressPersistence({ load: () => saved, save: (nextProgress) => { saved = nextProgress; }, reset: () => { saved = initialProgress(); } }, gateway({ currentLearnerAccount: async () => ({ id: "learner-1", email: "learner@example.test" }), deleteLearnerAccount: async () => { deleted = true; } }));

    await persistence.currentLearnerAccount();
    await persistence.deleteLearnerAccount();

    expect(deleted).toBe(true);
    expect(persistence.isAuthenticated()).toBe(false);
    expect(saved).toEqual(initialProgress());
  });

  it("merges existing browser learning progress after email-code verification", async () => {
    const local: ProgressState = { version: 1, questions: { local: { attempts: 2, correct: 1, ease: 2.4, intervalDays: 1, nextReviewAt: "2026-09-01T10:00:00.000Z", lastAnsweredAt: "2026-08-31T10:00:00.000Z" } } };
    const merged: ProgressState = { version: 1, questions: { ...local.questions, cloud: { attempts: 3, correct: 3, ease: 2.8, intervalDays: 4, nextReviewAt: "2026-09-04T10:00:00.000Z", lastAnsweredAt: "2026-09-01T10:00:00.000Z" } } };
    let saved = local;
    let submitted: ProgressState | undefined;
    const persistence = createLearningProgressPersistence({ load: () => saved, save: (progress) => { saved = progress; } }, gateway({ mergeLearningProgress: async (progress) => { submitted = progress; return merged; } }));

    const account = await persistence.verifyEmailCode("learner@example.test", "123456");

    expect(account).toEqual({ id: "learner-1", email: "learner@example.test" });
    expect(submitted).toEqual(local);
    expect(saved).toEqual(merged);
  });

  it("synchronizes browser learning progress for a returning learner account", async () => {
    const local: ProgressState = { version: 1, questions: {} };
    const cloud: ProgressState = { version: 1, questions: { cloud: { attempts: 1, correct: 1, ease: 2.6, intervalDays: 1, nextReviewAt: "2026-09-01T10:00:00.000Z", lastAnsweredAt: "2026-08-31T10:00:00.000Z" } } };
    let saved = local;
    const persistence = createLearningProgressPersistence({ load: () => saved, save: (progress) => { saved = progress; } }, gateway({ currentLearnerAccount: async () => ({ id: "learner-1", email: "learner@example.test" }), mergeLearningProgress: async () => cloud }));

    const synchronized = await persistence.synchronizeLearningProgress();

    expect(synchronized).toEqual(cloud);
    expect(saved).toEqual(cloud);
  });

  it("keeps an initial merge idempotent when it is retried", async () => {
    const merged: ProgressState = { version: 1, questions: { question: { attempts: 2, correct: 2, ease: 2.7, intervalDays: 2, nextReviewAt: "2026-09-02T10:00:00.000Z", lastAnsweredAt: "2026-08-31T10:00:00.000Z" } } };
    let saved = initialProgress();
    const persistence = createLearningProgressPersistence({ load: () => saved, save: (progress) => { saved = progress; } }, gateway({ mergeLearningProgress: async () => merged }));

    await persistence.synchronizeLearningProgress();
    await persistence.synchronizeLearningProgress();

    expect(saved).toEqual(merged);
  });

  it("saves answered theory-question progress locally before a coalesced background synchronization", async () => {
    vi.useFakeTimers();
    const progress: ProgressState = { version: 1, questions: { question: { attempts: 1, correct: 1, ease: 2.6, intervalDays: 1, nextReviewAt: "2026-09-01T10:00:00.000Z", lastAnsweredAt: "2026-08-31T10:00:00.000Z" } } };
    let saved = initialProgress();
    let submitted: ProgressState | undefined;
    const persistence = createLearningProgressPersistence({ load: () => saved, save: (nextProgress) => { saved = nextProgress; } }, gateway({ currentLearnerAccount: async () => ({ id: "learner-1", email: "learner@example.test" }), mergeLearningProgress: async (nextProgress) => { submitted = nextProgress; return nextProgress; } }));

    await persistence.currentLearnerAccount();
    await persistence.save(progress);

    expect(saved).toEqual(progress);
    expect(persistence.syncState()).toBe("pending");
    expect(submitted).toBeUndefined();

    await vi.advanceTimersByTimeAsync(250);

    expect(submitted).toEqual(progress);
    expect(persistence.syncState()).toBe("synchronized");
  });

  it("retries failed synchronization without discarding locally saved learning progress", async () => {
    const progress: ProgressState = { version: 1, questions: { question: { attempts: 1, correct: 0, ease: 2.3, intervalDays: 1, nextReviewAt: "2026-09-01T10:00:00.000Z", lastAnsweredAt: "2026-08-31T10:00:00.000Z" } } };
    let saved = progress;
    let attempts = 0;
    const persistence = createLearningProgressPersistence({ load: () => saved, save: (nextProgress) => { saved = nextProgress; } }, gateway({ currentLearnerAccount: async () => ({ id: "learner-1", email: "learner@example.test" }), mergeLearningProgress: async (nextProgress) => { attempts += 1; if (attempts === 1) throw new Error("offline"); return nextProgress; } }));

    await persistence.currentLearnerAccount();
    await expect(persistence.synchronizeLearningProgress()).rejects.toThrow("offline");

    expect(saved).toEqual(progress);
    expect(persistence.syncState()).toBe("failed");

    await persistence.retrySynchronization();

    expect(attempts).toBe(2);
    expect(persistence.syncState()).toBe("synchronized");
  });

  it("keeps a newer local answer when an earlier synchronization finishes", async () => {
    vi.useFakeTimers();
    const first: ProgressState = { version: 1, questions: { question: { attempts: 1, correct: 1, ease: 2.6, intervalDays: 1, nextReviewAt: "2026-09-01T10:00:00.000Z", lastAnsweredAt: "2026-08-31T10:00:00.000Z" } } };
    const second: ProgressState = { version: 1, questions: { question: { ...first.questions.question, attempts: 2, correct: 1, lastAnsweredAt: "2026-08-31T10:01:00.000Z" } } };
    let saved = initialProgress();
    let resolveFirstMerge: ((progress: ProgressState) => void) | undefined;
    const submitted: ProgressState[] = [];
    const persistence = createLearningProgressPersistence({ load: () => saved, save: (nextProgress) => { saved = nextProgress; } }, gateway({ currentLearnerAccount: async () => ({ id: "learner-1", email: "learner@example.test" }), mergeLearningProgress: async (nextProgress) => {
      submitted.push(nextProgress);
      if (submitted.length === 1) return new Promise<ProgressState>((resolve) => { resolveFirstMerge = resolve; });
      return nextProgress;
    } }));

    await persistence.currentLearnerAccount();
    await persistence.save(first);
    vi.advanceTimersByTime(250);
    await Promise.resolve();
    await persistence.save(second);
    resolveFirstMerge?.(first);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(250);

    expect(submitted).toEqual([first, second]);
    expect(saved).toEqual(second);
    expect(persistence.syncState()).toBe("synchronized");
  });

  it("retries a newer local answer after the synchronization already in flight fails", async () => {
    vi.useFakeTimers();
    const first: ProgressState = { version: 1, questions: { question: { attempts: 1, correct: 1, ease: 2.6, intervalDays: 1, nextReviewAt: "2026-09-01T10:00:00.000Z", lastAnsweredAt: "2026-08-31T10:00:00.000Z" } } };
    const second: ProgressState = { version: 1, questions: { question: { ...first.questions.question, attempts: 2, correct: 1, lastAnsweredAt: "2026-08-31T10:01:00.000Z" } } };
    let saved = initialProgress();
    let rejectFirstMerge: ((error: Error) => void) | undefined;
    const submitted: ProgressState[] = [];
    const persistence = createLearningProgressPersistence({ load: () => saved, save: (nextProgress) => { saved = nextProgress; } }, gateway({ currentLearnerAccount: async () => ({ id: "learner-1", email: "learner@example.test" }), mergeLearningProgress: async (nextProgress) => {
      submitted.push(nextProgress);
      if (submitted.length === 1) return new Promise<ProgressState>((_, reject) => { rejectFirstMerge = reject; });
      return nextProgress;
    } }));

    await persistence.currentLearnerAccount();
    await persistence.save(first);
    vi.advanceTimersByTime(250);
    await Promise.resolve();
    await persistence.save(second);
    rejectFirstMerge?.(new Error("offline"));
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(250);

    expect(submitted).toEqual([first, second]);
    expect(saved).toEqual(second);
    expect(persistence.syncState()).toBe("synchronized");
  });
});
