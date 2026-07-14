"use client";

import { Pacifico } from "next/font/google";

const pacifico = Pacifico({
  weight: ["400"],
  subsets: ["latin"],
});

export default function Logo() {
  return (
    <div className="logo-wrapper" aria-hidden={false}>
      <svg viewBox="0 0 320 80" className="logo-svg" aria-label="Ortho Prime logo" role="img">
        <defs>
          <clipPath id="logoClip">
            <rect x="0" y="0" width="320" height="80" rx="8" />
          </clipPath>
        </defs>

        {/* Hand-traced path for 'ortho' (single continuous stroke) */}
        <g clipPath="url(#logoClip)">
          <path
            id="ortho-path"
            className="logo-path"
            d="M10 50 C18 14, 46 12, 60 48 C66 64, 86 60, 94 46 C102 32, 126 30, 138 46 C144 58, 158 66, 176 50"
            fill="none"
          />

          {/* small flourish to complete the 'o' ending */}
          <path
            d="M176 50 C182 42, 190 42, 196 48"
            className="logo-path"
            fill="none"
          />

          {/* 'prime' text placed closer to the traced 'ortho' */}
          <text x="198" y="52" className="logo-prime" style={{ fontFamily: "Inter, Arial, sans-serif", fontSize: 36, fontWeight: 700 }}>prime</text>
        </g>
      </svg>
    </div>
  );
}
