"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  UserRound,
  CalendarDays,
  CircleDollarSign,
  StickyNote,
  Plus,
  Clock3,
  Activity,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { formatDateDMY } from "../../lib/date";

type VisitMedia = {
  id: number;
  visitId: number;
  filename: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  fileType: string;
  category: string;
  uploadedBy: string;
  uploadedAt: string;
};

type GalleryMedia = VisitMedia & {
  visitDate: string;
  visitNumber: number;
};

type Visit = {
  id: number;
  date: string;
  time?: string | null;
  wireUsed?: string | null;
  upperArch?: string | null;
  lowerArch?: string | null;
  elastics?: string | null;
  tads?: string | null;
  treatmentNotes?: string | null;
  paymentCollected?: number | null;
  doctorNotes?: string | null;
  visitMedia?: VisitMedia[];
};

type Patient = {
  id: number;
  name: string;
  phone: string;
  age?: number | null;
  clinicName?: string | null;
  clinicColor?: string | null;
  treatment: string;
  treatmentCategory?: string | null;
  bracketType?: string | null;
  caseStatus?: string | null;
  notes?: string | null;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  totalFee?: number | null;
  totalPaid?: number | null;
  createdAt: string;
  visits?: Visit[];
};

const FILE_TYPES = ["PHOTO", "XRAY", "SCAN", "PDF", "STL", "OTHER"];

const CATEGORY_OPTIONS: Record<string, string[]> = {
  PHOTO: [
    "Extraoral Front",
    "Extraoral Smile",
    "Extraoral Profile",
    "Intraoral Front",
    "Right Buccal",
    "Left Buccal",
    "Upper Occlusal",
    "Lower Occlusal",
  ],
  XRAY: ["OPG", "Lateral Ceph", "PA Ceph", "CBCT", "Other"],
  SCAN: ["Upper STL", "Lower STL", "Digital Scan", "Other"],
  PDF: ["Consent", "Treatment Plan", "Referral", "Prescription", "Invoice", "Other"],
  STL: ["Upper STL", "Lower STL", "Digital Scan", "Other"],
  OTHER: ["Other"],
};

type GalleryFilter = "all" | "photos" | "radiographs" | "scans" | "documents";
type GallerySort = "newest" | "oldest" | "visit";

const getStatusColor = (status: string | null | undefined) => {
  switch (status) {
    case "finished":
      return "text-emerald-700 bg-emerald-50";
    case "retainer":
      return "text-violet-700 bg-violet-50";
    case "cancelled":
      return "text-rose-700 bg-rose-50";
    case "archived":
      return "text-slate-700 bg-slate-100";
    default:
      return "text-sky-700 bg-sky-50";
  }
};

const getStatusLabel = (status: string | null | undefined) => {
  switch (status) {
    case "finished":
      return "Finished";
    case "retainer":
      return "Retainer";
    case "cancelled":
      return "Cancelled";
    case "archived":
      return "Archived";
    default:
      return "Active";
  }
};

const isImageFile = (mimeType: string) => mimeType.startsWith("image/");

const getGalleryFilterTitle = (filter: GalleryFilter) => {
  switch (filter) {
    case "photos":
      return "Photos";
    case "radiographs":
      return "Radiographs";
    case "scans":
      return "Scans";
    case "documents":
      return "Documents";
    default:
      return "All";
  }
};

export default function PatientProfilePage() {
  const params = useParams();
  const id = params?.id ? String(params.id) : "";

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "visits" | "gallery" | "payments">("overview");
  const [showNewVisitForm, setShowNewVisitForm] = useState(false);
  const [newVisitForm, setNewVisitForm] = useState({
    date: "",
    time: "",
    wireUsed: "",
    upperArch: "",
    lowerArch: "",
    elastics: "",
    tads: "",
    treatmentNotes: "",
    paymentCollected: "",
    doctorNotes: "",
  });
  const [uploadVisitId, setUploadVisitId] = useState<number | null>(null);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadType, setUploadType] = useState("PHOTO");
  const [uploadCategory, setUploadCategory] = useState(CATEGORY_OPTIONS.PHOTO[0]);
  const [uploading, setUploading] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>("all");
  const [gallerySort, setGallerySort] = useState<GallerySort>("newest");
  const [viewerMedia, setViewerMedia] = useState<GalleryMedia | null>(null);
  const [compareSelection, setCompareSelection] = useState<GalleryMedia[]>([]);

  const visits = useMemo(() => patient?.visits ?? [], [patient]);
  const totalPayments = useMemo(() => visits.reduce((sum, visit) => sum + (visit.paymentCollected || 0), 0), [visits]);
  const totalFee = patient?.totalFee ?? 0;
  const remainingBalance = totalFee - totalPayments;
  const visitCount = visits.length;

  const galleryItems = useMemo(() => {
    const items: Array<VisitMedia & { visitDate: string; visitNumber: number }> = [];
    visits.forEach((visit, index) => {
      const visitNumber = index + 1;
      visit.visitMedia?.forEach((media) => {
        items.push({ ...media, visitDate: visit.date, visitNumber });
      });
    });

    const filtered = items.filter((media) => {
      if (galleryFilter === "all") return true;
      if (galleryFilter === "photos") return media.fileType === "PHOTO";
      if (galleryFilter === "radiographs") return media.fileType === "XRAY";
      if (galleryFilter === "scans") return media.fileType === "SCAN";
      if (galleryFilter === "documents") return media.fileType === "PDF" || media.fileType === "STL" || media.fileType === "OTHER";
      return true;
    });

    return filtered.sort((a, b) => {
      if (gallerySort === "newest") {
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
      if (gallerySort === "oldest") {
        return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      }
      return a.visitNumber - b.visitNumber || new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });
  }, [galleryFilter, gallerySort, visits]);

  const loadPatient = async () => {
    if (!id) return;
    setLoading(true);

    try {
      console.log('[DEBUG][client /patients/[id]] route param id:', id);
      const response = await fetch(`/api/patients/${id}`, { cache: "no-store" });
      console.log('[DEBUG][client /patients/[id]] fetch status:', response.status);
      const data = await response.json().catch(() => null);
      console.log('[DEBUG][client /patients/[id]] response body:', data);
      if (!response.ok) {
        // Log the error and preserve the response for debugging.
        console.error('[DEBUG][client /patients/[id]] fetch failed status:', response.status, 'body:', data);
        throw new Error('Patient fetch failed');
      }
      setPatient(data);
    } catch {
      setPatient(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatient();
  }, [id]);

  const handleNewVisitSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;

    try {
      const response = await fetch(`/api/patients/${id}/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newVisitForm.date,
          time: newVisitForm.time || null,
          wireUsed: newVisitForm.wireUsed || null,
          upperArch: newVisitForm.upperArch || null,
          lowerArch: newVisitForm.lowerArch || null,
          elastics: newVisitForm.elastics || null,
          tads: newVisitForm.tads || null,
          treatmentNotes: newVisitForm.treatmentNotes || null,
          paymentCollected: newVisitForm.paymentCollected ? Number(newVisitForm.paymentCollected) : null,
          doctorNotes: newVisitForm.doctorNotes || null,
        }),
      });
      if (!response.ok) throw new Error("Unable to add visit");
      setShowNewVisitForm(false);
      setNewVisitForm({
        date: "",
        time: "",
        wireUsed: "",
        upperArch: "",
        lowerArch: "",
        elastics: "",
        tads: "",
        treatmentNotes: "",
        paymentCollected: "",
        doctorNotes: "",
      });
      loadPatient();
    } catch {
      // keep UI intact
    }
  };

  const handleDeleteVisit = async (visitId: number) => {
    if (!id) return;
    if (!confirm("Delete this visit?")) return;

    const response = await fetch(`/api/patients/${id}/visits/${visitId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      loadPatient();
    }
  };

  const handleUploadMedia = async (event: React.FormEvent<HTMLFormElement>, visitId: number) => {
    event.preventDefault();
    if (!id || !uploadFiles || uploadFiles.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < uploadFiles.length; i += 1) {
        formData.append("files", uploadFiles[i]);
      }
      formData.append("fileType", uploadType);
      formData.append("category", uploadCategory);
      formData.append("uploadedBy", "Clinical User");

      const response = await fetch(`/api/patients/${id}/visits/${visitId}/media`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      setUploadFiles(null);
      setUploadVisitId(null);
      loadPatient();
    } catch {
      // keep current view intact
    } finally {
      setUploading(false);
    }
  };

  const toggleCompareSelection = (media: GalleryMedia) => {
    setCompareSelection((current) => {
      const exists = current.some((item) => item.id === media.id);
      if (exists) {
        return current.filter((item) => item.id !== media.id);
      }
      if (current.length >= 2) {
        return [current[1], media];
      }
      return [...current, media];
    });
  };

  const compareEnabled = compareSelection.length === 2;

  const getMediaUrl = (storagePath: string) => `/${storagePath}`;

  const openViewer = (media: GalleryMedia) => {
    setViewerMedia(media);
  };

  const closeViewer = () => {
    setViewerMedia(null);
  };

  const availableGallery = galleryItems;

  const viewerIndex = viewerMedia ? availableGallery.findIndex((item) => item.id === viewerMedia.id) : -1;

  const goPreviousMedia = () => {
    if (viewerIndex > 0) {
      setViewerMedia(availableGallery[viewerIndex - 1]);
    }
  };

  const goNextMedia = () => {
    if (viewerIndex < availableGallery.length - 1) {
      setViewerMedia(availableGallery[viewerIndex + 1]);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">Loading patient profile…</div>
        </main>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">Patient not found.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-600 text-white shadow-lg">
                  <UserRound size={32} />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-teal-600">Patient profile</p>
                  <h1 className="mt-3 text-4xl font-semibold text-slate-900">{patient.name}</h1>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1">{patient.phone}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">Age: {patient.age ?? "—"}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">Clinic: {patient.clinicName || "—"}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">Bracket: {patient.bracketType || "Not set"}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700">{patient.treatment}</span>
                <span className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusColor(patient.caseStatus)}`}>{getStatusLabel(patient.caseStatus)}</span>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Created {formatDateDMY(patient.createdAt.split("T")[0])}</span>
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-4">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Activity size={16} className="text-teal-600" /> Treatment information
              </div>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{patient.treatment}</p>
              <p className="mt-2 text-sm text-slate-600">Current treatment plan and appliance details.</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <CircleDollarSign size={16} className="text-teal-600" /> Financial summary
              </div>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{totalPayments.toLocaleString()} IQD</p>
              <p className="mt-2 text-sm text-slate-600">Total collected across all visits.</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <CalendarDays size={16} className="text-teal-600" /> Next appointment
              </div>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{patient.appointmentDate || "Not scheduled"}</p>
              <p className="mt-2 text-sm text-slate-600">{patient.appointmentTime || "No time set"}</p>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <StickyNote size={16} className="text-teal-600" /> Quick notes
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-700">{patient.notes || "No quick notes."}</p>
            </article>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Patient center</h2>
                <p className="mt-1 text-sm text-slate-600">Navigate the patient journey and keep treatment details organized.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["overview", "visits", "gallery", "payments"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${activeTab === tab ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                  >
                    {tab === "overview" ? "Overview" : tab === "visits" ? "Visits" : tab === "gallery" ? "Gallery" : "Payments"}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === "overview" && (
              <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <h3 className="text-xl font-semibold text-slate-900">Clinical snapshot</h3>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white p-4 shadow-sm">
                        <p className="text-sm text-slate-500">Visit count</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{visitCount}</p>
                      </div>
                      <div className="rounded-2xl bg-white p-4 shadow-sm">
                        <p className="text-sm text-slate-500">Paid so far</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{totalPayments.toLocaleString()} IQD</p>
                      </div>
                      <div className="rounded-2xl bg-white p-4 shadow-sm">
                        <p className="text-sm text-slate-500">Remaining balance</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{remainingBalance.toLocaleString()} IQD</p>
                      </div>
                      <div className="rounded-2xl bg-white p-4 shadow-sm">
                        <p className="text-sm text-slate-500">Media items</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{galleryItems.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">Latest visit</h3>
                        <p className="mt-2 text-sm text-slate-600">Quick summary of the most recent clinical session.</p>
                      </div>
                      <Link href={`/patients/${patient.id}`} className="text-sm font-semibold text-teal-600 hover:text-teal-700">
                        Refresh
                      </Link>
                    </div>
                    <div className="mt-6 space-y-4">
                      {visits.length === 0 ? (
                        <p className="text-sm text-slate-600">No visits recorded yet.</p>
                      ) : (
                        (() => {
                          const latest = visits[visits.length - 1];
                          return (
                            <div className="rounded-3xl bg-white p-5 shadow-sm">
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <p className="text-sm text-slate-500">Visit date</p>
                                  <p className="mt-1 text-lg font-semibold text-slate-900">{latest.date}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-slate-500">Time</p>
                                  <p className="mt-1 text-lg font-semibold text-slate-900">{latest.time || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-slate-500">Payment</p>
                                  <p className="mt-1 text-lg font-semibold text-slate-900">{latest.paymentCollected ? `${latest.paymentCollected.toLocaleString()} IQD` : "—"}</p>
                                </div>
                              </div>
                              <div className="mt-6 grid gap-3 md:grid-cols-2">
                                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                                  <div className="font-semibold text-slate-900">Treatment</div>
                                  <p className="mt-2">{latest.treatmentNotes || "No treatment notes."}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                                  <div className="font-semibold text-slate-900">Doctor notes</div>
                                  <p className="mt-2">{latest.doctorNotes || "No doctor notes."}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>
                </div>
                <aside className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-900">Patient details</h3>
                    <dl className="mt-5 space-y-4 text-sm text-slate-600">
                      <div>
                        <dt className="font-semibold text-slate-900">Full name</dt>
                        <dd>{patient.name}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-900">Phone</dt>
                        <dd>{patient.phone}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-900">Clinic</dt>
                        <dd>{patient.clinicName || "—"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-900">Bracket system</dt>
                        <dd>{patient.bracketType || "—"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-900">Created</dt>
                        <dd>{formatDateDMY(patient.createdAt.split("T")[0])}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-900">Clinician actions</h3>
                    <div className="mt-5 grid gap-3">
                      <Link href={`/edit-patient/${patient.id}`} className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800">
                        Edit patient
                      </Link>
                      <Link href={`/new-appointment/${patient.id}`} className="rounded-2xl bg-teal-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-700">
                        Schedule appointment
                      </Link>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {activeTab === "visits" && (
              <div className="mt-8 space-y-6">
                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                    <p className="text-sm text-slate-500">Visits</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{visitCount}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                    <p className="text-sm text-slate-500">Total paid</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{totalPayments.toLocaleString()} IQD</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                    <p className="text-sm text-slate-500">Remaining</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{remainingBalance.toLocaleString()} IQD</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">Visits</h3>
                      <p className="mt-1 text-sm text-slate-600">Manage the treatment sessions and upload visit media.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewVisitForm((active) => !active)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
                    >
                      <Plus size={16} /> New Visit
                    </button>
                  </div>

                  {showNewVisitForm && (
                    <form onSubmit={handleNewVisitSubmit} className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">Visit date</label>
                        <input required value={newVisitForm.date} onChange={(e) => setNewVisitForm((prev) => ({ ...prev, date: e.target.value }))} type="date" className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Time</label>
                        <input value={newVisitForm.time} onChange={(e) => setNewVisitForm((prev) => ({ ...prev, time: e.target.value }))} type="time" className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Wire used</label>
                        <input value={newVisitForm.wireUsed} onChange={(e) => setNewVisitForm((prev) => ({ ...prev, wireUsed: e.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none" placeholder="e.g. 0.019x0.025 SS" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Upper arch</label>
                        <input value={newVisitForm.upperArch} onChange={(e) => setNewVisitForm((prev) => ({ ...prev, upperArch: e.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none" placeholder="Upper arch" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Lower arch</label>
                        <input value={newVisitForm.lowerArch} onChange={(e) => setNewVisitForm((prev) => ({ ...prev, lowerArch: e.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none" placeholder="Lower arch" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Elastics</label>
                        <input value={newVisitForm.elastics} onChange={(e) => setNewVisitForm((prev) => ({ ...prev, elastics: e.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none" placeholder="Elastic type" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">TADs</label>
                        <input value={newVisitForm.tads} onChange={(e) => setNewVisitForm((prev) => ({ ...prev, tads: e.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none" placeholder="TAD details" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Payment collected</label>
                        <input value={newVisitForm.paymentCollected} onChange={(e) => setNewVisitForm((prev) => ({ ...prev, paymentCollected: e.target.value }))} type="number" className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none" placeholder="IQD" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">Treatment notes</label>
                        <textarea value={newVisitForm.treatmentNotes} onChange={(e) => setNewVisitForm((prev) => ({ ...prev, treatmentNotes: e.target.value }))} rows={3} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none" placeholder="Treatment notes" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">Doctor notes</label>
                        <textarea value={newVisitForm.doctorNotes} onChange={(e) => setNewVisitForm((prev) => ({ ...prev, doctorNotes: e.target.value }))} rows={3} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none" placeholder="Doctor notes" />
                      </div>
                      <div className="md:col-span-2 flex justify-end gap-3">
                        <button type="button" onClick={() => setShowNewVisitForm(false)} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                        <button type="submit" className="rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white">Save visit</button>
                      </div>
                    </form>
                  )}
                </div>

                {visits.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">No visits recorded yet. Add a visit to begin the treatment timeline.</div>
                ) : (
                  <div className="space-y-6">
                    {visits.map((visit, index) => {
                      const mediaCount = visit.visitMedia?.length ?? 0;
                      return (
                        <article key={visit.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                                <Clock3 size={18} className="text-teal-600" />
                                <span>Visit #{index + 1}</span>
                                <span className="text-sm font-medium text-slate-500">• {visit.date}</span>
                                {visit.time ? <span className="text-sm font-medium text-slate-500">{visit.time}</span> : null}
                              </div>
                              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                                  <h4 className="font-semibold text-slate-900">Upper wire</h4>
                                  <p className="mt-2">{visit.upperArch || "—"}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                                  <h4 className="font-semibold text-slate-900">Lower wire</h4>
                                  <p className="mt-2">{visit.lowerArch || "—"}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                                  <h4 className="font-semibold text-slate-900">Elastics</h4>
                                  <p className="mt-2">{visit.elastics || "—"}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                                  <h4 className="font-semibold text-slate-900">TAD</h4>
                                  <p className="mt-2">{visit.tads || "—"}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                                  <h4 className="font-semibold text-slate-900">Payment</h4>
                                  <p className="mt-2">{visit.paymentCollected ? `${visit.paymentCollected.toLocaleString()} IQD` : "—"}</p>
                                </div>
                              </div>
                            </div>
                            <div className="min-w-[260px] rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                              <div className="font-semibold text-slate-900">Media</div>
                              <p className="mt-2">{mediaCount} files attached</p>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <Link href={`/edit-visit/${patient.id}/${visit.id}`} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                                  Edit Visit
                                </Link>
                                <button type="button" onClick={() => handleDeleteVisit(visit.id)} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700">
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUploadVisitId((current) => (current === visit.id ? null : visit.id))}
                                  className="rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
                                >
                                  Upload files
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 grid gap-4 lg:grid-cols-2">
                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                              <h4 className="font-semibold text-slate-900">Treatment notes</h4>
                              <p className="mt-2 whitespace-pre-line">{visit.treatmentNotes || "No treatment notes."}</p>
                            </div>
                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                              <h4 className="font-semibold text-slate-900">Doctor notes</h4>
                              <p className="mt-2 whitespace-pre-line">{visit.doctorNotes || "No doctor notes."}</p>
                            </div>
                          </div>

                          {uploadVisitId === visit.id && (
                            <form onSubmit={(event) => handleUploadMedia(event, visit.id)} className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                  <label className="mb-2 block text-sm font-semibold text-slate-700">Select files</label>
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf,.stl"
                                    onChange={(event) => setUploadFiles(event.target.files)}
                                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                                  />
                                </div>
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-slate-700">File type</label>
                                  <select
                                    value={uploadType}
                                    onChange={(event) => {
                                      setUploadType(event.target.value);
                                      setUploadCategory(CATEGORY_OPTIONS[event.target.value]?.[0] || "Other");
                                    }}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                                  >
                                    {FILE_TYPES.map((type) => (
                                      <option key={type} value={type}>{type}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
                                  <select
                                    value={uploadCategory}
                                    onChange={(event) => setUploadCategory(event.target.value)}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                                  >
                                    {CATEGORY_OPTIONS[uploadType].map((categoryOption) => (
                                      <option key={categoryOption} value={categoryOption}>{categoryOption}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="md:col-span-2 flex flex-col gap-3">
                                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                                    <p className="font-semibold text-slate-900">Upload details</p>
                                    <p className="mt-2">Choose one or more files, select the media type and category, then upload them to this visit.</p>
                                  </div>
                                  <div className="flex flex-wrap gap-3">
                                    <button type="submit" disabled={uploading} className="rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
                                      {uploading ? "Uploading…" : "Upload files"}
                                    </button>
                                    <button type="button" onClick={() => setUploadVisitId(null)} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </form>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "gallery" && (
              <div className="mt-8 space-y-6">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-900">Gallery</h3>
                    <p className="mt-2 text-sm text-slate-600">Browse all visit media and compare photos side by side.</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500">Compare</p>
                    <p className="mt-3 text-sm text-slate-700">Select two images to compare them.</p>
                    <p className="mt-4 text-sm text-slate-600">Selected: {compareSelection.length}/2</p>
                    <button
                      type="button"
                      onClick={() => setCompareSelection([])}
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Clear selection
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {(["all", "photos", "radiographs", "scans", "documents"] as GalleryFilter[]).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setGalleryFilter(filter)}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${galleryFilter === filter ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                      >
                        {getGalleryFilterTitle(filter)}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">Sort</span>
                    <select
                      value={gallerySort}
                      onChange={(event) => setGallerySort(event.target.value as GallerySort)}
                      className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="visit">Visit</option>
                    </select>
                  </div>
                </div>

                {availableGallery.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-600">No media available for this filter.</div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {availableGallery.map((media) => (
                      <button
                        key={media.id}
                        type="button"
                        onClick={() => openViewer(media)}
                        className="group overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex h-52 items-center justify-center overflow-hidden rounded-3xl bg-slate-100">
                          {isImageFile(media.mimeType) ? (
                            <img src={getMediaUrl(media.storagePath)} alt={media.originalName} className="h-full w-full object-cover transition duration-200 group-hover:scale-105" />
                          ) : (
                            <div className="text-slate-400">
                              <FileText size={40} />
                            </div>
                          )}
                        </div>
                        <div className="mt-4 text-sm text-slate-500">Visit #{media.visitNumber} • {media.visitDate}</div>
                        <h3 className="mt-2 text-base font-semibold text-slate-900 truncate">{media.originalName}</h3>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2 py-1">{media.fileType}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">{media.category}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500">Uploaded {formatDateDMY(media.uploadedAt.split("T")[0])}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCompareSelection(media);
                            }}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${compareSelection.some((item) => item.id === media.id) ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                          >
                            {compareSelection.some((item) => item.id === media.id) ? "Selected" : "Compare"}
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {compareEnabled && (
                  <div className="rounded-3xl border border-teal-200 bg-teal-50 p-6 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">Compare selected media</h3>
                        <p className="mt-1 text-sm text-slate-600">Review before and after or side-by-side treatment images.</p>
                      </div>
                      <button type="button" onClick={() => setCompareSelection([])} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                        Clear compare
                      </button>
                    </div>
                    <div className="mt-6 grid gap-4 xl:grid-cols-2">
                      {compareSelection.map((media) => (
                        <div key={media.id} className="rounded-3xl overflow-hidden border border-slate-200 bg-white">
                          {isImageFile(media.mimeType) ? (
                            <img src={getMediaUrl(media.storagePath)} alt={media.originalName} className="h-96 w-full object-cover" />
                          ) : (
                            <div className="flex h-96 items-center justify-center bg-slate-100 text-slate-500">
                              <FileText size={40} />
                            </div>
                          )}
                          <div className="p-4">
                            <p className="text-sm text-slate-500">Visit #{media.visitNumber} • {media.visitDate}</p>
                            <h4 className="mt-2 text-base font-semibold text-slate-900">{media.originalName}</h4>
                            <p className="mt-2 text-sm text-slate-600">{media.category}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "payments" && (
              <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">Payments</h3>
                    <p className="mt-1 text-sm text-slate-600">Track visit-level payments and running balance.</p>
                  </div>
                  <div className="rounded-3xl bg-white px-5 py-4 text-sm text-slate-700 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span>Total paid</span>
                      <span className="font-semibold text-slate-900">{totalPayments.toLocaleString()} IQD</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <span>Balance</span>
                      <span className="font-semibold text-slate-900">{remainingBalance.toLocaleString()} IQD</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-semibold text-slate-700">Visit</th>
                        <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-semibold text-slate-700">Date</th>
                        <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-semibold text-slate-700">Amount Paid</th>
                        <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-semibold text-slate-700">Notes</th>
                        <th className="whitespace-nowrap px-6 py-4 text-left text-sm font-semibold text-slate-700">Running Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {visits.reduce<{ rows: Array<{ visit: Visit; runningTotal: number }> ; current: number }>((acc, visit) => {
                        const payment = visit.paymentCollected || 0;
                        const runningTotal = acc.current + payment;
                        acc.rows.push({ visit, runningTotal });
                        acc.current = runningTotal;
                        return acc;
                      }, { rows: [], current: 0 }).rows.map(({ visit, runningTotal }, index) => (
                        <tr key={visit.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-900">#{index + 1}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{visit.date}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{(visit.paymentCollected || 0).toLocaleString()} IQD</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{visit.treatmentNotes || visit.doctorNotes || "—"}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-900">{runningTotal.toLocaleString()} IQD</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {viewerMedia ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <button type="button" onClick={closeViewer} className="absolute right-4 top-4 rounded-full bg-slate-900 p-3 text-white hover:bg-slate-800">
              Close
            </button>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="flex h-[70vh] items-center justify-center bg-slate-950 text-white">
                {isImageFile(viewerMedia.mimeType) ? (
                  <img src={getMediaUrl(viewerMedia.storagePath)} alt={viewerMedia.originalName} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-200">
                    <FileText size={48} />
                    <p className="text-lg">{viewerMedia.originalName}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-between bg-slate-50 p-6">
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">{viewerMedia.originalName}</h3>
                  <p className="mt-3 text-sm text-slate-600">Visit #{viewerMedia.visitNumber} • {viewerMedia.visitDate}</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-900">Category:</span> {viewerMedia.category}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">Type:</span> {viewerMedia.fileType}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">Uploader:</span> {viewerMedia.uploadedBy}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">Uploaded:</span> {formatDateDMY(viewerMedia.uploadedAt.split("T")[0])}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">Size:</span> {viewerMedia.fileSize.toLocaleString()} bytes
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={goPreviousMedia} disabled={viewerIndex <= 0} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <a href={getMediaUrl(viewerMedia.storagePath)} download className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                    Download
                  </a>
                  <button type="button" onClick={goNextMedia} disabled={viewerIndex >= availableGallery.length - 1} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
