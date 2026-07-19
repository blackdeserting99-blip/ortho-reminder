"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pacifico } from "next/font/google";
import { ChevronDown, UserCircle2 } from "lucide-react";

const pacifico = Pacifico({ subsets: ["latin"], weight: "400" });

type AuthUser = {
  id: string;
  name: string | null;
  email: string;
};

export default function Navbar() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        if (!active) return;
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          setUser(null);
        }
      } catch {
        if (active) setUser(null);
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  const initials = useMemo(() => {
    if (!user) return "U";
    const name = user.name?.trim();
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return user.email.slice(0, 2).toUpperCase();
  }, [user]);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <nav className="brand-gradient fixed inset-x-0 top-0 z-[1200] h-18 border-b border-white/30 text-white shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/40 bg-white/20 text-lg font-semibold text-white shadow-sm">
            O
          </div>
          <div className="flex flex-col">
            <span className={`${pacifico.className} text-xl text-white`}>ortho</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/80">assistant</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-2 text-sm text-white/90 sm:flex">
            <span className="font-medium">Powered by</span>
            <span className="font-semibold text-white">OrthoPrime</span>
          </div>

          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-3 rounded-full border border-white/30 bg-white/15 px-3 py-2 shadow-sm transition hover:bg-white/25"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#0f766e]">
                  {initials}
                </div>
                <div className="hidden text-left sm:block">
                  <div className="text-sm font-semibold text-white">{user.name || user.email}</div>
                  <div className="text-xs text-white/80">{user.email}</div>
                </div>
                <ChevronDown size={16} className="text-white/80" />
              </button>

              {open ? (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-teal-100 bg-white p-2 shadow-xl">
                  <div className="rounded-xl bg-[#ecfdf8] px-3 py-3">
                    <div className="text-sm font-semibold text-[#0f766e]">{user.name || user.email}</div>
                    <div className="mt-1 text-xs text-[#0f766e]/80">{user.email}</div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <button type="button" className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-[#ecfdf8] hover:text-[#0f766e]">
                      My Account
                    </button>
                    <button type="button" className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-[#ecfdf8] hover:text-[#0f766e]">
                      Settings
                    </button>
                    <button type="button" onClick={handleLogout} className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50">
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-2 text-sm text-white/90">
              <UserCircle2 size={18} />
              <span>Account</span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
