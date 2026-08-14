"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import { CalendarDays, CircleDollarSign, StickyNote, Clock3, Pencil, Trash2 } from "lucide-react";
import { formatDateDMY, convertTo12Hour } from "../../lib/date";
import { CLINIC_COLORS } from "../../lib/patient";
import { useAuth } from "../../lib/auth-context";

type Patient = {
  id: number;
  name: string;
  phone?: string;
  age?: number | string;
  address?: string;
  occupation?: string;
  clinicName?: string;
  clinicColor?: string;
  treatment?: string;
  bracketType?: string;
  damonTorques?: string;
  elasticEnabled?: boolean;
  elasticType?: string;
  tadsNote?: string;
  wireSettings?: Record<string, any>;
  notes?: string;
  caseSheet?: string;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  totalFee?: number | null;
  totalPaid?: number | null;
  caseStatus?: string;
  visits?: any[];
  galleryPhotos?: any[];
  caseSheetAttachments?: any[];
};

export default function PatientProfilePage() {
  const params = useParams();
  const id = params?.id ? String(params.id) : "";
  const { status: authStatus } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    phone: "",
    age: "",
    address: "",
    occupation: "",
    clinicName: "",
    clinicColor: "",
    treatment: "",
    bracketType: "",
    damonTorques: "",
    notes: "",
    caseSheet: "",
    appointmentDate: "",
    appointmentTime: "",
    totalFee: "",
    totalPaid: "",
    caseStatus: "active",
  });
  const [manualPayments, setManualPayments] = useState<any[]>([]);
  const [galleryUploadFiles, setGalleryUploadFiles] = useState<FileList | null>(null);
  const [galleryUploadType, setGalleryUploadType] = useState<"PHOTO" | "XRAY" | "SCAN" | "OTHER">("PHOTO");
  const [galleryUploadCategory, setGalleryUploadCategory] = useState<string>("Extraoral Front");
  const [galleryUploadMessage, setGalleryUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [galleryDeletingIds, setGalleryDeletingIds] = useState<string[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "CASH",
    paymentDate: new Date().toISOString().slice(0, 10),
    reason: "",
    reference: "",
  });
  const [paymentMessage, setPaymentMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "visits" | "gallery" | "payments">("overview");

  useEffect(() => {
    // Wait for the shared auth state to resolve so this doesn't race /api/me
    // on the very first load.
    if (authStatus === "loading") return;

    let cancelled = false;

    const load = async () => {
      if (!id) {
        setErrorMessage("Patient id missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const res = await fetch(`/api/patients/${id}`, { cache: "no-store", credentials: "same-origin" });
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Unable to load patient profile.");
        }

        const foundPatient = await res.json();
        if (cancelled) return;
        if (!foundPatient || !foundPatient.id) {
          throw new Error("Patient profile could not be loaded.");
        }

        setPatient(foundPatient);
        setFormState({
          name: foundPatient.name || "",
          phone: foundPatient.phone || "",
          age: foundPatient.age ? String(foundPatient.age) : "",
          address: foundPatient.address || "",
          occupation: foundPatient.occupation || "",
          clinicName: foundPatient.clinicName || "",
          clinicColor: foundPatient.clinicColor || "",
          treatment: foundPatient.treatment || "",
          bracketType: foundPatient.bracketType || "",
          damonTorques: foundPatient.damonTorques || "",
          notes: foundPatient.notes || "",
          caseSheet: foundPatient.caseSheet || "",
          appointmentDate: foundPatient.appointmentDate || "",
          appointmentTime: foundPatient.appointmentTime || "",
          totalFee: foundPatient.totalFee != null ? String(foundPatient.totalFee) : "",
          totalPaid: foundPatient.totalPaid != null ? String(foundPatient.totalPaid) : "",
          caseStatus: foundPatient.caseStatus || "active",
        });

        try {
          const p = await fetch(`/api/patients/${id}/payments`, { cache: "no-store", credentials: "same-origin" });
          const payments = p.ok ? await p.json().catch(() => []) : [];
          if (cancelled) return;
          setManualPayments(Array.isArray(payments) ? payments : []);
        } catch (_) {
          if (!cancelled) setManualPayments([]);
        }
      } catch (error: any) {
        if (cancelled) return;
        setPatient(null);
        setManualPayments([]);
        setErrorMessage(error?.message || "Unable to load patient profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [id, authStatus]);

  const visitPaymentsTotal = useMemo(() => (patient?.visits ?? []).reduce((s: number, v: any) => s + (Number(v.paymentCollected) || 0), 0), [patient]);
  const manualPaymentsTotal = useMemo(() => manualPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0), [manualPayments]);
  const totalPayments = visitPaymentsTotal + manualPaymentsTotal;
  const totalFee = Number(patient?.totalFee || 0);
  const remainingBalance = totalFee - totalPayments;
  const displayedTotalFee = isEditing ? Number(formState.totalFee || 0) : totalFee;
  const displayedTotalPaid = isEditing ? Number(formState.totalPaid || 0) : totalPayments;
  const displayedRemaining = isEditing ? displayedTotalFee - displayedTotalPaid : remainingBalance;

  const galleryCategories: Record<string, string[]> = {
    PHOTO: [
      "Extraoral Front",
      "Extraoral Smile",
      "Extraoral Profile",
      "Intraoral Front",
      "Right Buccal",
      "Left Buccal",
      "Upper Occlusal",
      "Lower Occlusal",
      "Other",
    ],
    XRAY: ["OPG", "Lateral Ceph", "PA Ceph", "CBCT", "Other"],
    SCAN: ["Upper STL", "Lower STL", "Digital Scan", "Other"],
    OTHER: ["Other"],
  };

  const headerThumbnail = useMemo(() => {
    const pick = (patient?.caseSheetAttachments && patient.caseSheetAttachments[0]) || (patient?.galleryPhotos && patient.galleryPhotos[0]);
    if (!pick) return null;
    return pick.dataUrl || pick.storagePath || null;
  }, [patient]);

  const lastVisit = (patient?.visits && patient.visits.length > 0) ? patient.visits[patient.visits.length - 1] : null;
  const resolveWireDisplayValue = (key: "upper" | "lower") => {
    const wireSettings = patient?.wireSettings ?? {};
    const visitValue = key === "upper"
      ? (lastVisit?.upperWire || lastVisit?.upperArch || null)
      : (lastVisit?.lowerWire || lastVisit?.lowerArch || null);
    const patientValue = key === "upper"
      ? (wireSettings.upperDamonWire || (wireSettings.upperWireGauge ? `${wireSettings.upperWireGauge} ${wireSettings.upperWireMaterial || ""}`.trim() : null))
      : (wireSettings.lowerDamonWire || (wireSettings.lowerWireGauge ? `${wireSettings.lowerWireGauge} ${wireSettings.lowerWireMaterial || ""}`.trim() : null));
    return visitValue || patientValue || "—";
  };
  const resolveElasticDisplayValue = () => {
    if (!patient?.elasticEnabled) {
      return "—";
    }
    return patient.elasticType || "Enabled";
  };
  const resolveTadsDisplayValue = () => {
    if (!patient?.elasticEnabled || !patient?.tadsNote) {
      return "—";
    }
    return patient.tadsNote;
  };
  const lastVisitOrFallback = lastVisit || {
    upperWire: resolveWireDisplayValue("upper"),
    lowerWire: resolveWireDisplayValue("lower"),
    elastics: resolveElasticDisplayValue(),
    tads: resolveTadsDisplayValue(),
    visitNotes: patient?.notes || null,
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const handleGalleryUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !galleryUploadFiles || galleryUploadFiles.length === 0) {
      setGalleryUploadMessage({ type: "error", text: "Please select at least one file." });
      return;
    }

    setGalleryUploadMessage(null);
    const files = Array.from(galleryUploadFiles);

    try {
      const nextGalleryPhotos = await Promise.all(
        files.map(async (file) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          originalName: file.name,
          dataUrl: await readFileAsDataUrl(file),
          mimeType: file.type || "application/octet-stream",
          fileType: galleryUploadType,
          category: galleryUploadCategory,
          uploadedAt: new Date().toISOString(),
          source: "gallery",
        }))
      );

      const response = await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          galleryPhotos: [
            ...(Array.isArray(patient?.galleryPhotos) ? patient.galleryPhotos : []),
            ...nextGalleryPhotos,
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to upload gallery files.");
      }

      const updated = await response.json();
      setPatient(updated);
      setGalleryUploadFiles(null);
      setGalleryUploadMessage({ type: "success", text: "Gallery upload saved." });
    } catch (error: any) {
      setGalleryUploadMessage({ type: "error", text: error?.message || "Upload failed." });
    }
  };

  const handleDeleteGalleryPhoto = async (photoId: string) => {
    if (!id) return;
    setGalleryDeletingIds((current) => [...current, photoId]);

    try {
      const response = await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          galleryPhotos: (patient?.galleryPhotos ?? []).filter((photo) => photo.id !== photoId),
          caseSheetAttachments: (patient?.caseSheetAttachments ?? []).filter((photo) => photo.id !== photoId),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || "Failed to delete photo.");
      }

      const updated = await response.json();
      setPatient(updated);
      setGalleryUploadMessage({ type: "success", text: "Photo deleted." });
    } catch (error: any) {
      setGalleryUploadMessage({ type: "error", text: error?.message || "Unable to delete photo." });
    } finally {
      setGalleryDeletingIds((current) => current.filter((id) => id !== photoId));
    }
  };

  const handleAddPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !paymentForm.amount) {
      setPaymentMessage({ type: "error", text: "Amount is required." });
      return;
    }

    setPaymentSubmitting(true);
    setPaymentMessage(null);

    try {
      const response = await fetch(`/api/patients/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(paymentForm.amount),
          method: paymentForm.method,
          paymentDate: paymentForm.paymentDate,
          reason: paymentForm.reason || undefined,
          reference: paymentForm.reference || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Payment save failed.");
      }

      const created = await response.json();
      setManualPayments((current) => [...current, created]);
      setPaymentForm({ amount: "", method: "CASH", paymentDate: new Date().toISOString().slice(0, 10), reason: "", reference: "" });
      setPaymentMessage({ type: "success", text: "Payment recorded." });
    } catch (error: any) {
      setPaymentMessage({ type: "error", text: error?.message || "Unable to save payment." });
    } finally {
      setPaymentSubmitting(false);
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <main className="mx-auto max-w-6xl p-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">Patient id missing.</div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <main className="mx-auto max-w-6xl p-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-slate-700">Loading patient profile...</div>
          </div>
          <div className="mb-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Clinical</div>
              <div className="mt-2 text-sm text-slate-700">
                <div><strong>Elastics:</strong> {resolveElasticDisplayValue()}</div>
                <div><strong>TADs:</strong> {resolveTadsDisplayValue()}</div>
                <div><strong>Upper Wire:</strong> {resolveWireDisplayValue("upper")}</div>
                <div><strong>Lower Wire:</strong> {resolveWireDisplayValue("lower")}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <main className="mx-auto max-w-6xl p-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="text-lg font-semibold text-slate-900">Patient profile unavailable</div>
            <div className="text-slate-700">{errorMessage ?? "The patient profile could not be loaded."}</div>
            <div>
              <Link href="/patients" className="rounded-full bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700">
                Back to Patients
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    if (digits.length <= 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)} ${digits.slice(10)}`;
  };

  const populateForm = (patient: Patient) => {
    setFormState({
      name: patient.name || "",
      phone: patient.phone || "",
      age: patient.age ? String(patient.age) : "",
      address: patient.address || "",
      occupation: patient.occupation || "",
      clinicName: patient.clinicName || "",
      clinicColor: patient.clinicColor || "",
      treatment: patient.treatment || "",
      bracketType: patient.bracketType || "",
      damonTorques: patient.damonTorques || "",
      notes: patient.notes || "",
      caseSheet: patient.caseSheet || "",
      appointmentDate: patient.appointmentDate || "",
      appointmentTime: patient.appointmentTime || "",
      totalFee: patient.totalFee != null ? String(patient.totalFee) : "",
      totalPaid: patient.totalPaid != null ? String(patient.totalPaid) : "",
      caseStatus: patient.caseStatus || "active",
    });
  };

  const handleSaveProfile = async () => {
    if (!id) return;
    setSaveLoading(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.name,
          phone: formState.phone,
          address: formState.address,
          occupation: formState.occupation,
          clinicName: formState.clinicName || undefined,
          clinicColor: formState.clinicColor || undefined,
          age: formState.age ? Number(formState.age) : undefined,
          treatment: formState.treatment,
          bracketType: formState.bracketType || undefined,
          damonTorques: formState.damonTorques !== "" ? formState.damonTorques : null,
          notes: formState.notes,
          caseSheet: formState.caseSheet,
          appointmentDate: formState.appointmentDate || undefined,
          appointmentTime: formState.appointmentTime || undefined,
          totalFee: formState.totalFee ? Number(formState.totalFee.replace(/,/g, "")) : undefined,
          totalPaid: formState.totalPaid ? Number(formState.totalPaid.replace(/,/g, "")) : undefined,
          caseStatus: formState.caseStatus,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || "Failed to save profile.");
      }

      const updated = await response.json();
      setPatient(updated);
      populateForm(updated);
      setIsEditing(false);
      setSaveMessage({ type: "success", text: "Profile saved." });
    } catch (error: any) {
      setSaveMessage({ type: "error", text: error?.message || "Failed to save profile." });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (patient) {
      populateForm(patient);
    }
    setIsEditing(false);
    setSaveMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="mx-auto max-w-6xl p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-slate-100">
                {isEditing ? (
                  <div className="h-full w-full bg-slate-200" />
                ) : headerThumbnail ? (
                  // may be data URL or path
                  <img src={headerThumbnail} alt={patient?.name || "photo"} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-slate-200" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold text-slate-900">{patient?.name ?? "Patient"}</h1>
                <p className="truncate text-sm text-slate-500">{patient?.phone ?? "-"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${activeTab === "overview" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700"}`}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </button>
              <button
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${activeTab === "visits" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700"}`}
                onClick={() => setActiveTab("visits")}
              >
                Visits
              </button>
              <button
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${activeTab === "gallery" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700"}`}
                onClick={() => setActiveTab("gallery")}
              >
                Gallery
              </button>
              <button
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${activeTab === "payments" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700"}`}
                onClick={() => setActiveTab("payments")}
              >
                Payments
              </button>
              <Link
                href={`/patients/${id}/case-sheet`}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Patient CaseSheet
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    void handleSaveProfile();
                    return;
                  }
                  setIsEditing(true);
                  setSaveMessage(null);
                }}
                disabled={saveLoading}
                className="flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" />
                {isEditing ? (saveLoading ? "Saving..." : "Save changes") : "Edit profile"}
              </button>
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6">
          {/* Persistent quick summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6 mb-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Treatment</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{patient?.treatment ?? "—"}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Last Visit</div>
              <div className="mt-2 text-sm text-slate-700">
                <div>
                  <strong>Upper Wire:</strong>{" "}
                  {resolveWireDisplayValue("upper")}
                </div>
                <div>
                  <strong>Lower Wire:</strong>{" "}
                  {resolveWireDisplayValue("lower")}
                </div>
                <div><strong>Elastics:</strong> {resolveElasticDisplayValue()}</div>
                <div><strong>TADs:</strong> {resolveTadsDisplayValue()}</div>
                {lastVisitOrFallback?.visitNotes || patient?.notes ? <div className="mt-2 text-sm text-slate-500">{lastVisitOrFallback?.visitNotes || patient?.notes}</div> : null}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Total fee</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{displayedTotalFee.toLocaleString()} IQD</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Total paid</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{displayedTotalPaid.toLocaleString()} IQD</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Remaining</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{displayedRemaining.toLocaleString()} IQD</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Next appointment</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{patient?.appointmentDate ? `${patient.appointmentDate} ${patient.appointmentTime ? convertTo12Hour(patient.appointmentTime) : ""}` : "Not scheduled"}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Case status</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{patient?.caseStatus ?? "Active"}</div>
            </div>
          </div>
          {activeTab === "overview" && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Clock3 className="text-teal-600" /> Overview
                </div>
              </div>
              {saveMessage ? (
                <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${saveMessage.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {saveMessage.text}
                </div>
              ) : null}
              <div className="mt-4 text-slate-700 space-y-3">
                {isEditing ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Name
                        <input
                          type="text"
                          value={formState.name}
                          onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Phone
                        <input
                          type="tel"
                          value={formState.phone}
                          onChange={(event) => setFormState((prev) => ({ ...prev, phone: formatPhoneInput(event.target.value) }))}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                        />
                      </label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Age
                        <input
                          type="number"
                          min="0"
                          value={formState.age}
                          onChange={(event) => setFormState((prev) => ({ ...prev, age: event.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Address
                        <input
                          type="text"
                          value={formState.address}
                          onChange={(event) => setFormState((prev) => ({ ...prev, address: event.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                        />
                      </label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Occupation
                        <input
                          type="text"
                          value={formState.occupation}
                          onChange={(event) => setFormState((prev) => ({ ...prev, occupation: event.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Clinic Name
                        <input
                          type="text"
                          value={formState.clinicName}
                          onChange={(event) => setFormState((prev) => ({ ...prev, clinicName: event.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                        />
                      </label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Clinic Color
                        <div className="mt-2 flex flex-wrap gap-2">
                          {CLINIC_COLORS.map((color) => {
                            const selected = formState.clinicColor === color;
                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setFormState((prev) => ({ ...prev, clinicColor: color }))}
                                className={`h-10 w-10 rounded-full border ${selected ? "border-slate-900 ring-2 ring-teal-500" : "border-slate-300"}`}
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            );
                          })}
                        </div>
                      </label>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">
                          Treatment
                          <select
                            value={formState.treatment}
                            onChange={(event) => {
                              const treatmentValue = event.target.value;
                              setFormState((prev) => ({
                                ...prev,
                                treatment: treatmentValue,
                                bracketType: treatmentValue === "Fixed Braces" ? prev.bracketType || "MBT System" : "",
                              }));
                            }}
                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                          >
                            <option value="Fixed Braces">Fixed Braces</option>
                            <option value="Clear Aligners">Clear Aligners</option>
                            <option value="Retainers">Retainers</option>
                            <option value="Myofunctional Appliance">Myofunctional Appliance</option>
                          </select>
                        </label>
                      </div>
                    </div>
                    {formState.treatment === "Fixed Braces" ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-medium text-slate-700">
                          Bracket Type
                          <select
                            value={formState.bracketType}
                            onChange={(event) => {
                              const nextBracket = event.target.value;
                              setFormState((prev) => ({
                                ...prev,
                                bracketType: nextBracket,
                                damonTorques: nextBracket === "Damon System" ? prev.damonTorques : "",
                              }));
                            }}
                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                          >
                            <option>MBT System</option>
                            <option>Roth System</option>
                            <option>Damon System</option>
                          </select>
                        </label>
                        {formState.bracketType === "Damon System" ? (
                          <label className="block text-sm font-medium text-slate-700">
                            Damon Torques
                            <input
                              type="text"
                              value={formState.damonTorques}
                              onChange={(event) => setFormState((prev) => ({ ...prev, damonTorques: event.target.value }))}
                              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                              placeholder="Enter Damon torques"
                            />
                          </label>
                        ) : null}
                        <label className="block text-sm font-medium text-slate-700">
                          Case Status
                          <select
                            value={formState.caseStatus}
                            onChange={(event) => setFormState((prev) => ({ ...prev, caseStatus: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                          >
                            <option value="active">Active</option>
                            <option value="retainer">Retainer</option>
                            <option value="finished">Finished</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="archived">Archived</option>
                          </select>
                        </label>
                      </div>
                    ) : null}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Appointment Date
                        <input
                          type="date"
                          value={formState.appointmentDate}
                          onChange={(event) => setFormState((prev) => ({ ...prev, appointmentDate: event.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Appointment Time
                        <input
                          type="text"
                          value={formState.appointmentTime}
                          onChange={(event) => setFormState((prev) => ({ ...prev, appointmentTime: event.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                          placeholder="04:00 PM"
                        />
                      </label>
                    </div>
                    <label className="block text-sm font-medium text-slate-700">
                      Notes
                      <textarea
                        value={formState.notes}
                        onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                        rows={4}
                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Total Fee
                        <input
                          type="number"
                          value={formState.totalFee}
                          onChange={(event) => setFormState((prev) => ({ ...prev, totalFee: event.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Total Paid
                        <input
                          type="number"
                          value={formState.totalPaid}
                          onChange={(event) => setFormState((prev) => ({ ...prev, totalPaid: event.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-slate-700 space-y-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><strong>Name:</strong> {patient?.name ?? "—"}</div>
                      <div><strong>Phone:</strong> {patient?.phone ?? "—"}</div>
                      {patient?.age ? <div><strong>Age:</strong> {patient.age}</div> : null}
                      {patient?.address ? <div><strong>Address:</strong> {patient.address}</div> : null}
                      {patient?.occupation ? <div><strong>Occupation:</strong> {patient.occupation}</div> : null}
                      {patient?.clinicName ? <div><strong>Clinic:</strong> {patient.clinicName}</div> : null}
                    </div>
                    <div>
                      <p><strong>Treatment:</strong> {patient?.treatment ?? "—"}</p>
                      <p className="mt-2"><strong>Notes:</strong> {patient?.notes ?? "—"}</p>
                      <p className="mt-2"><strong>Next appointment:</strong> {patient?.appointmentDate ? `${patient.appointmentDate} ${patient.appointmentTime ? convertTo12Hour(patient.appointmentTime) : ""}` : "Not scheduled"}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === "visits" && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Clock3 className="text-teal-600" /> Visits
              </div>
              <div className="mt-4 text-slate-700">
                {(patient?.visits && patient.visits.length > 0) ? (
                  <ul className="space-y-3">
                    {patient.visits.map((v: any, idx: number) => (
                      <li key={v.id} className="rounded-xl border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">Visit #{idx + 1} — {v.date}</div>
                            <div className="text-sm text-slate-600">{v.treatmentNotes || v.doctorNotes || "No notes"}</div>
                          </div>
                          <div className="text-sm text-slate-900">{(Number(v.paymentCollected) || 0).toLocaleString()} IQD</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>No visits recorded yet.</div>
                )}
                <div className="mt-4">
                  <Link href={`/patients/${id}/edit-visit`} className="rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white">Add visit</Link>
                </div>
              </div>
            </section>
          )}

          {activeTab === "gallery" && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Clock3 className="text-teal-600" /> Gallery
              </div>
              <div className="mt-4 text-slate-700">
                <form className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4" onSubmit={handleGalleryUpload}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-slate-700">
                      File(s)
                      <input
                        type="file"
                        accept="image/*,.pdf,.stl"
                        multiple
                        onChange={(event) => setGalleryUploadFiles(event.target.files)}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-700">
                      Type
                      <select
                        value={galleryUploadType}
                        onChange={(event) => {
                          const nextType = event.target.value as "PHOTO" | "XRAY" | "SCAN" | "OTHER";
                          setGalleryUploadType(nextType);
                          const nextCategory = galleryCategories[nextType]?.[0] || "Other";
                          setGalleryUploadCategory(nextCategory);
                        }}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                      >
                        <option value="PHOTO">Photo</option>
                        <option value="XRAY">X-Ray</option>
                        <option value="SCAN">Scanner / STL</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </label>
                  </div>
                  <label className="space-y-2 text-sm text-slate-700">
                    Category
                    <select
                      value={galleryUploadCategory}
                      onChange={(event) => setGalleryUploadCategory(event.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                    >
                      {(galleryCategories[galleryUploadType] || ["Other"]).map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="text-sm text-slate-600">Choose files and press Upload to save to the patient gallery.</div>
                    <button type="submit" className="rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white">Upload</button>
                  </div>
                  {galleryUploadMessage ? (
                    <div className={`rounded-2xl px-4 py-3 text-sm ${galleryUploadMessage.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {galleryUploadMessage.text}
                    </div>
                  ) : null}
                </form>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {((patient?.caseSheetAttachments ?? []).concat(patient?.galleryPhotos ?? [])).length === 0 ? (
                    <div className="text-slate-600">No images available.</div>
                  ) : (
                    ((patient?.caseSheetAttachments ?? []).concat(patient?.galleryPhotos ?? [])).map((m: any) => {
                      const isDeleting = galleryDeletingIds.includes(m.id);
                      return (
                        <div key={m.id} className="rounded-xl overflow-hidden border bg-slate-50 relative">
                          {m.dataUrl ? (
                            <img src={m.dataUrl} alt={m.originalName || m.name} className="h-48 w-full object-cover" />
                          ) : (
                            <div className="h-48 w-full bg-slate-100 flex items-center justify-center text-slate-400">No preview</div>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleDeleteGalleryPhoto(m.id)}
                            disabled={isDeleting}
                            className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-white"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                          <div className="p-2 text-sm text-slate-700">{m.originalName || m.name}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === "payments" && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <CircleDollarSign className="text-teal-600" /> Payments
              </div>
              <div className="mt-4 text-slate-700 space-y-6">
                <form className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4" onSubmit={handleAddPayment}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-slate-700">
                      Amount (IQD)
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="1"
                        value={paymentForm.amount}
                        onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                        placeholder="Amount"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-700">
                      Method
                      <select
                        value={paymentForm.method}
                        onChange={(event) => setPaymentForm((prev) => ({ ...prev, method: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                      >
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="BANK_TRANSFER">Bank transfer</option>
                        <option value="UPI">UPI</option>
                        <option value="INSURANCE">Insurance</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-slate-700">
                      Date
                      <input
                        type="date"
                        value={paymentForm.paymentDate}
                        onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentDate: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-700">
                      Reference / Receipt
                      <input
                        type="text"
                        value={paymentForm.reference}
                        onChange={(event) => setPaymentForm((prev) => ({ ...prev, reference: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                        placeholder={paymentForm.method === "CARD" ? "Optional card receipt" : "Optional reference"}
                      />
                    </label>
                  </div>
                  <label className="space-y-2 text-sm text-slate-700">
                    Note / reason
                    <textarea
                      rows={3}
                      value={paymentForm.reason}
                      onChange={(event) => setPaymentForm((prev) => ({ ...prev, reason: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                      placeholder="Why was this payment made?"
                    />
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-600">Add a manual payment for this patient.</div>
                    <button type="submit" disabled={paymentSubmitting} className="rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                      {paymentSubmitting ? "Saving..." : "Save payment"}
                    </button>
                  </div>
                  {paymentMessage ? (
                    <div className={`rounded-2xl px-4 py-3 text-sm ${paymentMessage.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {paymentMessage.text}
                    </div>
                  ) : null}
                </form>
                {(manualPayments.length === 0 && !(patient?.visits && patient.visits.length > 0)) ? (
                  <div className="text-slate-600">No payments recorded yet.</div>
                ) : (
                  <div className="space-y-2">
                    {manualPayments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-xl border p-3">
                        <div>
                          <div className="font-semibold">{p.method} • {p.date}</div>
                          <div className="text-sm text-slate-600">{p.note || p.reference || "Manual payment"}</div>
                        </div>
                        <div className="font-semibold">{Number(p.amount || 0).toLocaleString()} IQD</div>
                      </div>
                    ))}
                    {(patient?.visits ?? []).map((v: any, idx: number) => (
                      (Number(v.paymentCollected) || 0) > 0 ? (
                        <div key={`visit-pay-${v.id}`} className="flex items-center justify-between rounded-xl border p-3">
                          <div>
                            <div className="font-semibold">Visit #{idx + 1} • {v.date}</div>
                            <div className="text-sm text-slate-600">{v.treatmentNotes || "Visit payment"}</div>
                          </div>
                          <div className="font-semibold">{Number(v.paymentCollected).toLocaleString()} IQD</div>
                        </div>
                      ) : null
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
