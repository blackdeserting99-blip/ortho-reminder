"use client";

import Link from "next/link";
import { Pacifico } from "next/font/google";

const pacifico = Pacifico({ subsets: ["latin"], weight: "400" });

export default function Navbar() {
  return (
    <nav className="bg-teal-700 text-white shadow-lg overflow-hidden overflow-x-hidden">
      <div className="flex flex-col items-center justify-center min-w-0 w-full" style={{ minHeight: 96, padding: '12px 12px' }}>
        <div className="text-center w-full max-w-full min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-end justify-center gap-3 w-full max-w-full min-w-0 overflow-hidden">
            <span className={`${pacifico.className} leading-none min-w-0`} style={{ fontSize: 40, color: '#ffffff' }}>
              ortho
            </span>
            <span className="font-extrabold leading-none min-w-0" style={{ fontSize: 40, color: '#ffffff' }}>assistant</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-6 text-white/90 w-full max-w-full min-w-0 overflow-hidden" style={{ fontSize: 12 }}>
            <div className="h-px bg-white/30 flex-1 min-w-[40px] max-w-[120px]" />
            <div className="flex flex-wrap items-center justify-center gap-2 tracking-widest w-full max-w-full min-w-0 overflow-hidden" style={{ fontSize: 12 }}>
              <span className="truncate min-w-0" style={{ letterSpacing: '0.32em', textTransform: 'uppercase' }}>powered by</span>
              <span className={`${pacifico.className} min-w-0`} style={{ fontSize: 32, textTransform: 'none' }}>ortho</span>
              <span className="truncate min-w-0" style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase' }}>prime</span>
            </div>
            <div className="h-px bg-white/30 flex-1 min-w-[40px] max-w-[120px]" />
          </div>
        </div>
      </div>
    </nav>
  );
}
