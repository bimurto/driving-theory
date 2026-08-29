"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useLearningProgress } from "@/components/LearningProgressProvider";

export default function AccountPage() {
  const { account, accountsConfigured, error, syncState, requestEmailCode, verifyEmailCode, signOut, deleteLearnerAccount } = useLearningProgress();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletionConfirmation, setDeletionConfirmation] = useState("");

  async function request(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage(null);
    try { await requestEmailCode(email); setCodeRequested(true); setMessage("Check your email for an eight-digit code."); }
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

  async function signOutOfAccount() {
    setBusy(true); setMessage(null);
    try { await signOut(); setMessage("You are signed out. You can continue practising as a guest."); }
    catch { /* Context exposes the safe error message. */ }
    finally { setBusy(false); }
  }

  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage(null);
    try { await deleteLearnerAccount(); setMessage("Your learner account and synced learning progress have been deleted from this device."); }
    catch { /* Context exposes the safe error message. */ }
    finally { setBusy(false); }
  }

  if (account) return <section className="content page-content"><p className="eyebrow">Learner account</p><h1>Signed in</h1><p className="lede">{account.email ?? "Your learner account"}</p><section className={`notice sync-state ${syncState}`} aria-live="polite"><h2>{syncState === "synchronized" ? "Learning progress synchronized" : syncState === "pending" ? "Learning progress waiting to synchronize" : "Learning progress could not synchronize"}</h2><p>{syncState === "synchronized" ? "Your locally saved learning progress is synchronized with this learner account." : syncState === "pending" ? "Your learning progress is safely saved on this device and will synchronize shortly." : "Your learning progress is safely saved on this device. We’ll retry synchronization when you reconnect or continue practising."}</p></section><section className="account-actions"><h2>Account controls</h2><button className="button secondary" type="button" disabled={busy} onClick={signOutOfAccount}>Sign out</button><p><Link href="/privacy">Read the privacy notice</Link></p></section><section className="account-actions danger-zone"><h2>Delete learner account</h2><p>Deleting your learner account permanently removes its synced learning progress and clears the merged copy on this device. Type <strong>DELETE</strong> to confirm.</p><form className="account-form" onSubmit={deleteAccount}><label>Confirmation<input value={deletionConfirmation} onChange={(event) => setDeletionConfirmation(event.target.value)} autoComplete="off" /></label><button className="button danger-button" type="submit" disabled={busy || deletionConfirmation !== "DELETE"}>{busy ? "Deleting…" : "Permanently delete learner account"}</button></form></section>{error && <p className="error-message" role="alert">{error}</p>}</section>;
  if (!accountsConfigured) return <section className="content page-content"><p className="eyebrow">Learner account</p><h1>Account setup is in progress</h1><p className="lede">You can keep practising as a guest. Learner-account sign-in will be available after this deployment receives its public Supabase configuration.</p><p><Link href="/privacy">Read the privacy notice</Link></p></section>;

  return <section className="content page-content"><p className="eyebrow">Learner account</p><h1>Save your learning progress</h1><p className="lede">Use your email address to create or access a learner account. No password is required.</p><section className="notice"><h2>Continue with email</h2><form className="account-form" onSubmit={request}><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><button className="button" type="submit" disabled={busy}>{busy ? "Sending…" : "Email me a code"}</button></form>{codeRequested && <form className="account-form" onSubmit={verify}><label>Eight-digit code<input inputMode="numeric" pattern="[0-9]{8}" maxLength={8} value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" required /></label><button className="button secondary" type="submit" disabled={busy}>{busy ? "Verifying…" : "Verify code"}</button></form>}{message && <p className="success-message" role="status">{message}</p>}{error && <p className="error-message" role="alert">{error}</p>}</section><p><Link href="/privacy">Read the privacy notice</Link></p></section>;
}
