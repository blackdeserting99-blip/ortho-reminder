"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Users,
  Calendar,
  Archive,
  HelpCircle,
  Info,
  Repeat,
  Menu,
  X,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname() || "";
  const [isOpen, setIsOpen] = useState(false);

  const closeSidebar = () => setIsOpen(false);
  const toggleSidebar = () => setIsOpen((prev) => !prev);

  const linkClass = (href: string) => {
    const isPatientRoute = /^\/patient(\/|$)/.test(pathname || "");
    const isActive =
      pathname === href ||
      pathname.startsWith(href + "/") ||
      (href === "/patients" && isPatientRoute);

    return `group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
      isActive
        ? "bg-white/25 text-white shadow-[0_10px_30px_rgba(15,23,42,0.12)] ring-1 ring-white/30"
        : "text-white/85 hover:bg-white/15 hover:text-white"
    }`;
  };

  const menuItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/patients", label: "Patients", icon: Users },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/retainers", label: "Retainers", icon: Repeat },
    { href: "/finished-cases", label: "Finished Cases", icon: Calendar },
    { href: "/archive", label: "Archive", icon: Archive },
    { href: "/support", label: "Support", icon: HelpCircle },
    { href: "/about", label: "About", icon: Info },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 transition-opacity duration-200 md:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSidebar}
      />

      <aside
        className={`brand-gradient fixed left-0 top-0 z-[10000] h-[100dvh] w-72 max-w-[80vw] border-r border-white/30 text-white shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/25 px-4 py-4">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/85">Navigation</div>
          <button
            type="button"
            onClick={closeSidebar}
            className="rounded-2xl bg-white/15 p-2 text-white transition hover:bg-white/25"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex flex-col gap-2 px-3 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={closeSidebar} className={`${linkClass(item.href)} justify-start`}>
                <Icon size={18} className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <aside className="brand-gradient fixed bottom-0 left-0 right-0 z-[10000] flex h-16 w-full items-center gap-2 overflow-x-auto border-t border-white/30 px-2 text-white shadow-2xl backdrop-blur-xl md:hidden">
        <button
          type="button"
          onClick={toggleSidebar}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white transition hover:bg-white/25"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <nav className="flex flex-1 items-center gap-2 overflow-x-auto py-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white transition hover:bg-white/25" aria-label={item.label}>
                <Icon size={18} />
              </Link>
            );
          })}
        </nav>
      </aside>

      <aside className="brand-gradient group fixed left-0 top-18 z-[1000] hidden h-[calc(100dvh-4.5rem)] w-20 border-r border-white/30 text-white shadow-[0_0_40px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-300 ease-in-out hover:w-64 md:flex md:flex-col">
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-4 rounded-2xl border border-white/25 bg-white/15 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">
            Workspace
          </div>
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={`${linkClass(item.href)} overflow-hidden`}>
                  <Icon size={18} className="shrink-0" />
                  <span className="truncate transition-all duration-300 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
