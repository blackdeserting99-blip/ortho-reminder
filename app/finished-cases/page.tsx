"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import DateInput from "../components/DateInput";
import Modal from "../components/Modal";

type Patient = {
  id: number;
  name: string;
  treatment: string;
  phone: string;

  caseStatus?:
    | "active"
    | "retainer"
    | "finished"
    | "cancelled"
    | "archived";
};

export default function FinishedCasesPage() {
  const [finishedPatients, setFinishedPatients] =
    useState<Patient[]>([]);

  const [showFinished, setShowFinished] =
    useState(true);

  const [highlightId, setHighlightId] = useState<number | null>(null);

  useEffect(() => {
    const loadFinishedPatients = async () => {
      try {
        const response = await fetch("/api/patients", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load patients");
        }
        const patients = await response.json();
        setFinishedPatients(patients.filter((p: Patient) => p.caseStatus === "finished"));

        // Handle focusing from external actions
        const params = new URLSearchParams(window.location.search);
        const focus = params.get("focus");
        const mode = params.get("mode");
        if (focus) {
          const id = Number(focus);
          setHighlightId(id);
          if (mode === "finished") setShowFinished(true);

          // Scroll into view shortly after render
          setTimeout(() => {
            const el = document.getElementById(`patient-${id}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 250);

          // Clear highlight after a short delay
          setTimeout(() => setHighlightId(null), 3500);
        }
      } catch {
        setFinishedPatients([]);
      }
    };

    loadFinishedPatients();
  }, []);

  const router = useRouter();
  const [showUnfinishModal, setShowUnfinishModal] = useState(false);
  const [unfinishTargetId, setUnfinishTargetId] = useState<number | null>(null);
  const [unfinishScheduleNow, setUnfinishScheduleNow] = useState(false);
  const [unfinishDate, setUnfinishDate] = useState("");
  const [unfinishTime, setUnfinishTime] = useState("");

  const openUnfinishModal = (id: number) => {
    setUnfinishTargetId(id);
    setUnfinishScheduleNow(false);
    setUnfinishDate("");
    setUnfinishTime("");
    setShowUnfinishModal(true);
  };

  const confirmUnfinish = async () => {
    const id = unfinishTargetId;
    if (!id) return;
    try {
      const response = await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseStatus: "active" }),
      });
      if (!response.ok) {
        throw new Error("Unfinish failed");
      }
      setShowUnfinishModal(false);
      if (unfinishScheduleNow) {
        router.push(`/new-appointment/${id}?focus=current`);
      } else {
        setFinishedPatients((prev) => prev.filter((p: Patient) => p.id !== id));
        setHighlightId(id);
        setTimeout(() => setHighlightId(null), 1500);
      }
    } catch {
      setShowUnfinishModal(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-4xl font-bold text-green-700 mb-4">Completed Cases</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Total finished cases</p>
            <p className="mt-4 text-4xl font-semibold text-green-700">{finishedPatients.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <button
            onClick={() => setShowFinished(!showFinished)}
            className="text-2xl font-bold text-green-700 mb-4"
          >
            {showFinished ? "▼" : "▶"} Completed Cases ({finishedPatients.length})
          </button>

          {showFinished && (
            <>
              {finishedPatients.length === 0 ? (
                <p className="text-gray-500">No completed cases.</p>
              ) : (
                <div className="space-y-3">
                  {finishedPatients.map((patient) => (
                    <div
                      id={`patient-${patient.id}`}
                      key={patient.id}
                      className={`bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
                        highlightId === patient.id ? "ring-4 ring-yellow-300 bg-yellow-50" : ""
                      }`}
                    >
                      <div>
                        <div className="font-bold">{patient.name}</div>
                        <div className="text-gray-600">{patient.treatment}</div>
                        <div className="text-green-700 font-semibold">✅ Finished</div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Link
                          href={`/patients/${patient.id}`}
                          className="bg-teal-600 text-white px-3 py-1 rounded"
                        >
                          View Record
                        </Link>
                        <button
                          onClick={() => openUnfinishModal(patient.id)}
                          className="bg-yellow-500 text-white px-3 py-1 rounded ml-2"
                        >
                          Reopen Case
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      {showUnfinishModal && (
        <Modal
          title="Reopen Case"
          description="Return this case to active status. Optionally schedule a new appointment now."
          show={showUnfinishModal}
          onCancel={() => setShowUnfinishModal(false)}
          onConfirm={confirmUnfinish}
          confirmLabel="Reopen"
          cancelLabel="Close"
        >
          <div className="space-y-3">
            <div className="p-3 border rounded-xl bg-slate-50">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold">Reopen Case</div>
                  <div className="text-sm text-slate-500">Return the case to active status</div>
                </div>
                <div>
                  <button
                    onClick={() => setUnfinishScheduleNow(!unfinishScheduleNow)}
                    className={`px-3 py-1 rounded-full ${unfinishScheduleNow ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700"}`}
                  >
                    {unfinishScheduleNow ? "Schedule now" : "Reopen"}
                  </button>
                </div>
              </div>
                  {unfinishScheduleNow && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <DateInput value={unfinishDate} onChange={setUnfinishDate} className="" />
                  <input
                    type="time"
                    value={unfinishTime}
                    onChange={(e) => setUnfinishTime(e.target.value)}
                    className="border p-3 rounded-xl w-full"
                  />
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
