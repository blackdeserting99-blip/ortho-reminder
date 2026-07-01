"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Modal from "../../components/Modal";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import DateInput from "../../components/DateInput";
import { formatDateDMY } from "../../lib/date";

type Visit = {
  date: string;
  time: string;
  visitNotes?: string;
  upperWire?: string;
  lowerWire?: string;
  upperArch?: string;
  lowerArch?: string;
  elasticEnabled: boolean;
  elasticType: string;
  tadsNote?: string;
  payment?: number;
  plannedUpperArch?: string;
  plannedLowerArch?: string;
  plannedElasticType?: string;
  plannedTadsNote?: string;
  plannedNotes?: string;
  nextDate?: string;
  nextTime?: string;
};

type AttachedPhoto = {
  id: string;
  name: string;
  dataUrl: string;
};

type Patient = {
  id: number;
  name: string;
  phone: string;
  address?: string;
  treatment: string;
  bracketType?: string;
  age?: number;
  appointmentDate: string;
  appointmentTime?: string;
  caseStatus?: "active" | "retainer" | "finished" | "cancelled" | "archived";
  notes?: string;
  totalFee?: number;
  totalPaid?: number;
  visits?: Visit[];
  attachments?: AttachedPhoto[];
};

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState("");
  const [tempTreatment, setTempTreatment] = useState("");
  const [treatmentActive, setTreatmentActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visitsOrder, setVisitsOrder] = useState<"newest" | "oldest">("newest");
  const [editingAppt, setEditingAppt] = useState(false);
  const [appointmentMode, setAppointmentMode] = useState("30 Days");
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");

  useEffect(() => {
    const patients = JSON.parse(localStorage.getItem("patients") || "[]");
    const foundPatient = patients.find((p: Patient) => p.id.toString() === params.id);
    setPatient(foundPatient || null);
    if (foundPatient) setTempNotes(foundPatient.notes || "");
    if (foundPatient) setTempTreatment(foundPatient.treatment || "");
    if (foundPatient) {
      setManualDate(foundPatient.appointmentDate || "");
      setManualTime(foundPatient.appointmentTime || "");
      setAppointmentMode(foundPatient.appointmentDate ? "Manual" : "30 Days");
    }
  }, [params.id]);

  const getSelectedDate = () => {
    if (appointmentMode === "Manual") return manualDate;

    const days = parseInt(appointmentMode, 10);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return futureDate.toISOString().split("T")[0];
  };

  const selectedDate = getSelectedDate();
  const isFriday = selectedDate && new Date(selectedDate).getDay() === 5;

  const saveNotes = () => {
    const patients = JSON.parse(localStorage.getItem("patients") || "[]");
    const updatedPatients = patients.map((p: any) =>
      p.id.toString() === params.id ? { ...p, notes: tempNotes } : p
    );
    localStorage.setItem("patients", JSON.stringify(updatedPatients));
    setPatient((prev) => (prev ? { ...prev, notes: tempNotes } : null));
    setEditingNotes(false);
  };

  const saveTreatment = () => {
    const patients = JSON.parse(localStorage.getItem("patients") || "[]");
    const updatedPatients = patients.map((p: any) => (p.id.toString() === params.id ? { ...p, treatment: tempTreatment } : p));
    localStorage.setItem("patients", JSON.stringify(updatedPatients));
    setPatient((prev) => (prev ? { ...prev, treatment: tempTreatment } : null));
    setTreatmentActive(false);
  };

  const saveManualAppointment = () => {
    if (!selectedDate) {
      alert("Please choose a date");
      return;
    }
    const patients = JSON.parse(localStorage.getItem("patients") || "[]");
    const updatedPatients = patients.map((p: any) => (p.id.toString() === params.id ? { ...p, appointmentDate: selectedDate, appointmentTime: manualTime } : p));
    localStorage.setItem("patients", JSON.stringify(updatedPatients));
    setPatient((prev) => (prev ? { ...prev, appointmentDate: selectedDate, appointmentTime: manualTime } : null));
    setEditingAppt(false);
  };

  const renderHighlighted = (text: string | undefined, query: string) => {
    if (!text) return <span className="text-slate-700">-</span>;
    if (!query) return <span className="text-slate-700">{text}</span>;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  const deleteVisit = (visitIndex: number) => {
    // kept for backward compatibility; actual deletion is handled by modal confirm
    const patients = JSON.parse(localStorage.getItem("patients") || "[]");
    const updatedPatients = patients.map((p: any) => {
      if (p.id.toString() !== params.id) return p;
      const visits = [...(p.visits || [])];
      const deletedPayment = visits[visitIndex]?.payment || 0;
      visits.splice(visitIndex, 1);
      return {
        ...p,
        visits,
        totalPaid: (p.totalPaid || 0) - deletedPayment,
      };
    });
    localStorage.setItem("patients", JSON.stringify(updatedPatients));
    window.location.reload();
  };

  // Modal state for deleting a visit
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const promptDeleteVisit = (visitIndex: number) => {
    setDeleteIndex(visitIndex);
    setShowDeleteModal(true);
  };

  const confirmDeleteVisit = () => {
    if (deleteIndex === null) return;
    deleteVisit(deleteIndex);
    setShowDeleteModal(false);
    setDeleteIndex(null);
  };

  // Finished-case modal state
  const [showFinishedModal, setShowFinishedModal] = useState(false);
  const [modalScheduleNow, setModalScheduleNow] = useState(false);
  const [modalDate, setModalDate] = useState("");
  const [modalTime, setModalTime] = useState("");

  const handleUnfinishFromModal = () => {
    const patients = JSON.parse(localStorage.getItem("patients") || "[]");
    const updatedPatients = patients.map((p: any) => (p.id === patient!.id ? { ...p, caseStatus: "active" } : p));
    localStorage.setItem("patients", JSON.stringify(updatedPatients));
    setShowFinishedModal(false);
    if (modalScheduleNow) {
      // persist the chosen date/time if provided
      if (modalDate) {
        const patients2 = JSON.parse(localStorage.getItem("patients") || "[]");
        const updatedPatients2 = patients2.map((p: any) => (p.id === patient!.id ? { ...p, appointmentDate: modalDate, appointmentTime: modalTime } : p));
        localStorage.setItem("patients", JSON.stringify(updatedPatients2));
      }
      router.push(`/new-appointment/${patient!.id}`);
    } else {
      // refresh current view
      router.refresh();
    }
  };

  const handleArchiveFromModal = () => {
    const patients = JSON.parse(localStorage.getItem("patients") || "[]");
    const updatedPatients = patients.map((p: any) => (p.id === patient!.id ? { ...p, previousCaseStatus: p.caseStatus, caseStatus: "archived" } : p));
    localStorage.setItem("patients", JSON.stringify(updatedPatients));
    setShowFinishedModal(false);
    router.push(`/archive`);
  };

  if (!patient) {
    return (
      <div className="flex min-h-screen bg-blue-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold text-red-600">Patient Not Found</h1>
        </main>
      </div>
    );
  }

  const lastVisit = patient.visits && patient.visits.length > 0 ? patient.visits[patient.visits.length - 1] : null;
  const totalFee = patient.totalFee || 0;
  const totalPaid = patient.totalPaid || 0;
  const remaining = totalFee - totalPaid;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "finished":
        return "text-green-600 bg-green-50";
      case "retainer":
        return "text-purple-600 bg-purple-50";
      case "cancelled":
        return "text-red-600 bg-red-50";
      case "archived":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-blue-600 bg-blue-50";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "finished":
        return "✅ Finished";
      case "retainer":
        return "🦷 Retainer";
      case "cancelled":
        return "❌ Cancelled";
      case "archived":
        return "📦 Archived";
      default:
        return "🟢 Active";
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row min-h-screen bg-blue-50">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 w-full">
          {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Patient Profile</h1>
          <p className="text-slate-500 mt-3">Patient Record & Treatment Summary</p>
          <span className="sr-only">Patient ID: {patient.id}</span>
        </div>

        {/* Patient Info & Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-sm text-slate-500 mb-2">Patient Details</p>
              <p className="text-lg font-semibold text-slate-900 mb-1">{patient.name}</p>
              <p className="text-slate-600 mb-1">📞 {patient.phone}</p>
              <p className="text-slate-600 mb-1">{patient.address || "Address not provided"}</p>
              <p className="text-slate-600 text-sm">Age: {patient.age ?? "Not provided"}</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {(patient.appointmentDate === "" || !patient.appointmentDate) && patient.caseStatus !== "finished" && (
                <Link
                  href={`/new-appointment/${patient.id}`}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium transition"
                >
                  New Appointment
                </Link>
              )}
              <Link
                href={`/edit-patient/${patient.id}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition"
              >
                Edit Patient
              </Link>
              {patient.caseStatus === "finished" ? (
                <button
                  onClick={() => setShowFinishedModal(true)}
                  className={`text-white px-5 py-2.5 rounded-lg font-medium transition bg-emerald-700 hover:bg-emerald-800`}
                >
                  ✅ Finished Case
                </button>
              ) : (
                <Link
                  href={`/finish-case/${patient.id}`}
                  className={`text-white px-5 py-2.5 rounded-lg font-medium transition bg-green-600 hover:bg-green-700`}
                >
                  Finish Case
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Patient Attachments */}
        {patient.attachments && patient.attachments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Patient Photos</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {patient.attachments.map((photo) => (
                <div key={photo.id} className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
                  <img src={photo.dataUrl} alt={photo.name} className="h-56 w-full object-cover" />
                  <div className="p-3">
                    <p className="text-sm font-medium text-slate-700 truncate">{photo.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Treatment Info */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Treatment Information</h2>
            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Treatment Type</p>
                  <p className="text-lg font-semibold text-slate-900">{patient.treatment}</p>
                  {patient.bracketType && <p className="text-slate-600 text-sm mt-1">{patient.bracketType}</p>}
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Case Status</p>
                  <span className={`inline-block px-4 py-2 rounded-full font-semibold text-sm ${getStatusColor(patient.caseStatus)}`}>
                    {getStatusLabel(patient.caseStatus)}
                  </span>
                </div>
                {lastVisit && (
                  <>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Current Wire</p>
                      <p className="text-slate-900">
                        Upper: <span className="font-semibold">{lastVisit.upperWire || lastVisit.upperArch || "-"}</span> | Lower:{" "}
                        <span className="font-semibold">{lastVisit.lowerWire || lastVisit.lowerArch || "-"}</span>
                      </p>
                    </div>
                    {lastVisit.elasticEnabled && (
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Current Elastics</p>
                        <p className="text-slate-900 font-semibold">{lastVisit.elasticType}</p>
                      </div>
                    )}
                    {lastVisit.tadsNote && (
                      <div>
                        <p className="text-sm text-slate-500 mb-1">TADs</p>
                        <p className="text-slate-900">{lastVisit.tadsNote}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-sm text-slate-500 mb-2">Treatment Plan</p>
                <textarea
                  rows={8}
                  value={tempTreatment}
                  readOnly={!treatmentActive}
                  onFocus={() => setTreatmentActive(true)}
                  onBlur={() => setTreatmentActive(false)}
                  onChange={(e) => setTempTreatment(e.target.value)}
                  placeholder="Tap to edit treatment plan"
                  className={`w-full min-h-[220px] rounded-2xl p-3 text-slate-900 transition ${treatmentActive ? "bg-white ring-2 ring-blue-500" : "bg-slate-100 border-slate-300 text-slate-600"}`}
                />
                <div className="mt-4 flex gap-2">
                  <button onClick={saveTreatment} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">
                    Save
                  </button>
                  <button
                    onClick={() => setTempTreatment(patient.treatment || "")}
                    className="bg-slate-200 text-slate-900 px-4 py-2 rounded-lg font-medium"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Financial Summary</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Total Fee</p>
                <p className="text-2xl font-bold text-slate-900">{totalFee.toLocaleString()} IQD</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                <p className="text-sm text-emerald-600">Paid</p>
                <p className="text-xl font-bold text-emerald-700">{totalPaid.toLocaleString()} IQD</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <p className="text-sm text-red-600">Remaining</p>
                <p className="text-xl font-bold text-red-700">{remaining.toLocaleString()} IQD</p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Appointment */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Next Appointment</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-500 mb-1">Date</p>
              <p className="text-lg font-semibold text-slate-900">{patient.appointmentDate ? formatDateDMY(patient.appointmentDate) : "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Time</p>
              <p className="text-lg font-semibold text-slate-900">{patient.appointmentTime || "Not set"}</p>
            </div>
          </div>
          <div className="mt-4">
            {editingAppt ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Next Appointment Date</label>
                  <select value={appointmentMode} onChange={(e) => setAppointmentMode(e.target.value)} className="w-full border border-slate-300 p-2 rounded-lg">
                    <option>15 Days</option>
                    <option>30 Days</option>
                    <option>45 Days</option>
                    <option>60 Days</option>
                    <option>Manual</option>
                  </select>
                </div>
                {appointmentMode === "Manual" && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Appointment Date</label>
                    <DateInput
                      value={manualDate}
                      onChange={setManualDate}
                      className="w-full border border-slate-300 p-2 rounded-lg"
                    />
                  </div>
                )}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-700">Selected Date</p>
                  <p className="text-sm text-slate-900">{selectedDate || "-"}</p>
                  {isFriday && <p className="mt-2 text-sm text-orange-700">Note: This appointment is scheduled on Friday.</p>}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Appointment Time</label>
                  <select value={manualTime} onChange={(e) => setManualTime(e.target.value)} className="w-full border border-slate-300 p-2 rounded-lg">
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
                  <button onClick={saveManualAppointment} className="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
                  <button onClick={() => setEditingAppt(false)} className="bg-slate-300 px-3 py-1 rounded">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setEditingAppt(true)} className="bg-emerald-600 text-white px-3 py-1 rounded">Change Date</button>
            )}
          </div>
        </div>

        {/* Next Visit Plan */}
        {lastVisit && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Next Visit Plan</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">Planned Wire</p>
                <p className="text-slate-900">
                  Upper: <span className="font-semibold">{lastVisit.plannedUpperArch || "-"}</span> | Lower:{" "}
                  <span className="font-semibold">{lastVisit.plannedLowerArch || "-"}</span>
                </p>
              </div>
              {lastVisit.plannedElasticType && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Planned Elastics</p>
                  <p className="text-slate-900 font-semibold">{lastVisit.plannedElasticType}</p>
                </div>
              )}
              {lastVisit.plannedTadsNote && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Planned TADs</p>
                  <p className="text-slate-900">{lastVisit.plannedTadsNote}</p>
                </div>
              )}
              {lastVisit.plannedNotes && (
                <div className="col-span-2">
                  <p className="text-sm text-slate-500 mb-1">Notes</p>
                  <p className="text-slate-900 whitespace-pre-wrap">{lastVisit.plannedNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clinical Notes */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">Clinical Notes</h2>
            <div className="flex gap-2 items-center">
              <input placeholder="Search notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="border p-2 rounded" />
              <button onClick={() => setSearchQuery("")} className="text-sm text-slate-500">Clear</button>
            </div>
          </div>
          {editingNotes ? (
            <div>
              <textarea
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                rows={5}
                className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Add notes here..."
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={saveNotes}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
                >
                  Save Notes
                </button>
                <button
                  onClick={() => {
                    setEditingNotes(false);
                    setTempNotes(patient.notes || "");
                  }}
                  className="bg-slate-300 hover:bg-slate-400 text-slate-900 px-6 py-2 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
              <div
                onClick={() => setEditingNotes(true)}
                className="bg-slate-50 rounded-lg p-4 cursor-pointer hover:bg-slate-100 transition border border-slate-200 min-h-24 flex items-center"
              >
                <p className="text-slate-700 whitespace-pre-wrap">{renderHighlighted(patient.notes || "", searchQuery) || <span className="text-slate-400">Click to add notes...</span>}</p>
              </div>
          )}
        </div>

        {/* Visit History */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Visit History</h2>
          {!patient.visits || patient.visits.length === 0 ? (
            <p className="text-slate-500">No visits recorded yet.</p>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-slate-500">Showing visits ({patient.visits.length})</div>
                <div className="flex gap-2">
                  <button onClick={() => setVisitsOrder(visitsOrder === "newest" ? "oldest" : "newest")} className="bg-slate-200 px-3 py-1 rounded">Order: {visitsOrder === "newest" ? "Newest" : "Oldest"}</button>
                </div>
              </div>

              <div className="space-y-4">
                {(() => {
                  const list = visitsOrder === "newest" ? [...patient.visits].slice().reverse() : [...patient.visits];
                  const q = searchQuery.trim().toLowerCase();
                  return list.filter((visit) => {
                    if (!q) return true;
                    return (
                      (visit.visitNotes && visit.visitNotes.toLowerCase().includes(q)) ||
                      (visit.plannedNotes && visit.plannedNotes.toLowerCase().includes(q))
                    );
                  }).map((visit, index) => {
                    const realIndex = visitsOrder === "newest" ? patient.visits!.length - 1 - index : index;
                    return (
                      <div key={index} className="border border-slate-200 rounded-xl p-6 bg-slate-50 hover:bg-slate-100 transition">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-sm text-slate-500">Visit #{realIndex + 1}</p>
                            <p className="text-lg font-semibold text-slate-900">{visit.date}</p>
                            <p className="text-slate-600">{visit.time}</p>
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/edit-visit/${patient.id}/${realIndex}`} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Edit</Link>
                            <button onClick={() => deleteVisit(realIndex)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Delete</button>
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Wire</p>
                            <p className="font-semibold text-slate-900">
                              Upper: {visit.upperWire || visit.upperArch || "-"} • Lower: {visit.lowerWire || visit.lowerArch || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Elastics</p>
                            <p className={`font-semibold ${visit.elasticEnabled ? "text-emerald-600" : "text-slate-500"}`}>
                              {visit.elasticEnabled ? visit.elasticType : "None"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">TADs</p>
                            <p className="font-semibold text-slate-900">{visit.tadsNote || "None"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Notes</p>
                            <p className={`whitespace-pre-wrap ${visit.visitNotes ? "text-slate-700" : "text-slate-400"}`}>
                              {visit.visitNotes || "No notes recorded"}
                            </p>
                          </div>
                          {visit.payment && (<div><p className="text-xs text-slate-500 mb-1">Payment</p><p className="font-semibold text-emerald-700">{visit.payment.toLocaleString()} IQD</p></div>)}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
        <Modal
          title="Finished Case"
          description="Choose an action for this finished case."
          show={showFinishedModal}
          onCancel={() => setShowFinishedModal(false)}
          onConfirm={handleUnfinishFromModal}
          confirmLabel="Unfinish"
          cancelLabel="Close"
        >
          <div className="space-y-3">
            <div className="p-3 border rounded">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Reopen Case</div>
                  <div className="text-sm text-slate-500">Return the case to active status</div>
                </div>
                <div>
                  <button onClick={() => { setModalScheduleNow(!modalScheduleNow); }} className={`px-3 py-1 rounded ${modalScheduleNow ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>{modalScheduleNow ? 'Schedule now' : 'Reopen'}</button>
                </div>
              </div>
              {modalScheduleNow && (
                <div className="mt-3 flex gap-2">
                  <input type="date" value={modalDate} onChange={(e) => setModalDate(e.target.value)} className="border p-2 rounded w-1/2" />
                  <input type="time" value={modalTime} onChange={(e) => setModalTime(e.target.value)} className="border p-2 rounded w-1/2" />
                </div>
              )}
            </div>

            <div className="p-3 border rounded">
              <div className="font-semibold">Archive Record</div>
              <div className="text-sm text-slate-500">Archive the patient's record</div>
              <div className="mt-3">
                  <button onClick={handleArchiveFromModal} className="bg-slate-700 text-white px-4 py-2 rounded">Archive Record</button>
              </div>
            </div>
          </div>
        </Modal>
      </main>
    </div>
    {showDeleteModal && (
      <Modal
        title="Delete Visit"
        description="Are you sure you want to delete this visit? This action cannot be undone."
        show={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteVisit}
        confirmLabel="Delete"
        cancelLabel="Back"
        variant="danger"
      />
    )}
    </>
  );
}