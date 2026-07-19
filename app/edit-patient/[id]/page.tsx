"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import DateInput from "../../components/DateInput";

export default function EditPatientPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id ?? "";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0,3)} ${digits.slice(3)}`;
    if (digits.length <= 10) return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`;
    return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6,10)} ${digits.slice(10)}`;
  };
const [address, setAddress] = useState("");
const [age, setAge] = useState("");
const [treatment, setTreatment] = useState("");
const [bracketType, setBracketType] = useState("");
  const [appointmentDate, setAppointmentDate] =
    useState("");
  const [appointmentTime, setAppointmentTime] =
    useState("");
  const [firstAppointment, setFirstAppointment] =
    useState(false);

  const [notes, setNotes] = useState("");

  const [totalFee, setTotalFee] =
    useState("");

  useEffect(() => {
    const loadPatient = async () => {
      try {
        const response = await fetch(`/api/patients/${id}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Patient not found");
        }
        const patient = await response.json();
        if (patient) {
          setName(patient.name || "");
          setPhone(patient.phone || "");
          setAddress(patient.address || "");
          setAge(patient.age ? patient.age.toString() : "");
          setTreatment(patient.treatment || "");
          setBracketType(patient.bracketType || "");
          setAppointmentDate(patient.appointmentDate || "");
          setAppointmentTime(patient.appointmentTime || "");
          setFirstAppointment(patient.firstAppointment || false);
          setNotes(patient.notes || "");
          setTotalFee(patient.totalFee ? patient.totalFee.toString() : "");
        }
      } catch {
        // leave the form empty on failure
      }
    };

    if (id) {
      loadPatient();
    }
  }, [id]);

  const saveChanges = async () => {
    try {
      const response = await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          address,
          age: age ? Number(age) : undefined,
          treatment,
          bracketType: treatment === "Fixed Braces" ? bracketType : undefined,
          appointmentDate,
          appointmentTime,
          firstAppointment,
          notes,
          totalFee: Number(totalFee.replace(/,/g, "")) || 0,
        }),
      });
      if (!response.ok) {
        throw new Error("Update failed");
      }
      router.push(`/patients/${id}`);
    } catch {
      // keep the existing form behavior on error
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 w-full">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-700 mb-2">Edit Patient Record</h1>
          <p className="text-lg font-semibold text-slate-900">{name || "Patient Name"}</p>
          <p className="text-sm text-slate-500">Update patient profile and treatment details using the familiar layout.</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-4xl text-black">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block mb-2 text-sm font-medium text-slate-700">Patient Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border p-3 rounded"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-slate-700">Contact Number</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                    className="w-full border p-3 rounded"
                    placeholder="e.g., 0770 123 4567"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block mb-2 text-sm font-medium text-slate-700">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full border p-3 rounded"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-slate-700">Age (years)</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full border p-3 rounded"
                    placeholder="e.g., 25"
                    min="0"
                    max="120"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-slate-700">Treatment</label>
                <select
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                  className="w-full border p-3 rounded"
                >
                  <option>Fixed Braces</option>
                  <option>Clear Aligners</option>
                  <option>Retainers</option>
                  <option>Twin Block</option>
                  <option>Hyrax</option>
                </select>
              </div>
              {treatment === "Fixed Braces" && (
                <div>
                  <label className="block mb-2 text-sm font-medium text-slate-700">Bracket System</label>
                  <select
                    value={bracketType}
                    onChange={(e) => setBracketType(e.target.value)}
                    className="w-full border p-3 rounded"
                  >
                    <option value="">Select a system</option>
                    <option>MBT System</option>
                    <option>Roth System</option>
                    <option>Damon System</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700">Appointment Date</label>
              <DateInput value={appointmentDate} onChange={setAppointmentDate} className="" />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700">Appointment Time</label>
              <input
                type="text"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-full border p-3 rounded"
                placeholder="04:00 PM"
              />
            </div>
          </div>

          <div className="mt-8">
            <label className="block mb-2 text-sm font-medium text-slate-700">Clinical Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full border p-3 rounded"
              placeholder="Write notes about this patient..."
            />
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700">Estimated Treatment Fee</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={totalFee}
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, "");
                  if (/^\d*$/.test(value)) {
                    setTotalFee(value);
                  }
                }}
                placeholder="1,500,000"
                className="flex-1 border p-3 rounded"
              />
              <span className="font-semibold text-slate-700">IQD</span>
            </div>
            {totalFee && (
              <p className="text-blue-600 mt-2 font-medium">{Number(totalFee).toLocaleString()}</p>
            )}
            </div>
            <div className="flex items-end justify-end">
              <button
                onClick={saveChanges}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg w-full"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}