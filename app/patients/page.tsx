"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserRound,
  Archive,
  Trash2,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Modal from "../components/Modal";
import DateInput from "../components/DateInput";
import { formatDateDMY } from "../lib/date";
type Visit = {
  date: string;
  time: string;
  note: string;
  visitNotes?: string;
  plannedNotes?: string;
  payment?: number;
  elasticEnabled: boolean;
  elasticType: string;
  tadsNote?: string;
};

type Patient = {
  id: number;
  name: string;
  phone: string;
  clinicName?: string;
  clinicColor?: string;
  treatment: string;
  treatmentCategory?: string;
  bracketType?: string;
  age?: number;
  appointmentDate: string;
  appointmentTime?: string;
  caseStatus?:
  | "active"
  | "retainer"
  | "finished"
  | "cancelled"
  | "archived";
  firstAppointment?: boolean;

  notes?: string;
  visits?: Visit[];

  totalFee?: number;
  totalPaid?: number;
};

export default function PatientsPage() {
  const today = new Date().toLocaleDateString("en-CA");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [clinicSearch, setClinicSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [treatmentCategory, setTreatmentCategory] = useState("all");
  const [dateMode, setDateMode] = useState("newest");
  const [manualDate, setManualDate] = useState(today);

  // Apply clinic-name filter before other list filters
  const clinicFiltered = patients.filter((p) => {
    if (!clinicSearch || !clinicSearch.trim()) return true;
    return (p.clinicName || "").toLowerCase().includes(clinicSearch.trim().toLowerCase());
  });

  useEffect(() => {
    const savedPatients = JSON.parse(
      localStorage.getItem("patients") || "[]"
    );

    // Auto-migrate existing patients to add bracketType if missing
    const migratedPatients: Patient[] = savedPatients.map((patient: any) => {
      const updated: any = { ...patient };
      if (patient.treatment === "Fixed Braces" && !patient.bracketType) {
        updated.bracketType = "MBT System";
      }
      return updated;
    });

    // Update localStorage if migration happened
    if (JSON.stringify(savedPatients) !== JSON.stringify(migratedPatients)) {
      localStorage.setItem("patients", JSON.stringify(migratedPatients));
    }

    setPatients(migratedPatients);
  }, []);

const [showDeletePatientModal, setShowDeletePatientModal] = useState(false);
const [deletePatientId, setDeletePatientId] = useState<number | null>(null);
const [autoMessagesEnabled, setAutoMessagesEnabled] = useState(false);

const promptDeletePatient = (id: number) => {
  setDeletePatientId(id);
  setShowDeletePatientModal(true);
};

const confirmDeletePatient = () => {
  if (deletePatientId === null) return;
  const updatedPatients = patients.filter((patient) => patient.id !== deletePatientId);
  setPatients(updatedPatients);
  localStorage.setItem("patients", JSON.stringify(updatedPatients));
  setShowDeletePatientModal(false);
  setDeletePatientId(null);
};
const archivePatient = (id: number) => {
  const updatedPatients = patients.map((patient) =>
    patient.id === id
      ? { ...patient, caseStatus: "archived" as const }
      : patient
  );

  setPatients(updatedPatients);

  localStorage.setItem(
    "patients",
    JSON.stringify(updatedPatients)
  );
};

const exportPatients = () => {
  const data =
    localStorage.getItem("patients") || "[]";

  const blob = new Blob([data], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "patients-backup.json";
  a.click();

  URL.revokeObjectURL(url);
};

const getTreatmentCategory = (patient: Patient) => {
  const category = (patient.treatmentCategory || patient.treatment || "").toLowerCase();

  if (category.includes("fixed")) return "fixed-braces";
  if (category.includes("clear")) return "clear-aligners";
  if (category.includes("retainer")) return "retainers";
  if (category.includes("myofunctional")) return "myofunctional";

  return "other";
};

const getNextVisitRange = (appointmentDate: string) => {
  if (!appointmentDate) return "no-date";
  const date = new Date(appointmentDate);
  const todayDate = new Date(today);
  const diff = Math.ceil((date.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return "overdue";
  if (diff <= 14) return "close";
  return "far";
};

const filteredPatients = clinicFiltered
  .filter((patient) => {
    if (patient.caseStatus === "archived" || patient.caseStatus === "finished" || patient.caseStatus === "retainer") {
      return false;
    }

    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch =
      patient.name
        .toLowerCase()
        .includes(lowerSearch) ||
      patient.phone.includes(searchTerm) ||
      (patient.notes || "").toLowerCase().includes(lowerSearch) ||
      (patient.visits || []).some((visit: any) =>
        (visit.visitNotes || "")
          .toLowerCase()
          .includes(lowerSearch) ||
        (visit.plannedNotes || "")
          .toLowerCase()
          .includes(lowerSearch)
      );

    if (!matchesSearch) {
      return false;
    }

    if (treatmentCategory !== "all") {
      const category = getTreatmentCategory(patient);
      if (treatmentCategory !== category) {
        return false;
      }
    }

    if (dateMode === "manual" && manualDate) {
      return patient.appointmentDate === manualDate;
    }

    if (filter === "today") {
      return patient.appointmentDate === today;
    }

    if (filter === "upcoming") {
      return patient.appointmentDate > today;
    }

    if (filter === "overdue") {
      return patient.appointmentDate < today;
    }

    return true;
  })
  .sort((a, b) => {
    const aDate = new Date(a.appointmentDate).getTime();
    const bDate = new Date(b.appointmentDate).getTime();
    if (dateMode === "newest") {
      return bDate - aDate;
    }
    return aDate - bDate;
  });

const totalPatients = filteredPatients.length;

const todayAppointments = filteredPatients.filter(
  (p) => p.appointmentDate === today
).length;

const overduePatients = filteredPatients.filter(
  (p) => new Date(p.appointmentDate) < new Date()
).length;

// Compute summary counts respecting clinic filter
const allCount = clinicFiltered.filter(
  (p) => p.caseStatus !== "archived" && p.caseStatus !== "finished" && p.caseStatus !== "retainer"
).length;
const todayCount = clinicFiltered.filter(
  (p) =>
    p.caseStatus !== "archived" &&
    p.caseStatus !== "finished" &&
    p.caseStatus !== "retainer" &&
    p.appointmentDate === today
).length;

const upcomingCount = clinicFiltered.filter(
  (p) =>
    p.caseStatus !== "archived" &&
    p.caseStatus !== "finished" &&
    p.caseStatus !== "retainer" &&
    p.appointmentDate > today
).length;

const overdueCount = clinicFiltered.filter(
  (p) =>
    p.caseStatus !== "archived" &&
    p.caseStatus !== "finished" &&
    p.caseStatus !== "retainer" &&
    p.appointmentDate < today
).length;
  return (
    <>
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 w-full">

<h1 className="text-3xl font-bold text-slate-800 mb-8">
          Patients
      </h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <Link
          href="/add-patient"
          className="bg-teal-600 text-white px-6 py-3 rounded-lg"
        >
          New Patient
        </Link>

        <button
          onClick={exportPatients}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg"
        >
          Export Records
        </button>
        
      </div>
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
    <div className="text-sm uppercase tracking-[0.2em] text-slate-500">
      Patients
    </div>
    <div className="text-4xl font-semibold text-teal-700 mt-3">
      {totalPatients}
    </div>
  </div>

  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
    <div className="text-sm uppercase tracking-[0.2em] text-slate-500">
      Today's Appointments
    </div>
    <div className="text-4xl font-semibold text-emerald-700 mt-3">
      {todayAppointments}
    </div>
  </div>

  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
    <div className="text-sm uppercase tracking-[0.2em] text-slate-500">
      Overdue
    </div>
    <div className="text-4xl font-semibold text-red-700 mt-3">
      {overduePatients}
    </div>
  </div>

</div>  
      <input
        type="text"
        placeholder="Search patient..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full mb-6 p-4 bg-white border border-gray-200 rounded-3xl text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      <div className="mb-6 flex gap-2 items-center">
        <input
          type="text"
          placeholder="Filter by clinic name..."
          value={clinicSearch}
          onChange={(e) => setClinicSearch(e.target.value)}
          className="w-full p-3 bg-white border border-gray-200 rounded-3xl text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        {clinicSearch && (
          <button onClick={() => setClinicSearch("")} className="px-4 py-2 bg-slate-200 rounded-lg">Clear</button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">

<button
  onClick={() => setFilter("all")}
  className={`px-4 py-2 rounded-lg ${
    filter === "all"
      ? "bg-teal-600 text-white"
      : "bg-white border border-gray-200 text-gray-700"
  }`}
>
All ({allCount})
</button>

<button
  onClick={() => setFilter("today")}
  className={`px-4 py-2 rounded-lg ${
    filter === "today"
      ? "bg-teal-600 text-white"
      : "bg-white border border-gray-200 text-gray-700"
  }`}
>
  Today ({todayCount})
</button>

<button
  onClick={() => setFilter("upcoming")}
  className={`px-4 py-2 rounded-lg ${
    filter === "upcoming"
      ? "bg-teal-600 text-white"
      : "bg-white border border-gray-200 text-gray-700"
  }`}
>
  Upcoming ({upcomingCount})
</button>
<button
  onClick={() => setFilter("overdue")}
  className={`px-4 py-2 rounded-lg ${
    filter === "overdue"
      ? "bg-teal-600 text-white"
      : "bg-white border border-gray-200 text-gray-700"
  }`}
>
  Overdue ({overdueCount})
</button>

</div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Clinic filter</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Filter by clinic name..."
            value={clinicSearch}
            onChange={(e) => setClinicSearch(e.target.value)}
            className="w-full p-3 bg-white border border-gray-200 rounded-3xl text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {clinicSearch && (
            <button onClick={() => setClinicSearch("")} className="px-4 py-2 bg-slate-200 rounded-lg">Clear</button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="min-w-[220px] flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">Treatment category</label>
          <select
            value={treatmentCategory}
            onChange={(e) => setTreatmentCategory(e.target.value)}
            className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-teal-300 focus:ring-2 focus:ring-teal-200"
          >
            <option value="all">All treatments</option>
            <option value="fixed-braces">Fixed Braces</option>
            <option value="clear-aligners">Clear Aligners</option>
            <option value="retainers">Retainers</option>
            <option value="myofunctional">Myofunctional Appliance</option>
            <option value="other">Other treatments</option>
          </select>
        </div>

        <div className="min-w-[220px] flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">Date view</label>
          <select
            value={dateMode}
            onChange={(e) => setDateMode(e.target.value)}
            className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-teal-300 focus:ring-2 focus:ring-teal-200"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="manual">Manual date</option>
          </select>
          {dateMode === "manual" && (
            <div className="mt-3">
              <DateInput
                value={manualDate}
                onChange={setManualDate}
                className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-teal-300 focus:ring-2 focus:ring-teal-200"
              />
            </div>
          )}
        </div>

      </div>
      <div className="flex flex-wrap items-center gap-3 mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={autoMessagesEnabled}
            onChange={(e) => setAutoMessagesEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
          />
          Enable auto WhatsApp messages
        </label>
        <span className="text-sm text-slate-500">
          {autoMessagesEnabled ? "Enabled for future bot integration" : "Disabled for now"}
        </span>
      </div>
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-black min-w-[900px]">

          <thead>
            <tr className="border-b bg-gray-100">
<th className="p-4 text-left">
  Patient
</th>

<th className="p-4 text-left">
  Treatment
</th>

<th className="p-4 text-left">
  Next Visit
</th>

              <th className="p-4 text-left">
                Payment
              </th>

              <th className="p-4 text-left">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>

            {filteredPatients.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center"
                >
                  No patients found
                </td>
              </tr>
            ) : (
              filteredPatients.map(
                (patient) => {

                  const lastVisit =
                    patient.visits &&
                    patient.visits.length > 0
                      ? patient.visits[
                          patient.visits.length - 1
                        ]
                      : null;

                  const totalPaid =
                    patient.totalPaid || 0;

                  const totalFee =
                    patient.totalFee || 0;

                  return (
                    <tr
                      key={patient.id}
                      className="border-b hover:bg-gray-50"
                    >

<td className="px-4 py-3 align-top">
  <div className="flex items-center gap-3">

    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold flex items-center justify-center shadow-sm">
      {patient.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()}
    </div>

    <div>

      <div className="flex items-center gap-2">

        <Link
          href={`/patient/${patient.id}`}
          className="font-bold text-gray-900 hover:text-teal-600"
        >
          {patient.name}
        </Link>


      </div>

      <div className="text-xs text-gray-500 mt-1">
        {patient.age && `• ${patient.age} years`}
      </div>

      <div className="text-xs text-gray-500 mt-1">
        📞 {patient.phone}

          {patient.clinicName && (
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: patient.clinicColor || '#ddd' }} />
              <span>{patient.clinicName}</span>
            </div>
          )}
      </div>

    </div>

  </div>
</td>

<td className="px-4 py-3 align-top">
  <div className="font-medium">
    {patient.treatment}
    {patient.bracketType && (
      <div className="text-sm text-gray-600 mt-1">
        ({patient.bracketType})
      </div>
    )}
  </div>

  <div className="mt-2">
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${
        patient.caseStatus === "finished"
          ? "bg-teal-100 text-teal-700"
          : patient.caseStatus === "retainer"
          ? "bg-purple-100 text-purple-700"
          : patient.caseStatus === "cancelled"
          ? "bg-red-100 text-red-700"
          : "bg-green-100 text-green-700"
      }`}
    >
      {(patient.caseStatus || "active").toUpperCase()}
    </span>
  </div>

</td>

<td className="px-4 py-3 align-top">  
<div className="font-semibold text-gray-900">
  {formatDateDMY(patient.appointmentDate)}
</div>

{patient.appointmentDate < today && (
  <span className="inline-block mt-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-600">
    Overdue
  </span>
)}

  <div className="text-sm text-gray-500">
    🕒 {patient.appointmentTime || "-"}
  </div>

</td>



<td className="px-4 py-3 w-[220px] align-top">
      <div className="font-semibold text-gray-800">
    {totalPaid.toLocaleString()} / {totalFee.toLocaleString()} IQD
  </div>

  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
    <div
      className={`h-2 rounded-full ${
        totalPaid >= totalFee
          ? "bg-green-500"
          : "bg-teal-500"
      }`}
      style={{
        width: `${
          totalFee > 0
            ? Math.min(
                (totalPaid / totalFee) * 100,
                100
              )
            : 0
        }%`,
      }}
    />
  </div>

</td>

<td className="px-4 py-3 align-top">                      
<div className="flex gap-2">

  <Link
    href={`/patient/${patient.id}`}
    className="w-9 h-9 rounded-xl border border-teal-200 flex items-center justify-center text-teal-600 hover:bg-teal-50 transition"
    title="Profile"
  >
    <UserRound size={18} />
  </Link>

<button
  onClick={() => archivePatient(patient.id)}
  className="w-9 h-9 rounded-xl border border-yellow-200 flex items-center justify-center text-yellow-600 hover:bg-yellow-50 transition"
  title="Archive"
>
  <Archive size={18} />
</button>
<button
  onClick={() => promptDeletePatient(patient.id)}
  className="w-9 h-9 rounded-xl border border-red-200 flex items-center justify-center text-red-600 hover:bg-red-50 transition"
  title="Delete"
>
  <Trash2 size={18} />
</button>

</div>

                      </td>

                    </tr>
                  );
                }
              )
            )}

          </tbody>

        </table>
      </div>
    </div>
    </main>
    </div>
    {showDeletePatientModal && (
      <Modal
        title="Delete Patient"
        description="Are you sure you want to permanently delete this patient and all related records?"
        show={showDeletePatientModal}
        onCancel={() => setShowDeletePatientModal(false)}
        onConfirm={confirmDeletePatient}
        confirmLabel="Delete"
        cancelLabel="Back"
        variant="danger"
      />
    )}
    </>
  );
}
