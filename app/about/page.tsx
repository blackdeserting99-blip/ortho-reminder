"use client";

import Sidebar from "../components/Sidebar";

export default function AboutPage() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 w-full">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-blue-950 px-6 py-12 sm:px-10 sm:py-16 text-white">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-300">About Us</p>
              <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
                Built by a small Iraqi dental team for orthodontists.
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-slate-300 leading-8">
                We created this platform to simplify appointment management, patient follow-up, and treatment planning for busy orthodontic clinics.
              </p>
            </div>

            <div className="p-6 sm:p-8 bg-slate-50 space-y-8">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">Our mission</h2>
                <p className="mt-3 text-slate-600 leading-7">
                  Ortho Reminder is designed to support orthodontists with a simple, reliable, and responsive practice management tool. Our goal is to reduce administrative overhead and keep patient care on track.
                </p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">Who we are</h2>
                <p className="mt-3 text-slate-600 leading-7">
                  We are a small Iraqi team of dentists and developers. We built this project because we understand the clinical workflow and want to deliver software that orthodontists can trust.
                </p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">Why this platform</h2>
                <p className="mt-3 text-slate-600 leading-7">
                  This website combines appointment scheduling, patient notes, and treatment planning in a clean interface that adapts to both desktop and mobile. It is built to help clinics stay organized and focused on patient care.
                </p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">Contact</h2>
                <p className="mt-3 text-slate-600 leading-7">
                  For technical support, please use the Support page. For other support needs, we will update the contact details soon.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
