"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Download,
  Eye,
  FileText,
  ImageIcon,
  Maximize2,
  Plus,
  Trash2,
} from "lucide-react";
import Sidebar from "../../../components/Sidebar";
import { formatDateDMY } from "../../../lib/date";

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

type Visit = {
  id: number;
  date: string;
  time?: string | null;
  paymentCollected?: number | null;
  visitNotes?: string | null;
  plannedNotes?: string | null;
  upperArch?: string | null;
  lowerArch?: string | null;
  elastics?: string | null;
  tads?: string | null;
  treatmentNotes?: string | null;
  doctorNotes?: string | null;
  visitMedia?: VisitMedia[];
};

type Patient = {
  id: number;
  name: string;
  age?: number | null;
  treatment: string;
  bracketType?: string | null;
  caseStatus?: string | null;
  clinicName?: string | null;
  clinicColor?: string | null;
  visits?: Visit[];
};

const CHART_POSITIONS = [
  { key: "frontFace", label: "Front Face", category: "Front Face" },
  { key: "smile", label: "Smile", category: "Smile" },
  { key: "profile", label: "Profile", category: "Profile" },
  { key: "upperOcclusal", label: "Upper Occlusal", category: "Upper Occlusal" },
  { key: "infoCard", label: "Patient Information Card", category: "" },
  { key: "lowerOcclusal", label: "Lower Occlusal", category: "Lower Occlusal" },
  { key: "rightBuccal", label: "Right Buccal", category: "Right Buccal" },
  { key: "frontalIntraoral", label: "Frontal Intraoral", category: "Frontal Intraoral" },
  { key: "leftBuccal", label: "Left Buccal", category: "Left Buccal" },
];

const EXTRA_PHOTO_CATEGORIES = [
  "Broken Bracket",
  "TAD Placement",
  "Open Bite",
  "Crossbite",
  "Elastic Progress",
  "Retainer",
  "Emergency Visit",
  "Other",
];

const XRAY_CATEGORIES = ["OPG", "Lateral Ceph", "PA Ceph", "CBCT", "Other"];
const SCAN_CATEGORIES = ["Upper STL", "Lower STL", "Other STL"];
const DOCUMENT_CATEGORIES = ["Treatment Plan", "Consent", "Referral", "Prescription", "Invoice", "Other"];

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const DOCUMENT_ACCEPT = ".pdf";
const SCAN_ACCEPT = ".stl,image/jpeg,image/png,image/webp";

const slugify = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();

const isImageFile = (mimeType: string) => mimeType.startsWith("image/");

export default function EditVisitPage() {
  const params = useParams();
  const router = useRouter();

  const patientId = (params?.patientId ?? "") as string;
  const visitId = Number(params?.visitId ?? "");

  const [patient, setPatient] = useState<Patient | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewerMedia, setViewerMedia] = useState<VisitMedia | null>(null);
  const [viewerScale, setViewerScale] = useState(1);
  const [extraCategory, setExtraCategory] = useState(EXTRA_PHOTO_CATEGORIES[0]);
  const [xrayCategory, setXrayCategory] = useState(XRAY_CATEGORIES[0]);
  const [scanCategory, setScanCategory] = useState(SCAN_CATEGORIES[0]);
  const [documentCategory, setDocumentCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState("");
  const [additionalEnabled, setAdditionalEnabled] = useState(false);
  const [additionalAmount, setAdditionalAmount] = useState("");
  const [additionalReason, setAdditionalReason] = useState("");
  const [additionalPaid, setAdditionalPaid] = useState(true);
  const [elasticEnabled, setElasticEnabled] = useState(false);
  const [elasticType, setElasticType] = useState("Class II");
  const uploadContextRef = useRef<{ category: string; fileType: string; existingMediaId?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const visitNumber = useMemo(() => {
    if (!patient || !patient.visits) return null;
    const index = patient.visits.findIndex((item) => item.id === visitId);
    return index >= 0 ? index + 1 : null;
  }, [patient, visitId]);

  const chartCategories = useMemo(
    () => CHART_POSITIONS.filter((item) => item.category).map((item) => item.category),
    []
  );

  const clinicalChartMedia = useMemo(() => {
    if (!visit?.visitMedia) return {} as Record<string, VisitMedia>;
    return visit.visitMedia.reduce<Record<string, VisitMedia>>((map, media) => {
      if (media.fileType === "PHOTO" && chartCategories.includes(media.category)) {
        map[media.category] = map[media.category] || media;
      }
      return map;
    }, {});
  }, [visit, chartCategories]);

  const extraPhotos = useMemo(
    () => visit?.visitMedia?.filter((media) => media.fileType === "PHOTO" && !chartCategories.includes(media.category)) ?? [],
    [visit, chartCategories]
  );

  const radiographs = useMemo(
    () => visit?.visitMedia?.filter((media) => media.fileType === "XRAY") ?? [],
    [visit]
  );

  const scans = useMemo(
    () => visit?.visitMedia?.filter((media) => media.fileType === "SCAN") ?? [],
    [visit]
  );

  const documents = useMemo(
    () => visit?.visitMedia?.filter((media) => media.fileType === "PDF" || media.fileType === "STL" || media.fileType === "OTHER") ?? [],
    [visit]
  );

  const getMediaUrl = (storagePath: string) => `/${storagePath}`;

  const loadVisit = async () => {
    if (!patientId || Number.isNaN(visitId)) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/patients/${patientId}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Patient not found");
      }
      const patientData = await response.json();
      const currentVisit = patientData.visits?.find((item: Visit) => item.id === visitId) ?? null;
      setPatient(patientData);
      setVisit(currentVisit);
      setNote(currentVisit?.visitNotes ?? "");
      setPayment(currentVisit?.paymentCollected?.toString() ?? "");
      setAdditionalEnabled(currentVisit?.elastics ? true : false);
      setElasticEnabled(!!currentVisit?.elastics);
      setElasticType(currentVisit?.elastics ?? "Class II");
    } catch {
      setPatient(null);
      setVisit(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadVisit();
    }
  }, [patientId, visitId]);

  const saveVisit = async () => {
    try {
      const response = await fetch(`/api/patients/${patientId}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Patient not found");
      }
      const patientData = await response.json();
      const visits = patientData.visits || [];
      const currentIndex = visits.findIndex((item: Visit) => item.id === visitId);
      const currentVisit = visits[currentIndex] ?? {};

      const newPayment = Number(payment.replace(/,/g, "")) || 0;
      const newAdditional = Number(additionalAmount.replace(/,/g, "")) || 0;
      const newAdditionalPaid = !!additionalPaid;

      visits[currentIndex] = {
        ...currentVisit,
        visitNotes: note,
        paymentCollected: newPayment,
        elastics: elasticEnabled ? elasticType : null,
      };

      const updateResponse = await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visits }),
      });
      if (!updateResponse.ok) {
        throw new Error("Update failed");
      }
    } catch {
      // keep current view intact on error
    }

    router.push(`/patients/${patientId}`);
  };

  const deleteVisitMedia = async (mediaId: number) => {
    if (!patientId || Number.isNaN(visitId)) return;
    await fetch(`/api/patients/${patientId}/visits/${visitId}/media/${mediaId}`, {
      method: "DELETE",
    });
    await loadVisit();
  };

  const uploadVisitMedia = async (
    files: FileList | File[],
    fileType: string,
    category: string,
    existingMediaId?: number
  ) => {
    if (!patientId || Number.isNaN(visitId) || !files || files.length === 0) return;

    setUploading(true);
    try {
      if (existingMediaId) {
        await deleteVisitMedia(existingMediaId);
      }

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });
      formData.append("fileType", fileType);
      formData.append("category", category);
      formData.append("uploadedBy", "Clinical User");

      await fetch(`/api/patients/${patientId}/visits/${visitId}/media`, {
        method: "POST",
        body: formData,
      });

      await loadVisit();
    } catch {
      // keep current view intact
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    const context = uploadContextRef.current;
    if (!context || !files || files.length === 0) return;

    await uploadVisitMedia(files, context.fileType, context.category, context.existingMediaId);
    event.target.value = "";
    uploadContextRef.current = null;
  };

  const handleDrop = async (
    event: React.DragEvent<HTMLDivElement>,
    fileType: string,
    category: string,
    existingMediaId?: number
  ) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files).filter((file) => file.size > 0);
    if (files.length === 0) return;
    await uploadVisitMedia(files, fileType, category, existingMediaId);
  };

  const promptUpload = (fileType: string, category: string, existingMediaId?: number) => {
    uploadContextRef.current = { fileType, category, existingMediaId };
    fileInputRef.current?.click();
  };

  const openViewer = (media: VisitMedia) => {
    setViewerMedia(media);
    setViewerScale(1);
  };

  const closeViewer = () => {
    setViewerMedia(null);
    setViewerScale(1);
  };

  const zoomIn = () => setViewerScale((current) => Math.min(current + 0.25, 2));
  const zoomOut = () => setViewerScale((current) => Math.max(current - 0.25, 0.5));

  const currentVisit = visit;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">Loading visit record…</div>
        </main>
      </div>
    );
  }

  if (!patient || !currentVisit) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">Visit or patient record not found.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-teal-600">Clinical Records</p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900">Visit {visitNumber ?? "#"} — {currentVisit.date}</h1>
                <p className="mt-2 text-sm text-slate-600">Orthodontic photo chart and clinical record for this visit.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 print:hidden"
                >
                  Print Chart
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:shadow-none print:border-0">
            <div className="grid gap-4 md:grid-cols-3">
              {CHART_POSITIONS.map((position) => {
                if (position.key === "infoCard") {
                  return (
                    <div key={position.key} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm print:border print:border-slate-200">
                      <h2 className="text-lg font-semibold text-slate-900">Patient Information</h2>
                      <div className="mt-4 space-y-3 text-sm text-slate-700">
                        <div>
                          <span className="block text-slate-500">Patient</span>
                          <span className="font-semibold text-slate-900">{patient.name}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500">Age</span>
                          <span className="font-semibold text-slate-900">{patient.age ?? "—"}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500">Patient ID</span>
                          <span className="font-semibold text-slate-900">{patient.id}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500">Treatment</span>
                          <span className="font-semibold text-slate-900">{patient.treatment}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500">Bracket System</span>
                          <span className="font-semibold text-slate-900">{patient.bracketType ?? "—"}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500">Case Status</span>
                          <span className="font-semibold text-slate-900">{patient.caseStatus ?? "—"}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500">Visit Number</span>
                          <span className="font-semibold text-slate-900">{visitNumber ?? "—"}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500">Visit Date</span>
                          <span className="font-semibold text-slate-900">{currentVisit.date}</span>
                        </div>
                        {patient.clinicName ? (
                          <div>
                            <span className="block text-slate-500">Clinic</span>
                            <span className="font-semibold text-slate-900">{patient.clinicName}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                }

                const media = clinicalChartMedia[position.category];
                const categorySlug = slugify(position.category);

                return (
                  <div
                    key={position.key}
                    onDrop={(event) => handleDrop(event, "PHOTO", position.category, media?.id)}
                    onDragOver={(event) => event.preventDefault()}
                    className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-sm transition hover:border-teal-500"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={IMAGE_ACCEPT}
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                    <div className="flex h-44 flex-col items-center justify-center gap-3 text-center text-slate-500">
                      <div className="rounded-full bg-white p-3 text-teal-600 shadow-sm">
                        <ImageIcon size={28} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{position.label}</p>
                        <p className="mt-1 text-xs leading-5">
                          {media ? "Tap to replace or drag a new image" : "Upload Image"}
                        </p>
                      </div>
                    </div>
                    <div className="absolute inset-0 transition-opacity duration-200 group-hover:opacity-100">
                      {media ? (
                        <img
                          src={getMediaUrl(media.storagePath)}
                          alt={media.originalName}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="absolute inset-0 flex flex-col justify-between p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <div className="flex justify-between">
                        <button
                          type="button"
                          onClick={() => promptUpload("PHOTO", position.category, media?.id)}
                          className="rounded-2xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white"
                        >
                          {media ? "Replace" : "Upload"}
                        </button>
                        {media ? (
                          <button
                            type="button"
                            onClick={() => deleteVisitMedia(media.id)}
                            className="rounded-2xl bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                      {media ? (
                        <div className="flex items-center justify-between gap-2 rounded-2xl bg-white/90 p-3 text-xs text-slate-700">
                          <span>{media.originalName}</span>
                          <button
                            type="button"
                            onClick={() => openViewer(media)}
                            className="font-semibold text-teal-600"
                          >
                            Preview
                          </button>
                        </div>
                      ) : (
                        <p className="rounded-2xl bg-white/90 p-3 text-xs text-slate-700">JPEG, PNG, WEBP only</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Additional Clinical Photos</h2>
                <p className="mt-2 text-sm text-slate-600">Unlimited supplementary photos for treatment events and complications.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={extraCategory}
                  onChange={(event) => setExtraCategory(event.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                >
                  {EXTRA_PHOTO_CATEGORIES.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => promptUpload("PHOTO", extraCategory)}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Upload Photo
                </button>
              </div>
            </div>

            {extraPhotos.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-600">No additional clinical photos yet.</div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {extraPhotos.map((media) => (
                  <div key={media.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    {isImageFile(media.mimeType) ? (
                      <img src={getMediaUrl(media.storagePath)} alt={media.originalName} className="h-56 w-full object-cover" />
                    ) : (
                      <div className="flex h-56 items-center justify-center bg-slate-100 text-slate-500">
                        <FileText size={32} />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-sm text-slate-500">{media.category}</p>
                      <h3 className="mt-2 text-base font-semibold text-slate-900 truncate">{media.originalName}</h3>
                      <p className="mt-2 text-sm text-slate-600">Uploaded {formatDateDMY(media.uploadedAt.split("T")[0])}</p>
                      <div className="mt-4 flex items-center gap-2">
                        <button type="button" onClick={() => openViewer(media)} className="rounded-2xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Preview</button>
                        <button type="button" onClick={() => promptUpload("PHOTO", media.category, media.id)} className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Replace</button>
                        <button type="button" onClick={() => deleteVisitMedia(media.id)} className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Radiographs</h2>
                <p className="mt-2 text-sm text-slate-600">Upload OPG, ceph and CBCT radiographs for this visit.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={xrayCategory}
                  onChange={(event) => setXrayCategory(event.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                >
                  {XRAY_CATEGORIES.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => promptUpload("XRAY", xrayCategory)}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Upload Radiograph
                </button>
              </div>
            </div>

            {radiographs.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-600">No radiographs available.</div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {radiographs.map((media) => (
                  <div key={media.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    {isImageFile(media.mimeType) ? (
                      <img src={getMediaUrl(media.storagePath)} alt={media.originalName} className="h-56 w-full object-cover" />
                    ) : (
                      <div className="flex h-56 items-center justify-center bg-slate-100 text-slate-500"><FileText size={32} /></div>
                    )}
                    <div className="p-4">
                      <p className="text-sm text-slate-500">{media.category}</p>
                      <h3 className="mt-2 text-base font-semibold text-slate-900 truncate">{media.originalName}</h3>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openViewer(media)}
                          className="rounded-2xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => promptUpload("XRAY", media.category, media.id)}
                          className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteVisitMedia(media.id)}
                          className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Digital Models</h2>
                <p className="mt-2 text-sm text-slate-600">Upload STL scans for upper, lower, or other digital models.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={scanCategory}
                  onChange={(event) => setScanCategory(event.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                >
                  {SCAN_CATEGORIES.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => promptUpload("SCAN", scanCategory)}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Upload Scan
                </button>
              </div>
            </div>

            {scans.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-600">No digital models available.</div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {scans.map((media) => (
                  <div key={media.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex h-56 items-center justify-center bg-slate-100 text-slate-500"><FileText size={32} /></div>
                    <div className="p-4">
                      <p className="text-sm text-slate-500">{media.category}</p>
                      <h3 className="mt-2 text-base font-semibold text-slate-900 truncate">{media.originalName}</h3>
                      <p className="mt-2 text-sm text-slate-600">Uploaded {formatDateDMY(media.uploadedAt.split("T")[0])}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openViewer(media)}
                          className="rounded-2xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => promptUpload("SCAN", media.category, media.id)}
                          className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteVisitMedia(media.id)}
                          className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Documents</h2>
                <p className="mt-2 text-sm text-slate-600">Attach treatment plans, consent forms, referrals, invoices, and PDFs.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={documentCategory}
                  onChange={(event) => setDocumentCategory(event.target.value)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                >
                  {DOCUMENT_CATEGORIES.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => promptUpload("PDF", documentCategory)}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Upload Document
                </button>
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-600">No documents attached.</div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {documents.map((media) => (
                  <div key={media.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex h-56 items-center justify-center bg-slate-100 text-slate-500"><FileText size={32} /></div>
                    <div className="p-4">
                      <p className="text-sm text-slate-500">{media.category}</p>
                      <h3 className="mt-2 text-base font-semibold text-slate-900 truncate">{media.originalName}</h3>
                      <p className="mt-2 text-sm text-slate-600">Uploaded {formatDateDMY(media.uploadedAt.split("T")[0])}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openViewer(media)}
                          className="rounded-2xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => promptUpload("PDF", media.category, media.id)}
                          className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteVisitMedia(media.id)}
                          className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Visit Details</h2>
                <p className="mt-2 text-sm text-slate-600">Update optional notes and treatment details for this visit.</p>
              </div>
              <button
                type="button"
                onClick={saveVisit}
                className="rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                Save Visit
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Visit Notes</label>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={6}
                  className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 p-4 text-slate-900 outline-none"
                />
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Payment Collected</label>
                  <input
                    type="text"
                    value={payment}
                    onChange={(event) => setPayment(event.target.value.replace(/\D/g, ""))}
                    className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Treatment Notes</label>
                  <textarea
                    value={currentVisit.treatmentNotes ?? ""}
                    readOnly
                    rows={4}
                    className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        {viewerMedia ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4">
            <div className="relative w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{viewerMedia.originalName}</h3>
                  <p className="mt-1 text-sm text-slate-500">{viewerMedia.category} • {viewerMedia.fileType}</p>
                </div>
                <button type="button" onClick={closeViewer} className="text-slate-500 transition hover:text-slate-900">Close</button>
              </div>
              <div className="flex flex-col gap-4 p-6">
                <div className="relative overflow-hidden rounded-3xl bg-slate-100" style={{ minHeight: 420 }}>
                  {isImageFile(viewerMedia.mimeType) ? (
                    <img
                      src={getMediaUrl(viewerMedia.storagePath)}
                      alt={viewerMedia.originalName}
                      style={{ transform: `scale(${viewerScale})` }}
                      className="mx-auto h-full w-full object-contain transition-transform"
                    />
                  ) : (
                    <div className="flex h-96 items-center justify-center text-slate-500">
                      <FileText size={56} />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={zoomOut} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                      <span>-</span>
                    </button>
                    <button type="button" onClick={zoomIn} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                      <span>+</span>
                    </button>
                    <span className="text-sm text-slate-500">Zoom {Math.round(viewerScale * 100)}%</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={getMediaUrl(viewerMedia.storagePath)} download className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Download</a>
                    <button type="button" onClick={closeViewer} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Close</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
