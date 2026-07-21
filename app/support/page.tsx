"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

export default function SupportPage() {
  const [doctorWhatsapp, setDoctorWhatsapp] = useState("");
  const [loadingSetting, setLoadingSetting] = useState(true);
  const [savingSetting, setSavingSetting] = useState(false);
  const [settingMessage, setSettingMessage] = useState("");

  useEffect(() => {
    const loadSetting = async () => {
      try {
        const response = await fetch("/api/settings/doctor-whatsapp", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) {
          throw new Error("Failed to load setting");
        }
        const data = await response.json();
        setDoctorWhatsapp(data.phone || "");
      } catch {
        setSettingMessage("Could not load doctor WhatsApp setting.");
      } finally {
        setLoadingSetting(false);
      }
    };

    loadSetting();
  }, []);

  const saveDoctorWhatsapp = async () => {
    if (!doctorWhatsapp.trim()) {
      setSettingMessage("Please enter a WhatsApp number.");
      return;
    }

    setSavingSetting(true);
    setSettingMessage("");

    try {
      const response = await fetch("/api/settings/doctor-whatsapp", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: doctorWhatsapp }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save setting");
      }

      setDoctorWhatsapp(payload.phone || doctorWhatsapp);
      setSettingMessage("Doctor WhatsApp saved. Iraqi local numbers are converted to +964 automatically.");
    } catch (error) {
      setSettingMessage(error instanceof Error ? error.message : "Failed to save doctor WhatsApp");
    } finally {
      setSavingSetting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 w-full">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-950 via-teal-900 to-slate-900 px-6 py-12 sm:px-10 sm:py-16 text-white">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-300">Support Center</p>
              <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
                Need help? We're here for you.
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-slate-300">
                Contact our technical support team for platform issues, or use the additional support channel for practice and product inquiries.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 p-6 sm:p-8 bg-slate-50">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500 uppercase tracking-[0.2em] mb-3">Technical Support</p>
                <h2 className="text-2xl font-semibold text-slate-900">Platform issues</h2>
                <p className="mt-3 text-slate-600 leading-7">
                  If your dashboard, scheduling, or data handling is not working as expected, contact our technical team directly.
                </p>
                <div className="mt-6 space-y-3 text-slate-700">
                  <div>
                    <span className="block text-sm font-medium text-slate-500">Phone</span>
                    <span className="text-lg font-semibold">+964 773 836 1523</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-slate-500">Email</span>
                    <span className="text-lg font-semibold">support@ortho-reminder.app</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500 uppercase tracking-[0.2em] mb-3">Other Support</p>
                <h2 className="text-2xl font-semibold text-slate-900">Practice and product help</h2>
                <p className="mt-3 text-slate-600 leading-7">
                  For product questions, feature requests, or non-technical support, we'll update this contact shortly.
                </p>
                <div className="mt-6 space-y-3 text-slate-700">
                  <div>
                    <span className="block text-sm font-medium text-slate-500">Phone</span>
                    <span className="text-lg font-semibold">—</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-slate-500">Email</span>
                    <span className="text-lg font-semibold">info@ortho-reminder.app</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white p-6 sm:p-8">
              <div className="mb-8 rounded-2xl border border-teal-200 bg-teal-50 p-5">
                <p className="text-sm text-teal-700 uppercase tracking-[0.2em]">Automation Setting</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">Doctor WhatsApp Number</h3>
                <p className="mt-2 text-slate-700">
                  Save the doctor's WhatsApp once. You can type Iraqi number in local format (for example 0770xxxxxxx)
                  and the system will auto-convert it to +964 format.
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="tel"
                    value={doctorWhatsapp}
                    onChange={(event) => setDoctorWhatsapp(event.target.value)}
                    placeholder="0770xxxxxxx or +964..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                    disabled={loadingSetting || savingSetting}
                  />
                  <button
                    type="button"
                    onClick={saveDoctorWhatsapp}
                    disabled={loadingSetting || savingSetting}
                    className="rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                  >
                    {savingSetting ? "Saving..." : "Save"}
                  </button>
                </div>

                {settingMessage && (
                  <p className="mt-3 text-sm text-slate-700">{settingMessage}</p>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-[0.2em]">Support Hours</p>
                  <p className="mt-2 text-slate-900 font-semibold">Sun - Thu, 9:00 AM - 6:00 PM</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-[0.2em]">Response time</p>
                  <p className="mt-2 text-slate-900 font-semibold">Within 24 hours on business days</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-[0.2em]">Request type</p>
                  <p className="mt-2 text-slate-900 font-semibold">Technical support, bug reports, general inquiries</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

