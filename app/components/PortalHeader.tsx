"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import HeaderFixer from "./HeaderFixer";
import { Satisfy, Poppins } from "next/font/google";
const satisfy = Satisfy({
  subsets: ["latin"],
  weight: "400",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: "700",
});

export default function PortalHeader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const header = (
    <header className="site-header">
      <div className="mx-auto flex max-w-7xl items-center justify-center h-full px-4 sm:px-6">
        <div className="logo-wrapper">
          <div className="logo-badge">
            <span className={`logo-ortho ${satisfy.className}`}>
              ortho
            </span>

            <span className={`logo-prime ${poppins.className}`}>
              prime
            </span>
          </div>
        </div>
      </div>

      <HeaderFixer />
    </header>
  );

  if (!mounted) return null;

  return createPortal(header, document.body);
}