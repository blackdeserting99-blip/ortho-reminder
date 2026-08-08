"use client";

import { useState } from "react";
import Link from "next/link";

type ResetPasswordFormProps = {
  initialToken: string;
};

export default function ResetPasswordForm({ initialToken }: ResetPasswordFormProps) {
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirmReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setResetLoading(true);

    try {
      const response = await fetch("/api/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Password reset failed.");
        return;
      }

      setMessage(data.message ?? "Your password was reset.");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Unable to reset password right now.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 flex items-center justify-center">
      <section className="w-full max-w-lg rounded-[2rem] border border-slate-200/80 bg-white/95 p-8 shadow-xl shadow-slate-900/10">
        <div className="space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">Reset password</p>
          <h1 className="text-3xl font-semibold text-slate-900">Create a new password</h1>
          <p className="text-sm text-slate-600">Use the secure link from your email to set a new password.</p>
        </div>

        {message ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="mt-8 space-y-4" onSubmit={confirmReset}>
          <label className="block text-sm font-medium text-slate-700">
            Reset token
            <input
              type="text"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              placeholder="At least 8 characters"
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              placeholder="Repeat your new password"
              required
            />
          </label>

          <button
            type="submit"
            disabled={resetLoading}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resetLoading ? "Resetting…" : "Reset password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Back to{' '}
          <Link href="/login" className="font-semibold text-cyan-700 hover:text-cyan-800">
            login
          </Link>
        </p>
      </section>
    </main>
  );
}