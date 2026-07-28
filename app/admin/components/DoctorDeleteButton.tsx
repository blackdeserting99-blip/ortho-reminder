"use client";

import { useState } from "react";

type Props = {
  doctorId: string;
};

export function DoctorDeleteButton({ doctorId }: Props) {
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (loading) return;

    const text = window.prompt('Type DELETE to confirm account deletion.');
    if (text !== "DELETE") {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/doctors/${doctorId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data?.error || "Failed to delete doctor account.");
        return;
      }

      window.location.href = "/admin/doctors";
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={loading}
      className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
    >
      {loading ? "Deleting..." : "Delete"}
    </button>
  );
}
