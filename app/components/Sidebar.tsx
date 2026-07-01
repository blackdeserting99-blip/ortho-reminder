"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Calendar,
  Archive,
  HelpCircle,
  Info,
  Repeat,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-3xl transition-all duration-200 ${
      pathname === href || pathname.startsWith(href + "/")
        ? "bg-white/10 text-white shadow-sm"
        : "text-slate-300 hover:text-white hover:bg-slate-800/80"
    }`;

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
    <aside className="group fixed bottom-0 left-0 right-0 h-16 z-50 w-full md:sticky md:top-0 md:h-screen md:w-20 md:hover:w-72 md:self-start bg-slate-950 text-white shadow-2xl flex flex-col md:flex-col border-b border-slate-900 md:border-b-0 md:border-r overflow-hidden transition-[width] duration-300 ease-in-out">
      <div className="hidden md:block p-4 md:p-6 border-b border-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-blue-500 text-2xl shadow-lg">
            🦷
          </div>
          <div className="hidden md:block h-12 overflow-hidden">
            <div className="h-full max-w-0 group-hover:max-w-[180px] transition-[max-width] duration-300 ease-in-out opacity-0 group-hover:opacity-100 overflow-hidden">
              <h1 className="text-2xl font-semibold tracking-tight">Ortho Practice</h1>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 flex md:flex-col flex-row items-center md:items-start px-2 md:px-4 py-2 md:py-5 gap-2 overflow-x-auto md:overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`${linkClass(item.href)} justify-center md:justify-start`}>
              <Icon size={18} className="shrink-0" />
              <span className="hidden md:inline-flex opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out text-sm font-medium ml-2">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}