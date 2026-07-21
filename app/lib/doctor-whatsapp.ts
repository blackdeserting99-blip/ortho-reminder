type JsonObject = Record<string, unknown>;

function toObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonObject;
}

export function readDoctorWhatsAppFromClinicMetadata(metadata: unknown): string {
  const obj = toObject(metadata);
  const value = obj.doctorWhatsappPhone;
  return typeof value === "string" ? value.trim() : "";
}

export function getDoctorWhatsApp(input?: {
  clinicMetadata?: unknown;
  clinicPhone?: string | null;
}) {
  const fromMetadata = readDoctorWhatsAppFromClinicMetadata(input?.clinicMetadata);
  if (fromMetadata) {
    return fromMetadata;
  }

  const fromEnv = (process.env.DOCTOR_WHATSAPP_PHONE || "").trim();
  if (fromEnv) {
    return fromEnv;
  }

  return (input?.clinicPhone || "").trim();
}
