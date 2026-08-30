"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDateDMY } from "../lib/date";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import DateInput from "../components/DateInput";
import {
  Patient,
  normalizeDateIso,
  hasAppointmentConflict,
  validatePatientRecord,
  CLINIC_COLORS,
} from "../lib/patient";
import { getCaseSheetDraftStorageKey, getCurrentUserId, getExistingCaseSheetDraftStorageKey, migrateCaseSheetDraftStorageKey } from "../lib/draft";

export default function AddPatientPage() {
  const router = useRouter();

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
const [occupation, setOccupation] = useState("");
const [clinicEnabled, setClinicEnabled] = useState(false);
const [clinicName, setClinicName] = useState("");
const [clinicColor, setClinicColor] = useState(CLINIC_COLORS[0]);
  const [treatmentType, setTreatmentType] =
    useState("Fixed Braces");

  const [MyofunctionalType, setMyofunctionalType] =
    useState("Fixed");

  const [treatment, setTreatment] =
    useState("Fixed Braces");

  const [bracketType, setBracketType] =
    useState("MBT System");
  const [damonTorques, setDamonTorques] = useState("");
const [wireMaterial, setWireMaterial] =
  useState("NiTi");
    const [elasticEnabled, setElasticEnabled] = useState(false);
    const [elasticType, setElasticType] = useState("Class II");
    const [tadsNote, setTadsNote] = useState("");
  const [caseSheet, setCaseSheet] = useState("");
  const [caseSheetAttachments, setCaseSheetAttachments] = useState<any[]>([]);
  const [existingCaseSheet, setExistingCaseSheet] = useState("");
  const [existingCaseSheetAttachments, setExistingCaseSheetAttachments] = useState<any[]>([]);
  const [draftStorageKey, setDraftStorageKey] = useState<string>("newPatientCaseSheetDraft");
  const [existingDraftStorageKey, setExistingDraftStorageKey] = useState<string>("existingPatientCaseSheetDraft");
  const [draftKeyLoaded, setDraftKeyLoaded] = useState(false);
  const [existingLoadedFromId, setExistingLoadedFromId] = useState<number | null>(null);
  const [existingLoadMessage, setExistingLoadMessage] = useState<string | null>(null);
  const [showClinicalDetails, setShowClinicalDetails] = useState(false);

  const [appointmentMode, setAppointmentMode] =
    useState("30 Days");
  useEffect(() => {
    let cancelled = false;

    getCurrentUserId().then((userId) => {
      if (cancelled) return;
      setDraftStorageKey(migrateCaseSheetDraftStorageKey(userId || undefined));
      setExistingDraftStorageKey(getExistingCaseSheetDraftStorageKey(userId || undefined));
      setDraftKeyLoaded(true);
    }).catch(() => {
      if (cancelled) return;
      setDraftStorageKey(getCaseSheetDraftStorageKey(undefined));
      setExistingDraftStorageKey(getExistingCaseSheetDraftStorageKey(undefined));
      setDraftKeyLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const parseWireLabelFromString = (value: string) => {
    const v = (value || "").trim();
    const result: { material?: string; gauge?: string; isDamon?: boolean; damon?: string; other?: string } = {};
    if (!v) return result;

    // Damon wires often contain 'CuNiTi' or other descriptors
    if (/Damon|CuNiTi|Damon/i.test(v)) {
      result.isDamon = true;
      result.damon = v;
      return result;
    }

    // Gauge like '16', '17x25', '18x25'
    const gaugeMatch = v.match(/(\d{2}(?:x\d{2})?)/);
    if (gaugeMatch) result.gauge = gaugeMatch[1];

    if (/SS|Stainless/i.test(v)) {
      result.material = "Stainless Steel";
    } else if (/NiTi|Niti/i.test(v)) {
      result.material = "NiTi";
    }

    if (!result.material && result.gauge) {
      // fallback: assume NiTi
      result.material = "NiTi";
    }

    return result;
  };

  useEffect(() => {
    if (!draftKeyLoaded) return;

    try {
      const draft = JSON.parse(
        localStorage.getItem(draftStorageKey) || "null"
      );

      if (
        draft &&
        draft.draftPresent === true &&
        typeof draft.caseSheetText === "string"
      ) {
        setCaseSheet(draft.caseSheetText);
      }

      if (draft && typeof draft === "object") {
        if (typeof draft.name === "string" && draft.name.trim()) {
          setName(draft.name);
        }
        if (typeof draft.phone === "string" && draft.phone.trim()) {
          setPhone(draft.phone);
        } else if (typeof draft.mobile === "string" && draft.mobile.trim()) {
          setPhone(draft.mobile);
        } else if (typeof draft.homePhone === "string" && draft.homePhone.trim()) {
          setPhone(draft.homePhone);
        }
        if (typeof draft.homeAddress === "string" && draft.homeAddress.trim()) {
          setAddress(draft.homeAddress);
        }
        if (typeof draft.age === "string" && draft.age.trim()) {
          setAge(draft.age);
        }
        if (typeof draft.occupation === "string" && draft.occupation.trim()) {
          setOccupation(draft.occupation);
        }
        if (Array.isArray(draft.attachments)) {
          setCaseSheetAttachments(draft.attachments);
        }
      }
    } catch (error) {
      console.warn("Failed to load new-patient case sheet draft", error);
    }

    try {
      const existingDraft = JSON.parse(
        localStorage.getItem(existingDraftStorageKey) || "null"
      );

      if (
        existingDraft &&
        existingDraft.draftPresent === true &&
        typeof existingDraft.caseSheetText === "string"
      ) {
        setExistingCaseSheet(existingDraft.caseSheetText);
      }

      if (existingDraft && typeof existingDraft === "object") {
        if (typeof existingDraft.name === "string" && existingDraft.name.trim()) {
          setExistingName(existingDraft.name);
        }
        if (typeof existingDraft.phone === "string" && existingDraft.phone.trim()) {
          setExistingPhone(existingDraft.phone);
        } else if (typeof existingDraft.mobile === "string" && existingDraft.mobile.trim()) {
          setExistingPhone(existingDraft.mobile);
        } else if (typeof existingDraft.homePhone === "string" && existingDraft.homePhone.trim()) {
          setExistingPhone(existingDraft.homePhone);
        }
        if (typeof existingDraft.homeAddress === "string" && existingDraft.homeAddress.trim()) {
          setExistingAddress(existingDraft.homeAddress);
        }
        if (typeof existingDraft.age === "string" && existingDraft.age.trim()) {
          setExistingAge(existingDraft.age);
        }
        if (typeof existingDraft.occupation === "string" && existingDraft.occupation.trim()) {
          setExistingOccupation(existingDraft.occupation);
        }
        if (typeof existingDraft.wireSettings === "object" && existingDraft.wireSettings !== null) {
          const wireSettings = existingDraft.wireSettings as Record<string, unknown>;
          if (typeof wireSettings.upperWireMaterial === "string") {
            setExistingUpperWireMaterial(wireSettings.upperWireMaterial);
          }
          if (typeof wireSettings.lowerWireMaterial === "string") {
            setExistingLowerWireMaterial(wireSettings.lowerWireMaterial);
          }
          if (typeof wireSettings.upperWireGauge === "string") {
            setExistingUpperWireGauge(wireSettings.upperWireGauge);
          }
          if (typeof wireSettings.lowerWireGauge === "string") {
            setExistingLowerWireGauge(wireSettings.lowerWireGauge);
          }
          if (typeof wireSettings.upperDamonWire === "string") {
            setExistingUpperDamonWire(wireSettings.upperDamonWire);
          }
          if (typeof wireSettings.upperDamonWireOther === "string") {
            setExistingUpperDamonWireOther(wireSettings.upperDamonWireOther);
          }
          if (typeof wireSettings.lowerDamonWire === "string") {
            setExistingLowerDamonWire(wireSettings.lowerDamonWire);
          }
          if (typeof wireSettings.lowerDamonWireOther === "string") {
            setExistingLowerDamonWireOther(wireSettings.lowerDamonWireOther);
          }
        }
        if (typeof existingDraft.wireMaterial === "string" && existingDraft.wireMaterial.trim()) {
          setExistingUpperWireMaterial(existingDraft.wireMaterial);
          setExistingLowerWireMaterial(existingDraft.wireMaterial);
        }
        if (Array.isArray(existingDraft.attachments)) {
          setExistingCaseSheetAttachments(existingDraft.attachments);
        }
      }
    } catch (error) {
      console.warn("Failed to load existing-patient case sheet draft", error);
    }
  }, [draftKeyLoaded, draftStorageKey, existingDraftStorageKey]);
  const [appointmentDate, setAppointmentDate] =
    useState("");

  const [appointmentTime, setAppointmentTime] =
    useState("04:00 PM");

  const [firstAppointment, setFirstAppointment] =
    useState(false);

  const [myofunctionalMode, setMyofunctionalMode] =
    useState<"daily" | "weekly">("daily");
  const [myofunctionalCount, setMyofunctionalCount] =
    useState(1);
  const [myofunctionalDailyOption, setMyofunctionalDailyOption] =
    useState<"day" | "night" | "day and night" | "2 day" | "2 night">(
      "day"
    );
  const [myofunctionalWeeklyDays, setMyofunctionalWeeklyDays] =
    useState<string[]>([]);

  // Clear aligner states
  const [plannedAligners, setPlannedAligners] = useState(30);
  const [givenCount, setGivenCount] = useState(10);
  const [alignerWearDays, setAlignerWearDays] = useState(14);

const [notes, setNotes] = useState("");
const [plannedNotesEnabled, setPlannedNotesEnabled] = useState(false);
const [plannedNotes, setPlannedNotes] = useState("");

const [showNotes, setShowNotes] =
  useState(false);

const [totalFee, setTotalFee] = useState("");
const [alreadyPaid, setAlreadyPaid] = useState("");
  const [additionalEnabled, setAdditionalEnabled] = useState(false);
  const [additionalAmount, setAdditionalAmount] = useState("");
  const [additionalReason, setAdditionalReason] = useState("");

  // Tab system
  const [activeTab, setActiveTab] = useState<"new" | "existing">("new");
  const tabOptions: Array<{ key: "new" | "existing"; label: string }> = [
    { key: "new", label: "New Patient" },
    { key: "existing", label: "Existing Patient" },
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const search = new URLSearchParams(window.location.search);
    const requestedTab = search.get("tab");

    if (requestedTab === "existing") {
      setActiveTab("existing");
    } else if (requestedTab === "new") {
      setActiveTab("new");
    } else {
      setActiveTab("new");
    }
  }, []);

  // Existing Patient form states
  const [existingName, setExistingName] = useState("");
  const [existingPhone, setExistingPhone] = useState("");
  const [existingAddress, setExistingAddress] = useState("");
  const [existingAge, setExistingAge] = useState("");
  const [existingOccupation, setExistingOccupation] = useState("");
  const [existingClinicEnabled, setExistingClinicEnabled] = useState(false);
  const [existingClinicName, setExistingClinicName] = useState("");
  const [existingClinicColor, setExistingClinicColor] = useState(CLINIC_COLORS[0]);

  const [existingTreatmentType, setExistingTreatmentType] = useState("Fixed Braces");
  const [existingTreatment, setExistingTreatment] = useState("Fixed Braces");
  const [existingBracketType, setExistingBracketType] = useState("MBT System");
  const [existingUpperWireMaterial, setExistingUpperWireMaterial] = useState("NiTi");
  const [existingLowerWireMaterial, setExistingLowerWireMaterial] = useState("NiTi");
  const [existingMyofunctionalType, setExistingMyofunctionalType] = useState("Fixed");
  const [existingUpperDamonWire, setExistingUpperDamonWire] = useState("0.014 CuNiTi");
  const [existingUpperDamonWireFamily, setExistingUpperDamonWireFamily] = useState<"CuNiTi" | "SS" | "Other">("CuNiTi");
  const [existingUpperDamonWireOther, setExistingUpperDamonWireOther] = useState("");
  const [existingLowerDamonWire, setExistingLowerDamonWire] = useState("0.014 CuNiTi");
  const [existingLowerDamonWireFamily, setExistingLowerDamonWireFamily] = useState<"CuNiTi" | "SS" | "Other">("CuNiTi");
  const [existingLowerDamonWireOther, setExistingLowerDamonWireOther] = useState("");
  const [existingDamonTorques, setExistingDamonTorques] = useState("");
  const [existingUpperWireGauge, setExistingUpperWireGauge] = useState("16");
  const [existingLowerWireGauge, setExistingLowerWireGauge] = useState("16");
  const [existingClinicalDetailsEnabled, setExistingClinicalDetailsEnabled] = useState(false);
  const [existingElasticEnabled, setExistingElasticEnabled] = useState(false);
  const [existingElasticType, setExistingElasticType] = useState("Class II");
  const [existingTadsNote, setExistingTadsNote] = useState("");

  // Existing patient treatment progress states
  const [existingAlignerProgress, setExistingAlignerProgress] = useState(10);
  const [existingRetainerType, setExistingRetainerType] = useState("Fixed");

  const [existingAppointmentMode, setExistingAppointmentMode] = useState("30");
  const [existingAppointmentDate, setExistingAppointmentDate] = useState("");
  const [existingAppointmentTime, setExistingAppointmentTime] = useState("04:00 PM");
  const [existingFirstAppointment, setExistingFirstAppointment] = useState(false);
  const [existingNotes, setExistingNotes] = useState("");

  const [existingTotalFee, setExistingTotalFee] = useState("");
  const [existingAlreadyPaid, setExistingAlreadyPaid] = useState("");
  const [retainerFee, setRetainerFee] = useState("");
  const [conflictWarning, setConflictWarning] = useState("");
  const [timeConflictMessage, setTimeConflictMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const formatCalculatedDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getSelectedDate = () => {
    if (appointmentMode === "Manual") return normalizeDateIso(appointmentDate);

    if (treatmentType === "Clear Aligners" && appointmentMode === "Auto") {
      const daysToAdd = Number(givenCount) * Number(alignerWearDays);
      const future = new Date();
      future.setDate(future.getDate() + daysToAdd);
      return formatCalculatedDate(future);
    }

    const parsed = parseInt(appointmentMode, 10);
    if (!Number.isNaN(parsed)) {
      const future = new Date();
      future.setDate(future.getDate() + parsed);
      return formatCalculatedDate(future);
    }

    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    return formatCalculatedDate(fallback);
  };

  const getExistingSelectedDate = () => {
    if (existingAppointmentMode === "Manual") {
      return normalizeDateIso(existingAppointmentDate);
    }

    const parsed = parseInt(existingAppointmentMode, 10);
    if (!Number.isNaN(parsed)) {
      const future = new Date();
      future.setDate(future.getDate() + parsed);
      return formatCalculatedDate(future);
    }

    return "";
  };

  const selectedDate = getSelectedDate();
  const existingSelectedDate = getExistingSelectedDate();
  const isFriday = selectedDate && new Date(selectedDate).getDay() === 5;
  const existingIsFriday = existingSelectedDate && new Date(existingSelectedDate).getDay() === 5;

  useEffect(() => {
    const loadExistingPatients = async () => {
      try {
        const response = await fetch("/api/patients", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load patients");
        }
        const patients = await response.json();
        if (!selectedDate || !appointmentTime) {
          setTimeConflictMessage("");
          return;
        }

        const conflict = hasAppointmentConflict(
          patients,
          selectedDate,
          appointmentTime
        );

        if (conflict) {
          setTimeConflictMessage(
            `Warning: Another patient is scheduled on ${formatDateDMY(selectedDate)} at ${appointmentTime}.`
          );
        } else {
          setTimeConflictMessage("");
        }
      } catch {
        setTimeConflictMessage("");
      }
    };

    loadExistingPatients();
  }, [selectedDate, appointmentTime]);

  const fixedAppliances = [
    "Hyrax",
    "Quad Helix",
    "TPA",
    "Nance Appliance",
    "Fixed Habit Breaker",
  ];

  const removableAppliances = [
    "Twin Block",
    "Myobrace",
    "Trainer T4K",
    "Frankel",
    "Bionator",
    "Activator",
  ];

  const getDamonWireFamily = (value: string): "CuNiTi" | "SS" | "Other" => {
    if (value === "Other") return "Other";
    return value.includes("Stainless Steel") ? "SS" : "CuNiTi";
  };

  const getDamonWireOptions = (family: "CuNiTi" | "SS" | "Other") => {
    if (family === "SS") {
      return [
        "0.016 × 0.025 Stainless Steel",
        "0.016 × 0.027 Stainless Steel",
        "0.018 × 0.027 Stainless Steel",
        "0.019 × 0.025 Stainless Steel",
      ];
    }

    if (family === "CuNiTi") {
      return [
        "0.014 CuNiTi",
        "0.016 CuNiTi",
        "0.018 CuNiTi",
        "0.014 × 0.025 CuNiTi",
        "0.014 × 0.027 CuNiTi",
        "0.018 × 0.025 CuNiTi",
        "0.018 × 0.027 CuNiTi",
      ];
    }

    return [];
  };

  const savePatient = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationErrors(["Patient name is required."]);
      return;
    }

    const existingPatients = [] as Patient[];
    try {
      const response = await fetch("/api/patients", { cache: "no-store", credentials: "same-origin" });
      if (response.ok) {
        const data = await response.json();
        existingPatients.push(...(Array.isArray(data) ? data : []));
      }
    } catch {
      // ignore and continue with empty list
    }

    const finalDate = selectedDate;
    const finalTreatment =
      treatmentType === "Myofunctional Appliance"
        ? treatment
        : treatmentType;

    const newPatient: Patient = {
      id: Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      clinicName: clinicEnabled ? clinicName.trim() || undefined : undefined,
      clinicColor: clinicEnabled ? clinicColor : undefined,
      address: address.trim() || undefined,
      age: age ? Number(age) : undefined,
      occupation: occupation.trim() || undefined,
      treatment: finalTreatment,
      treatmentCategory: treatmentType,
      bracketType: treatmentType === "Fixed Braces" ? bracketType : undefined,
      damonTorques:
        treatmentType === "Fixed Braces" && bracketType === "Damon System"
          ? damonTorques.trim() || undefined
          : undefined,
      wireMaterial:
  treatmentType === "Fixed Braces"
    ? wireMaterial
    : undefined,
      caseSheet: caseSheet || "",
      attachments: caseSheetAttachments,
      appointmentDate: finalDate,
      appointmentTime,
      firstAppointment,
      notes: notes.trim(),
      plannedNotes: plannedNotesEnabled ? plannedNotes.trim() : "",
      totalFee: Number(totalFee) || 0,
      totalPaid: Number(alreadyPaid) || 0,
      retainerFee: Number(retainerFee) || 0,
      elasticEnabled,
      elasticType: elasticType || undefined,
      tadsNote: tadsNote || undefined,
      caseStatus: "active",
      myofunctionalType:
        treatmentType === "Myofunctional Appliance"
          ? finalTreatment
          : undefined,
      myofunctionalProgram:
        treatmentType === "Myofunctional Appliance"
          ? {
              mode: myofunctionalMode,
              count: myofunctionalCount,
              dailyOption:
                myofunctionalMode === "daily"
                  ? myofunctionalDailyOption
                  : undefined,
              weeklyDays:
                myofunctionalMode === "weekly"
                  ? myofunctionalWeeklyDays
                  : undefined,
            }
          : undefined,
          clearAlignersPlan:
            treatmentType === "Clear Aligners"
              ? {
                  total: plannedAligners,
                  given: givenCount,
                  wearDays: alignerWearDays,
                }
              : undefined,
          visits: [],
    };

    const validation = validatePatientRecord(newPatient, existingPatients);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    const conflict = hasAppointmentConflict(
      existingPatients,
      finalDate,
      appointmentTime
    );

    if (conflict) {
      setConflictWarning(
        `Warning: Another patient already has an appointment on ${formatDateDMY(finalDate)} at ${appointmentTime}.`
      );
      // Do not block patient creation for appointment conflicts; warn only.
    }

    setConflictWarning("");
    setValidationErrors([]);

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPatient,
          id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          caseSheetAttachments: (newPatient.attachments ?? []).map((photo) => ({
            id: photo.id,
            name: photo.name,
            originalName: photo.name,
            dataUrl: photo.dataUrl,
            mimeType: photo.dataUrl?.startsWith("data:image/") ? photo.dataUrl.split(";")[0].replace("data:", "") : "image/jpeg",
            fileType: "PHOTO",
            category: "Other",
            uploadedAt: new Date().toISOString(),
            source: "case-sheet",
          })),
          attachments: undefined,
        }),
      });

      if (!response.ok) {
        // Show server-provided error details for better UX.
        let msg = "Unable to save the patient right now.";
        let details: any = null;
        try {
          const data = await response.json();
          if (data && data.error) msg = data.error;
          if (data && data.details) details = data.details;
        } catch (e) {
          // ignore JSON parse errors
        }

        if (
          /DATABASE_URL|NEON_DATABASE_URL|database is not configured correctly|Authentication failed against database server|P1000/i.test(msg)
        ) {
          setValidationErrors([
            "Database connection issue: update the Neon DATABASE_URL in .env with the real connection string, then redeploy.",
          ]);
          return;
        }

        if (details) {
          if (typeof details === "string") {
            setValidationErrors([details]);
          } else if (typeof details === "object") {
            const detailMessages: string[] = [];
            const flatten = (value: any, prefix?: string) => {
              if (Array.isArray(value)) {
                value.forEach((item) => flatten(item, prefix));
                return;
              }
              if (typeof value === "object" && value !== null) {
                Object.entries(value).forEach(([key, child]) => {
                  const label = prefix ? `${prefix}.${key}` : key;
                  flatten(child, label);
                });
                return;
              }
              if (typeof value === "string" && value.trim()) {
                detailMessages.push(prefix ? `${prefix}: ${value}` : value);
              }
            };
            flatten(details);
            if (detailMessages.length > 0) {
              setValidationErrors(detailMessages);
              return;
            }
          }
        }

        setValidationErrors([msg]);
        return;
      }

      // Read created patient from server and navigate to its profile.
      const created = await response.json().catch(() => null);
      // Debug: log the created object and the id we will navigate to
      try {
        console.log('[DEBUG][client add-patient] server created response:', created);
        console.log('[DEBUG][client add-patient] navigating to id:', created?.id);
      } catch (e) {
        // ignore
      }
      localStorage.removeItem(draftStorageKey);
      if (created?.id) {
        router.push(`/patients/${created.id}`);
      } else {
        router.push("/patients");
      }
    } catch (error: any) {
      setValidationErrors([error?.message || "Unable to save the patient right now."]);
    }
  };

  const saveExistingPatient = async () => {
    const trimmedName = existingName.trim();

    if (!trimmedName) {
      setValidationErrors(["Patient name is required."]);
      return;
    }

    const finalTreatment =
      existingTreatmentType === "Myofunctional Appliance"
        ? existingTreatment
        : existingTreatmentType;

    const newPatient = {
      name: trimmedName,
      phone: existingPhone.trim() || undefined,
      address: existingAddress.trim() || undefined,
      occupation: existingOccupation.trim() || undefined,
      age: existingAge ? Number(existingAge) : undefined,
      clinicName: existingClinicEnabled ? existingClinicName.trim() || undefined : undefined,
      clinicColor: existingClinicEnabled ? existingClinicColor : undefined,
      treatment: finalTreatment,
      treatmentCategory: existingTreatmentType,
      bracketType: existingTreatmentType === "Fixed Braces" ? existingBracketType : undefined,
      damonTorques:
        existingTreatmentType === "Fixed Braces" && existingBracketType === "Damon System"
          ? existingDamonTorques.trim() || undefined
          : undefined,
      wireSettings:
        existingTreatmentType === "Fixed Braces"
          ? {
              upperWireMaterial:
                existingBracketType !== "Damon System" ? existingUpperWireMaterial : undefined,
              lowerWireMaterial:
                existingBracketType !== "Damon System" ? existingLowerWireMaterial : undefined,
              upperWireGauge: existingUpperWireGauge,
              lowerWireGauge: existingLowerWireGauge,
              upperDamonWire:
                existingBracketType === "Damon System" ? existingUpperDamonWire : undefined,
              upperDamonWireOther:
                existingBracketType === "Damon System" ? existingUpperDamonWireOther || undefined : undefined,
              lowerDamonWire:
                existingBracketType === "Damon System" ? existingLowerDamonWire : undefined,
              lowerDamonWireOther:
                existingBracketType === "Damon System" ? existingLowerDamonWireOther || undefined : undefined,
            }
          : undefined,
      myofunctionalType: existingTreatmentType === "Myofunctional Appliance" ? existingMyofunctionalType : undefined,
      appointmentDate: existingSelectedDate || undefined,
      appointmentTime: existingAppointmentTime || undefined,
      firstAppointment: existingFirstAppointment,
      notes: existingNotes.trim() || undefined,
      plannedNotes: "",
      totalFee: existingTotalFee ? Number(existingTotalFee) : undefined,
      totalPaid: existingAlreadyPaid ? Number(existingAlreadyPaid) : undefined,
      retainerFee: undefined,
      elasticEnabled: existingElasticEnabled,
      elasticType: existingElasticType || undefined,
      tadsNote: existingTadsNote || undefined,
      caseStatus: "active",
      clearAlignersPlan: undefined,
      myofunctionalProgram: undefined,
      caseSheet: existingCaseSheet || undefined,
      caseSheetAttachments: existingCaseSheetAttachments.length
        ? existingCaseSheetAttachments.map((photo) => ({
            id: photo.id,
            name: photo.name,
            originalName: photo.name,
            dataUrl: photo.dataUrl,
            mimeType:
              photo.dataUrl?.startsWith("data:image/")
                ? photo.dataUrl.split(";")[0].replace("data:", "")
                : photo.mimeType || "application/octet-stream",
            fileType: photo.fileType || "PHOTO",
            category: photo.category || "Other",
            uploadedAt: photo.uploadedAt || new Date().toISOString(),
            source: photo.source || "case-sheet",
          }))
        : undefined,
    };

    try {
      const allPatientsResponse = await fetch("/api/patients", { cache: "no-store", credentials: "same-origin" });
      const allPatients = allPatientsResponse.ok
        ? await allPatientsResponse.json().catch(() => [])
        : [];

      const normalizedLookupPhone = (existingPhone || "")
        .replace(/[^\d]/g, "")
        .trim();

      const patients = Array.isArray(allPatients) ? allPatients : [];
      const exactPhoneMatches = patients.filter((patient: any) => {
        const patientPhone = typeof patient?.phone === "string" ? patient.phone : "";
        return (patientPhone.replace(/[^\d]/g, "").trim() || "") === normalizedLookupPhone && normalizedLookupPhone.length > 0;
      });
      const exactNameMatches = patients.filter((patient: any) => {
        const patientName = typeof patient?.name === "string" ? patient.name : "";
        return patientName.trim().toLowerCase() === trimmedName.toLowerCase() && trimmedName.length > 0;
      });

      const loadedPatient = existingLoadedFromId
        ? patients.find((patient: any) => Number(patient?.id) === Number(existingLoadedFromId)) || null
        : null;

      const targetPatient = loadedPatient || (exactPhoneMatches[0] ?? (exactNameMatches.length === 1 ? exactNameMatches[0] : null));

      if (targetPatient?.id) {
        try {
          const patchResponse = await fetch(`/api/patients/${targetPatient.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newPatient),
          });

          const patchData = await patchResponse.json().catch(() => null);
          if (!patchResponse.ok) {
            setValidationErrors([patchData?.error || "Unable to update the existing patient right now."]);
            return;
          }

          setExistingLoadedFromId(Number(targetPatient.id));
          setValidationErrors([]);
          setConflictWarning("");
          localStorage.removeItem(existingDraftStorageKey);
          router.push(`/patients/${targetPatient.id}`);
          return;
        } catch (err) {
          setValidationErrors(["Failed to update existing patient."]);
          return;
        }
      }

      const response = await fetch("/api/patients", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPatient),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const serverMessage = String(data?.error || "Unable to save the patient right now.");
        if (
          /DATABASE_URL|NEON_DATABASE_URL|database is not configured correctly|Authentication failed against database server|P1000/i.test(serverMessage)
        ) {
          setValidationErrors([
            "Database connection issue: update the Neon DATABASE_URL in .env with the real connection string, then redeploy.",
          ]);
          return;
        }
        setValidationErrors([serverMessage]);
        return;
      }

      setValidationErrors([]);
      setConflictWarning("");
      localStorage.removeItem(existingDraftStorageKey);
      if (data?.id) {
        router.push(`/patients/${data.id}`);
      } else {
        router.push("/patients");
      }
    } catch (error: any) {
      setValidationErrors([error?.message || "Unable to save the patient right now."]);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 w-full">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-teal-700 mb-4">Add Patient</h1>
        
        {/* Tab Navigation */}
        <nav aria-label="Patient form tabs" className="flex gap-2 border-b border-slate-200">
          {tabOptions.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 font-medium transition ${
                  isActive
                    ? "border-b-2 border-teal-600 text-teal-600"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="bg-white p-8 rounded-xl shadow max-w-full w-full mx-auto max-w-2xl text-black">

        {validationErrors.length > 0 && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-semibold">Please fix the following:</p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ===== NEW PATIENT TAB ===== */}
        {activeTab === "new" && (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">New Patient</h2>
                <p className="text-sm text-slate-500">Create a patient record directly, or open the dedicated orthodontic case sheet page first.</p>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <Link
                  href="/case-sheet?tab=new"
                  className="inline-flex items-center justify-center rounded-full bg-teal-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
                >
                  Open case sheet page
                </Link>
                <p className="text-xs text-slate-500 max-w-sm text-right">
                  The case sheet is saved as a draft. If you fill it first, it will attach when you save the new patient.
                </p>
              </div>
            </div>

            {caseSheet && (
              <div className="mb-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-slate-700">
                <p className="font-medium">Case sheet draft loaded.</p>
                <p className="text-sm">Continue on this page to save the new patient, or edit the draft on the case sheet page.</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block mb-2">Patient Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border p-3 rounded" />
            </div>

            <div className="mb-4">
              <label className="block mb-2">Contact Number</label>
              <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(formatPhoneInput(e.target.value))} className="w-full border p-3 rounded" placeholder="e.g., 0770 123 4567" />
            </div>

            <div className="mb-4">
              <label className="block mb-2">Address</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border p-3 rounded" placeholder="Patient address" />
            </div>

            <div className="mb-4">
              <label className="block mb-2">Age (years)</label>
              <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full border p-3 rounded" placeholder="e.g., 25" min="0" max="120" />
            </div>

            <div className="mb-4">
              <label className="block mb-2">Occupation</label>
              <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} className="w-full border p-3 rounded" placeholder="Patient occupation" />
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={clinicEnabled} onChange={(e) => setClinicEnabled(e.target.checked)} />
                Choose Clinic
              </label>
              {clinicEnabled && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block mb-2">Clinic Name</label>
                    <input type="text" value={clinicName} onChange={(e) => setClinicName(e.target.value)} className="w-full border p-3 rounded" placeholder="Clinic name" />
                  </div>
                  <div>
                    <label className="block mb-2">Color Coding</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {CLINIC_COLORS.map((c) => {
                        const selected = c === clinicColor;
                        return (
                          <button key={c} type="button" onClick={() => setClinicColor(c)} title={c} className={`w-8 h-8 rounded-full ${selected ? 'ring-2 ring-offset-1 ring-teal-500' : 'border border-slate-200'}`} style={{ backgroundColor: c }} />
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block mb-2">Treatment</label>
              <select value={treatmentType} onChange={(e) => { const value = e.target.value; setTreatmentType(value); if (value !== "Myofunctional Appliance") { setTreatment(value); } else { setTreatment("Hyrax"); } }} className="w-full border p-3 rounded">
                <option>Fixed Braces</option>
                <option>Clear Aligners</option>
                <option>Retainers</option>
                <option>Myofunctional Appliance</option>
              </select>

              {treatmentType === "Fixed Braces" && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block mb-2">Bracket System</label>
                    <select value={bracketType} onChange={(e) => setBracketType(e.target.value)} className="w-full border p-3 rounded">
                      <option>MBT System</option>
                      <option>Roth System</option>
                      <option>Damon System</option>
                    </select>
                  </div>
                  {bracketType === "Damon System" ? (
                    <div>
                      <label className="block mb-2">Torques</label>
                      <input
                        type="text"
                        value={damonTorques}
                        onChange={(e) => setDamonTorques(e.target.value)}
                        className="w-full border p-3 rounded"
                        placeholder="Enter Damon torques"
                      />
                    </div>
                  ) : null}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowClinicalDetails((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left font-medium text-slate-700"
                    >
                      <span>Elastics & TADs</span>
                      <span className="text-sm text-slate-500">{showClinicalDetails ? "Hide" : "Show"}</span>
                    </button>
                    {showClinicalDetails ? (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block mb-2">Elastics (type)</label>
                          <select value={elasticType} onChange={(e) => setElasticType(e.target.value)} className="w-full border p-3 rounded">
                            <option>Class II</option>
                            <option>Class III</option>
                            <option>Cross</option>
                            <option>Other</option>
                          </select>
                          <label className="inline-flex items-center gap-2 mt-2"><input type="checkbox" checked={elasticEnabled} onChange={(e) => setElasticEnabled(e.target.checked)} /> Enabled</label>
                        </div>
                        <div>
                          <label className="block mb-2">TADs Note</label>
                          <input type="text" value={tadsNote} onChange={(e) => setTadsNote(e.target.value)} className="w-full border p-3 rounded" placeholder="TADs / mini-implant notes" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {treatmentType === "Retainers" && (
                <div className="mt-4">
                  <label className="block mb-2">Retainer Fee</label>
                  <div className="flex items-center gap-2">
                    <input type="text" value={retainerFee ? Number(retainerFee).toLocaleString() : retainerFee} onChange={(e) => setRetainerFee(e.target.value.replace(/\D/g, ""))} placeholder="0" className="flex-1 border p-3 rounded" />
                    <span className="font-semibold text-slate-700">IQD</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">This will be recorded as the retainer charge for this patient.</p>
                </div>
              )}
            </div>

            {treatmentType === "Myofunctional Appliance" && (
              <>
                <div className="mb-4">
                  <label className="block mb-2">Myofunctional Type</label>
                  <select value={MyofunctionalType} onChange={(e) => { const value = e.target.value; setMyofunctionalType(value); if (value === "Fixed") { setTreatment("Hyrax"); } else { setTreatment("Twin Block"); } }} className="w-full border p-3 rounded">
                    <option value="Fixed">Fixed</option>
                    <option value="Removable">Removable</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block mb-2">Appliance</label>
                  <select value={treatment} onChange={(e) => setTreatment(e.target.value)} className="w-full border p-3 rounded">
                    {(MyofunctionalType === "Fixed" ? fixedAppliances : removableAppliances).map((appliance) => (
                      <option key={appliance}>{appliance}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-sm font-semibold text-slate-700 mb-3">Myofunctional activation plan</div>
                  <div className="flex gap-2 mb-4">
                    <button type="button" onClick={() => setMyofunctionalMode("daily")} className={`px-3 py-2 rounded-lg border ${myofunctionalMode === "daily" ? "border-teal-600 bg-teal-50 text-teal-700" : "border-slate-300 bg-white text-slate-700"}`}>Daily</button>
                    <button type="button" onClick={() => setMyofunctionalMode("weekly")} className={`px-3 py-2 rounded-lg border ${myofunctionalMode === "weekly" ? "border-teal-600 bg-teal-50 text-teal-700" : "border-slate-300 bg-white text-slate-700"}`}>Weekly</button>
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2">How many times?</label>
                    <input type="number" min={1} max={10} value={myofunctionalCount} onChange={(e) => { const value = Number(e.target.value); setMyofunctionalCount(value > 10 ? 10 : value < 1 ? 1 : value); if (myofunctionalMode === "weekly" && myofunctionalWeeklyDays.length > value) { setMyofunctionalWeeklyDays(myofunctionalWeeklyDays.slice(0, value)); } }} className="w-full border p-3 rounded" />
                  </div>

                  {myofunctionalMode === "daily" ? (
                    <div className="mb-4">
                      <label className="block mb-2">Choose daily timing</label>
                      <select value={myofunctionalDailyOption} onChange={(e) => setMyofunctionalDailyOption(e.target.value as | "day" | "night" | "day and night" | "2 day" | "2 night")} className="w-full border p-3 rounded">
                        <option value="day">1 time - day</option>
                        <option value="night">1 time - night</option>
                        <option value="day and night">2 times - day and night</option>
                        <option value="2 day">2 times - day only</option>
                        <option value="2 night">2 times - night only</option>
                      </select>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <div className="block mb-2">Choose the weekdays to activate</div>
                      <div className="grid grid-cols-2 gap-2">
                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                          <button key={day} type="button" onClick={() => { setMyofunctionalWeeklyDays((current) => { if (current.includes(day)) { return current.filter((item) => item !== day); } if (current.length >= myofunctionalCount) { return current; } return [...current, day]; }); }} className={`rounded-lg border px-3 py-2 text-sm text-slate-700 ${myofunctionalWeeklyDays.includes(day) ? "border-teal-600 bg-teal-50" : "border-slate-300 bg-white"}`}>
                            {day}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Select up to {myofunctionalCount} day(s).</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {treatmentType === "Clear Aligners" && (
              <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="text-sm font-semibold text-slate-700 mb-3">Clear Aligners plan</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center mb-3">
                  <div>
                    <label className="block mb-1 text-sm">Planned total aligners</label>
                    <input type="number" min={1} value={plannedAligners} onChange={(e) => setPlannedAligners(Number(e.target.value) || 0)} className="w-full border p-2 rounded" />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm">Mark given at this visit</label>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-slate-600">Click dots below to mark</div>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-sm">Days per aligner</label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setAlignerWearDays((v) => Math.max(1, v - 1))} className="px-3 py-1 bg-white border rounded">-</button>
                      <input type="number" min={1} value={alignerWearDays} onChange={(e) => setAlignerWearDays(Number(e.target.value) || 0)} className="w-20 text-center border p-2 rounded" />
                      <button type="button" onClick={() => setAlignerWearDays((v) => v + 1)} className="px-3 py-1 bg-white border rounded">+</button>
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block mb-1 text-sm">Aligners (total)</label>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: Math.max(0, plannedAligners) }).map((_, i) => {
                      const selected = i < givenCount;
                      return (
                        <button key={i} type="button" onClick={() => setGivenCount((cur) => (cur === i + 1 ? i : i + 1))} title={`Aligner ${i + 1}`} className={`w-3 h-3 rounded-full transition-colors ${selected ? 'bg-teal-700' : 'bg-slate-300'}`} />
                      );
                    })}
                  </div>
                  <div className="text-sm text-slate-700 mt-2">Given this visit: <strong>{givenCount}</strong></div>
                </div>
                <div className="text-sm text-slate-700">
                  Next appointment (auto): <strong>{treatmentType === "Clear Aligners" ? `${givenCount * alignerWearDays} days from today` : "N/A"}</strong>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block mb-2">Next Appointment Date</label>
              <select value={appointmentMode} onChange={(e) => setAppointmentMode(e.target.value)} className="w-full border p-3 rounded">
                {treatmentType === "Clear Aligners" ? (
                  <>
                    <option>Auto</option>
                    <option>Manual</option>
                  </>
                ) : (
                  <>
                    <option>15</option>
                    <option>30</option>
                    <option>45</option>
                    <option>60</option>
                    <option>Manual</option>
                  </>
                )}
              </select>
              {isFriday && (
                <p className="text-sm text-orange-700 mt-2">
                  Note: The selected appointment falls on Friday.
                </p>
              )}
            </div>

            {appointmentMode === "Manual" && (
              <div className="mb-4">
                <label className="block mb-2">Appointment Date</label>
                <DateInput value={appointmentDate} onChange={setAppointmentDate} className="w-full border p-3 rounded" />
                {isFriday && (
                  <p className="text-sm text-orange-700 mt-2">
                    Note: The selected appointment falls on Friday.
                  </p>
                )}
              </div>
            )}

            <div className="mb-6">
              <div className="bg-teal-50 border rounded-lg p-3">
                <strong>Selected Date:</strong> {selectedDate || "-"}
              </div>
              {isFriday && (
                <div className="mt-2 bg-red-100 border border-red-300 text-red-700 p-3 rounded">
                  Note: This appointment is scheduled on Friday
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={firstAppointment} onChange={(e) => setFirstAppointment(e.target.checked)} />
                First Appointment
              </label>
            </div>

            {firstAppointment && (
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={plannedNotesEnabled} onChange={(e) => setPlannedNotesEnabled(e.target.checked)} />
                  Planned Notes for first visit
                </label>
                {plannedNotesEnabled && (
                  <textarea value={plannedNotes} onChange={(e) => setPlannedNotes(e.target.value)} rows={4} placeholder="Enter a future note for the first appointment" className="w-full border p-3 rounded mt-3" />
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showNotes} onChange={(e) => setShowNotes(e.target.checked)} />
                Treatment Notes
              </label>
            </div>

            {showNotes && (
              <div className="mb-4">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Write treatment notes..." className="w-full border p-3 rounded" />
              </div>
            )}

            <div className="mb-4">
              <label className="block mb-2">Total Treatment Fee (Optional)</label>
              <div className="flex items-center gap-2">
                <input type="text" value={totalFee ? Number(totalFee).toLocaleString() : ""} onChange={(e) => { const digits = e.target.value.replace(/\D/g, ""); setTotalFee(digits); }} placeholder="1,500,000" className="flex-1 border p-3 rounded" />
                <span className="font-semibold text-slate-700">IQD</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Optional field.</p>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={additionalEnabled} onChange={(e) => setAdditionalEnabled(e.target.checked)} />
                Additional payment
              </label>
              {additionalEnabled && (
                <div className="mt-3 space-y-2">
                  <div>
                    <label className="block mb-1 text-sm">Additional fees</label>
                    <div className="flex items-center gap-2">
                      <input type="text" value={additionalAmount ? Number(additionalAmount).toLocaleString() : ""} onChange={(e) => setAdditionalAmount(e.target.value.replace(/\D/g, ""))} placeholder="0" className="flex-1 border p-3 rounded" />
                      <span className="font-semibold text-slate-700">IQD</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">This amount will be added to total paid.</p>
                  </div>
                  <div>
                    <label className="block mb-1 text-sm">Reason for additional fee</label>
                    <input type="text" value={additionalReason} onChange={(e) => setAdditionalReason(e.target.value)} className="w-full border p-2 rounded" />
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block mb-2">Appointment Time</label>
              <select value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} className="w-full border p-3 rounded">
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
                <option>09:00 PM</option>
                <option>10:00 PM</option>
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

            <button type="button" onClick={savePatient} className="bg-teal-600 text-white px-6 py-3 rounded-lg relative z-10">
              Save Patient
            </button>
          </>
        )}

        {/* ===== EXISTING PATIENT TAB ===== */}
        {activeTab === "existing" && (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Existing Patient</h2>
                <p className="text-sm text-slate-500">Add a patient who is already in treatment to track their progress.</p>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <Link
                  href="/case-sheet?tab=existing"
                  className="inline-flex items-center justify-center rounded-full bg-teal-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
                >
                  Open case sheet page
                </Link>
                <p className="text-xs text-slate-500 max-w-sm text-right">
                  The case sheet is saved as a draft. If you fill it first, it will attach when you save the existing patient.
                </p>
              </div>
            </div>

            {existingCaseSheet && (
              <div className="mb-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-slate-700">
                <p className="font-medium">Existing patient case sheet draft loaded.</p>
                <p className="text-sm">Continue on this page to save the existing patient, or edit the draft on the case sheet page.</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block mb-2">Patient Name</label>
              <input type="text" value={existingName} onChange={(e) => setExistingName(e.target.value)} className="w-full border p-3 rounded" placeholder="Patient name" />
            </div>

            {existingLoadMessage ? (
              <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-teal-800">
                {existingLoadMessage}
              </div>
            ) : null}

            <div className="mb-4">
              <label className="block mb-2">Contact Number</label>
              <input type="tel" inputMode="tel" value={existingPhone} onChange={(e) => setExistingPhone(formatPhoneInput(e.target.value))} className="w-full border p-3 rounded" placeholder="e.g., 0770 123 4567" />
            </div>

            <div className="mb-4">
              <label className="block mb-2">Address</label>
              <input type="text" value={existingAddress} onChange={(e) => setExistingAddress(e.target.value)} className="w-full border p-3 rounded" placeholder="Patient address" />
            </div>

            {/* Elastics & TADs moved into the braces card below */}

            <div className="mb-4">
              <label className="block mb-2">Age (years)</label>
              <input type="number" value={existingAge} onChange={(e) => setExistingAge(e.target.value)} className="w-full border p-3 rounded" placeholder="e.g., 25" min="0" max="120" />
            </div>

            <div className="mb-4">
              <label className="block mb-2">Occupation</label>
              <input type="text" value={existingOccupation} onChange={(e) => setExistingOccupation(e.target.value)} className="w-full border p-3 rounded" placeholder="Patient occupation" />
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={existingClinicEnabled} onChange={(e) => setExistingClinicEnabled(e.target.checked)} />
                Choose Clinic
              </label>
              {existingClinicEnabled && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block mb-2">Clinic Name</label>
                    <input type="text" value={existingClinicName} onChange={(e) => setExistingClinicName(e.target.value)} className="w-full border p-3 rounded" placeholder="Clinic name" />
                  </div>
                  <div>
                    <label className="block mb-2">Color Coding</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {CLINIC_COLORS.map((c) => {
                        const selected = c === existingClinicColor;
                        return (
                          <button key={c} type="button" onClick={() => setExistingClinicColor(c)} title={c} className={`w-8 h-8 rounded-full ${selected ? 'ring-2 ring-offset-1 ring-teal-500' : 'border border-slate-200'}`} style={{ backgroundColor: c }} />
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block mb-2">Treatment Type</label>
              <select value={existingTreatmentType} onChange={(e) => { const value = e.target.value; setExistingTreatmentType(value); if (value !== "Myofunctional Appliance") { setExistingTreatment(value); } else { setExistingTreatment("Hyrax"); } }} className="w-full border p-3 rounded">
                <option>Fixed Braces</option>
                <option>Clear Aligners</option>
                <option>Retainers</option>
                <option>Myofunctional Appliance</option>
              </select>
            </div>

            {existingTreatmentType === "Fixed Braces" && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-700 mb-3">Current Braces Stage</h3>
                <div className="mt-4">
                  <label className="block mb-2">Bracket System</label>
                  <select
                    value={existingBracketType}
                    onChange={(e) => {
                      const nextBracketType = e.target.value;
                      setExistingBracketType(nextBracketType);
                      if (nextBracketType !== "Damon System") {
                        setExistingDamonTorques("");
                      }
                    }}
                    className="w-full border p-3 rounded"
                  >
                    <option>MBT System</option>
                    <option>Roth System</option>
                    <option>Damon System</option>
                  </select>
                </div>

                <div className="mt-4">
                  {existingBracketType !== "Damon System" && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block mb-2">Upper Wire Material</label>
                          <select
                            value={existingUpperWireMaterial}
                            onChange={(e) => setExistingUpperWireMaterial(e.target.value)}
                            className="w-full border p-3 rounded"
                          >
                            <option value="NiTi">NiTi</option>
                            <option value="Stainless Steel">Stainless Steel (SS)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block mb-2">Lower Wire Material</label>
                          <select
                            value={existingLowerWireMaterial}
                            onChange={(e) => setExistingLowerWireMaterial(e.target.value)}
                            className="w-full border p-3 rounded"
                          >
                            <option value="NiTi">NiTi</option>
                            <option value="Stainless Steel">Stainless Steel (SS)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div>
                          <label className="block text-sm mb-2">Upper Wire Gauge</label>
                          <select value={existingUpperWireGauge} onChange={(e) => setExistingUpperWireGauge(e.target.value)} className="w-full border p-2 rounded text-sm">
                            {["12", "14", "16", "18", "16x22", "17x25", "18x25"].map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm mb-2">Lower Wire Gauge</label>
                          <select value={existingLowerWireGauge} onChange={(e) => setExistingLowerWireGauge(e.target.value)} className="w-full border p-2 rounded text-sm">
                            {["12", "14", "16", "18", "16x22", "17x25", "18x25"].map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-2 text-left font-medium text-slate-700">
                      <span>Elastics & TADs</span>
                      <label className="inline-flex items-center gap-2 text-sm font-normal text-slate-600">
                        <input
                          type="checkbox"
                          checked={existingClinicalDetailsEnabled}
                          onChange={(e) => {
                            const nextValue = e.target.checked;
                            setExistingClinicalDetailsEnabled(nextValue);
                            if (!nextValue) {
                              setExistingElasticEnabled(false);
                              setExistingTadsNote("");
                            }
                          }}
                        />
                        Enable
                      </label>
                    </div>
                    {existingClinicalDetailsEnabled ? (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block mb-2">Elastics (type)</label>
                          <select value={existingElasticType} onChange={(e) => setExistingElasticType(e.target.value)} className="w-full border p-2 rounded text-sm">
                            <option>Class II</option>
                            <option>Class III</option>
                            <option>Cross</option>
                            <option>Other</option>
                          </select>
                          <label className="inline-flex items-center gap-2 mt-2 text-sm">
                            <input type="checkbox" checked={existingElasticEnabled} onChange={(e) => setExistingElasticEnabled(e.target.checked)} /> Enabled
                          </label>
                        </div>
                        <div>
                          <label className="block mb-2">TADs Note</label>
                          <input type="text" value={existingTadsNote} onChange={(e) => setExistingTadsNote(e.target.value)} className="w-full border p-2 rounded text-sm" placeholder="TADs / mini-implant notes" />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {existingBracketType === "Damon System" && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block mb-2">Upper Damon Wire</label>
                        <div className="mb-2 flex flex-wrap gap-2">
                          {(["CuNiTi", "SS", "Other"] as const).map((family) => (
                            <label key={family} className="flex items-center gap-2 rounded border px-2 py-1 text-sm">
                              <input
                                type="radio"
                                name="existingUpperDamonWireFamily"
                                value={family}
                                checked={existingUpperDamonWireFamily === family}
                                onChange={() => {
                                  setExistingUpperDamonWireFamily(family);
                                  if (family === "Other") {
                                    setExistingUpperDamonWire("Other");
                                    return;
                                  }
                                  const nextOptions = getDamonWireOptions(family);
                                  setExistingUpperDamonWire(nextOptions[0] ?? "0.014 CuNiTi");
                                }}
                              />
                              {family === "SS" ? "SS" : family}
                            </label>
                          ))}
                        </div>
                        {existingUpperDamonWireFamily !== "Other" && (
                          <select
                            value={existingUpperDamonWire}
                            onChange={(e) => setExistingUpperDamonWire(e.target.value)}
                            className="w-full border p-3 rounded"
                          >
                            {getDamonWireOptions(existingUpperDamonWireFamily).map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                            <option value="Other">Other</option>
                          </select>
                        )}
                        {existingUpperDamonWireFamily === "Other" && (
                          <input
                            type="text"
                            value={existingUpperDamonWireOther}
                            onChange={(e) => setExistingUpperDamonWireOther(e.target.value)}
                            className="mt-2 w-full border p-3 rounded"
                            placeholder="Enter upper custom Damon wire"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block mb-2">Lower Damon Wire</label>
                        <div className="mb-2 flex flex-wrap gap-2">
                          {(["CuNiTi", "SS", "Other"] as const).map((family) => (
                            <label key={family} className="flex items-center gap-2 rounded border px-2 py-1 text-sm">
                              <input
                                type="radio"
                                name="existingLowerDamonWireFamily"
                                value={family}
                                checked={existingLowerDamonWireFamily === family}
                                onChange={() => {
                                  setExistingLowerDamonWireFamily(family);
                                  if (family === "Other") {
                                    setExistingLowerDamonWire("Other");
                                    return;
                                  }
                                  const nextOptions = getDamonWireOptions(family);
                                  setExistingLowerDamonWire(nextOptions[0] ?? "0.014 CuNiTi");
                                }}
                              />
                              {family === "SS" ? "SS" : family}
                            </label>
                          ))}
                        </div>
                        {existingLowerDamonWireFamily !== "Other" && (
                          <select
                            value={existingLowerDamonWire}
                            onChange={(e) => setExistingLowerDamonWire(e.target.value)}
                            className="w-full border p-3 rounded"
                          >
                            {getDamonWireOptions(existingLowerDamonWireFamily).map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                            <option value="Other">Other</option>
                          </select>
                        )}
                        {existingLowerDamonWireFamily === "Other" && (
                          <input
                            type="text"
                            value={existingLowerDamonWireOther}
                            onChange={(e) => setExistingLowerDamonWireOther(e.target.value)}
                            className="mt-2 w-full border p-3 rounded"
                            placeholder="Enter lower custom Damon wire"
                          />
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block mb-2">Damon Torques</label>
                        <input
                          type="text"
                          value={existingDamonTorques}
                          onChange={(e) => setExistingDamonTorques(e.target.value)}
                          className="w-full border p-3 rounded"
                          placeholder="Enter Damon torques"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {existingTreatmentType === "Clear Aligners" && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-700 mb-3">Aligner Progress</h3>
                <label className="block text-sm mb-2">Aligner Number (current)</label>
                <input type="number" min={1} value={existingAlignerProgress} onChange={(e) => setExistingAlignerProgress(Number(e.target.value) || 0)} className="w-full border p-2 rounded" />
              </div>
            )}

            {existingTreatmentType === "Myofunctional Appliance" && (
              <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-700 mb-3">Appliance Type</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button type="button" onClick={() => setExistingMyofunctionalType("Fixed")} className={`px-3 py-2 rounded-lg border ${existingMyofunctionalType === "Fixed" ? "border-purple-600 bg-purple-100 text-purple-700" : "border-slate-300 bg-white text-slate-700"}`}>Fixed</button>
                  <button type="button" onClick={() => setExistingMyofunctionalType("Removable")} className={`px-3 py-2 rounded-lg border ${existingMyofunctionalType === "Removable" ? "border-purple-600 bg-purple-100 text-purple-700" : "border-slate-300 bg-white text-slate-700"}`}>Removable</button>
                </div>
                <label className="block text-sm mb-2">Appliance</label>
                <select value={existingTreatment} onChange={(e) => setExistingTreatment(e.target.value)} className="w-full border p-2 rounded text-sm">
                  {(existingMyofunctionalType === "Fixed" ? fixedAppliances : removableAppliances).map((appliance) => (
                    <option key={appliance} value={appliance}>{appliance}</option>
                  ))}
                </select>
              </div>
            )}

            {existingTreatmentType === "Retainers" && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-700 mb-3">Retainer Type</h3>
                <select value={existingRetainerType} onChange={(e) => setExistingRetainerType(e.target.value)} className="w-full border p-2 rounded">
                  <option>Fixed</option>
                  <option>Removable</option>
                  <option>Bonded</option>
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="block mb-2">Total Treatment Fee</label>
              <div className="flex items-center gap-2">
                <input type="text" value={existingTotalFee ? Number(existingTotalFee).toLocaleString() : ""} onChange={(e) => { const digits = e.target.value.replace(/\D/g, ""); setExistingTotalFee(digits); }} placeholder="1,500,000" className="flex-1 border p-3 rounded" />
                <span className="font-semibold text-slate-700">IQD</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-medium">Amount Already Paid (Historical)</label>
              <p className="text-sm text-gray-500 mb-2">Enter the total amount this patient paid before being added to the system.</p>
              <div className="flex items-center gap-2">
                <input type="text" value={existingAlreadyPaid ? Number(existingAlreadyPaid).toLocaleString() : ""} onChange={(e) => { const digits = e.target.value.replace(/\D/g, ""); setExistingAlreadyPaid(digits); }} placeholder="0" className="flex-1 border p-3 rounded" />
                <span className="font-semibold text-slate-700">IQD</span>
              </div>
              {(Number(existingTotalFee) > 0 || Number(existingAlreadyPaid) > 0) && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Fee</span>
                    <span className="font-medium">{(Number(existingTotalFee) || 0).toLocaleString()} IQD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Already Paid</span>
                    <span className="font-medium text-emerald-700">{(Number(existingAlreadyPaid) || 0).toLocaleString()} IQD</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                    <span className="font-semibold text-slate-700">Remaining</span>
                    <span className="font-bold text-rose-600">
                      {Math.max((Number(existingTotalFee) || 0) - (Number(existingAlreadyPaid) || 0), 0).toLocaleString()} IQD
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block mb-2">Next Appointment Date</label>
              <select value={existingAppointmentMode} onChange={(e) => setExistingAppointmentMode(e.target.value)} className="w-full border p-3 rounded">
                <option value="15">15 Days</option>
                <option value="30">30 Days</option>
                <option value="45">45 Days</option>
                <option value="60">60 Days</option>
                <option value="Manual">Manual</option>
              </select>
            </div>

            <div className="mb-6">
              <div className="bg-teal-50 border rounded-lg p-3">
                <strong>Selected Date:</strong> {existingSelectedDate || "-"}
              </div>
              {existingIsFriday && (
                <div className="mt-2 bg-red-100 border border-red-300 text-red-700 p-3 rounded">
                  Note: This appointment is scheduled on Friday
                </div>
              )}
            </div>

            {existingAppointmentMode === "Manual" && (
              <div className="mb-4">
                <label className="block mb-2">Appointment Date</label>
                <DateInput value={existingAppointmentDate} onChange={setExistingAppointmentDate} className="w-full border p-3 rounded" />
              </div>
            )}

            <div className="mb-4">
              <label className="block mb-2">Appointment Time</label>
              <select value={existingAppointmentTime} onChange={(e) => setExistingAppointmentTime(e.target.value)} className="w-full border p-3 rounded">
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

            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={existingFirstAppointment} onChange={(e) => setExistingFirstAppointment(e.target.checked)} />
                First Appointment
              </label>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={existingNotes ? true : false} onChange={(e) => setExistingNotes(e.target.checked ? existingNotes : "")} />
                Treatment Notes
              </label>
              {existingNotes || true && (
                <textarea value={existingNotes} onChange={(e) => setExistingNotes(e.target.value)} rows={4} placeholder="Write treatment notes..." className="w-full border p-3 rounded mt-2" />
              )}
            </div>

            <button type="button" onClick={saveExistingPatient} className="bg-teal-600 text-white px-6 py-3 rounded-lg relative z-10">
              Save Existing Patient
            </button>
          </>
        )}
            </div>
    </main>
  </div>
  );
}