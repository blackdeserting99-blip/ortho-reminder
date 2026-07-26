"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WhatsAppSetupPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if already configured
  useEffect(() => {
    fetch("/api/settings/doctor-whatsapp")
      .then((r) => r.json())
      .then((data) => {
        if (data.phone) {
          setPhone(data.phone);
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/settings/doctor-whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save.");
        return;
      }

      // Set the whatsapp_configured cookie client-side so middleware sees it
      document.cookie = "whatsapp_configured=1; path=/; max-age=604800; secure; samesite=lax";

      router.push("/patients");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <section className="w-full max-w-md rounded-[2rem] border border-slate-200/80 bg-white/95 p-8 shadow-xl shadow-slate-900/10">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-50 text-3xl">
            💬
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">
            Required Setup
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Connect Your WhatsApp Business Number
          </h1>
          <p className="text-sm text-slate-600">
            This is the number that will send reminders and instructions to your
            patients. You can change it anytime from settings.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              WhatsApp Business Phone Number
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                placeholder="e.g. 07701234567"
                required
              />
            </label>
            <p className="mt-1.5 text-xs text-slate-400">
              Iraqi number format: 07XX XXX XXXX — will be stored as
              964XXXXXXXXXX
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="w-full rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-cyan-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save & Continue to Dashboard"}
          </button>
        </form>
      </section>
    </main>
  );
}
