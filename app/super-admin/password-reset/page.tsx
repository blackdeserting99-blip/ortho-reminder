"use client";

import { useState } from "react";

type DoctorResult = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
};

export default function SuperAdminPasswordResetPage() {
  const [query, setQuery] = useState("");
  const [doctor, setDoctor] = useState<DoctorResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const searchDoctor = async () => {
    setSearching(true);
    setSearchError(null);
    setDoctor(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/super-admin/password-reset?query=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSearchError(data.error || "Doctor not found.");
        return;
      }

      setDoctor(data.doctor as DoctorResult);
    } catch {
      setSearchError("Network error while searching for doctor.");
    } finally {
      setSearching(false);
    }
  };

  const resetPassword = async () => {
    if (!doctor) {
      setResetError("Search for a doctor first.");
      return;
    }

    setSaving(true);
    setResetError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/super-admin/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctor.id,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setResetError(data.details || data.error || "Password reset failed.");
        return;
      }

      setSuccessMessage(data.message || "✅ Password reset successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setResetError("Network error while resetting the password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_32%),linear-gradient(135deg,_#f7fbff_0%,_#eef7fb_100%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-4xl rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur md:p-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-700">Super Admin</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Password Recovery</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Search for a doctor by email or phone number, then reset the password securely for the selected account.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
            <label className="block text-sm font-semibold text-slate-700">Search doctor</label>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Email address or phone number"
              className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            />

            {searchError ? (
              <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{searchError}</p>
            ) : null}

            <button
              type="button"
              onClick={searchDoctor}
              disabled={searching || !query.trim()}
              className="mt-4 inline-flex rounded-2xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>

            {doctor ? (
              <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-emerald-900">Doctor found</h2>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{doctor.role}</span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm text-slate-700">
                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <dt className="font-medium text-slate-500">Name</dt>
                    <dd>{doctor.name || "—"}</dd>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <dt className="font-medium text-slate-500">Email</dt>
                    <dd>{doctor.email}</dd>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <dt className="font-medium text-slate-500">Phone</dt>
                    <dd>{doctor.phone || "—"}</dd>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <dt className="font-medium text-slate-500">Role</dt>
                    <dd>{doctor.role}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Reset Password</h2>
            <p className="mt-2 text-sm text-slate-600">
              The new password is hashed with bcryptjs before it is stored. The plain password is never saved.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                New password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Confirm password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                />
              </label>
            </div>

            {resetError ? (
              <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{resetError}</p>
            ) : null}

            {successMessage ? (
              <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{successMessage}</p>
            ) : null}

            <button
              type="button"
              onClick={resetPassword}
              disabled={saving || !doctor || !newPassword || !confirmPassword}
              className="mt-5 inline-flex w-full justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}