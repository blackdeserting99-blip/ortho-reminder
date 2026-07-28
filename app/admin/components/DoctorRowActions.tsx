"use client";

import { useState } from "react";

type Props = {
  doctorId: string;
  isDisabled: boolean;
};

export function DoctorRowActions({ doctorId, isDisabled }: Props) {
  const [loading, setLoading] = useState(false);

  async function toggleDisabled(nextDisabled: boolean) {
    if (loading) return;

    const confirmed = window.confirm(
      nextDisabled
        ? "Disable this doctor account? They will no longer be able to log in."
        : "Enable this doctor account?"
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/doctors", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ doctorId, disabled: nextDisabled }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data?.error || "Failed to update account status.");
        return;
      }

      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => toggleDisabled(!isDisabled)}
      disabled={loading}
      className="rounded border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60"
    >
      {loading ? "Saving..." : isDisabled ? "Enable" : "Disable"}
    </button>
  );
}
