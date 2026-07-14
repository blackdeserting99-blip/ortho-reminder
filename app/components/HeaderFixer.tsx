"use client";

import { useEffect } from "react";

export default function HeaderFixer() {
  useEffect(() => {
    const apply = () => {
      const el = document.querySelector(".site-header") as HTMLElement | null;
      if (!el) return;
      el.style.position = "fixed";
      el.style.top = "0";
      el.style.left = "0";
      el.style.width = "100%";
      el.style.zIndex = "9999";
      el.style.height = el.style.height || "80px";
    };

    apply();
    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  return null;
}
