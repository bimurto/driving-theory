import { describe, expect, it } from "vitest";
import { createLearningProgressPersistence, type LearningProgressGateway } from "../lib/learning-progress-persistence";
import { initialProgress, type ProgressState } from "../lib/progress";

function gateway(overrides: Partial<LearningProgressGateway> = {}): LearningProgressGateway {
  return {
    isConfigured: () => true,
    currentLearnerAccount: async () => null,
    requestEmailCode: async () => undefined,
    verifyEmailCode: async () => ({ id: "learner-1", email: "learner@example.test" }),
    mergeLearningProgress: async (progress) => progress,
    ...overrides,
  };
}

describe("learning-progress persistence", () => {
  it("keeps guest learning progress local", async () => {
    let saved = initialProgress();
    const persistence = createLearningProgressPersistence({ load: () => saved, save: (progress) => { saved = progress; } }, gateway({ isConfigured: () => false }));
    const progress: ProgressState = { version: 1, questions: { question: { attempts: 1, correct: 1, ease: 2.6, intervalDays: 1, nextReviewAt: "2026-09-01T10:00:00.000Z", lastAnsweredAt: "2026-08-31T10:00:00.000Z" } } };

    await persistence.save(progress);

    expect(saved).toEqual(progress);
    expect(await persistence.currentLearnerAccount()).toBeNull();
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
});
