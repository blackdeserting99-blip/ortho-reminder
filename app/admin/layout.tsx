import Link from "next/link";
import { requireAdmin } from "@/app/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-7xl p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">Owner Controls</p>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin" className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Overview
          </Link>
          <Link href="/admin/doctors" className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Doctors
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
