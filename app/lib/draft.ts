export const PATIENT_CASE_SHEET_DRAFT_KEY_PREFIX = "newPatientCaseSheetDraft";
export const EXISTING_PATIENT_CASE_SHEET_DRAFT_KEY_PREFIX = "existingPatientCaseSheetDraft";
export const LEGACY_CASE_SHEET_DRAFT_STORAGE_KEY = PATIENT_CASE_SHEET_DRAFT_KEY_PREFIX;

export function getCaseSheetDraftStorageKey(userId?: string) {
  return userId ? `${PATIENT_CASE_SHEET_DRAFT_KEY_PREFIX}:${userId}` : PATIENT_CASE_SHEET_DRAFT_KEY_PREFIX;
}

export function getExistingCaseSheetDraftStorageKey(userId?: string) {
  return userId
    ? `${EXISTING_PATIENT_CASE_SHEET_DRAFT_KEY_PREFIX}:${userId}`
    : EXISTING_PATIENT_CASE_SHEET_DRAFT_KEY_PREFIX;
}

export function migrateCaseSheetDraftStorageKey(userId?: string) {
  if (typeof window === "undefined") {
    return getCaseSheetDraftStorageKey(userId);
  }

  const userKey = getCaseSheetDraftStorageKey(userId);
  const legacyDraft = localStorage.getItem(LEGACY_CASE_SHEET_DRAFT_STORAGE_KEY);
  const existingUserDraft = localStorage.getItem(userKey);

  if (userId && legacyDraft && !existingUserDraft) {
    localStorage.setItem(userKey, legacyDraft);
    localStorage.removeItem(LEGACY_CASE_SHEET_DRAFT_STORAGE_KEY);
  }

  return userKey;
}

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const response = await fetch("/api/me", { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const data = await response.json().catch(() => null);
    if (data && typeof data.id === "string") {
      return data.id;
    }
  } catch {
    // ignore fetch failures; fallback to legacy draft key
  }

  return null;
}

export function getPatientCaseSheetDraftStorageKey(patientId: string) {
  return `${PATIENT_CASE_SHEET_DRAFT_KEY_PREFIX}:patient:${patientId}`;
}
