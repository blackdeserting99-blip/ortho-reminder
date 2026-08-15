import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | OrthoPrime",
  description:
    "Learn how OrthoPrime handles information for orthodontic professionals and their practices.",
};

const sections = [
  {
    title: "Information we collect",
    content:
      "We collect information needed to provide and improve OrthoPrime, a software platform for orthodontic professionals. The information we collect depends on how a doctor or clinic uses the platform.",
  },
  {
    title: "Account information",
    content:
      "When a doctor or clinic creates an OrthoPrime account, we collect account details such as name, email address, login credentials, clinic-related settings, and the information needed to administer access to the platform.",
  },
  {
    title: "Patient information entered by doctors",
    content:
      "Doctors and authorized clinic staff may enter patient information, including names, contact details, and orthodontic records. The doctor or clinic that enters this information is responsible for obtaining any required patient permissions, providing required notices, and ensuring that the information is accurate and lawfully collected.",
  },
  {
    title: "Appointment and treatment information",
    content:
      "OrthoPrime may process appointment dates, treatment notes, visit history, case status, and related practice-management information that doctors and their authorized staff enter into the platform.",
  },
  {
    title: "WhatsApp reminder data and messaging",
    content:
      "When a clinic enables WhatsApp reminders, OrthoPrime processes the phone numbers, appointment details, message template data, delivery status, and configuration information needed to send and manage those reminders. Doctors are responsible for ensuring they have a lawful basis and any required consent to contact patients through WhatsApp.",
  },
  {
    title: "How information is used",
    content:
      "We use information to operate the platform, authenticate users, manage appointments and clinical workflows, deliver requested reminders, provide support, maintain security, prevent misuse, and improve the reliability and functionality of OrthoPrime.",
  },
  {
    title: "Data storage and security",
    content:
      "We use reasonable administrative, technical, and organizational measures designed to protect information against unauthorized access, alteration, disclosure, or loss. No method of transmission or storage is completely secure, and doctors should use strong passwords and limit access to authorized personnel.",
  },
  {
    title: "Third-party services",
    content:
      "We may rely on carefully selected service providers for infrastructure, hosting, authentication-related functions, communications, and other services needed to operate OrthoPrime. These providers may process information only as needed to provide their services to us and subject to their applicable terms and privacy practices.",
  },
  {
    title: "WhatsApp/Meta services",
    content:
      "WhatsApp reminder features use services provided by Meta and WhatsApp. Information sent through or processed by those services is also subject to the applicable Meta and WhatsApp terms, policies, and privacy practices. OrthoPrime does not control how Meta or WhatsApp independently process information under their own policies.",
  },
  {
    title: "Cookies and similar technologies",
    content:
      "We use essential cookies and similar technologies to keep users signed in, maintain sessions, protect the platform, and remember necessary preferences. Disabling essential cookies may affect the availability or proper operation of OrthoPrime.",
  },
  {
    title: "Data retention",
    content:
      "We retain information for as long as reasonably necessary to provide OrthoPrime, meet legal and operational requirements, resolve disputes, enforce agreements, and maintain appropriate records. Retention periods may vary based on the type of information and the doctor or clinic's account status.",
  },
  {
    title: "User rights",
    content:
      "Depending on applicable law, users may have rights to request access to, correction of, deletion of, or restriction of processing of their personal information. Doctors and clinics are responsible for responding to patient requests concerning patient information they control. Account holders may contact us for requests relating to their OrthoPrime account information.",
  },
  {
    title: "Children's privacy",
    content:
      "OrthoPrime is designed for use by orthodontic professionals and is not intended for children to use directly. Patient information concerning minors may be entered only by doctors or authorized clinic staff who are responsible for complying with applicable privacy and consent requirements.",
  },
  {
    title: "Changes to this Privacy Policy",
    content:
      "We may update this Privacy Policy from time to time to reflect changes to our practices, services, or legal requirements. The updated version will be posted on this page with a revised effective date.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-5xl overflow-hidden border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
        <header className="brand-gradient px-6 py-12 text-white sm:px-10 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">OrthoPrime</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/90 sm:text-lg">
            This Privacy Policy explains how OrthoPrime handles information when orthodontic professionals and their authorized clinic staff use our platform.
          </p>
          <p className="mt-6 text-sm text-white/75">Effective date: August 15, 2026</p>
        </header>

        <div className="px-6 py-10 sm:px-10 sm:py-12">
          <section className="border-l-4 border-teal-500 bg-teal-50 px-5 py-4 text-slate-700" aria-label="Important notice">
            <p className="font-semibold text-slate-900">OrthoPrime is a software platform for orthodontic professionals.</p>
            <p className="mt-2 leading-7">
              Doctors and clinics are responsible for the patient information they enter into the system, including ensuring that collection, use, and messaging comply with applicable laws and professional obligations.
            </p>
          </section>

          <div className="mt-10 space-y-9">
            {sections.map((section) => (
              <section key={section.title} className="border-b border-slate-200 pb-9 last:border-b-0 last:pb-0">
                <h2 className="text-2xl font-semibold text-slate-900">{section.title}</h2>
                <p className="mt-3 leading-7 text-slate-600">{section.content}</p>
              </section>
            ))}

            <section className="border-b border-slate-200 pb-9 last:border-b-0 last:pb-0">
              <h2 className="text-2xl font-semibold text-slate-900">Contact information</h2>
              <p className="mt-3 leading-7 text-slate-600">
                For questions about this Privacy Policy or requests relating to your OrthoPrime account information, contact us at{" "}
                <a className="font-semibold text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-900" href="mailto:support@ortho-reminder.app">
                  support@ortho-reminder.app
                </a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}