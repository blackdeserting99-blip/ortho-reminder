"use client";

import Link from "next/link";
import { Pacifico } from "next/font/google";

const pacifico = Pacifico({ subsets: ["latin"], weight: "400" });

export default function Navbar() {
  return (
    <nav className="bg-teal-700 text-white shadow-lg">
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 96, padding: '12px 12px' }}>
        <div className="text-center">
          <div className="flex items-end justify-center gap-3">
            <span className={`${pacifico.className} leading-none`} style={{ fontSize: 40, color: '#ffffff' }}>
              ortho
            </span>
            <span className="font-extrabold leading-none" style={{ fontSize: 40, color: '#ffffff' }}>assistant</span>
          </div>

          <div className="mt-3 flex items-center justify-center gap-6 text-white/90">
            <div className="h-px bg-white/30" style={{ width: 220 }} />
            <div className="flex items-center gap-3 tracking-widest" style={{ fontSize: 12 }}>
              <span style={{ letterSpacing: '0.32em', textTransform: 'uppercase' }}>powered by</span>
              <span className={pacifico.className} style={{ fontSize: 32, textTransform: 'none' }}>ortho</span>
              <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase' }}>prime</span>
            </div>
            <div className="h-px bg-white/30" style={{ width: 220 }} />
          </div>
        </div>
      </div>
    </nav>
  );
}
