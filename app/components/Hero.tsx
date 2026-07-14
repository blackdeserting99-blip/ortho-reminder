"use client";

import Image from "next/image";

export default function Hero() {
  return (
    <section className="mb-6">
      <div className="rounded-[1.25rem] overflow-hidden border border-slate-200 bg-white/5 shadow-lg">
        <div className="relative bg-gradient-to-r from-teal-400 via-teal-500 to-slate-900 p-6 md:p-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-center">
              <div className="relative flex items-center justify-center w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] bg-gradient-to-b from-[#1caea9] via-[#0fa2a0] to-[#134a4f] shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03),transparent_40%)]" />

                <div className="z-10 w-64 sm:w-80">
                  <Image
                    src="/logo.png"
                    alt="Ortho Assistant"
                    width={720}
                    height={360}
                    className="w-full h-auto object-contain"
                    priority
                  />
                </div>

                <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-6 text-white/85 z-10">
                  <div className="hidden sm:block h-px bg-white/30 w-24" />
                  <div className="text-xs tracking-widest uppercase flex items-center gap-2 text-white/80">
                    <span className="text-[10px]">POWERED BY</span>
                    <span className="italic font-medium">orthoprime</span>
                  </div>
                  <div className="hidden sm:block h-px bg-white/30 w-24" />
                </div>
              </div>
            </div>

            <p className="mt-8 text-center text-white/85 max-w-3xl mx-auto px-4">
              Practice-ready patient tracking, appointments and retention tools — now styled to match your brand.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
