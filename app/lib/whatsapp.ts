import { formatDateDMY } from "./date";

export type WhatsAppReminderType = "3days" | "sameDay" | "general";

export type WhatsAppReminderPatient = {
  phone: string;
  appointmentDate: string;
  appointmentTime?: string;
  treatment?: string;
  treatmentCategory?: string;
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

  const myoScheduleText = buildMyofunctionalScheduleText(
    patient.myofunctionalProgram
  );

  if (patient.firstAppointment) {
    if (category.includes("myofunctional") || treatment.includes("hyrax") || treatment.includes("twin block") || treatment.includes("myobrace") || treatment.includes("trainer") || treatment.includes("frankel") || treatment.includes("bionator") || treatment.includes("activator")) {
      parts.push(
        `هذه أول زيارة لك مع الجهاز الميوفنكشونال. يجب تفعيله يدوياً حسب الجدول التالي: ${myoScheduleText}`
      );
    } else if (category.includes("fixed") || treatment.includes("braces") || treatment.includes("hyrax") || treatment.includes("fixed")) {
      parts.push(
        "هذه أول زيارة لك مع جهاز التقويم الثابت. يرجى الاهتمام بالتالي:\n- نظف الأسنان جيداً بعد كل وجبة.\n- تجنب الأطعمة الصلبة واللزجة.\n- لا تلمس الجهاز بيدك.\n- استخدم فرشاة بين الأسنان."
      );
    } else if (category.includes("retainer") || treatment.includes("retainer")) {
      parts.push(
        "هذه أول زيارة لك مع الجهة المانعة للحركة (Retainer). يرجى الاهتمام بالتالي:\n- ارتدِ الجهة حسب تعليمات الطبيب.\n- نظفها يومياً بالماء الفاتر والبخار.\n- لا تأكل وأنت ترتديها.\n- احفظها في علبتها عندما لا تستخدمها."
      );
    } else if (category.includes("aligner") || treatment.includes("aligner")) {
      parts.push(
        "هذه أول زيارة لك مع الجهاز الشفاف. يرجى الاهتمام بالتالي:\n- نظف الجهاز يومياً.\n- اخلعه قبل الأكل واشرب السوائل الساخنة.\n- ارتديه 20-22 ساعة يومياً.\n- احفظه في علبته النظيفة."
      );
    } else {
      parts.push(
        "هذه أول زيارة لك. يرجى اتباع تعليمات العناية العامة للجهاز:\n- نظف الأسنان جيداً بعد كل وجبة.\n- تجنب الأطعمة الصلبة واللزجة.\n- لا تلمس الجهاز بيدك."
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

  const whenText =
    reminderType === "3days"
      ? "هذا تذكير قبل 3 أيام من موعدك"
      : reminderType === "sameDay"
      ? "هذا تذكير ليوم الموعد"
      : "هذا تذكير بموعدك";

  const careText = buildCareInstructions(patient);

  return `${whenText} من عيادة الدكتور.\nموعدك يوم ${appointmentDate} الساعة ${appointmentTime}.${careText}\n\nإذا كان لديك أي سؤال، راسلنا هنا على هذا الرقم.`;
}

export function createWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
