import { formatDateDMY } from "./date";
import { recordOutboundWhatsAppMessage } from "./whatsapp-message-tracking";

export type WhatsAppReminderType = "3days" | "sameDay" | "general";

export type WhatsAppReminderPatient = {
  name?: string;
  clinicName?: string;
  doctorName?: string;
  phone: string;
  appointmentDate: string;
  appointmentTime?: string;
  treatment?: string;
  treatmentCategory?: string;
  alignerDaysPerTray?: number;
  firstAppointment?: boolean;
  elasticEnabled?: boolean;
  elasticType?: string;
  tadsNote?: string;
  myofunctionalType?: string;
  myofunctionalProgram?: MyofunctionalProgram;
  visits?: Array<{
    elasticEnabled?: boolean;
    elasticType?: string;
    tadsNote?: string;
  }>;
};

type MyofunctionalProgram = {
  mode: "daily" | "weekly";
  count: number;
  dailyOption?: "day" | "night" | "day and night" | "2 day" | "2 night";
  weeklyDays?: string[];
};

export function getReminderType(
  appointmentDate: string,
  now = new Date()
): WhatsAppReminderType | null {
  const appointment = new Date(appointmentDate);
  if (Number.isNaN(appointment.getTime())) return null;

  const today = new Date(now.toLocaleDateString("en-CA"));
  const diffDays = Math.round(
    (appointment.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 3) {
    return "3days";
  }
  if (diffDays === 0) {
    return "sameDay";
  }
  return null;
}

const ARABIC_WEEKDAYS: Record<string, string> = {
  Sunday: "الأحد",
  Monday: "الاثنين",
  Tuesday: "الثلاثاء",
  Wednesday: "الأربعاء",
  Thursday: "الخميس",
  Friday: "الجمعة",
  Saturday: "السبت",
};

const buildMyofunctionalScheduleText = (
  program?: MyofunctionalProgram
): string => {
  if (!program || program.count <= 0) return "";

  if (program.mode === "daily") {
    if (program.count === 1) {
      if (program.dailyOption === "day") {
        return "مرة واحدة يومياً في الصباح.";
      }
      if (program.dailyOption === "night") {
        return "مرة واحدة يومياً في المساء.";
      }
      return "مرة واحدة يومياً.";
    }

    if (program.count === 2) {
      if (program.dailyOption === "day and night") {
        return "مرتين يومياً: صباحاً ومساءً.";
      }
      if (program.dailyOption === "2 day") {
        return "مرتين يومياً في النهار.";
      }
      if (program.dailyOption === "2 night") {
        return "مرتين يومياً في الليل.";
      }
      return "مرتين يومياً.";
    }

    return `يتم تفعيله ${program.count} مرات يومياً.`;
  }

  if (program.mode === "weekly") {
    const days = program.weeklyDays || [];
    const dayText = days
      .map((day) => ARABIC_WEEKDAYS[day] || day)
      .join("، ");

    if (days.length > 0) {
      return `مجموع ${program.count} مرة في الأسبوع في أيام: ${dayText}.`;
    }
    return `مجموع ${program.count} مرة في الأسبوع.`;
  }

  return "";
};

const buildCareInstructions = (
  patient: WhatsAppReminderPatient
): string => {
  const parts: string[] = [];
  const treatment = (patient.treatment || "").toLowerCase();
  const category = (patient.treatmentCategory || "").toLowerCase();
  const alignerDays =
    Number.isFinite(Number(patient.alignerDaysPerTray)) && Number(patient.alignerDaysPerTray) > 0
      ? Number(patient.alignerDaysPerTray)
      : 14;
  const patientName = (patient.name || "").trim() || "مراجعنا العزيز";
  const doctorName = (patient.doctorName || "").trim() || "Doctor";

  const myoScheduleText = buildMyofunctionalScheduleText(
    patient.myofunctionalProgram
  );
  const upcomingDate = formatDateDMY(patient.appointmentDate);

  const getFirstAppointmentArabicInstructions = () => {
    const isFixedBraces =
      category.includes("fixed") ||
      treatment.includes("braces") ||
      treatment.includes("fixed");

    const isClearAligners =
      category.includes("aligner") ||
      treatment.includes("aligner");

    const isRetainers =
      category.includes("retainer") ||
      treatment.includes("retainer");

    const isMyofunctional =
      category.includes("myofunctional") ||
      category.includes("orthopedic") ||
      treatment.includes("hyrax") ||
      treatment.includes("twin block") ||
      treatment.includes("myobrace") ||
      treatment.includes("trainer") ||
      treatment.includes("frankel") ||
      treatment.includes("bionator") ||
      treatment.includes("activator") ||
      treatment.includes("quad helix") ||
      treatment.includes("tpa") ||
      treatment.includes("nance") ||
      treatment.includes("habit breaker");

    if (isFixedBraces) {
      return `✅ خلال الأيام الأولى قد تشعر بعدم الراحة أو ضغط خفيف على الأسنان.
✅ تناول الأطعمة اللينة في البداية.
✅ تجنب الأطعمة الصلبة واللزجة مثل المكسرات، الثلج، العلكة، والكراميل.
✅ نظف الأسنان والتقويم بعناية بعد كل وجبة.
✅ إذا تسبب السلك أو أي جزء من التقويم في تهيج اللثة أو الخد، استخدم الخيط أو اتصل بالعيادة لتقييم الوضع.
⚠️ إذا شعرتم بألم شديد، أو تلف جزء من الجهاز، أو انكسر السلك، يرجى التواصل مع العيادة فوراً.`;
    }

    if (isClearAligners) {
      return `✅ ارتدِ التقويم الشفاف قرابة 20-22 ساعة يومياً.
✅ أزلها عند تناول الطعام أو المشروبات.
✅ نظفها بانتظام وحافظ عليها جافة في علبة خاصة بها.
✅ احفظها دائمًا في العلبة عند إزالتها.
✅ اتبع تعليمات الطبيب بشأن تغيير مجموعات التقويم.`;
    }

    if (isRetainers) {
      return `✅ اتباع جدول ارتداء الريتينر حسب تعليمات الطبيب.
✅ تنظيف الريتينر بانتظام.
✅ حفظ الريتينر داخل علبته دائماً عند عدم استخدامه.
✅ إبقاؤه بعيداً عن الحرارة والمواد الساخنة.
⚠️ في حال كسر الريتينر، فقدانه، أو عدم ملاءمته، يرجى التواصل مع العيادة.`;
    }

    if (isMyofunctional) {
      return `✅ التزم بجدول ارتداء الجهاز حسب تعليمات الطبيب.
✅ نظف الجهاز يومياً بشكل جيد.
✅ احفظه في مكان آمن عند إزالته.
✅ لا تعدّل أو تضبط الجهاز بنفسك.
⚠️ إذا كسر الجهاز أو تسبب في ألم مستمر، يرجى التواصل مع العيادة.`;
    }

    return `✅ الالتزام بتعليمات الطبيب بدقة.
✅ المحافظة على نظافة الجهاز والابتعاد عن الأطعمة أو العادات التي قد تؤثر عليه.
✅ التواصل مع العيادة في حال وجود ألم مستمر أو تلف في الجهاز.`;
  };

  if (patient.firstAppointment) {
    const instructions = getFirstAppointmentArabicInstructions();
    parts.push(
      `مرحباً ${patientName} 👋

أهلاً بك، نتمنى لك رحلة علاج ناجحة 🌟

فيما يلي بعض التعليمات المهمة للعناية بجهازك:

${instructions}

شكراً لثقتكم بنا، ونتمنى لكم علاجاً ناجحاً. 🌹

${doctorName}`
    );
  }

  const hasElastic =
    patient.elasticEnabled ||
    Boolean(patient.elasticType) ||
    patient.visits?.some(
      (visit) => visit.elasticEnabled || Boolean(visit.elasticType)
    );

  if (hasElastic) {
    parts.push(
      "إذا كنت تستخدم الإيلاستيك، يرجى لبسه مرة واحدة كل 24 ساعة وعدم نسيانه."
    );
  }

  const hasTads =
    Boolean(patient.tadsNote) ||
    patient.visits?.some((visit) => Boolean(visit.tadsNote));

  if (hasTads) {
    parts.push(
      "إذا كان لديك TADS، يرجى العناية بها جيداً وعدم العبث بها أو فكها."
    );
  }

  return parts.length > 0 ? `\n\n${parts.join("\n\n")}` : "";
};

export function buildWhatsAppBotMessage(
  patient: WhatsAppReminderPatient,
  reminderType: WhatsAppReminderType = "general"
) {
  const appointmentDate = formatDateDMY(patient.appointmentDate);
  const appointmentTime = patient.appointmentTime || "غير محددة";
  const patientName = (patient.name || "").trim() || "مراجعنا العزيز";
  const clinicName = (patient.clinicName || "").trim() || "العيادة";

  if (reminderType === "sameDay" || reminderType === "3days") {
    return `السلام عليكم ${patientName} 🌹

نود تذكيركم بأن لديكم موعد في عيادة ${clinicName}.

📅 التاريخ: ${appointmentDate}
🕒 الوقت: ${appointmentTime}

يرجى الحضور قبل الموعد بـ 10 دقائق.

في حال الرغبة بتغيير الموعد يرجى التواصل معنا.

نتمنى لكم يوماً سعيداً 💙`;
  }

  const whenText = "هذا تذكير بموعدك";

  const careText = buildCareInstructions(patient);

  return `${whenText} من عيادة الدكتور.\nموعدك يوم ${appointmentDate} الساعة ${appointmentTime}.${careText}\n\nإذا كان لديك أي سؤال، راسلنا هنا على هذا الرقم.`;
}

export function buildFirstAppointmentConfirmationMessage(input: {
  patientName?: string;
  appointmentDate: string | Date;
  appointmentTime?: string;
  treatmentCategory?: string;
  treatment?: string;
}) {
  const patientName = (input.patientName || "").trim() || "المريض";
  const appointmentDateValue =
    input.appointmentDate instanceof Date
      ? input.appointmentDate.toISOString()
      : input.appointmentDate;
  const appointmentDate = formatDateDMY(appointmentDateValue);
  const appointmentTime = (input.appointmentTime || "04:00 PM").trim();
  const treatmentCategory = (input.treatmentCategory || input.treatment || "").toLowerCase();
  const treatment = (input.treatment || "").toLowerCase();

  const firstAppointmentInstructions = (() => {
    if (
      treatmentCategory.includes("fixed") ||
      treatment.includes("braces") ||
      treatment.includes("fixed")
    ) {
      return `✅ خلال الأيام الأولى قد تشعر بعدم الراحة أو ضغط خفيف على الأسنان.\n✅ تناول الأطعمة اللينة في البداية.\n✅ تجنب الأطعمة الصلبة واللزجة مثل المكسرات، الثلج، العلكة، والكراميل.\n✅ نظف الأسنان والتقويم بعناية بعد كل وجبة.\n✅ إذا تسبب السلك أو أي جزء من التقويم في تهيج اللثة أو الخد، استخدم الخيط أو اتصل بالعيادة لتقييم الوضع.\n⚠️ إذا شعرتم بألم شديد، أو تلف جزء من الجهاز، أو انكسر السلك، يرجى التواصل مع العيادة فوراً.`;
    }

    if (
      treatmentCategory.includes("aligner") ||
      treatment.includes("aligner")
    ) {
      return `✅ ارتدِ التقويم الشفاف قرابة 20-22 ساعة يومياً.\n✅ أزلها عند تناول الطعام أو المشروبات.\n✅ نظفها بانتظام وحافظ عليها جافة في علبة خاصة بها.\n✅ احفظها دائمًا في العلبة عند إزالتها.\n✅ اتبع تعليمات الطبيب بشأن تغيير مجموعات التقويم.`;
    }

    if (
      treatmentCategory.includes("retainer") ||
      treatment.includes("retainer")
    ) {
      return `✅ اتباع جدول ارتداء الريتينر حسب تعليمات الطبيب.\n✅ تنظيف الريتينر بانتظام.\n✅ حفظ الريتينر داخل علبته دائماً عند عدم استخدامه.\n✅ إبقاؤه بعيداً عن الحرارة والمواد الساخنة.\n⚠️ في حال كسر الريتينر، فقدانه، أو عدم ملاءمته، يرجى التواصل مع العيادة.`;
    }

    if (
      treatmentCategory.includes("myofunctional") ||
      treatmentCategory.includes("orthopedic") ||
      treatment.includes("hyrax") ||
      treatment.includes("twin block") ||
      treatment.includes("myobrace") ||
      treatment.includes("trainer") ||
      treatment.includes("frankel") ||
      treatment.includes("bionator") ||
      treatment.includes("activator") ||
      treatment.includes("quad helix") ||
      treatment.includes("tpa") ||
      treatment.includes("nance") ||
      treatment.includes("habit breaker")
    ) {
      return `✅ التزم بجدول ارتداء الجهاز حسب تعليمات الطبيب.\n✅ نظف الجهاز يومياً بشكل جيد.\n✅ احفظه في مكان آمن عند إزالته.\n✅ لا تعدّل أو تضبط الجهاز بنفسك.\n⚠️ إذا كسر الجهاز أو تسبب في ألم مستمر، يرجى التواصل مع العيادة.`;
    }

    return `✅ الالتزام بتعليمات الطبيب بدقة.\n✅ المحافظة على نظافة الجهاز والابتعاد عن الأطعمة أو العادات التي قد تؤثر عليه.\n✅ التواصل مع العيادة في حال وجود ألم مستمر أو تلف في الجهاز.`;
  })();

  return `مرحباً ${patientName} 👋\n\nأهلاً بك، نتمنى لك رحلة علاج ناجحة 🌟\n\nفيما يلي بعض التعليمات المهمة للعناية بجهازك:\n\n${firstAppointmentInstructions}\n\nموعدك القادم: ${appointmentDate} الساعة ${appointmentTime}.\n\nشكراً لثقتكم بنا، ونتمنى لكم علاجاً ناجحاً. 🌹`;
}

export function buildElasticsStartedPatientMessage(input: {
  patientName?: string;
  elasticType?: string | null;
  doctorName?: string;
}) {
  const patientName = (input.patientName || "").trim() || "مراجعنا العزيز";
  const doctorName = (input.doctorName || "").trim() || "Doctor";
  const elasticType = (input.elasticType || "").trim();

  // Visits usually store elastics as: "Class II (Medium 3/16)".
  // For this template we only show the size/gauge part inside parentheses.
  const parenthesized = elasticType.match(/\(([^)]+)\)/)?.[1]?.trim() || "";
  const elasticSizeText = parenthesized || elasticType || "غير محدد";

  return `السلام عليكم ${patientName} 🌹

يرجى الالتزام بارتداء المطاطات حسب تعليمات الطبيب، حيث إن الالتزام بها يعد جزءاً أساسياً من نجاح العلاج وتقليل مدته.

📏 مقاس المطاط:
${elasticSizeText}

تعليمات مهمة:
✅ قم بتبديل المطاطات يومياً للحفاظ على قوة الشد المطلوبة.
✅ انزع المطاطات فقط عند تناول الطعام أو تنظيف الأسنان، ثم أعد تركيبها مباشرة.
✅ احتفظ دائماً بمطاطات إضافية معك في حال انقطاع أو فقدان أحدها.

⚠️ عدم الالتزام بارتداء المطاطات قد يؤدي إلى تأخير العلاج أو عدم الوصول إلى النتيجة المطلوبة.

في حال نفاد المطاطات أو وجود أي استفسار، يرجى التواصل مع العيادة.

شكراً لثقتكم بنا، ونتمنى لكم علاجاً ناجحاً 🌹

${doctorName}`;
}

export function buildElasticsStartedDoctorMessage(input: {
  patientName: string;
  patientPhone: string;
  elasticType?: string | null;
}) {
  const elasticType = (input.elasticType || "").trim() || "Not specified";

  return [
    "Elastics started alert.",
    `Patient: ${input.patientName}`,
    `Phone: ${input.patientPhone || "-"}`,
    `Elastic type: ${elasticType}`,
  ].join("\n");
}

export function buildTadsStartedPatientMessage(input: {
  patientName?: string;
  tadsNote?: string | null;
  doctorName?: string;
}) {
  const patientName = (input.patientName || "").trim() || "مراجعنا العزيز";
  const doctorName = (input.doctorName || "").trim() || "Doctor";
  const tadsNote = (input.tadsNote || "").trim() || "حسب تعليمات الطبيب";

  return `السلام عليكم ${patientName} 🌹

تم اليوم وضع الـ TADS ضمن خطة العلاج الخاصة بكم.

📌 تعليمات العناية:
✅ الالتزام التام بتعليمات الطبيب.
✅ المحافظة على نظافة المنطقة حول الـ TADS يومياً.
✅ تجنب العبث بها أو تحريكها باللسان أو الأصابع.
✅ الالتزام بالمراجعات الدورية لضمان تقدم العلاج بالشكل الصحيح.

ملاحظة الطبيب:
${tadsNote}

⚠️ في حال الشعور بألم غير طبيعي، حركة في الـ TADS، أو أي انزعاج مستمر، يرجى التواصل مع العيادة مباشرة.

شكراً لثقتكم بنا، ونتمنى لكم علاجاً ناجحاً 🌹

${doctorName}`;
}

export function buildTadsStartedDoctorMessage(input: {
  patientName: string;
  patientPhone: string;
  tadsNote?: string | null;
}) {
  const tadsNote = (input.tadsNote || "").trim() || "Not specified";

  return [
    "TADS started alert.",
    `Patient: ${input.patientName}`,
    `Phone: ${input.patientPhone || "-"}`,
    `TADS note: ${tadsNote}`,
  ].join("\n");
}

export function buildRetainerYearOnePatientMessage(input: {
  patientName?: string;
  doctorName?: string;
}) {
  const patientName = (input.patientName || "").trim() || "مراجعنا العزيز";
  const doctorName = (input.doctorName || "").trim() || "Doctor";

  return `السلام عليكم ${patientName} 🌹

نبارك لكم إكمال السنة الأولى من استخدام الريتينر. 👏

ابتداءً من الآن، يمكنكم ارتداء الريتينر أثناء النوم فقط، ما لم يوصِ الطبيب بغير ذلك.

تذكير مهم:
✅ ارتدِ الريتينر كل ليلة للمحافظة على استقامة الأسنان.
✅ نظّف الريتينر يومياً بالماء الفاتر وفرشاة ناعمة.
✅ احفظه في علبته عند عدم استخدامه.
❌ لا تستخدم الماء الساخن لتنظيفه.
❌ لا تتركه ملفوفاً بمناديل أو في أماكن معرضة للحرارة.

⚠️ إذا أصبح الريتينر ضيقاً، انكسر، أو فُقد، يرجى التواصل مع العيادة في أقرب وقت.

شكراً لثقتكم بنا، ونتمنى لكم دوام الصحة وابتسامة جميلة 🌹

${doctorName}`;
}

export function createWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export type WhatsAppSendResult = {
  ok: boolean;
  provider: "meta" | "vonage" | "simulation";
  to: string;
  messageId?: string;
  error?: string;
  debug?: {
    endpoint: string;
    statusCode: number | null;
    payload: unknown;
  };
};

export type WhatsAppTemplateComponent = {
  type: "body";
  parameters: Array<{
    type: "text";
    text: string;
  }>;
};

export type VonageTemplateFallback = {
  name: string;
  locale: string;
  parameters: string[];
};

export type DoctorWhatsAppCredentials = {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string | null;
  userId?: string;
};

const ENCRYPTED_TOKEN_PREFIX = "enc:v1:";

function toBase64(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

function fromBase64(value: string) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function getEncryptionKey() {
  const secret = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    return null;
  }

  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", secretBytes);

  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptWhatsAppProviderToken(token: string) {
  const raw = (token || "").trim();
  if (!raw) {
    return "";
  }

  const key = await getEncryptionKey();
  if (!key) {
    return raw;
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(raw);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return `${ENCRYPTED_TOKEN_PREFIX}${toBase64(iv)}:${toBase64(new Uint8Array(cipherBuffer))}`;
}

export async function decryptWhatsAppProviderToken(token: string | null | undefined) {
  const value = (token || "").trim();
  if (!value) {
    return "";
  }

  if (!value.startsWith(ENCRYPTED_TOKEN_PREFIX)) {
    return value;
  }

  const payload = value.slice(ENCRYPTED_TOKEN_PREFIX.length);
  const [ivBase64, cipherBase64] = payload.split(":");
  if (!ivBase64 || !cipherBase64) {
    return "";
  }

  const key = await getEncryptionKey();
  if (!key) {
    return "";
  }

  try {
    const iv = fromBase64(ivBase64);
    const cipher = fromBase64(cipherBase64);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipher
    );
    return new TextDecoder().decode(plainBuffer);
  } catch {
    return "";
  }
}

function sanitizeQuotedValue(value: string | null | undefined) {
  const raw = (value || "").trim();
  return raw.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
}

export async function buildDoctorWhatsAppCredentials(input: {
  whatsappAccessToken?: string | null;
  whatsappPhoneNumberId?: string | null;
  whatsappBusinessAccountId?: string | null;
  userId?: string;
}) {
  const phoneNumberId = sanitizeQuotedValue(input.whatsappPhoneNumberId);
  const decryptedAccessToken = sanitizeQuotedValue(
    await decryptWhatsAppProviderToken(input.whatsappAccessToken)
  );
  const businessAccountId = sanitizeQuotedValue(input.whatsappBusinessAccountId);

  if (phoneNumberId && decryptedAccessToken) {
    return {
      accessToken: decryptedAccessToken,
      phoneNumberId,
      businessAccountId: businessAccountId || null,
      userId: input.userId,
    } as DoctorWhatsAppCredentials;
  }

  return null;
}

function toMetaRecipient(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return "";
  }

  return normalized.startsWith("+") ? normalized : `+${normalized}`;
}

function getMetaGraphApiVersion() {
  return (process.env.META_GRAPH_API_VERSION || "v23.0").trim();
}

function getMetaGraphBaseUrl() {
  return `https://graph.facebook.com/${getMetaGraphApiVersion()}`;
}

function base64UrlEncode(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToBytes(pem: string) {
  const base64 = normalizePrivateKey(pem)
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function normalizePrivateKey(value: string) {
  return value
    .trim()
    .replace(/^"([\s\S]*)"$/, "$1")
    .replace(/^'([\s\S]*)'$/, "$1")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");
}

function isOutsideWhatsAppWindow(payload: unknown) {
  return /1340|131047|outside allowed window|more than 24 hours/i.test(
    JSON.stringify(payload || {})
  );
}

async function getVonagePrivateKey() {
  if (process.env.NODE_ENV === "development") {
    try {
      const { readFile } = await import("node:fs/promises");
      const fileKey = normalizePrivateKey(
        await readFile(`${process.cwd()}/vonage-private.key`, "utf8")
      );
      if (fileKey) {
        return fileKey;
      }
    } catch {
      // Local key file is optional; use the environment fallback below.
    }
  }

  return normalizePrivateKey(process.env.VONAGE_PRIVATE_KEY || "");
}

async function createVonageJwt(applicationId: string, privateKeyPem: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ typ: "JWT", alg: "RS256" }));
  const payload = base64UrlEncode(JSON.stringify({
    application_id: applicationId,
    iat: now,
    exp: now + 300,
    jti: crypto.randomUUID(),
  }));
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export function hasVonageConfiguration() {
  return Boolean(
    process.env.VONAGE_APPLICATION_ID?.trim() &&
      process.env.VONAGE_WHATSAPP_NUMBER?.trim() &&
      process.env.VONAGE_PRIVATE_KEY?.trim()
  );
}

function getVonageMessagesEndpoint() {
  return "https://api.nexmo.com/v1/messages";
}

async function sendVonageWhatsAppText(
  phone: string,
  message: string,
  userId?: string,
  options?: { templateFallback?: VonageTemplateFallback }
): Promise<WhatsAppSendResult> {
  const to = normalizePhone(phone);
  const applicationId = process.env.VONAGE_APPLICATION_ID?.trim() || "";
  const privateKey = await getVonagePrivateKey();
  const from = normalizePhone(process.env.VONAGE_WHATSAPP_NUMBER || "");
  let endpoint = "";

  try {
    endpoint = getVonageMessagesEndpoint();
  } catch (error) {
    return {
      ok: false,
      provider: "vonage",
      to,
      error: error instanceof Error ? error.message : "Vonage endpoint configuration is invalid.",
      debug: { endpoint, statusCode: null, payload: null },
    };
  }

  if (!to || !applicationId || !from || !privateKey) {
    console.warn("[WhatsApp] Message failed: Vonage configuration or recipient is missing.");
    return { ok: false, provider: "vonage", to, error: "Vonage WhatsApp messaging is not configured." };
  }

  try {
    console.log("[WhatsApp] Sending message", { provider: "vonage", to, endpoint, authentication: "jwt" });
    const authorization = `Bearer ${await createVonageJwt(applicationId, privateKey)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        message_type: "text",
        text: message,
        channel: "whatsapp",
        webhook_url: process.env.VONAGE_STATUS_WEBHOOK_URL?.trim() || "https://orthoprimeoa.com/api/whatsapp/webhook-status",
        webhook_version: "v1",
      }),
    });
    const payload = await response.json().catch(() => null);
    console.log("[WhatsApp] Vonage response", {
      statusCode: response.status,
      messageId: payload?.message_uuid || null,
    });
    if (!response.ok) {
      if (options?.templateFallback && isOutsideWhatsAppWindow(payload)) {
        return sendVonageWhatsAppTemplate(
          phone,
          options.templateFallback,
          userId
        );
      }

      console.warn("[WhatsApp] Message failed", { statusCode: response.status, to });
      return { ok: false, provider: "vonage", to, error: "Vonage rejected the WhatsApp message.", debug: { endpoint, statusCode: response.status, payload } };
    }

    const messageId = payload?.message_uuid || payload?.message_uuid?.toString();
    await recordOutboundWhatsAppMessage({
      userId,
      providerMessageId: messageId,
      phoneNumberId: applicationId,
      recipientPhone: to,
      messageType: "text",
      providerPayload: options?.templateFallback
        ? { ...payload, _vonageTemplateFallback: options.templateFallback }
        : payload,
    });
    console.log("[WhatsApp] Message sent successfully", { provider: "vonage", to, messageId });
    return { ok: true, provider: "vonage", to, messageId, debug: { endpoint, statusCode: response.status, payload } };
  } catch (error) {
    console.warn("[WhatsApp] Message failed", {
      to,
      error: error instanceof Error ? error.message : "Unknown Vonage error",
    });
    return { ok: false, provider: "vonage", to, error: "Unable to reach the Vonage WhatsApp service.", debug: { endpoint, statusCode: null, payload: null } };
  }
}

export async function sendVonageWhatsAppTemplate(
  phone: string,
  template: VonageTemplateFallback,
  userId?: string
): Promise<WhatsAppSendResult> {
  const to = normalizePhone(phone);
  const applicationId = process.env.VONAGE_APPLICATION_ID?.trim() || "";
  const privateKey = await getVonagePrivateKey();
  const from = normalizePhone(process.env.VONAGE_WHATSAPP_NUMBER || "");
  const endpoint = "https://api.nexmo.com/v1/messages";

  if (!to || !applicationId || !from || !privateKey || !template.name || !template.locale) {
    return {
      ok: false,
      provider: "vonage",
      to,
      error: "Vonage template configuration is incomplete.",
      debug: { endpoint, statusCode: null, payload: null },
    };
  }

  try {
    const authorization = `Bearer ${await createVonageJwt(applicationId, privateKey)}`;
    const requestPayload = {
      to,
      from,
      channel: "whatsapp",
      message_type: "template",
      whatsapp: {
        policy: "deterministic",
        locale: template.locale,
      },
      template: {
        name: template.name,
        parameters: template.parameters,
      },
      webhook_url:
        process.env.VONAGE_STATUS_WEBHOOK_URL?.trim() ||
        "https://orthoprimeoa.com/api/whatsapp/webhook-status",
      webhook_version: "v1",
    };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });
    const responsePayload = await response.json().catch(() => null);
    const result: WhatsAppSendResult = {
      ok: response.ok,
      provider: "vonage",
      to,
      messageId: responsePayload?.message_uuid || undefined,
      error: response.ok
        ? undefined
        : responsePayload?.error?.detail || "Vonage template message was rejected.",
      debug: { endpoint, statusCode: response.status, payload: responsePayload },
    };

    if (result.ok) {
      await recordOutboundWhatsAppMessage({
        userId,
        providerMessageId: result.messageId,
        phoneNumberId: applicationId,
        recipientPhone: to,
        messageType: "template",
        providerPayload: responsePayload,
      });
    }

    return result;
  } catch (error) {
    return {
      ok: false,
      provider: "vonage",
      to,
      error: error instanceof Error ? error.message : String(error),
      debug: { endpoint, statusCode: null, payload: null },
    };
  }
}

export async function testWhatsAppConnection(
  credentials: DoctorWhatsAppCredentials | null | undefined
) {
  const phoneNumberId = credentials?.phoneNumberId?.trim() || "";
  const accessToken = credentials?.accessToken?.trim() || "";

  if (!phoneNumberId || !accessToken) {
    return {
      ok: false,
      provider: "simulation" as const,
      to: "",
      error: "WhatsApp Phone Number ID and Access Token are required.",
    };
  }

  try {
    const url = new URL(`${getMetaGraphBaseUrl()}/${phoneNumberId}`);
    url.searchParams.set("fields", "id,display_phone_number,verified_name,quality_rating");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        provider: "meta" as const,
        to: "",
        error:
          payload?.error?.message ||
          payload?.message ||
          `Meta status request failed with status ${response.status}`,
      };
    }

    return {
      ok: true,
      provider: "meta" as const,
      to: "",
      messageId: payload?.id || phoneNumberId,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "meta" as const,
      to: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function normalizePhone(phone: string) {
  let digits = phone.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("964")) {
    return digits;
  }

  // Iraqi local mobile formats:
  // - 07XXXXXXXXX -> 9647XXXXXXXXX
  // - 7XXXXXXXXX  -> 9647XXXXXXXXX
  if (digits.length === 11 && digits.startsWith("07")) {
    return `964${digits.slice(1)}`;
  }

  if (digits.length === 10 && digits.startsWith("7")) {
    return `964${digits}`;
  }

  return digits;
}

export async function sendWhatsAppText(
  credentials: DoctorWhatsAppCredentials | null | undefined,
  phone: string,
  message: string,
  userId?: string,
  options?: { vonageTemplateFallback?: VonageTemplateFallback }
): Promise<WhatsAppSendResult> {
  if (hasVonageConfiguration()) {
    return sendVonageWhatsAppText(
      phone,
      message,
      credentials?.userId || userId,
      { templateFallback: options?.vonageTemplateFallback }
    );
  }

  const to = toMetaRecipient(phone);

  if (!to) {
    return {
      ok: false,
      provider: "simulation",
      to,
      error: "Phone number is empty after normalization.",
    };
  }

  const accessToken = credentials?.accessToken?.trim();
  const phoneNumberId = credentials?.phoneNumberId?.trim();

  if (!accessToken || !phoneNumberId) {
    return {
      ok: false,
      provider: "simulation",
      to,
      error: "Doctor Meta WhatsApp credentials are not connected.",
      debug: {
        endpoint: "",
        statusCode: null,
        payload: null,
      },
    };
  }

  try {
    const endpoint = `${getMetaGraphBaseUrl()}/${phoneNumberId}/messages`;
    const body = JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        provider: "meta",
        to,
        error:
          payload?.error?.message ||
          payload?.message ||
          `Meta request failed with status ${response.status}`,
        debug: {
          endpoint,
          statusCode: response.status,
          payload,
        },
      };
    }

    const result: WhatsAppSendResult = {
      ok: true,
      provider: "meta",
      to,
      messageId: payload?.messages?.[0]?.id || payload?.id || undefined,
      debug: {
        endpoint,
        statusCode: response.status,
        payload,
      },
    };
    await recordOutboundWhatsAppMessage({
      userId: credentials?.userId,
      providerMessageId: result.messageId,
      phoneNumberId,
      recipientPhone: to,
      messageType: "text",
      providerPayload: payload,
    });
    return result;
  } catch (error) {
    return {
      ok: false,
      provider: "meta",
      to,
      error: error instanceof Error ? error.message : String(error),
      debug: {
        endpoint: phoneNumberId ? `${getMetaGraphBaseUrl()}/${phoneNumberId}/messages` : "",
        statusCode: null,
        payload: null,
      },
    };
  }
}

export async function sendWhatsAppTemplate(
  credentials: DoctorWhatsAppCredentials | null | undefined,
  phone: string,
  templateName = "hello_world",
  languageCode = "en_US",
  components?: WhatsAppTemplateComponent[]
): Promise<WhatsAppSendResult> {
  const to = normalizePhone(phone);

  if (!to) {
    return {
      ok: false,
      provider: "simulation",
      to,
      error: "Phone number is empty after normalization.",
    };
  }

  const accessToken = credentials?.accessToken?.trim();
  const phoneNumberId = credentials?.phoneNumberId?.trim();

  if (!accessToken || !phoneNumberId) {
    return {
      ok: false,
      provider: "simulation",
      to,
      error: "Doctor Meta WhatsApp credentials are not connected.",
      debug: {
        endpoint: "",
        statusCode: null,
        payload: null,
      },
    };
  }

  try {
    const endpoint = `${getMetaGraphBaseUrl()}/${phoneNumberId}/messages`;
    const template: {
      name: string;
      language: { code: string };
      components?: WhatsAppTemplateComponent[];
    } = {
      name: templateName,
      language: { code: languageCode },
    };

    if (components && components.length > 0) {
      template.components = components;
    }

    const body = JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        provider: "meta",
        to,
        error:
          payload?.error?.message ||
          payload?.message ||
          `Meta request failed with status ${response.status}`,
        debug: {
          endpoint,
          statusCode: response.status,
          payload,
        },
      };
    }

    const result: WhatsAppSendResult = {
      ok: true,
      provider: "meta",
      to,
      messageId: payload?.messages?.[0]?.id || payload?.id || undefined,
      debug: {
        endpoint,
        statusCode: response.status,
        payload,
      },
    };
    await recordOutboundWhatsAppMessage({
      userId: credentials?.userId,
      providerMessageId: result.messageId,
      phoneNumberId,
      recipientPhone: to,
      messageType: "template",
      providerPayload: payload,
    });
    return result;
  } catch (error) {
    return {
      ok: false,
      provider: "meta",
      to,
      error: error instanceof Error ? error.message : String(error),
      debug: {
        endpoint: phoneNumberId ? `${getMetaGraphBaseUrl()}/${phoneNumberId}/messages` : "",
        statusCode: null,
        payload: null,
      },
    };
  }
}
