"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CallbackCompletionProps = {
  code: string;
  businessAccountId: string;
  phoneNumberId: string;
};

export default function CallbackCompletion({ code, businessAccountId, phoneNumberId }: CallbackCompletionProps) {
  const [message, setMessage] = useState("Completing your Meta WhatsApp connection...");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const complete = async () => {
      if (!businessAccountId || !phoneNumberId) {
        setFailed(true);
        setMessage("Meta did not return the WhatsApp Business Account and phone number identifiers required to connect this account.");
        return;
      }

      const response = await fetch("/api/settings/doctor-whatsapp/meta/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, businessAccountId, phoneNumberId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFailed(true);
        setMessage(payload.details || payload.error || "Meta WhatsApp connection could not be completed.");
        return;
      }

      window.location.replace("/settings/whatsapp?meta=connected");
    };

    void complete();
  }, [businessAccountId, code, phoneNumberId]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <section className="mx-auto max-w-xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        <p className={`text-sm font-medium ${failed ? "text-rose-700" : "text-teal-700"}`}>{message}</p>
        {failed ? (
          <Link href="/settings/whatsapp" className="mt-6 inline-flex text-sm font-semibold text-teal-700 underline underline-offset-4">
            Return to WhatsApp settings
          </Link>
        ) : null}
      </section>
    </main>
  );
}