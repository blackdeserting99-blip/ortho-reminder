"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Sidebar from "../components/Sidebar";

type EruptionStatus = Record<string, "present" | "not-present">;
type AttachedPhoto = { id: string; name: string; dataUrl: string };

const todayDate = new Date().toISOString().split("T")[0];

type RelationFieldProps = {
  label: string;
  pattern: string;
  classValue: string;
  leftValue: string;
  rightValue: string;
  onPatternChange: (value: string) => void;
  onClassChange: (value: string) => void;
  onLeftChange: (value: string) => void;
  onRightChange: (value: string) => void;
  allowAsymmetric?: boolean;
};

function RelationField({
  label,
  pattern,
  classValue,
  leftValue,
  rightValue,
  onPatternChange,
  onClassChange,
  onLeftChange,
  onRightChange,
  allowAsymmetric = true,
}: RelationFieldProps) {
  const relationOptions = ["Cl 1", "Cl 2", "Cl 3"];

  return (
    <div className="space-y-2">
      <span className="font-medium">{label}</span>
      {allowAsymmetric && (
        <select
          value={pattern}
          onChange={(e) => onPatternChange(e.target.value)}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
        >
          <option value="Symmetric">Symmetric</option>
          <option value="Asymmetric">Asymmetric</option>
        </select>
      )}
      {allowAsymmetric && pattern === "Asymmetric" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={leftValue}
            onChange={(e) => onLeftChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
          >
            <option value="">Left</option>
            {relationOptions.map((option) => (
              <option key={`${label}-left-${option}`} value={option}>{option}</option>
            ))}
          </select>
          <select
            value={rightValue}
            onChange={(e) => onRightChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
          >
            <option value="">Right</option>
            {relationOptions.map((option) => (
              <option key={`${label}-right-${option}`} value={option}>{option}</option>
            ))}
          </select>
        </div>
      ) : (
        <select
          value={classValue}
          onChange={(e) => onClassChange(e.target.value)}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
        >
          <option value="">Select</option>
          {relationOptions.map((option) => (
            <option key={`${label}-${option}`} value={option}>{option}</option>
          ))}
        </select>
      )}
    </div>
  );
}

const initialDraft = {
  name: "",
  age: "",
  gender: "",
  examDate: todayDate,
  homeAddress: "",
  homePhone: "",
  occupation: "",
  officePhone: "",
  mobile: "",
  guardianName: "",
  guardianOccupation: "",
  guardianOffice: "",
  medicalHistory: "",
  chiefComplaint: "",
  pastTreatment: "no",
  treatmentRemovedDate: "",
  habitThumb: false,
  habitLip: false,
  habitTongue: false,
  habitMouth: false,
  habitNail: false,
  habitOther: "",
  tongueFrenum: false,
  labialFrenum: false,
  extraOralProfileMaxilla: "",
  extraOralProfileMandible: "",
  extraOralVerticalHeight: "",
  extraOralDeviation: "",
  extraOralLipPosition: "",
  intraoralTongueSize: "",
  intraoralToothArchRatio: "",
  apRelationPattern: "Symmetric",
  apRelationClass: "",
  apRelationLeft: "",
  apRelationRight: "",
  canineRelationPattern: "Symmetric",
  canineRelationClass: "",
  canineRelationLeft: "",
  canineRelationRight: "",
  molarRelationPattern: "Symmetric",
  molarRelationClass: "",
  molarRelationLeft: "",
  molarRelationRight: "",
  crossbiteType: "",
  crossbitePattern: "",
  crossbiteSide: "",
  crossbiteTeethCount: "",
  overjet: "",
  overbite: "",
  eruptionStatus: {} as EruptionStatus,
  supernumeraryTeeth: "",
  congenitallyMissingTeeth: "",
  impactedTeeth: "",
  attachments: [] as AttachedPhoto[],
  treatmentPlan: "",
  caseSheetText: "",
};

type CaseSheetDraft = typeof initialDraft;

const eruptionQuadrants = [
  {
    key: "upper-right",
    label: "Maxillary right (1st quadrant)",
    numbers: ["8", "7", "6", "5", "4", "3", "2", "1"],
  },
  {
    key: "upper-left",
    label: "Maxillary left (2nd quadrant)",
    numbers: ["1", "2", "3", "4", "5", "6", "7", "8"],
  },
  {
    key: "lower-right",
    label: "Mandibular right (4th quadrant)",
    numbers: ["8", "7", "6", "5", "4", "3", "2", "1"],
  },
  {
    key: "lower-left",
    label: "Mandibular left (3rd quadrant)",
    numbers: ["1", "2", "3", "4", "5", "6", "7", "8"],
  },
];

function getRelationNumberOptions(relationClass: string) {
  const positiveOptions = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  const negativeOptions = ["0", "-1", "-2", "-3", "-4", "-5", "-6", "-7", "-8", "-9", "-10"];

  return relationClass === "Cl 3" ? negativeOptions : positiveOptions;
}

function formatRelationSummary(pattern: string, classValue: string, leftValue: string, rightValue: string) {
  if (pattern === "Asymmetric") {
    return `Asymmetric (L: ${leftValue || "-"}, R: ${rightValue || "-"})`;
  }

  return classValue || "-";
}

function serializeDraft(draft: CaseSheetDraft) {
  const sections: string[] = [];

  sections.push("ORTHODONTIC CASE SHEET");
  sections.push(`Patient Name: ${draft.name}`);
  sections.push(`Age: ${draft.age}`);
  sections.push(`Gender: ${draft.gender}`);
  sections.push(`Date of Exam: ${draft.examDate}`);
  sections.push(`Residence: ${draft.homeAddress}`);
  sections.push(`Phone Number: ${draft.mobile || draft.homePhone}`);
  sections.push(`Occupation: ${draft.occupation}`);
  sections.push(`Guardian: ${draft.guardianName}`);
  sections.push(`Guardian Occupation: ${draft.guardianOccupation}`);
  sections.push(`Guardian Office: ${draft.guardianOffice}`);

  sections.push("\nMEDICAL HISTORY");
  sections.push(draft.medicalHistory || "-");

  sections.push("\nCHIEF COMPLAINT");
  sections.push(draft.chiefComplaint || "-");

  sections.push("\nORTHODONTIC HISTORY");
  sections.push(`Past Orthodontic Treatment: ${draft.pastTreatment}`);
  if (draft.pastTreatment === "yes") {
    sections.push(`Date Removed: ${draft.treatmentRemovedDate}`);
  }

  sections.push("\nCLINICAL EXAMINATION");
  sections.push("Extra Oral:");
  sections.push(`Profile - Maxilla: ${draft.extraOralProfileMaxilla || "-"}`);
  sections.push(`Profile - Mandible: ${draft.extraOralProfileMandible || "-"}`);
  sections.push(`Vertical facial height: ${draft.extraOralVerticalHeight || "-"}`);
  sections.push(`Facial deviation: ${draft.extraOralDeviation || "-"}`);
  sections.push(`Lip position: ${draft.extraOralLipPosition || "-"}`);

  sections.push("\nIntra Oral:");
  sections.push(`Tongue size: ${draft.intraoralTongueSize || "-"}`);
  sections.push(`Tooth size to arch size: ${draft.intraoralToothArchRatio || "-"}`);
  sections.push(`Overjet: ${draft.overjet || "-"}`);
  sections.push(`Overbite: ${draft.overbite || "-"}`);
  sections.push(`Angle classification: ${formatRelationSummary(draft.apRelationPattern, draft.apRelationClass, draft.apRelationLeft, draft.apRelationRight)}`);
  sections.push(`Canine relation: ${formatRelationSummary(draft.canineRelationPattern, draft.canineRelationClass, draft.canineRelationLeft, draft.canineRelationRight)}`);
  sections.push(`Anterior relation: ${formatRelationSummary(draft.molarRelationPattern, draft.molarRelationClass, draft.molarRelationLeft, draft.molarRelationRight)}`);
  sections.push(`Crossbite type: ${draft.crossbiteType || "-"}`);
  sections.push(`Crossbite pattern: ${draft.crossbitePattern || "-"}`);
  sections.push(`Crossbite side: ${draft.crossbiteSide || "-"}`);
  sections.push(`Teeth in crossbite: ${draft.crossbiteTeethCount || "-"}`);

  sections.push("\nERUPTION CHART");
  sections.push(JSON.stringify(draft.eruptionStatus));

  sections.push("\nOTHER DENTAL FINDINGS");
  sections.push(`Supernumerary teeth: ${draft.supernumeraryTeeth || "-"}`);
  sections.push(`Congenitally missing teeth: ${draft.congenitallyMissingTeeth || "-"}`);
  sections.push(`Impacted teeth: ${draft.impactedTeeth || "-"}`);

  sections.push("\nHABITS & FRENUM");
  const habits: string[] = [];
  if (draft.habitTongue) habits.push("Tongue thrust");
  if (draft.habitLip) habits.push("Lip bite");
  if (draft.habitThumb) habits.push("Digit sucking");
  if (draft.habitMouth) habits.push("Mouth breathing");
  if (draft.habitNail) habits.push("Nail biting");
  if (draft.habitOther) habits.push(draft.habitOther);
  sections.push(habits.length > 0 ? habits.join(", ") : "None");
  sections.push(`Tongue frenum: ${draft.tongueFrenum ? "Present/problematic" : "Normal"}`);
  sections.push(`Labial frenum: ${draft.labialFrenum ? "Present/problematic" : "Normal"}`);

  sections.push("\nTREATMENT PLAN");
  sections.push(draft.treatmentPlan || "-");

  return sections.join("\n");
}

function hasDraftContent(draft: CaseSheetDraft) {
  return Object.entries(draft).some(([key, value]) => {
    if (key === "caseSheetText") return false;
    if (typeof value === "boolean") return value;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object" && value !== null) {
      return Object.keys(value as Record<string, unknown>).length > 0;
    }
    return typeof value === "string" && value.trim().length > 0;
  });
}

export default function CaseSheetPage() {
  const [draft, setDraft] = useState<CaseSheetDraft>(initialDraft);
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("newPatientCaseSheetDraft");
      if (saved) {
        const parsed = JSON.parse(saved);
        setDraft((prev) => ({
          ...prev,
          ...parsed,
          examDate: parsed.examDate || prev.examDate,
          eruptionStatus: parsed.eruptionStatus || prev.eruptionStatus,
          attachments: parsed.attachments || prev.attachments,
        }));
      }
    } catch (error) {
      console.warn("Failed to load case sheet draft", error);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const text = serializeDraft(draft);
    const hasContent = hasDraftContent(draft);

    if (hasContent) {
      const payload = {
        ...draft,
        caseSheetText: text,
        draftPresent: true,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("newPatientCaseSheetDraft", JSON.stringify(payload));
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } else {
      localStorage.removeItem("newPatientCaseSheetDraft");
      setSavedAt(null);
    }
  }, [draft, loaded]);

  const update = <T extends keyof CaseSheetDraft>(field: T, value: CaseSheetDraft[T]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const updateEruptionStatus = (key: string, value: "present" | "not-present") => {
    setDraft((prev) => ({
      ...prev,
      eruptionStatus: { ...prev.eruptionStatus, [key]: value },
    }));
  };

  const resetDraft = () => {
    setDraft(initialDraft);
    localStorage.removeItem("newPatientCaseSheetDraft");
    setSavedAt(null);
  };

  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const readers = files.map(
      (file) =>
        new Promise<AttachedPhoto>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              name: file.name,
              dataUrl: reader.result as string,
            });
          };
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then((photos) => {
      setDraft((prev) => ({ ...prev, attachments: [...prev.attachments, ...photos] }));
    });

    event.target.value = "";
  };

  const removePhoto = (photoId: string) => {
    setDraft((prev) => ({ ...prev, attachments: prev.attachments.filter((photo) => photo.id !== photoId) }));
  };

  const overjetOptions = useMemo(() => getRelationNumberOptions(draft.molarRelationClass), [draft.molarRelationClass]);
  const overbiteOptions = useMemo(() => getRelationNumberOptions(draft.molarRelationClass), [draft.molarRelationClass]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 w-full">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Orthodontic Case Sheet</h1>
              <p className="mt-2 text-slate-600">This version is structured around the clinical exam flow you described, including extra-oral, intra-oral, crossbite, eruption chart, and habit findings.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/add-patient" className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700">
                Continue to Patient Page
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Print / Save as PDF
              </button>
              <button
                type="button"
                onClick={resetDraft}
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear Draft
              </button>
            </div>
          </div>

          <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-slate-700">
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
              <p className="text-sm">Draft is saved automatically as you type.</p>
              {savedAt ? <p className="text-sm text-slate-500">Last saved at {savedAt}</p> : <p className="text-sm text-slate-500">Loading draft…</p>}
            </div>
          </div>

          <div className="space-y-8">
            <section id="patient-registration" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Patient Information</h2>
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Patient Name</span>
                  <input value={draft.name} onChange={(e) => update("name", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Age</span>
                  <input value={draft.age} onChange={(e) => update("age", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Gender</span>
                  <select value={draft.gender} onChange={(e) => update("gender", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Date of Exam</span>
                  <input type="date" value={draft.examDate} onChange={(e) => update("examDate", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900" />
                </label>
                <label className="space-y-2 lg:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Residence</span>
                  <input value={draft.homeAddress} onChange={(e) => update("homeAddress", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Phone Number</span>
                  <input value={draft.mobile || draft.homePhone} onChange={(e) => update("mobile", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Occupation</span>
                  <input value={draft.occupation} onChange={(e) => update("occupation", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900" />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">History</h2>
              <div className="space-y-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Medical History</span>
                  <textarea value={draft.medicalHistory} onChange={(e) => update("medicalHistory", e.target.value)} rows={3} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900" placeholder="Any relevant medical history, allergies, or systemic conditions" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Chief Complaint</span>
                  <textarea value={draft.chiefComplaint} onChange={(e) => update("chiefComplaint", e.target.value)} rows={3} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Past Orthodontic Treatment</span>
                    <select value={draft.pastTreatment} onChange={(e) => update("pastTreatment", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900">
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Date Removed</span>
                    <input type="date" value={draft.treatmentRemovedDate} onChange={(e) => update("treatmentRemovedDate", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900" />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Clinical Examination</h2>
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800 mb-3">Extra Oral</p>
                  <div className="space-y-4 text-sm text-slate-700">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="font-medium">Profile / Lateral view - Maxilla</span>
                        <select value={draft.extraOralProfileMaxilla} onChange={(e) => update("extraOralProfileMaxilla", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                          <option value="">Select</option>
                          <option value="Prognathic">Prognathic</option>
                          <option value="Retrognathic">Retrognathic</option>
                          <option value="Normal">Normal</option>
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="font-medium">Profile / Lateral view - Mandible</span>
                        <select value={draft.extraOralProfileMandible} onChange={(e) => update("extraOralProfileMandible", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                          <option value="">Select</option>
                          <option value="Prognathic">Prognathic</option>
                          <option value="Retrognathic">Retrognathic</option>
                          <option value="Normal">Normal</option>
                        </select>
                      </label>
                    </div>
                    <label className="space-y-2">
                      <span className="font-medium">Vertical facial height</span>
                      <select value={draft.extraOralVerticalHeight} onChange={(e) => update("extraOralVerticalHeight", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                        <option value="">Select</option>
                        <option value="Increased">Increased</option>
                        <option value="Normal">Normal</option>
                        <option value="Decreased">Decreased</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="font-medium">Superior view / facial deviation</span>
                      <select value={draft.extraOralDeviation} onChange={(e) => update("extraOralDeviation", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                        <option value="">Select</option>
                        <option value="No deviation">No deviation</option>
                        <option value="Deviation left">Deviation left</option>
                        <option value="Deviation right">Deviation right</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="font-medium">Lips</span>
                      <select value={draft.extraOralLipPosition} onChange={(e) => update("extraOralLipPosition", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                        <option value="">Select</option>
                        <option value="Competent">Competent</option>
                        <option value="Incompetent">Incompetent</option>
                        <option value="Potentially competent">Potentially competent</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800 mb-3">Intra Oral</p>
                  <div className="space-y-4 text-sm text-slate-700">
                    <label className="space-y-2">
                      <span className="font-medium">Tongue size</span>
                      <select value={draft.intraoralTongueSize} onChange={(e) => update("intraoralTongueSize", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                        <option value="">Select</option>
                        <option value="Normal">Normal</option>
                        <option value="Large">Large</option>
                        <option value="Small">Small</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="font-medium">Tooth size to arch size</span>
                      <select value={draft.intraoralToothArchRatio} onChange={(e) => update("intraoralToothArchRatio", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                        <option value="">Select</option>
                        <option value="Normal">Normal</option>
                        <option value="Large">Large</option>
                        <option value="Small">Small</option>
                      </select>
                    </label>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <RelationField
                        label="Angle classification"
                        pattern={draft.apRelationPattern}
                        classValue={draft.apRelationClass}
                        leftValue={draft.apRelationLeft}
                        rightValue={draft.apRelationRight}
                        onPatternChange={(value) => update("apRelationPattern", value)}
                        onClassChange={(value) => update("apRelationClass", value)}
                        onLeftChange={(value) => update("apRelationLeft", value)}
                        onRightChange={(value) => update("apRelationRight", value)}
                      />
                      <RelationField
                        label="Canine relation"
                        pattern={draft.canineRelationPattern}
                        classValue={draft.canineRelationClass}
                        leftValue={draft.canineRelationLeft}
                        rightValue={draft.canineRelationRight}
                        onPatternChange={(value) => update("canineRelationPattern", value)}
                        onClassChange={(value) => update("canineRelationClass", value)}
                        onLeftChange={(value) => update("canineRelationLeft", value)}
                        onRightChange={(value) => update("canineRelationRight", value)}
                      />
                      <RelationField
                        label="Anterior relation"
                        pattern={draft.molarRelationPattern}
                        classValue={draft.molarRelationClass}
                        leftValue={draft.molarRelationLeft}
                        rightValue={draft.molarRelationRight}
                        onPatternChange={(value) => update("molarRelationPattern", value)}
                        onClassChange={(value) => update("molarRelationClass", value)}
                        onLeftChange={(value) => update("molarRelationLeft", value)}
                        onRightChange={(value) => update("molarRelationRight", value)}
                        allowAsymmetric={false}
                      />
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <label className="space-y-2">
                        <span className="font-medium">Overjet</span>
                        <select value={draft.overjet} onChange={(e) => update("overjet", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                          <option value="">Select</option>
                          {overjetOptions.map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="font-medium">Overbite</span>
                        <select value={draft.overbite} onChange={(e) => update("overbite", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                          <option value="">Select</option>
                          {overbiteOptions.map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-4">Crossbite</p>
                <div className="grid gap-4 lg:grid-cols-4">
                  <label className="space-y-2">
                    <span className="font-medium">Crossbite type</span>
                    <select value={draft.crossbiteType} onChange={(e) => update("crossbiteType", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                      <option value="">Select</option>
                      <option value="Anterior">Anterior</option>
                      <option value="Posterior">Posterior</option>
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="font-medium">Crossbite pattern</span>
                    <select value={draft.crossbitePattern} onChange={(e) => update("crossbitePattern", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                      <option value="">Select</option>
                      <option value="True">True</option>
                      <option value="Pseudo">Pseudo</option>
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="font-medium">Crossbite side</span>
                    <select value={draft.crossbiteSide} onChange={(e) => update("crossbiteSide", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                      <option value="">Select</option>
                      <option value="Left">Left</option>
                      <option value="Right">Right</option>
                      <option value="Bilateral">Bilateral</option>
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="font-medium">Teeth in crossbite</span>
                    <select value={draft.crossbiteTeethCount} onChange={(e) => update("crossbiteTeethCount", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                      <option value="">Select</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8+">{"8\u2060+"}</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-3">Eruption chart</p>
                <div className="relative overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="pointer-events-none absolute inset-x-12 top-1/2 h-1 bg-slate-900"></div>
                  <div className="pointer-events-none absolute left-1/2 inset-y-12 w-1 bg-slate-900"></div>
                  <div className="grid min-w-[720px] gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{eruptionQuadrants[0].label}</div>
                      <div className="mt-3 grid min-w-[22rem] grid-cols-[repeat(8,minmax(2.5rem,1fr))] gap-2 text-center text-xs">
                        {eruptionQuadrants[0].numbers.map((number) => (
                          <div key={`${eruptionQuadrants[0].key}-${number}-label`} className="flex h-10 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-700">
                            {number}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 grid min-w-[22rem] grid-cols-[repeat(8,minmax(2.5rem,1fr))] gap-2 text-center text-xs">
                        {eruptionQuadrants[0].numbers.map((number) => {
                          const key = `${eruptionQuadrants[0].key}-${number}`;
                          const selected = draft.eruptionStatus[key] ?? "not-present";
                          const icon = selected === "present" ? "✔" : "✕";
                          const color = selected === "present" ? "text-emerald-600" : "text-red-600";
                          return (
                            <button key={key} type="button" onClick={() => updateEruptionStatus(key, selected === "present" ? "not-present" : "present") } className={`flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold ${color}`} aria-label={`${number} ${selected}`}>
                              {icon}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{eruptionQuadrants[1].label}</div>
                      <div className="mt-3 grid min-w-[22rem] grid-cols-[repeat(8,minmax(2.5rem,1fr))] gap-2 text-center text-xs">
                        {eruptionQuadrants[1].numbers.map((number) => (
                          <div key={`${eruptionQuadrants[1].key}-${number}-label`} className="flex h-10 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-700">
                            {number}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 grid min-w-[22rem] grid-cols-[repeat(8,minmax(2.5rem,1fr))] gap-2 text-center text-xs">
                        {eruptionQuadrants[1].numbers.map((number) => {
                          const key = `${eruptionQuadrants[1].key}-${number}`;
                          const selected = draft.eruptionStatus[key] ?? "not-present";
                          const icon = selected === "present" ? "✔" : "✕";
                          const color = selected === "present" ? "text-emerald-600" : "text-red-600";
                          return (
                            <button key={key} type="button" onClick={() => updateEruptionStatus(key, selected === "present" ? "not-present" : "present") } className={`flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold ${color}`} aria-label={`${number} ${selected}`}>
                              {icon}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{eruptionQuadrants[2].label}</div>
                      <div className="mt-3 grid min-w-[22rem] grid-cols-[repeat(8,minmax(2.5rem,1fr))] gap-2 text-center text-xs">
                        {eruptionQuadrants[2].numbers.map((number) => (
                          <div key={`${eruptionQuadrants[2].key}-${number}-label`} className="flex h-10 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-700">
                            {number}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 grid min-w-[22rem] grid-cols-[repeat(8,minmax(2.5rem,1fr))] gap-2 text-center text-xs">
                        {eruptionQuadrants[2].numbers.map((number) => {
                          const key = `${eruptionQuadrants[2].key}-${number}`;
                          const selected = draft.eruptionStatus[key] ?? "not-present";
                          const icon = selected === "present" ? "✔" : "✕";
                          const color = selected === "present" ? "text-emerald-600" : "text-red-600";
                          return (
                            <button key={key} type="button" onClick={() => updateEruptionStatus(key, selected === "present" ? "not-present" : "present") } className={`flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold ${color}`} aria-label={`${number} ${selected}`}>
                              {icon}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{eruptionQuadrants[3].label}</div>
                      <div className="mt-3 grid min-w-[22rem] grid-cols-[repeat(8,minmax(2.5rem,1fr))] gap-2 text-center text-xs">
                        {eruptionQuadrants[3].numbers.map((number) => (
                          <div key={`${eruptionQuadrants[3].key}-${number}-label`} className="flex h-10 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-700">
                            {number}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 grid min-w-[22rem] grid-cols-[repeat(8,minmax(2.5rem,1fr))] gap-2 text-center text-xs">
                        {eruptionQuadrants[3].numbers.map((number) => {
                          const key = `${eruptionQuadrants[3].key}-${number}`;
                          const selected = draft.eruptionStatus[key] ?? "not-present";
                          const icon = selected === "present" ? "✔" : "✕";
                          const color = selected === "present" ? "text-emerald-600" : "text-red-600";
                          return (
                            <button key={key} type="button" onClick={() => updateEruptionStatus(key, selected === "present" ? "not-present" : "present") } className={`flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold ${color}`} aria-label={`${number} ${selected}`}>
                              {icon}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-2 text-slate-700"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>Present</span>
                  <span className="inline-flex items-center gap-2 text-slate-700"><span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>Not present</span>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-3">Other dental findings</p>
                <div className="grid gap-4 lg:grid-cols-3">
                  <label className="space-y-2">
                    <span className="font-medium">Supernumerary teeth</span>
                    <textarea value={draft.supernumeraryTeeth} onChange={(e) => update("supernumeraryTeeth", e.target.value)} rows={3} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" placeholder="e.g. Mesiodens, extra upper incisor" />
                  </label>
                  <label className="space-y-2">
                    <span className="font-medium">Congenitally missing teeth</span>
                    <textarea value={draft.congenitallyMissingTeeth} onChange={(e) => update("congenitallyMissingTeeth", e.target.value)} rows={3} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" placeholder="e.g. Upper lateral incisor missing" />
                  </label>
                  <label className="space-y-2">
                    <span className="font-medium">Impacted teeth</span>
                    <textarea value={draft.impactedTeeth} onChange={(e) => update("impactedTeeth", e.target.value)} rows={3} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" placeholder="e.g. Lower third molar impacted" />
                  </label>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-3">Habits & Frenum</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3 text-sm text-slate-700">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={draft.habitTongue} onChange={(e) => update("habitTongue", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                      Tongue thrust
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={draft.habitLip} onChange={(e) => update("habitLip", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                      Lip bite
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={draft.habitThumb} onChange={(e) => update("habitThumb", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                      Digit sucking
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={draft.habitMouth} onChange={(e) => update("habitMouth", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                      Mouth breathing
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={draft.habitNail} onChange={(e) => update("habitNail", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                      Nail biting
                    </label>
                    <label className="space-y-2">
                      <span>Other habit</span>
                      <input value={draft.habitOther} onChange={(e) => update("habitOther", e.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" />
                    </label>
                  </div>
                  <div className="space-y-3 text-sm text-slate-700">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={draft.tongueFrenum} onChange={(e) => update("tongueFrenum", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                      Tongue frenum present / problematic
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={draft.labialFrenum} onChange={(e) => update("labialFrenum", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                      Labial frenum present / problematic
                    </label>
                    <p className="rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-500">Ticked items are recorded as present or problematic; unticked items are treated as normal.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Photos & Attachments</h2>
              <div className="space-y-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Upload patient photos from this computer</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900" />
                </label>
                {draft.attachments.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {draft.attachments.map((photo) => (
                      <div key={photo.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <img src={photo.dataUrl} alt={photo.name} className="h-40 w-full rounded-xl object-cover" />
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-700">{photo.name}</p>
                          <button type="button" onClick={() => removePhoto(photo.id)} className="text-sm text-red-600 hover:text-red-700">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No images attached yet. Add photographs here and they will stay with this draft in the browser.</p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Treatment Plan</h2>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Treatment Plan Notes</span>
                <textarea value={draft.treatmentPlan} onChange={(e) => update("treatmentPlan", e.target.value)} rows={5} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900" placeholder="Write the proposed orthodontic treatment plan here." />
              </label>
            </section>
            <div className="mt-8 flex justify-center">
              <Link href="/add-patient" className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700">
                Continue to Patient Page
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
