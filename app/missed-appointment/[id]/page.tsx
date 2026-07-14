"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import DateInput from "../../components/DateInput";
import Modal from "../../components/Modal";

export default function MissedAppointmentPage() {
  const params = useParams();
  const router = useRouter();

  const [reason, setReason] =
    useState("");

  const [action, setAction] =
    useState("cancel");

  const [newDate, setNewDate] =
    useState("");

  const saveMissedAppointment = () => {
    const patients = JSON.parse(
      localStorage.getItem("patients") || "[]"
    );

    const updatedPatients = patients.map(
      (patient: any) => {
        if (
          patient.id.toString() !==
          params.id
        ) {
          return patient;
        }

        return {
          ...patient,

          appointmentStatus:
            action === "cancel"
              ? "cancelled"
              : "pending",

          appointmentDate:
            action === "cancel"
              ? ""
              : newDate,

          missedReason: reason,
        };
      }
    );

    localStorage.setItem(
      "patients",
      JSON.stringify(updatedPatients)
    );

    router.push("/");
  };

  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 w-full">

      <h1 className="text-4xl font-bold text-red-700 mb-8">
        Missed Appointment
      </h1>

      <div className="bg-white rounded-xl shadow p-8 max-w-2xl text-black">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-red-700">Handle Missed Appointment</h2>
          <p className="text-sm text-slate-500">Choose whether to cancel the appointment or reschedule it.</p>
        </div>

        <div className="mb-6">
          <label className="block mb-2 font-semibold">Reason (optional)</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="w-full border p-3 rounded" placeholder="Patient didn't show up, called late, etc." />
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded border ${action === 'cancel' ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">Cancel Appointment</div>
                <div className="text-sm text-slate-600">Mark appointment as cancelled</div>
              </div>
              <div>
                <input type="radio" name="missedAction" checked={action==='cancel'} onChange={() => setAction('cancel')} />
              </div>
            </div>
          </div>

          <div className={`p-4 rounded border ${action === 'reschedule' ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">Reschedule</div>
                <div className="text-sm text-slate-600">Pick a new date for the appointment</div>
              </div>
              <div>
                <input type="radio" name="missedAction" checked={action==='reschedule'} onChange={() => setAction('reschedule')} />
              </div>
            </div>
            {action === 'reschedule' && (
                <div className="mt-3">
                <label className="block mb-2 font-semibold">New Appointment Date</label>
                <DateInput value={newDate} onChange={setNewDate} className="" />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={() => router.push('/')} className="bg-slate-200 px-4 py-2 rounded">Cancel</button>
          <button
            onClick={() => {
              if (action === 'cancel') {
                setShowConfirmCancel(true);
                return;
              }
              saveMissedAppointment();
            }}
            className={`px-4 py-2 rounded ${action === 'cancel' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}
          >
            {action === 'cancel' ? 'Cancel Appointment' : 'Save & Reschedule'}
          </button>
        </div>

        <Modal
          title="Confirm Cancellation"
          description="Are you sure you want to cancel this appointment? This will mark the appointment as cancelled."
          show={showConfirmCancel}
          onCancel={() => setShowConfirmCancel(false)}
          onConfirm={() => { saveMissedAppointment(); setShowConfirmCancel(false); }}
          confirmLabel="Confirm Cancel"
          cancelLabel="Back"
        />

      </div>

    </main>
    </div>
  );
}