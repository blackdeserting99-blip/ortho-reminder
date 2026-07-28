"use client";

import { useState } from "react";

type Props = {
  doctorId: string;
  currentStatus: "FREE" | "ACTIVE" | "EXPIRED" | "SUSPENDED";
};

const statuses = ["FREE", "ACTIVE", "EXPIRED", "SUSPENDED"] as const;

export function DoctorSubscriptionForm({ doctorId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSave() {
    if (loading) return;
    setLoading(true);

    try {
      const subscriptionEndDate = endDate
        ? new Date(`${endDate}T00:00:00.000Z`).toISOString()
        : null;

      const response = await fetch(`/api/admin/doctors/${doctorId}/subscription`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subscriptionStatus: status,
          subscriptionEndDate,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data?.error || "Failed to update subscription.");
        return;
      }

      alert("Subscription updated.");
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      <label className="text-sm text-gray-700">
        Status
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2"
        >
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-gray-700">
        End Date (optional)
        <input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2"
        />
      </label>

      <div className="flex items-end">
        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Subscription"}
        </button>
      </div>
    </div>
  );
}
