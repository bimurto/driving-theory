"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { LearningProgressGateway, LearnerAccount } from "./learning-progress-persistence";
import type { ProgressState } from "./progress";

function configuredClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? createClient(url, key) : null;
}

function learnerAccount(user: { id: string; email?: string | null }): LearnerAccount {
  return { id: user.id, email: user.email ?? null };
}

function unavailable(): never { throw new Error("Learner accounts are not configured for this deployment."); }

export function createSupabaseLearningProgressGateway(client: SupabaseClient | null = configuredClient()): LearningProgressGateway {
  return {
    isConfigured: () => Boolean(client),
    async currentLearnerAccount() {
      if (!client) return null;
      const { data: { user }, error } = await client.auth.getUser();
      if (error) throw error;
      return user ? learnerAccount(user) : null;
    },
    async requestEmailCode(email) {
      if (!client) unavailable();
      const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw error;
    },
    async verifyEmailCode(email, code) {
      if (!client) unavailable();
      const { data, error } = await client.auth.verifyOtp({ email, token: code, type: "email" });
      if (error) throw error;
      if (!data.user) throw new Error("The code did not create a learner account session.");
      return learnerAccount(data.user);
    },
    async mergeLearningProgress(progress) {
      if (!client) unavailable();
      const { data, error } = await client.rpc("merge_learning_progress_snapshot", { incoming_progress: progress });
      if (error) throw error;
      return data as ProgressState;
    },
    async signOut() {
      if (!client) unavailable();
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
    },
    async deleteLearnerAccount() {
      if (!client) unavailable();
      const { error } = await client.rpc("delete_own_learner_account");
      if (error) throw error;
      const { error: signOutError } = await client.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
    },
  };
}
