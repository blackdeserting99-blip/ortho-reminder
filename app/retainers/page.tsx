"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import { formatDateDMY } from "../lib/date";

type Patient = {
  id: number;
  name: string;
  treatment: string;
  phone: string;
  appointmentDate: string;
  appointmentTime?: string;
  retainerChecked?: boolean;
  retainerNote?: string;
  retainerType?: string;
  caseStatus?:
    | "active"
    | "retainer"
    | "finished"
    | "cancelled"
    | "archived";
};

export default function RetainersPage() {
  const [retainerPatients, setRetainerPatients] = useState<Patient[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [appointmentMode, setAppointmentMode] = useState("30 Days");
  const [manualDate, setManualDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("04:00 PM");

  useEffect(() => {
    const savedPatients = JSON.parse(localStorage.getItem("patients") || "[]");
    const retainers = savedPatients.filter((patient: Patient) => patient.caseStatus === "retainer");
    setRetainerPatients(retainers);
  }, []);

  const getSelectedDate = () => {
    if (appointmentMode === "Manual") {
      return manualDate;
    }

    const days = parseInt(appointmentMode);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return futureDate.toISOString().split("T")[0];
  };

  const updateRetainerPatient = (id: number, changes: Partial<Patient>) => {
    const savedPatients = JSON.parse(localStorage.getItem("patients") || "[]");
    const updatedPatients = savedPatients.map((patient: any) =>
      patient.id === id ? { ...patient, ...changes } : patient
    );
    localStorage.setItem("patients", JSON.stringify(updatedPatients));
    const retainers = updatedPatients.filter((patient: Patient) => patient.caseStatus === "retainer");
    setRetainerPatients(retainers);
  };

  const saveAppointment = (patientId: number) => {
    const selectedDate = getSelectedDate();
    if (!selectedDate) {
      alert("Please select a date");
      return;
    }
    updateRetainerPatient(patientId, { appointmentDate: selectedDate, appointmentTime });
    setEditingId(null);
    setAppointmentMode("30 Days");
    setManualDate("");
    setAppointmentTime("04:00 PM");
  };

  const startEditing = (patient: Patient) => {
    setEditingId(patient.id);
    setManualDate(patient.appointmentDate || "");
    setAppointmentTime(patient.appointmentTime || "04:00 PM");
    setAppointmentMode("Manual");
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 w-full">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-purple-700">Retainer Cases</h1>
          </div>

          <div className="mb-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 w-full max-w-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Total retainers</p>
              <p className="mt-4 text-4xl font-semibold text-purple-700">{retainerPatients.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {retainerPatients.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No retainer cases found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-black">
                  <thead>
                    <tr className="border-b bg-slate-100">
                      <th className="p-4 text-left text-sm uppercase tracking-[0.15em] text-slate-500">Patient</th>
                      <th className="p-4 text-left text-sm uppercase tracking-[0.15em] text-slate-500">Treatment</th>
                      <th className="p-4 text-left text-sm uppercase tracking-[0.15em] text-slate-500">Retainer Type</th>
                      <th className="p-4 text-left text-sm uppercase tracking-[0.15em] text-slate-500">Active</th>
                      <th className="p-4 text-left text-sm uppercase tracking-[0.15em] text-slate-500">Notes</th>
                      <th className="p-4 text-left text-sm uppercase tracking-[0.15em] text-slate-500">Next Review</th>
                      <th className="p-4 text-left text-sm uppercase tracking-[0.15em] text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retainerPatients.map((patient) => (
                      <tr key={patient.id} className="border-b hover:bg-slate-50">
                        <td className="p-4 align-top">
                          <div className="font-semibold text-slate-900">{patient.name}</div>
                          <div className="text-sm text-slate-500 mt-1">{patient.phone}</div>
                        </td>
                        <td className="p-4 align-top">
                          <div className="font-medium text-slate-900">{patient.treatment}</div>
                        </td>
                        <td className="p-4 align-top">
                          <div className="text-slate-900">{patient.retainerType || ""}</div>
                        </td>
                        <td className="p-4 align-top">
                          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={patient.retainerChecked || false}
                              onChange={(e) => updateRetainerPatient(patient.id, { retainerChecked: e.target.checked, retainerNote: e.target.checked ? patient.retainerNote : "" })}
                              className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span>{patient.retainerChecked ? "On" : "Off"}</span>
                          </label>
                        </td>
                        <td className="p-4 align-top">
                          {patient.retainerChecked ? (
                            <textarea
                              value={patient.retainerNote || ""}
                              onChange={(e) => updateRetainerPatient(patient.id, { retainerNote: e.target.value })}
                              placeholder="Add note..."
                              className="w-full min-h-[72px] rounded-2xl border border-slate-200 p-2 text-sm text-slate-900"
                            />
                          ) : (
                            <span className="text-sm text-slate-400">Enable tick to add note</span>
                          )}
                        </td>
                        <td className="p-4 align-top">
                          {editingId === patient.id ? (
                            <div className="space-y-2">
                              <div>
                                <label className="block text-xs font-semibold mb-1">Date Mode</label>
                                <select
                                  value={appointmentMode}
                                  onChange={(e) => setAppointmentMode(e.target.value)}
                                  className="w-full border p-2 rounded text-sm"
                                >
                                  <option>15 Days</option>
                                  <option>30 Days</option>
                                  <option>45 Days</option>
                                  <option>60 Days</option>
                                  <option>Manual</option>
                                </select>
                              </div>
                              {appointmentMode === "Manual" && (
                                <div>
                                  <label className="block text-xs font-semibold mb-1">Date</label>
                                  <input
                                    type="date"
                                    value={manualDate}
                                    onChange={(e) => setManualDate(e.target.value)}
                                    className="w-full border p-2 rounded text-sm"
                                  />
                                </div>
                              )}
                              <div>
                                <label className="block text-xs font-semibold mb-1">Time</label>
                                <select
                                  value={appointmentTime}
                                  onChange={(e) => setAppointmentTime(e.target.value)}
                                  className="w-full border p-2 rounded text-sm"
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
                                  <option>07:00 PM</option>
                                  <option>08:00 PM</option>
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveAppointment(patient.id)}
                                  className="flex-1 bg-purple-600 text-white px-2 py-1 rounded text-sm hover:bg-purple-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="flex-1 bg-slate-200 text-slate-700 px-2 py-1 rounded text-sm hover:bg-slate-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold text-slate-900">{patient.appointmentDate ? formatDateDMY(patient.appointmentDate) : "TBD"}</div>
                              <div className="text-sm text-slate-500 mt-1">{patient.appointmentTime || "No time"}</div>
                              <button
                                onClick={() => startEditing(patient)}
                                className="mt-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-4 align-top">
                          <Link
                            href={`/patient/${patient.id}`}
                            className="inline-flex items-center justify-center rounded-2xl bg-purple-600 px-4 py-2 text-white transition hover:bg-purple-700"
                          >
                            View Record
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
