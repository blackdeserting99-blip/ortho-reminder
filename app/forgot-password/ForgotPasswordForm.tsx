"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const requestCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setResetUrl(null);
    setRequestLoading(true);

    try {
      const response = await fetch("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Unable to send reset code.");
        return;
      }
      setMessage(data.message ?? "We sent a reset code to your email.");
      setResetUrl(data.resetUrl ?? null);
    } catch {
      setError("Unable to send reset code. Please try again.");
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 flex items-center justify-center">
      <section className="w-full max-w-lg rounded-[2rem] border border-slate-200/80 bg-white/95 p-8 shadow-xl shadow-slate-900/10">
        <div className="space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">Reset password</p>
          <h1 className="text-3xl font-semibold text-slate-900">Recover your account</h1>
          <p className="text-sm text-slate-600">Enter your email and we will send a secure reset link.</p>
        </div>
        {message ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
        {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {resetUrl ? <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-700"><p className="font-semibold">Use this reset link:</p><a href={resetUrl} className="mt-2 inline-flex break-all font-medium text-cyan-800 underline">{resetUrl}</a></div> : null}
        <div className="mt-8 space-y-8">
          <form className="space-y-4" onSubmit={requestCode}>
            <label className="block text-sm font-medium text-slate-700">Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200" placeholder="you@example.com" required /></label>
            <button type="submit" disabled={requestLoading} className="inline-flex w-full items-center justify-center rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60">{requestLoading ? "Sending link…" : "Send reset link"}</button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-slate-600">Back to <Link href="/login" className="font-semibold text-cyan-700 hover:text-cyan-800">login</Link></p>
      </section>
    </main>
  );
}