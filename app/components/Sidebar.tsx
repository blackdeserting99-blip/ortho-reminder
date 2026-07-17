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
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const closeSidebar = () => setIsOpen(false);
  const toggleSidebar = () => setIsOpen((prev) => !prev);

  const linkClass = (href: string) => {
    const isPatientRoute = /^\/patient(\/|$)/.test(pathname || "");
    const isActive =
      pathname === href ||
      pathname.startsWith(href + "/") ||
      (href === "/patients" && isPatientRoute);

    return `flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 ${
      isActive
        ? "bg-white/90 text-cyan-900 shadow-sm"
        : "text-white/90 hover:text-white hover:bg-white/15"
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
        className={`fixed top-0 left-0 z-[10000] h-[100dvh] w-72 max-w-[80vw] bg-[linear-gradient(135deg,_#0f766e_0%,_#14b8a6_45%,_#2dd4bf_100%)] text-white shadow-2xl transform transition-transform duration-300 ease-in-out border-r border-teal-200/60 overflow-hidden md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-3 w-full bg-[linear-gradient(90deg,_rgba(255,255,255,0.18),_rgba(255,255,255,0.02),_rgba(255,255,255,0.18))]" />
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/15">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/90">Navigation</div>
          <button
            type="button"
            onClick={closeSidebar}
            className="rounded-2xl bg-white/10 p-2 text-white hover:bg-white/20 transition"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 flex flex-col gap-2 px-3 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={`${linkClass(item.href)} justify-start`}
              >
                <Icon size={18} className="shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <aside className="fixed bottom-0 left-0 right-0 z-[10000] h-16 w-full bg-[linear-gradient(135deg,_#0f766e_0%,_#14b8a6_45%,_#2dd4bf_100%)] text-white shadow-2xl flex items-center gap-2 px-2 border-t border-teal-200/60 overflow-x-auto md:hidden">
        <button
          type="button"
          onClick={toggleSidebar}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/20 transition"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <nav className="flex flex-1 items-center gap-2 overflow-x-auto py-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/20 transition"
                aria-label={item.label}
              >
                <Icon size={18} />
              </Link>
            );
          })}
        </nav>
      </aside>

      <aside className="hidden md:group md:fixed md:top-20 md:left-0 md:h-[calc(100%-5rem)] md:w-20 md:hover:w-72 bg-[linear-gradient(135deg,_#0f766e_0%,_#14b8a6_45%,_#2dd4bf_100%)] text-white shadow-2xl flex flex-col md:flex-col border-b border-teal-200/60 md:border-b-0 md:border-r overflow-hidden transition-[width] duration-300 ease-in-out">
        <div className="h-3 md:h-4 w-full bg-[linear-gradient(90deg,_rgba(255,255,255,0.18),_rgba(255,255,255,0.02),_rgba(255,255,255,0.18))]" />

        <div className="hidden md:flex items-center justify-center py-5">
          <Link href="/" className="flex items-center justify-center w-full">
            <div className="w-full max-w-[220px]">
              {/* Logo removed from sidebar per request; Navbar now contains the logo */}
            </div>
          </Link>
        </div>

        <nav className="flex-1 flex md:flex-col flex-row items-center md:items-start px-2 md:px-3 py-2 md:py-3 gap-1.5 overflow-x-auto md:overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`${linkClass(item.href)} justify-center md:justify-start`}>
                <Icon size={18} className="shrink-0" />
                <span className="inline-flex transition-opacity duration-150 ease-in-out text-sm font-medium ml-2">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
