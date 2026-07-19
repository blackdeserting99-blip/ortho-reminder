import { formatDateDMY } from "./date";

export type CaseStatus =
  | "active"
  | "retainer"
  | "finished"
  | "cancelled"
  | "archived";

export type Visit = {
  date: string;
  time: string;
  visitNotes?: string;
  plannedNotes?: string;
  upperWire?: string;
  lowerWire?: string;
  upperArch?: string;
  lowerArch?: string;
  plannedUpperArch?: string;
  plannedLowerArch?: string;
  elasticEnabled: boolean;
  elasticType: string;
  tadsNote?: string;
  payment?: number;
  nextDate?: string;
  nextTime?: string;
};

export type AttachedPhoto = {
  id: string;
  name: string;
  dataUrl: string;
};

export type Patient = {
  id: number;
  name: string;
  phone: string;
  clinicName?: string;
  clinicColor?: string;
  address?: string;
  age?: number;
  occupation?: string;
  treatment: string;
  treatmentCategory?: string;
  bracketType?: string;
  caseSheet?: string;
  attachments?: AttachedPhoto[];
  appointmentDate: string;
  appointmentTime?: string;
  firstAppointment?: boolean;
  notes?: string;
  plannedNotes?: string;
  totalFee?: number;
  totalPaid?: number;
  retainerFee?: number;
  elasticEnabled?: boolean;
  elasticType?: string;
  tadsNote?: string;
  caseStatus?: CaseStatus;
  visits?: Visit[];
  myofunctionalType?: string;
  myofunctionalProgram?: {
    mode: "daily" | "weekly";
    count: number;
    dailyOption?: string;
    weeklyDays?: string[];
  };
  clearAlignersPlan?: {
    total: number;
    given: number;
    wearDays: number;
  };
};

const STORAGE_KEY = "patients";

export const CLINIC_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export function loadPatients(): Patient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePatients(patients: Patient[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
}

export function normalizeDateIso(value: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().split("T")[0];
}

export function getTodayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export function getCalendarLabel(date: string): string {
  return formatDateDMY(normalizeDateIso(date));
}

export function isActivePatient(patient: Patient) {
  return (
    patient.caseStatus !== "archived" &&
    patient.caseStatus !== "finished" &&
    patient.caseStatus !== "retainer"
  );
}

export function hasAppointmentConflict(
  patients: Patient[],
  appointmentDate: string,
  appointmentTime: string,
  excludePatientId?: number
) {
  const normalizedDate = normalizeDateIso(appointmentDate);
  const normalizedTime = appointmentTime.trim();

  return patients.some((patient) => {
    if (excludePatientId && patient.id === excludePatientId) {
      return false;
    }
    return (
      normalizeDateIso(patient.appointmentDate) === normalizedDate &&
      (patient.appointmentTime || "").trim() === normalizedTime &&
      patient.caseStatus !== "cancelled"
    );
  });
}

export function validatePatientRecord(
  patient: Partial<Patient>,
  existingPatients: Patient[] = []
) {
  const errors: string[] = [];
  // Only require patient name for creation. All other fields are optional.
  if (!patient.name?.trim()) {
    errors.push("Patient name is required.");
  }

  return { valid: errors.length === 0, errors };
}
