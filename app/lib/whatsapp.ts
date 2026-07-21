import { formatDateDMY } from "./date";

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

  if (patient.firstAppointment) {
    if (
      category.includes("myofunctional") ||
      category.includes("orthopedic") ||
      treatment.includes("hyrax") ||
      treatment.includes("twin block") ||
      treatment.includes("myobrace") ||
      treatment.includes("trainer") ||
      treatment.includes("frankel") ||
      treatment.includes("bionator") ||
      treatment.includes("activator")
    ) {
      parts.push(
        `السلام عليكم ${patientName} 🌹

نتمنى لكم التوفيق في رحلة العلاج.

يرجى الالتزام بتعليمات الطبيب لضمان تحقيق أفضل النتائج.

📅 موعد التفعيل القادم:
${upcomingDate}

🔄 تعليمات التفعيل:
${myoScheduleText || "حسب تعليمات الطبيب"}

يرجى الالتزام بالمواعيد المحددة وعدم زيادة أو تقليل عدد مرات التفعيل إلا بتوجيه من الطبيب.

تعليمات مهمة:
✅ ارتداء الجهاز حسب المدة التي أوصى بها الطبيب.
✅ المحافظة على نظافة الجهاز بغسله بالماء الفاتر وتنظيفه يومياً.
✅ حفظ الجهاز داخل علبته المخصصة عند عدم استخدامه.
❌ تجنب تعريض الجهاز للماء الساخن أو أشعة الشمس المباشرة.
❌ عدم محاولة تعديل الجهاز أو تفعيله بطرق غير موصى بها.

⚠️ في حال كسر الجهاز، أو فقدانه، أو الشعور بألم غير طبيعي، يرجى التواصل مع العيادة مباشرة.

شكراً لثقتكم بنا، ونتمنى لكم علاجاً ناجحاً 🌹

${doctorName}`
      );
    } else if (
      category.includes("fixed") ||
      treatment.includes("braces") ||
      treatment.includes("fixed")
    ) {
      parts.push(
        `السلام عليكم ${patientName} 🌹

نبارك لكم بداية رحلة العلاج بالتقويم، ونتمنى لكم تجربة علاج ناجحة وابتسامة جميلة بإذن الله.

من الطبيعي خلال الأيام الأولى الشعور بضغط أو ألم خفيف على الأسنان، وقد تواجهون صعوبة بسيطة أثناء المضغ، وهذا أمر طبيعي وسيختفي تدريجياً مع تأقلم الأسنان على التقويم.

يرجى الالتزام بالتعليمات التالية:

✅ تناول الأطعمة اللينة خلال الأيام الأولى.
✅ تجنب الأطعمة القاسية واللزجة مثل المكسرات، الثلج، العلكة، والكراميل.
✅ تنظيف الأسنان والتقويم جيداً بعد كل وجبة للحفاظ على صحة الأسنان واللثة.

⚠️ في حال سقوط أي نجمة من التقويم، أو انقطاع السلك، أو حدوث أي مشكلة غير معتادة، يرجى التواصل مع العيادة مباشرة وعدم محاولة إصلاحها بأنفسكم.

شكراً لثقتكم بنا، ونتمنى لكم علاجاً ناجحاً وابتسامة جميلة. 🌹

${doctorName}`
      );
    } else if (category.includes("retainer") || treatment.includes("retainer")) {
      parts.push(
        "Retainer care instructions:\n- Wear exactly as prescribed by your doctor.\n- Clean daily with lukewarm water and a soft brush.\n- Do not eat while wearing your retainer.\n- Keep it in its case when not in use."
      );
    } else if (category.includes("aligner") || treatment.includes("aligner")) {
      parts.push(
        `Aligner instructions:\n- Wear aligners 20-22 hours per day.\n- Remove aligners only for meals and hot drinks.\n- Clean aligners daily using soft brush and lukewarm water.\n- Wear each aligner for ${alignerDays} days unless doctor changes plan.\n- When ${alignerDays} days are completed, switch to the next aligner set.`
      );
    } else {
      parts.push(
        "General appliance instructions:\n- Keep excellent oral hygiene.\n- Follow appliance use exactly as prescribed.\n- Avoid habits or foods that damage the appliance.\n- Contact clinic if breakage, severe pain, or fitting issues occur."
      );
    }
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

  const whenText =
    reminderType === "3days"
      ? "هذا تذكير قبل 3 أيام من موعدك"
      : reminderType === "sameDay"
      ? "هذا تذكير ليوم الموعد"
      : "هذا تذكير بموعدك";

  const careText = buildCareInstructions(patient);

  return `${whenText} من عيادة الدكتور.\nموعدك يوم ${appointmentDate} الساعة ${appointmentTime}.${careText}\n\nإذا كان لديك أي سؤال، راسلنا هنا على هذا الرقم.`;
}

export function buildElasticsStartedPatientMessage(input: {
  patientName?: string;
  elasticType?: string | null;
  doctorName?: string;
}) {
  const patientName = (input.patientName || "").trim() || "مراجعنا العزيز";
  const doctorName = (input.doctorName || "").trim() || "Doctor";
  const elasticType = (input.elasticType || "").trim();
  const elasticLine = elasticType ? `\nنوع الإيلاستك: ${elasticType}` : "";

  return `السلام عليكم ${patientName} 🌹

تم اليوم تركيب الإيلاستك ضمن خطة العلاج.${elasticLine}

يرجى الالتزام بالتعليمات التالية:
✅ ارتداء الإيلاستك بشكل مستمر.
✅ تبديل الإيلاستك مرة كل 24 ساعة.
✅ إزالته فقط أثناء الأكل وتنظيف الأسنان إذا أوصى الطبيب بذلك.

⚠️ في حال انقطاع الإيلاستك أو حدوث ألم غير طبيعي، يرجى التواصل مع العيادة مباشرة.

شكراً لالتزامكم، ونتمنى لكم علاجاً ناجحاً 🌹

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

export function createWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export type WhatsAppSendResult = {
  ok: boolean;
  provider: "meta" | "simulation";
  to: string;
  messageId?: string;
  error?: string;
};

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function sendWhatsAppText(
  phone: string,
  message: string
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

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

  // If Meta credentials are not configured, keep the flow non-breaking and
  // return a simulation result that can be logged/previewed in the dashboard.
  if (!accessToken || !phoneNumberId) {
    return {
      ok: true,
      provider: "simulation",
      to,
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: {
            preview_url: false,
            body: message,
          },
        }),
      }
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        provider: "meta",
        to,
        error:
          payload?.error?.message ||
          `Meta API request failed with status ${response.status}`,
      };
    }

    return {
      ok: true,
      provider: "meta",
      to,
      messageId: payload?.messages?.[0]?.id,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "meta",
      to,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
