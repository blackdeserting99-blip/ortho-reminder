"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import DateInput from "../../components/DateInput";
import { formatDateDMY } from "../../lib/date";
import OrthoPhotoChart, {
  ORTHO_PHOTO_UPLOAD_SLOTS,
  type OrthoPhotoSlotKey,
} from "../../components/OrthoPhotoChart";

type Visit = {
  date: string;
  time: string;

  nextDate?: string;
  nextTime?: string;

  visitNotes?: string;
  plannedNotes?: string;

  payment?: number;

  elasticEnabled: boolean;
  elasticType: string;
};

type Patient = {
  id: number;
  name: string;
  phone: string;
  age?: number;
  treatment: string;
  appointmentDate: string;
  appointmentTime?: string;
  firstAppointment?: boolean;
  plannedNotes?: string;
  treatmentCategory?: string;
  bracketType?: string;

  elasticEnabled?: boolean;
  elasticType?: string;

  totalFee?: number;

  visits?: Visit[];
};

type VisitPhotoUpload = {
  file: File;
  previewUrl: string;
  name: string;
};

type VisitSupportingUpload = {
  id: string;
  file: File;
  name: string;
  category: string;
};

const XRAY_CATEGORY_OPTIONS = ["OPG", "Lateral Ceph", "PA Ceph", "CBCT", "Other"];
const SCAN_CATEGORY_OPTIONS = ["Upper STL", "Lower STL", "Digital Scan", "Other"];

export default function NewAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id ?? "";

  const [patient, setPatient] =
    useState<Patient | null>(null);

  const [appointmentMode, setAppointmentMode] =
    useState("30 Days");

  const [appointmentDate, setAppointmentDate] =
    useState("");
  const [appointmentTime, setAppointmentTime] =
    useState("04:00 PM");

  const [elasticEnabled, setElasticEnabled] =
    useState(false);

const [elasticType, setElasticType] =
  useState("None");
  const [elasticOther, setElasticOther] =
  useState("");
const [elasticGauge, setElasticGauge] = useState<"Small"|"Medium"|"Heavy"|"Other">("Medium");
const [elasticSize, setElasticSize] = useState<string>("1/8");

const [visitNotes, setVisitNotes] =
  useState("");

const [plannedNotes, setPlannedNotes] =
  useState("");

const [paymentReceived, setPaymentReceived] =
  useState("");

const [additionalEnabled, setAdditionalEnabled] = useState(false);
const [additionalAmount, setAdditionalAmount] = useState("");
const [additionalReason, setAdditionalReason] = useState("");
const [additionalCollected, setAdditionalCollected] = useState(true);

  const searchParams = useSearchParams();

  useEffect(() => {
    const focus = searchParams?.get?.("focus");
    if (focus === "current") {
      const el = document.getElementById("current-appointment");
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      }
    }
  }, [searchParams]);

    const [upperWireSystem, setUpperWireSystem] =
  useState<"MBT/Roth" | "Damon">("MBT/Roth");
const [upperWireType, setUpperWireType] =
  useState<"Niti" | "SS">("Niti");
const [upperWireGauge, setUpperWireGauge] =
  useState("12");
const [upperWireOther, setUpperWireOther] =
  useState("");
const [upperDamonWire, setUpperDamonWire] =
  useState("0.014 CuNiTi");
const [upperDamonWireOther, setUpperDamonWireOther] =
  useState("");

const [lowerWireSystem, setLowerWireSystem] =
  useState<"MBT/Roth" | "Damon">("MBT/Roth");
const [lowerWireType, setLowerWireType] =
  useState<"Niti" | "SS">("Niti");
const [lowerWireGauge, setLowerWireGauge] =
  useState("12");
const [lowerWireOther, setLowerWireOther] =
  useState("");
const [lowerDamonWire, setLowerDamonWire] =
  useState("0.014 CuNiTi");
const [lowerDamonWireOther, setLowerDamonWireOther] =
  useState("");

const [upperArchEnabled, setUpperArchEnabled] =
  useState(false);

const [lowerArchEnabled, setLowerArchEnabled] =
  useState(false);
const [plannedUpperArchEnabled, setPlannedUpperArchEnabled] =
  useState(false);

const [plannedLowerArchEnabled, setPlannedLowerArchEnabled] =
  useState(false);
const [tadsEnabled, setTadsEnabled] =
  useState(false);

const [tadsNote, setTadsNote] =
  useState("");
  const [plannedUpperArch, setPlannedUpperArch] =
  useState("");

const [plannedLowerArch, setPlannedLowerArch] =
  useState("");

const [plannedElasticEnabled, setPlannedElasticEnabled] =
  useState(false);

const [plannedElasticType, setPlannedElasticType] =
  useState("Class II");
const [plannedElasticGauge, setPlannedElasticGauge] = useState<"Small"|"Medium"|"Heavy"|"Other">("Medium");
const [plannedElasticSize, setPlannedElasticSize] = useState<string>("1/8");
const [plannedElasticOther, setPlannedElasticOther] = useState("");

const [plannedUpperWireSystem, setPlannedUpperWireSystem] =
  useState<"MBT/Roth" | "Damon">("MBT/Roth");
const [plannedUpperWireType, setPlannedUpperWireType] =
  useState<"Niti" | "SS">("Niti");
const [plannedUpperWireGauge, setPlannedUpperWireGauge] =
  useState("12");
const [plannedUpperWireOther, setPlannedUpperWireOther] =
  useState("");
const [plannedUpperDamonWire, setPlannedUpperDamonWire] =
  useState("0.014 CuNiTi");
const [plannedUpperDamonWireOther, setPlannedUpperDamonWireOther] =
  useState("");

const [plannedLowerWireSystem, setPlannedLowerWireSystem] =
  useState<"MBT/Roth" | "Damon">("MBT/Roth");
const [plannedLowerWireType, setPlannedLowerWireType] =
  useState<"Niti" | "SS">("Niti");
const [plannedLowerWireGauge, setPlannedLowerWireGauge] =
  useState("12");
const [plannedLowerWireOther, setPlannedLowerWireOther] =
  useState("");
const [plannedLowerDamonWire, setPlannedLowerDamonWire] =
  useState("0.014 CuNiTi");
const [plannedLowerDamonWireOther, setPlannedLowerDamonWireOther] =
  useState("");

const [plannedTadsEnabled, setPlannedTadsEnabled] =
  useState(false);

const [plannedTadsNote, setPlannedTadsNote] =
  useState("");

const [conflictWarning, setConflictWarning] =
  useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [timeConflictMessage, setTimeConflictMessage] = useState("");
  const [visitPhotos, setVisitPhotos] = useState<
    Partial<Record<OrthoPhotoSlotKey, VisitPhotoUpload>>
  >({});
  const [visitPhotosEnabled, setVisitPhotosEnabled] = useState(false);
  const [visitXrays, setVisitXrays] = useState<VisitSupportingUpload[]>([]);
  const [visitXraysEnabled, setVisitXraysEnabled] = useState(false);
  const [visitScans, setVisitScans] = useState<VisitSupportingUpload[]>([]);
  const [visitScansEnabled, setVisitScansEnabled] = useState(false);
  const [xrayCategory, setXrayCategory] = useState(XRAY_CATEGORY_OPTIONS[0]);
  const [scanCategory, setScanCategory] = useState(SCAN_CATEGORY_OPTIONS[0]);
  const xrayInputRef = useRef<HTMLInputElement | null>(null);
  const scanInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const loadPatient = async () => {
      try {
const response = await fetch(`/api/patients/${id}`, { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) {
          throw new Error("Patient not found");
        }
        const foundPatient = await response.json();

        if (foundPatient) {
          setPatient(foundPatient);

          setAppointmentDate("");
          setAppointmentTime("04:00 PM");
          setElasticEnabled(foundPatient.elasticEnabled || false);
          setElasticType(foundPatient.elasticType || "Class II");

          const wireSystem = foundPatient.bracketType && foundPatient.bracketType.toLowerCase().includes("damon") ? "Damon" : "MBT/Roth";

          setUpperWireSystem(wireSystem as "MBT/Roth" | "Damon");
          setLowerWireSystem(wireSystem as "MBT/Roth" | "Damon");
          setPlannedUpperWireSystem(wireSystem as "MBT/Roth" | "Damon");
          setPlannedLowerWireSystem(wireSystem as "MBT/Roth" | "Damon");
        }
      } catch {
        setPatient(null);
      }
    };

    if (id) {
      loadPatient();
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [id]);

  const getSelectedDate = () => {
    if (appointmentMode === "Manual") {
      return appointmentDate;
    }

    const days = parseInt(appointmentMode);

    const futureDate = new Date();

    futureDate.setDate(
      futureDate.getDate() + days
    );

    return futureDate
      .toISOString()
      .split("T")[0];
  };

  const damonWireOptions = [
    "0.014 CuNiTi",
    "0.014 × 0.025 CuNiTi",
    "0.018 × 0.025 CuNiTi",
    "0.019 × 0.025 Stainless Steel",
    "Other",
  ];

  const wireGauges = (type: "Niti" | "SS") =>
    type === "Niti"
      ? ["12", "14", "16", "18", "16x22", "17x25", "18x25", "Other"]
      : ["18", "16x22", "17x25", "18x25", "Other"];

  const formatWireLabel = (
    system: "MBT/Roth" | "Damon",
    type: "Niti" | "SS",
    gauge: string,
    other: string,
    damonWire: string,
    damonOther: string
  ) => {
    if (system === "Damon") {
      if (damonWire === "Other") {
        return damonOther.trim() || "Other";
      }

      return damonWire;
    }

    if (gauge === "Other") {
      return other.trim() || `${type} Other`;
    }

    return `${gauge} ${type}`;
  };

  const selectedDate =
    getSelectedDate();

  const resolvedTreatment =
    patient?.treatment || patient?.treatmentCategory || "";

  const isFixedBraces =
    resolvedTreatment === "Fixed Braces";

  const isFriday =
    selectedDate &&
    new Date(selectedDate).getDay() === 5;

  const getWireSystemLabel = (
    system: "MBT/Roth" | "Damon",
    bracketType?: string
  ) => {
    if (bracketType) {
      return bracketType;
    }

    return system === "Damon"
      ? "Damon System"
      : "MBT / Roth";
  };

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const checkConflict = async () => {
      if (!selectedDate || !appointmentTime) {
        setTimeConflictMessage("");
        return;
      }
      try {
        const response = await fetch("/api/patients", { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) {
          throw new Error("Failed to load patients");
        }
        const patients = await response.json();
        const conflict = patients.some((p: Patient) => p.id.toString() !== id && p.appointmentDate === selectedDate && p.appointmentTime === appointmentTime);

        if (conflict) {
          setTimeConflictMessage(`Warning: Another patient is scheduled on ${formatDateDMY(selectedDate)} at ${appointmentTime}.`);
        } else {
          setTimeConflictMessage("");
        }
      } catch {
        setTimeConflictMessage("");
      }
    };

    checkConflict();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedDate, appointmentTime, id]);

  const handleVisitPhotoSelect = (slotKey: OrthoPhotoSlotKey, file: File) => {
    setVisitPhotos((prev) => {
      if (prev[slotKey]?.previewUrl) {
        URL.revokeObjectURL(prev[slotKey]!.previewUrl);
      }

      return {
        ...prev,
        [slotKey]: {
          file,
          previewUrl: URL.createObjectURL(file),
          name: file.name,
        },
      };
    });
  };

  const removeVisitPhoto = (slotKey: OrthoPhotoSlotKey) => {
    setVisitPhotos((prev) => {
      if (prev[slotKey]?.previewUrl) {
        URL.revokeObjectURL(prev[slotKey]!.previewUrl);
      }

      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  };

  const visitPhotosForChart = Object.entries(visitPhotos).reduce<
    Partial<Record<OrthoPhotoSlotKey, { name: string; previewUrl: string }>>
  >((acc, [slotKey, value]) => {
    if (!value) {
      return acc;
    }

    acc[slotKey as OrthoPhotoSlotKey] = {
      name: value.name,
      previewUrl: value.previewUrl,
    };
    return acc;
  }, {});

  const addSupportingFiles = (
    kind: "xray" | "scan",
    files: FileList | null,
    category: string
  ) => {
    if (!files || files.length === 0) {
      return;
    }

    const mapped = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      name: file.name,
      category,
    }));

    if (kind === "xray") {
      setVisitXrays((prev) => [...prev, ...mapped]);
      if (xrayInputRef.current) {
        xrayInputRef.current.value = "";
      }
      return;
    }

    setVisitScans((prev) => [...prev, ...mapped]);
    if (scanInputRef.current) {
      scanInputRef.current.value = "";
    }
  };

  const removeSupportingFile = (kind: "xray" | "scan", uploadId: string) => {
    if (kind === "xray") {
      setVisitXrays((prev) => prev.filter((item) => item.id !== uploadId));
      return;
    }

    setVisitScans((prev) => prev.filter((item) => item.id !== uploadId));
  };

  const buildElasticLabel = (
    enabled: boolean,
    type: string,
    other: string,
    gauge: string,
    size: string
  ) => {
    if (!enabled) return null;

    if (type === "Other") {
      return other.trim() || "Other";
    }

    const details = [gauge, size].filter(Boolean).join(" ");
    return details ? `${type} (${details})` : type;
  };

  const saveAppointment = async () => {
    if (isSavingRef.current || isSaving) {
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    const payment = Number(paymentReceived.replace(/,/g, "")) || 0;
    const additional = Number(additionalAmount.replace(/,/g, "")) || 0;

    try {
      const response = await fetch("/api/patients", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) {
        throw new Error("Failed to load patients");
      }
      const patients = await response.json();
      const conflict = patients.some((p: Patient) => p.id.toString() !== id && p.appointmentDate === selectedDate && p.appointmentTime === appointmentTime);

      if (conflict) {
        setConflictWarning(`Warning: Another patient already has an appointment on ${formatDateDMY(selectedDate)} at ${appointmentTime}.`);
        return;
      }

      setConflictWarning("");

      const patientResponse = await fetch(`/api/patients/${id}`, { cache: "no-store", credentials: "same-origin" });
      if (!patientResponse.ok) {
        throw new Error("Patient not found");
      }
      const existingPatient = await patientResponse.json();
      const existingVisits = existingPatient.visits || [];
      const today = new Date().toISOString().split("T")[0];
      const initialPlannedNotes = existingVisits.length === 0 ? existingPatient.plannedNotes || "" : "";

      // Convert 12-hour time format to 24-hour for datetime
      const convertTo24Hour = (time12h: string) => {
        const [time, period] = time12h.trim().split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        
        if (period === 'PM' && hours !== 12) {
          hours += 12;
        } else if (period === 'AM' && hours === 12) {
          hours = 0;
        }
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      };

      const time24h = convertTo24Hour(appointmentTime);
      const nextAppointmentISO = new Date(`${selectedDate}T${time24h}:00`).toISOString();

      const finalUpperWire = upperArchEnabled
        ? formatWireLabel(upperWireSystem, upperWireType, upperWireGauge, upperWireOther, upperDamonWire, upperDamonWireOther)
        : "";
      const finalLowerWire = lowerArchEnabled
        ? formatWireLabel(lowerWireSystem, lowerWireType, lowerWireGauge, lowerWireOther, lowerDamonWire, lowerDamonWireOther)
        : "";
      const plannedUpperWire = plannedUpperArchEnabled ? formatWireLabel(plannedUpperWireSystem, plannedUpperWireType, plannedUpperWireGauge, plannedUpperWireOther, plannedUpperDamonWire, plannedUpperDamonWireOther) : "";
      const plannedLowerWire = plannedLowerArchEnabled ? formatWireLabel(plannedLowerWireSystem, plannedLowerWireType, plannedLowerWireGauge, plannedLowerWireOther, plannedLowerDamonWire, plannedLowerDamonWireOther) : "";
      const finalElastics = buildElasticLabel(
        elasticEnabled,
        elasticType,
        elasticOther,
        elasticGauge,
        elasticSize
      );
      const plannedElastics = buildElasticLabel(
        plannedElasticEnabled,
        plannedElasticType,
        plannedElasticOther,
        plannedElasticGauge,
        plannedElasticSize
      );

      const newVisit = {
        visitDate: today,
        visitType: "Consultation",
        treatmentNotes: visitNotes,
        plannedTreatment: plannedNotes || initialPlannedNotes,
        upperArch: finalUpperWire,
        lowerArch: finalLowerWire,
        elastics: finalElastics,
        tads: tadsEnabled ? tadsNote : null,
        plannedUpperArch: plannedUpperWire || null,
        plannedLowerArch: plannedLowerWire || null,
        plannedElasticType: plannedElastics,
        plannedTadsNote: plannedTadsEnabled ? plannedTadsNote : null,
        paymentCollected: payment,
        nextAppointment: nextAppointmentISO,
      };

      // First update the patient
      const updatePatientResponse = await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstAppointment: false,
          elasticEnabled,
          elasticType: finalElastics || "",
          plannedNotes: existingVisits.length === 0 ? "" : existingPatient.plannedNotes,
        }),
      });
      if (!updatePatientResponse.ok) {
        throw new Error("Failed to update patient");
      }

      const appointmentDateTime = new Date(nextAppointmentISO);
      const appointmentResponse = await fetch(`/api/patients/${id}/appointments`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: appointmentDateTime.toISOString(),
          status: "SCHEDULED",
          type: "Regular",
          notes: visitNotes || "",
        }),
      });
      if (!appointmentResponse.ok) {
        throw new Error("Failed to create appointment");
      }

      // Then create the visit record for this appointment
      const updateResponse = await fetch(`/api/patients/${id}/visits`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVisit),
      });
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error("Visits update error:", errorText);
        throw new Error("Update failed");
      }

      const createdVisit = await updateResponse.json().catch(() => null);
      if (createdVisit?.id) {
        if (visitPhotosEnabled) {
          const uploadTasks = ORTHO_PHOTO_UPLOAD_SLOTS
            .map((slot) => {
              const photo = visitPhotos[slot.key];
              if (!photo) {
                return null;
              }

              return async () => {
                const formData = new FormData();
                formData.append("files", photo.file);
                formData.append("fileType", "PHOTO");
                formData.append("category", slot.category);
                formData.append("uploadedBy", patient?.name || "Orthodontist");

                const mediaResponse = await fetch(
                  `/api/patients/${id}/visits/${createdVisit.id}/media`,
                  {
                    method: "POST",
                    credentials: "same-origin",
                    body: formData,
                  }
                );

                if (!mediaResponse.ok) {
                  console.error("Visit photo upload failed for", slot.label);
                }
              };
            })
            .filter(Boolean) as Array<() => Promise<void>>;

          for (const uploadTask of uploadTasks) {
            await uploadTask();
          }
        }

        if (visitXraysEnabled) {
          for (const xray of visitXrays) {
            const formData = new FormData();
            formData.append("files", xray.file);
            formData.append("fileType", "XRAY");
            formData.append("category", xray.category);
            formData.append("uploadedBy", patient?.name || "Orthodontist");

            const mediaResponse = await fetch(
              `/api/patients/${id}/visits/${createdVisit.id}/media`,
              {
                method: "POST",
                credentials: "same-origin",
                body: formData,
              }
            );

            if (!mediaResponse.ok) {
              console.error("Visit X-ray upload failed for", xray.name);
            }
          }
        }

        if (visitScansEnabled) {
          for (const scan of visitScans) {
            const formData = new FormData();
            formData.append("files", scan.file);
            formData.append("fileType", "SCAN");
            formData.append("category", scan.category);
            formData.append("uploadedBy", patient?.name || "Orthodontist");

            const mediaResponse = await fetch(
              `/api/patients/${id}/visits/${createdVisit.id}/media`,
              {
                method: "POST",
                credentials: "same-origin",
                body: formData,
              }
            );

            if (!mediaResponse.ok) {
              console.error("Visit scanner upload failed for", scan.name);
            }
          }
        }
      }
    } catch (error) {
      console.error("Appointment save error:", error);
      setConflictWarning("Unable to save the appointment right now: " + (error instanceof Error ? error.message : String(error)));
      return;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }

    router.push(`/patients/${id}`);
  };

  if (!patient) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 p-8">
          <p>Patient not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 w-full">
        <h1 className="text-4xl font-bold text-blue-700 mb-8">
          Schedule Appointment
        </h1>

        <div className="bg-white rounded-xl shadow p-8 text-black">
          <div className="mb-6">
            <strong>Patient:</strong>{" "}
            {patient.name}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div id="current-appointment" className="border rounded-xl p-5 bg-blue-50">
              <h2 className="text-xl font-bold text-blue-700 mb-5">
                Current Appointment
              </h2>

            <div>
                <label className="flex items-center gap-3 font-semibold mb-3">
                  <input
                    type="checkbox"
                    checked={upperArchEnabled}
                    onChange={(e) => setUpperArchEnabled(e.target.checked)}
                  />
                  Upper Arch
                </label>

                {upperArchEnabled && (
                  <div className="space-y-4 mb-4">
                    <div className="text-sm text-slate-700">
                      Wire system: {getWireSystemLabel(upperWireSystem, patient?.bracketType)}
                    </div>

                    {upperWireSystem === "MBT/Roth" ? (
                      <>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-3 py-2">
                            <input
                              type="radio"
                              name="upperWireType"
                              value="Niti"
                              checked={upperWireType === "Niti"}
                              onChange={() => {
                                setUpperWireType("Niti");
                                if (!wireGauges("Niti").includes(upperWireGauge)) {
                                  setUpperWireGauge("12");
                                }
                              }}
                            />
                            Niti
                          </label>
                          <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-3 py-2">
                            <input
                              type="radio"
                              name="upperWireType"
                              value="SS"
                              checked={upperWireType === "SS"}
                              onChange={() => {
                                setUpperWireType("SS");
                                if (!wireGauges("SS").includes(upperWireGauge)) {
                                  setUpperWireGauge("18");
                                }
                              }}
                            />
                            SS
                          </label>
                        </div>

                        <div>
                          <label className="block mb-2 font-semibold text-sm">
                            Wire gauge
                          </label>
                          <select
                            value={upperWireGauge}
                            onChange={(e) => setUpperWireGauge(e.target.value)}
                            className="w-full border p-3 rounded"
                          >
                            {wireGauges(upperWireType).map((gauge) => (
                              <option key={gauge} value={gauge}>
                                {gauge}
                              </option>
                            ))}
                          </select>
                        </div>

                        {upperWireGauge === "Other" && (
                          <input
                            type="text"
                            value={upperWireOther}
                            onChange={(e) => setUpperWireOther(e.target.value)}
                            placeholder="Enter custom wire"
                            className="w-full border p-3 rounded"
                          />
                        )}
                      </>
                    ) : (
                      <div>
                        <label className="block mb-2 font-semibold text-sm">
                          Damon wire
                        </label>
                        <select
                          value={upperDamonWire}
                          onChange={(e) => setUpperDamonWire(e.target.value)}
                          className="w-full border p-3 rounded"
                        >
                          {damonWireOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        {upperDamonWire === "Other" && (
                          <input
                            type="text"
                            value={upperDamonWireOther}
                            onChange={(e) => setUpperDamonWireOther(e.target.value)}
                            placeholder="Enter custom Damon wire"
                            className="w-full border p-3 rounded mt-2"
                          />
                        )}
                      </div>
                    )}

                    <div className="text-sm text-slate-600">
                      Selected: {formatWireLabel(upperWireSystem, upperWireType, upperWireGauge, upperWireOther, upperDamonWire, upperDamonWireOther)}
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-3 font-semibold mb-3">
                  <input
                    type="checkbox"
                    checked={lowerArchEnabled}
                    onChange={(e) => setLowerArchEnabled(e.target.checked)}
                  />
                  Lower Arch
                </label>

                {lowerArchEnabled && (
                  <div className="space-y-4 mb-4">
                    <div className="text-sm text-slate-700">
                      Wire system: {getWireSystemLabel(lowerWireSystem, patient?.bracketType)}
                    </div>

                    {lowerWireSystem === "MBT/Roth" ? (
                      <>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-3 py-2">
                            <input
                              type="radio"
                              name="lowerWireType"
                              value="Niti"
                              checked={lowerWireType === "Niti"}
                              onChange={() => {
                                setLowerWireType("Niti");
                                if (!wireGauges("Niti").includes(lowerWireGauge)) {
                                  setLowerWireGauge("12");
                                }
                              }}
                            />
                            Niti
                          </label>
                          <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-3 py-2">
                            <input
                              type="radio"
                              name="lowerWireType"
                              value="SS"
                              checked={lowerWireType === "SS"}
                              onChange={() => {
                                setLowerWireType("SS");
                                if (!wireGauges("SS").includes(lowerWireGauge)) {
                                  setLowerWireGauge("18");
                                }
                              }}
                            />
                            SS
                          </label>
                        </div>

                        <div>
                          <label className="block mb-2 font-semibold text-sm">
                            Wire gauge
                          </label>
                          <select
                            value={lowerWireGauge}
                            onChange={(e) => setLowerWireGauge(e.target.value)}
                            className="w-full border p-3 rounded"
                          >
                            {wireGauges(lowerWireType).map((gauge) => (
                              <option key={gauge} value={gauge}>
                                {gauge}
                              </option>
                            ))}
                          </select>
                        </div>

                        {lowerWireGauge === "Other" && (
                          <input
                            type="text"
                            value={lowerWireOther}
                            onChange={(e) => setLowerWireOther(e.target.value)}
                            placeholder="Enter custom wire"
                            className="w-full border p-3 rounded"
                          />
                        )}
                      </>
                    ) : (
                      <div>
                        <label className="block mb-2 font-semibold text-sm">
                          Damon wire
                        </label>
                        <select
                          value={lowerDamonWire}
                          onChange={(e) => setLowerDamonWire(e.target.value)}
                          className="w-full border p-3 rounded"
                        >
                          {damonWireOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        {lowerDamonWire === "Other" && (
                          <input
                            type="text"
                            value={lowerDamonWireOther}
                            onChange={(e) => setLowerDamonWireOther(e.target.value)}
                            placeholder="Enter custom Damon wire"
                            className="w-full border p-3 rounded mt-2"
                          />
                        )}
                      </div>
                    )}

                    <div className="text-sm text-slate-600">
                      Selected: {formatWireLabel(lowerWireSystem, lowerWireType, lowerWireGauge, lowerWireOther, lowerDamonWire, lowerDamonWireOther)}
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-3 font-semibold mb-3">
                  <input
                    type="checkbox"
                    checked={elasticEnabled}
                    onChange={(e) => setElasticEnabled(e.target.checked)}
                  />
                  Elastics
                </label>

                {elasticEnabled && (
                  <div className="mb-4">
                    <select
                      value={elasticType}
                      onChange={(e) => setElasticType(e.target.value)}
                      className="w-full border p-3 rounded"
                    >
                      <option>Class II</option>
                      <option>Class III</option>
                      <option>Cross</option>
                      <option>Box</option>
                      <option>Triangle</option>
                      <option>Midline</option>
                      <option>Vertical</option>
                      <option>Other</option>
                    </select>

                    {elasticType === "Other" ? (
                      <input
                        type="text"
                        value={elasticOther}
                        onChange={(e) => setElasticOther(e.target.value)}
                        placeholder="Custom elastic"
                        className="w-full border p-3 rounded mt-2"
                      />
                    ) : (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="block mb-1 text-sm">Elastic Gauge</label>
                          <select value={elasticGauge} onChange={(e) => setElasticGauge(e.target.value as any)} className="w-full border p-2 rounded">
                            <option value="Small">Small</option>
                            <option value="Medium">Medium</option>
                            <option value="Heavy">Heavy</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block mb-1 text-sm">Elastic Size</label>
                          <select value={elasticSize} onChange={(e) => setElasticSize(e.target.value)} className="w-full border p-2 rounded">
                            <option>1/8</option>
                            <option>3/16</option>
                            <option>1/4</option>
                            <option>5/16</option>
                            <option>3/8</option>
                            <option>Other</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <label className="flex items-center gap-3 font-semibold mb-3">
                  <input
                    type="checkbox"
                    checked={tadsEnabled}
                    onChange={(e) => setTadsEnabled(e.target.checked)}
                  />
                  TADs
                </label>

                {tadsEnabled && (
                  <input
                    type="text"
                    value={tadsNote}
                    onChange={(e) => setTadsNote(e.target.value)}
                    placeholder="TAD note"
                    className="w-full border p-3 rounded mb-4"
                  />
                )}

                <div className="mb-4">
                  <label className="block mb-2 font-semibold">
                    Visit Notes
                  </label>

                  <textarea
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    rows={8}
                    placeholder="What was done during this visit?"
                    className="w-full border p-3 rounded"
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2 font-semibold">
                    Payment Received Today
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={paymentReceived ? Number(paymentReceived).toLocaleString() : ""}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        setPaymentReceived(digits);
                      }}
                      placeholder="0"
                      className="flex-1 border p-3 rounded"
                    />
                    <span className="font-semibold text-slate-700">IQD</span>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={additionalEnabled}
                      onChange={(e) => setAdditionalEnabled(e.target.checked)}
                    />
                    Additional payment
                  </label>

                  {additionalEnabled && (
                    <div className="mt-3 space-y-2">
                      <div>
                        <label className="block mb-1 text-sm">Additional fees</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={additionalAmount ? Number(additionalAmount).toLocaleString() : ""}
                            onChange={(e) => setAdditionalAmount(e.target.value.replace(/\D/g, ""))}
                            placeholder="0"
                            className="flex-1 border p-3 rounded"
                          />
                          <span className="font-semibold text-slate-700">IQD</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">This is an additional fee and will not be added to the patient's total paid. It is recorded separately on the visit.</p>
                      </div>
                      <div>
                        <label className="block mb-1 text-sm">Reason for additional fee</label>
                        <input type="text" value={additionalReason} onChange={(e) => setAdditionalReason(e.target.value)} className="w-full border p-2 rounded" />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 mt-2">
                          <input type="checkbox" checked={additionalCollected} onChange={(e) => setAdditionalCollected(e.target.checked)} />
                          Collected (mark as paid now)
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <label className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={visitPhotosEnabled}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setVisitPhotosEnabled(enabled);
                        if (!enabled) {
                          Object.values(visitPhotos).forEach((photo) => {
                            if (photo?.previewUrl) {
                              URL.revokeObjectURL(photo.previewUrl);
                            }
                          });
                          setVisitPhotos({});
                        }
                      }}
                    />
                    Photos
                  </label>
                  {visitPhotosEnabled && (
                    <div className="mt-3">
                      <OrthoPhotoChart
                        photos={visitPhotosForChart}
                        onSelectPhoto={handleVisitPhotoSelect}
                        onRemovePhoto={removeVisitPhoto}
                        patientName={patient.name}
                        ageText={patient.age ? String(patient.age) : "-"}
                        dentistText="Orthodontist"
                        bracesText={patient.bracketType || patient.treatment || "-"}
                        dateText={selectedDate || "-"}
                      />
                    </div>
                  )}
                </div>

                <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <label className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={visitXraysEnabled}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setVisitXraysEnabled(enabled);
                        if (!enabled) {
                          setVisitXrays([]);
                        }
                      }}
                    />
                    X-rays
                  </label>
                  {visitXraysEnabled && (
                    <>
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <select
                          value={xrayCategory}
                          onChange={(e) => setXrayCategory(e.target.value)}
                          className="w-full border p-3 rounded sm:w-auto"
                        >
                          {XRAY_CATEGORY_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <input
                          ref={xrayInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          multiple
                          className="hidden"
                          onChange={(e) => addSupportingFiles("xray", e.target.files, xrayCategory)}
                        />
                        <button
                          type="button"
                          onClick={() => xrayInputRef.current?.click()}
                          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Add X-ray Files
                        </button>
                      </div>

                      {visitXrays.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {visitXrays.map((item) => (
                            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                              <div>
                                <p className="font-medium text-slate-800">{item.name}</p>
                                <p className="text-xs text-slate-500">{item.category}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeSupportingFile("xray", item.id)}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">No X-ray files added.</p>
                      )}
                    </>
                  )}
                </div>

                <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <label className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={visitScansEnabled}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setVisitScansEnabled(enabled);
                        if (!enabled) {
                          setVisitScans([]);
                        }
                      }}
                    />
                    Scanner / Digital Models
                  </label>
                  {visitScansEnabled && (
                    <>
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <select
                          value={scanCategory}
                          onChange={(e) => setScanCategory(e.target.value)}
                          className="w-full border p-3 rounded sm:w-auto"
                        >
                          {SCAN_CATEGORY_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <input
                          ref={scanInputRef}
                          type="file"
                          accept=".stl,image/*,.pdf"
                          multiple
                          className="hidden"
                          onChange={(e) => addSupportingFiles("scan", e.target.files, scanCategory)}
                        />
                        <button
                          type="button"
                          onClick={() => scanInputRef.current?.click()}
                          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Add Scanner Files
                        </button>
                      </div>

                      {visitScans.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {visitScans.map((item) => (
                            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                              <div>
                                <p className="font-medium text-slate-800">{item.name}</p>
                                <p className="text-xs text-slate-500">{item.category}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeSupportingFile("scan", item.id)}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">No scanner files added.</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="border rounded-xl p-5 bg-green-50">
              <h2 className="text-xl font-bold text-green-700 mb-5">Next Appointment</h2>

              <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-lg font-semibold text-slate-800">Planned Visit Details</h3>
                {/* description removed per request */}

                <div className="space-y-4">
                  <label className="flex items-center gap-3 font-semibold">
                    <input
                      type="checkbox"
                      checked={plannedUpperArchEnabled}
                      onChange={(e) => setPlannedUpperArchEnabled(e.target.checked)}
                    />
                    Planned Upper Arch
                  </label>

                  {plannedUpperArchEnabled && (
                    <div className="space-y-4 rounded-xl border border-slate-200 p-3">
                        <div className="text-sm text-slate-700">
                          Wire system: {getWireSystemLabel(plannedUpperWireSystem, patient?.bracketType)}
                        </div>

                        {plannedUpperWireSystem === "MBT/Roth" ? (
                          <>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-3 py-2">
                                <input
                                  type="radio"
                                  name="plannedUpperWireType"
                                  value="Niti"
                                  checked={plannedUpperWireType === "Niti"}
                                  onChange={() => {
                                    setPlannedUpperWireType("Niti");
                                    if (!wireGauges("Niti").includes(plannedUpperWireGauge)) {
                                      setPlannedUpperWireGauge("12");
                                    }
                                  }}
                                />
                                Niti
                              </label>
                              <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-3 py-2">
                                <input
                                  type="radio"
                                  name="plannedUpperWireType"
                                  value="SS"
                                  checked={plannedUpperWireType === "SS"}
                                  onChange={() => {
                                    setPlannedUpperWireType("SS");
                                    if (!wireGauges("SS").includes(plannedUpperWireGauge)) {
                                      setPlannedUpperWireGauge("18");
                                    }
                                  }}
                                />
                                SS
                              </label>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-semibold">Wire gauge</label>
                              <select
                                value={plannedUpperWireGauge}
                                onChange={(e) => setPlannedUpperWireGauge(e.target.value)}
                                className="w-full border p-3 rounded"
                              >
                                {wireGauges(plannedUpperWireType).map((gauge) => (
                                  <option key={gauge} value={gauge}>
                                    {gauge}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {plannedUpperWireGauge === "Other" && (
                              <input
                                type="text"
                                value={plannedUpperWireOther}
                                onChange={(e) => setPlannedUpperWireOther(e.target.value)}
                                placeholder="Enter custom wire"
                                className="w-full border p-3 rounded"
                              />
                            )}
                          </>
                        ) : (
                          <div>
                            <label className="mb-2 block text-sm font-semibold">Damon wire</label>
                            <select
                              value={plannedUpperDamonWire}
                              onChange={(e) => setPlannedUpperDamonWire(e.target.value)}
                              className="w-full border p-3 rounded"
                            >
                              {damonWireOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                            {plannedUpperDamonWire === "Other" && (
                              <input
                                type="text"
                                value={plannedUpperDamonWireOther}
                                onChange={(e) => setPlannedUpperDamonWireOther(e.target.value)}
                                placeholder="Enter custom Damon wire"
                                className="mt-2 w-full border p-3 rounded"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <label className="flex items-center gap-3 font-semibold">
                      <input
                        type="checkbox"
                        checked={plannedLowerArchEnabled}
                        onChange={(e) => setPlannedLowerArchEnabled(e.target.checked)}
                      />
                      Planned Lower Arch
                    </label>

                    {plannedLowerArchEnabled && (
                      <div className="space-y-4 rounded-xl border border-slate-200 p-3">
                        <div className="text-sm text-slate-700">
                          Wire system: {getWireSystemLabel(plannedLowerWireSystem, patient?.bracketType)}
                        </div>

                        {plannedLowerWireSystem === "MBT/Roth" ? (
                          <>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-3 py-2">
                                <input
                                  type="radio"
                                  name="plannedLowerWireType"
                                  value="Niti"
                                  checked={plannedLowerWireType === "Niti"}
                                  onChange={() => {
                                    setPlannedLowerWireType("Niti");
                                    if (!wireGauges("Niti").includes(plannedLowerWireGauge)) {
                                      setPlannedLowerWireGauge("12");
                                    }
                                  }}
                                />
                                Niti
                              </label>
                              <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-3 py-2">
                                <input
                                  type="radio"
                                  name="plannedLowerWireType"
                                  value="SS"
                                  checked={plannedLowerWireType === "SS"}
                                  onChange={() => {
                                    setPlannedLowerWireType("SS");
                                    if (!wireGauges("SS").includes(plannedLowerWireGauge)) {
                                      setPlannedLowerWireGauge("18");
                                    }
                                  }}
                                />
                                SS
                              </label>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-semibold">Wire gauge</label>
                              <select
                                value={plannedLowerWireGauge}
                                onChange={(e) => setPlannedLowerWireGauge(e.target.value)}
                                className="w-full border p-3 rounded"
                              >
                                {wireGauges(plannedLowerWireType).map((gauge) => (
                                  <option key={gauge} value={gauge}>
                                    {gauge}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {plannedLowerWireGauge === "Other" && (
                              <input
                                type="text"
                                value={plannedLowerWireOther}
                                onChange={(e) => setPlannedLowerWireOther(e.target.value)}
                                placeholder="Enter custom wire"
                                className="w-full border p-3 rounded"
                              />
                            )}
                          </>
                        ) : (
                          <div>
                            <label className="mb-2 block text-sm font-semibold">Damon wire</label>
                            <select
                              value={plannedLowerDamonWire}
                              onChange={(e) => setPlannedLowerDamonWire(e.target.value)}
                              className="w-full border p-3 rounded"
                            >
                              {damonWireOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                            {plannedLowerDamonWire === "Other" && (
                              <input
                                type="text"
                                value={plannedLowerDamonWireOther}
                                onChange={(e) => setPlannedLowerDamonWireOther(e.target.value)}
                                placeholder="Enter custom Damon wire"
                                className="mt-2 w-full border p-3 rounded"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <label className="flex items-center gap-3 font-semibold">
                      <input
                        type="checkbox"
                        checked={plannedElasticEnabled}
                        onChange={(e) => setPlannedElasticEnabled(e.target.checked)}
                      />
                      Planned Elastics
                    </label>

                    {plannedElasticEnabled && (
                      <div className="rounded-xl border border-slate-200 p-3">
                        <select
                          value={plannedElasticType}
                          onChange={(e) => setPlannedElasticType(e.target.value)}
                          className="w-full border p-3 rounded"
                        >
                          <option>Class II</option>
                          <option>Class III</option>
                          <option>Cross</option>
                          <option>Box</option>
                          <option>Triangle</option>
                          <option>Midline</option>
                          <option>Vertical</option>
                          <option>Other</option>
                        </select>
                        {plannedElasticType === "Other" ? (
                          <input
                            type="text"
                            value={plannedElasticOther}
                            onChange={(e) => setPlannedElasticOther(e.target.value)}
                            placeholder="Custom elastic"
                            className="w-full border p-3 rounded mt-2"
                          />
                        ) : (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div>
                              <label className="block mb-1 text-sm">Planned Elastic Gauge</label>
                              <select value={plannedElasticGauge} onChange={(e) => setPlannedElasticGauge(e.target.value as any)} className="w-full border p-2 rounded">
                                <option value="Small">Small</option>
                                <option value="Medium">Medium</option>
                                <option value="Heavy">Heavy</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="block mb-1 text-sm">Planned Elastic Size</label>
                              <select value={plannedElasticSize} onChange={(e) => setPlannedElasticSize(e.target.value)} className="w-full border p-2 rounded">
                                <option>1/8</option>
                                <option>3/16</option>
                                <option>1/4</option>
                                <option>5/16</option>
                                <option>3/8</option>
                                <option>Other</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <label className="flex items-center gap-3 font-semibold">
                      <input
                        type="checkbox"
                        checked={plannedTadsEnabled}
                        onChange={(e) => setPlannedTadsEnabled(e.target.checked)}
                      />
                      Planned TADs
                    </label>

                    {plannedTadsEnabled && (
                      <input
                        type="text"
                        value={plannedTadsNote}
                        onChange={(e) => setPlannedTadsNote(e.target.value)}
                        placeholder="Planned TAD note"
                        className="w-full border p-3 rounded"
                      />
                    )}
                  </div>
              </div>

              <div className="mb-4">
                <label className="block mb-2 font-semibold">Next Appointment Date</label>
                <select
                  value={appointmentMode}
                  onChange={(e) => setAppointmentMode(e.target.value)}
                  className="w-full border p-3 rounded"
                >
                  <option>15 Days</option>
                  <option>30 Days</option>
                  <option>45 Days</option>
                  <option>60 Days</option>
                  <option>Manual</option>
                </select>
                {isFriday && (
                  <p className="text-sm text-orange-700 mt-2">
                    Note: The selected appointment falls on Friday.
                  </p>
                )}
              </div>

              {appointmentMode === "Manual" && (
                <div className="mb-4">
                  <DateInput
                    value={appointmentDate}
                    onChange={setAppointmentDate}
                    className="w-full border p-3 rounded"
                  />
                  {isFriday && (
                    <p className="text-sm text-orange-700 mt-2">
                      Note: The selected appointment falls on Friday.
                    </p>
                  )}
                </div>
              )}

              <div className="mb-4">
                <div className="bg-white border rounded-lg p-3">
                  <strong>Selected Date:</strong>{" "}
                  {selectedDate}
                </div>

                {isFriday && (
                  <div className="mt-2 bg-red-100 border border-red-300 text-red-700 p-3 rounded">
                    Note: This appointment is scheduled on Friday
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block mb-2 font-semibold">Next Appointment Time</label>
                <select
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="w-full border p-3 rounded"
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
                {timeConflictMessage && (
                  <p className="text-sm text-red-700 mt-2">{timeConflictMessage}</p>
                )}
              </div>

              {conflictWarning && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                  {conflictWarning}
                </div>
              )}

              <div className="mt-8 text-center">
                <button
                  onClick={saveAppointment}
                  disabled={isSaving}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isSaving ? "Saving..." : "Save Appointment"}
                </button>
              </div>

              <div className="border-t border-gray-200 mt-8 pt-6">
                <h3 className="text-lg font-bold mb-3 text-slate-800">Case Actions</h3>
                <p className="text-sm text-slate-600 mb-4">Finish the case or move it to retainer after scheduling the next visit.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/finish-case/${id}`)}
                    className="w-full bg-green-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                  >
                    Finish Case
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/finish-case/${id}?mode=retainer`)}
                    className="w-full bg-purple-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
                  >
                    Move to Retainer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
