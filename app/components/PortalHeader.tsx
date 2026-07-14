"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import HeaderFixer from "./HeaderFixer";

export default function PortalHeader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const header = (
    <header className="site-header">
      <div className="mx-auto flex max-w-7xl items-center justify-center h-full px-4 sm:px-6">
        <Link href="/" className="flex items-center justify-center h-full">
          {/* Header portal intentionally left without logo; logo is shown only in Navbar */}
        </Link>
      </div>

      <HeaderFixer />
    </header>
  );

  if (!mounted) return null;

  return createPortal(header, document.body);
}