"use client";

import { FormEvent, useState } from "react";
import { useLearningProgress } from "@/components/LearningProgressProvider";

export default function AccountPage() {
  const { account, accountsConfigured, error, requestEmailCode, verifyEmailCode } = useLearningProgress();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function request(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage(null);
    try { await requestEmailCode(email); setCodeRequested(true); setMessage("Check your email for a six-digit code."); }
    catch { /* Context exposes the safe error message. */ }
    finally { setBusy(false); }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage(null);
    try { await verifyEmailCode(email, code); setMessage("You are signed in and your learning progress has been saved to this learner account."); }
    catch { /* Context exposes the safe error message. */ }
    finally { setBusy(false); }
  }

  if (account) return <section className="content page-content"><p className="eyebrow">Learner account</p><h1>Signed in</h1><p className="lede">{account.email ?? "Your learner account"}</p><section className="notice"><h2>Learning progress saved</h2><p>Your browser learning progress was merged with this learner account when you signed in.</p></section></section>;
  if (!accountsConfigured) return <section className="content page-content"><p className="eyebrow">Learner account</p><h1>Account setup is in progress</h1><p className="lede">You can keep practising as a guest. Learner-account sign-in will be available after this deployment receives its public Supabase configuration.</p></section>;

  return <section className="content page-content"><p className="eyebrow">Learner account</p><h1>Save your learning progress</h1><p className="lede">Use your email address to create or access a learner account. No password is required.</p><section className="notice"><h2>Continue with email</h2><form className="account-form" onSubmit={request}><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><button className="button" type="submit" disabled={busy}>{busy ? "Sending…" : "Email me a code"}</button></form>{codeRequested && <form className="account-form" onSubmit={verify}><label>Six-digit code<input inputMode="numeric" pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" required /></label><button className="button secondary" type="submit" disabled={busy}>{busy ? "Verifying…" : "Verify code"}</button></form>}{message && <p className="success-message" role="status">{message}</p>}{error && <p className="error-message" role="alert">{error}</p>}</section></section>;
}
