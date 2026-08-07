"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import { CalendarDays, CircleDollarSign, StickyNote, Clock3 } from "lucide-react";
import { formatDateDMY, convertTo12Hour } from "../../lib/date";

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
  notes?: string;
  caseSheet?: string;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  totalFee?: number | null;
  visits?: any[];
  galleryPhotos?: any[];
  caseSheetAttachments?: any[];
};

export default function PatientProfilePage() {
  const params = useParams();
  const id = params?.id ? String(params.id) : "";
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualPayments, setManualPayments] = useState<any[]>([]);
  const [galleryUploadFiles, setGalleryUploadFiles] = useState<FileList | null>(null);
  const [galleryUploadType, setGalleryUploadType] = useState<"PHOTO" | "XRAY" | "SCAN" | "OTHER">("PHOTO");
  const [galleryUploadCategory, setGalleryUploadCategory] = useState<string>("Extraoral Front");
  const [galleryUploadMessage, setGalleryUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "CASH",
    paymentDate: new Date().toISOString().slice(0, 10),
    reason: "",
    reference: "",
  });
  const [paymentMessage, setPaymentMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "visits" | "gallery" | "payments" | "caseSheet">("overview");

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/patients/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setPatient(data);
        // load payments for ledger and totals
        try {
          const p = await fetch(`/api/patients/${id}/payments`, { cache: "no-store" });
          const payments = p.ok ? await p.json().catch(() => []) : [];
          setManualPayments(Array.isArray(payments) ? payments : []);
        } catch (_) {
          setManualPayments([]);
        }
      } catch (e) {
        setPatient(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const visitPaymentsTotal = useMemo(() => (patient?.visits ?? []).reduce((s: number, v: any) => s + (Number(v.paymentCollected) || 0), 0), [patient]);
  const manualPaymentsTotal = useMemo(() => manualPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0), [manualPayments]);
  const totalPayments = visitPaymentsTotal + manualPaymentsTotal;
  const totalFee = Number(patient?.totalFee || 0);
  const remainingBalance = totalFee - totalPayments;

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

  if (!id) return <div className="p-6">Patient id missing.</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="mx-auto max-w-6xl p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-100">
                {headerThumbnail ? (
                  // may be data URL or path
                  <img src={headerThumbnail} alt={patient?.name || "photo"} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-slate-200" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{patient?.name ?? "Patient"}</h1>
                <p className="text-sm text-slate-500">{patient?.phone ?? "-"}</p>
              </div>
            </div>
            <div className="flex gap-3 items-center">
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
              <Link href={`/patients/${id}/case-sheet`} onClick={() => setActiveTab("caseSheet")}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Patient CaseSheet
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {/* Persistent quick summary */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Treatment</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{patient?.treatment ?? "—"}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Total paid</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{totalPayments.toLocaleString()} IQD</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Remaining</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{remainingBalance.toLocaleString()} IQD</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">Next appointment</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{patient?.appointmentDate ?? "Not scheduled"}</div>
            </div>
          </div>
          {activeTab === "overview" && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Clock3 className="text-teal-600" /> Overview
              </div>
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
                    ((patient?.caseSheetAttachments ?? []).concat(patient?.galleryPhotos ?? [])).map((m: any) => (
                      <div key={m.id} className="rounded-xl overflow-hidden border bg-slate-50">
                        {m.dataUrl ? (
                          <img src={m.dataUrl} alt={m.originalName || m.name} className="h-48 w-full object-cover" />
                        ) : (
                          <div className="h-48 w-full bg-slate-100 flex items-center justify-center text-slate-400">No preview</div>
                        )}
                        <div className="p-2 text-sm text-slate-700">{m.originalName || m.name}</div>
                      </div>
                    ))
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

          {activeTab === "caseSheet" && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <StickyNote className="text-teal-600" /> Patient CaseSheet
              </div>
              <div className="mt-4 text-slate-700 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-700">Patient details</div>
                    <div className="mt-3 text-sm text-slate-700 space-y-2">
                      <div><strong>Name:</strong> {patient?.name ?? "—"}</div>
                      <div><strong>Phone:</strong> {patient?.phone ?? "—"}</div>
                      {patient?.age ? <div><strong>Age:</strong> {patient.age}</div> : null}
                      {patient?.address ? <div><strong>Address:</strong> {patient.address}</div> : null}
                      {patient?.occupation ? <div><strong>Occupation:</strong> {patient.occupation}</div> : null}
                      {patient?.clinicName ? <div><strong>Clinic:</strong> {patient.clinicName}</div> : null}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-700">Treatment & notes</div>
                    <div className="mt-3 text-sm text-slate-700 space-y-2">
                      <div><strong>Treatment:</strong> {patient?.treatment ?? "—"}</div>
                      <div><strong>Notes:</strong> {patient?.notes ?? "—"}</div>
                      <div><strong>Next appointment:</strong> {patient?.appointmentDate ? `${patient.appointmentDate} ${patient.appointmentTime ? convertTo12Hour(patient.appointmentTime) : ""}` : "Not scheduled"}</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-700">Case sheet content</div>
                  <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                    {patient?.caseSheet ?? "No case sheet content available."}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-700">Case sheet attachments</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {((patient?.caseSheetAttachments ?? []).concat(patient?.galleryPhotos ?? [])).length === 0 ? (
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-600">No attachments saved.</div>
                    ) : (
                      ((patient?.caseSheetAttachments ?? []).concat(patient?.galleryPhotos ?? [])).map((m: any) => (
                        <div key={m.id} className="rounded-xl overflow-hidden border bg-slate-50">
                          {m.dataUrl ? (
                            <img src={m.dataUrl} alt={m.originalName || m.name} className="h-44 w-full object-cover" />
                          ) : (
                            <div className="h-44 w-full bg-slate-100 flex items-center justify-center text-slate-400">No preview</div>
                          )}
                          <div className="p-2 text-sm text-slate-700">{m.originalName || m.name}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
