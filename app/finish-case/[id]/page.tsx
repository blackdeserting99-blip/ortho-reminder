"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import DateInput from "../../components/DateInput";

export default function FinishCasePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = String((params as any).id);
  const initialMode = searchParams?.get("mode") === "retainer" ? "retainer" : "finish";
  const [mode, setMode] = useState<"finish" | "retainer">(initialMode);
  const [message, setMessage] = useState("");

  const [retainerDate, setRetainerDate] = useState("");
  const [retainerTime, setRetainerTime] = useState("09:00 AM");
  const [retainerFee, setRetainerFee] = useState("");

  const finishCase = () => {
    const patients = JSON.parse(
      localStorage.getItem("patients") || "[]"
    );

    const updatedPatients = patients.map(
      (p: any) =>
p.id.toString() === patientId
                ? {
              ...p,
              caseStatus: "finished",
              appointmentDate: "",
              appointmentTime: "",
            }
          : p
    );

 localStorage.setItem(
  "patients",
  JSON.stringify(updatedPatients)
);
    setMessage("Case marked as finished.");
    setTimeout(() => router.push(`/finished-cases?focus=${patientId}&mode=finished`), 700);
};
  const moveToRetainer = () => {
    if (!retainerDate || !retainerTime) {
      alert(
        "Please select retainer date and time."
      );
      return;
    }

    const patients = JSON.parse(
      localStorage.getItem("patients") || "[]"
    );

    const updatedPatients = patients.map(
      (p: any) =>
p.id.toString() === patientId
                ? {
              ...p,
              caseStatus: "retainer",
treatment: p.treatment,
              appointmentDate: retainerDate,
              appointmentTime: retainerTime,
              retainerFee: Number(retainerFee) || 0,
            }
          : p
    );

    localStorage.setItem(
      "patients",
      JSON.stringify(updatedPatients)
    );
    setMessage("Retainer scheduled successfully.");
    setTimeout(() => router.push(`/finished-cases?focus=${patientId}&mode=retainer`), 700);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 w-full">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow p-8">

     <h1 className="text-4xl font-bold mb-2 text-blue-700">Finalize Case</h1>

<p className="text-gray-600 mb-6">Select the appropriate action for this patient's case record.</p>

<div className="flex gap-3 mb-6">
  <button
    onClick={() => setMode("finish")}
    className={`px-4 py-2 rounded-lg font-medium ${mode === "finish" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"}`}
  >
    Finalize Case
  </button>
  <button
    onClick={() => setMode("retainer")}
    className={`px-4 py-2 rounded-lg font-medium ${mode === "retainer" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700"}`}
  >
    Transfer to Retainer Phase
  </button>
</div>

{message && (
  <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
    {message}
  </div>
)}

        {mode === "retainer" ? (
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-2 text-purple-700">🦷 Retainer Phase Scheduling</h2>
            <p className="text-gray-600 mb-4">Schedule the patient's first retainer review appointment.</p>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 font-medium text-black">Retainer Date</label>
                <DateInput value={retainerDate} onChange={setRetainerDate} className="" />
              </div>

              <div>
                <label className="block mb-1 font-medium text-black">Retainer Time</label>
                <select
                  value={retainerTime}
                  onChange={(e) => setRetainerTime(e.target.value)}
                  className="w-full border rounded p-2 text-black"
                >
                  <option>09:00 AM</option>
                  <option>10:00 AM</option>
                  <option>11:00 AM</option>
                  <option>12:00 PM</option>
                  <option>01:00 PM</option>
                  <option>02:00 PM</option>
                  <option>03:00 PM</option>
                  <option>04:00 PM</option>
                  <option>05:00 PM</option>
                  <option>06:00 PM</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium text-black">Retainer Fee</label>
                <div className="flex items-center gap-2">
                  <input type="text" value={retainerFee ? Number(retainerFee).toLocaleString() : retainerFee} onChange={(e) => setRetainerFee(e.target.value.replace(/\D/g, ""))} className="w-full border p-2 rounded text-black" placeholder="0" />
                  <span className="font-semibold">IQD</span>
                </div>
              </div>

              <button onClick={moveToRetainer} className="bg-purple-600 text-white px-5 py-3 rounded-lg">Save Retainer</button>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-2 text-green-700">✅ Finish & Archive Case</h2>
            <p className="text-gray-600 mb-4">Treatment completed. No future appointments will be scheduled.</p>
            <button onClick={finishCase} className="bg-green-600 text-white px-5 py-3 rounded-lg">Finalize Case</button>
          </div>
        )}

      </div>
    </main>
    </div>
  );
}