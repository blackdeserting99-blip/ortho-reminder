import Link from "next/link";
import { getAdminOverview, requireAdmin } from "@/app/lib/admin";

export const dynamic = "force-dynamic";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const overview = await getAdminOverview();

  const cards = [
    { label: "Total doctors", value: overview.totalDoctors },
    { label: "Total patients", value: overview.totalPatients },
    { label: "Total appointments", value: overview.totalAppointments },
    { label: "Active subscriptions", value: overview.activeSubscriptions },
    { label: "Monthly revenue", value: formatMoney(overview.monthlyRevenue) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Doctor Management</h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage account status, subscriptions, and view doctor-level usage insights.
        </p>
        <Link
          href="/admin/doctors"
          className="mt-4 inline-flex rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          Open Doctors Page
        </Link>
      </div>
    </div>
  );
}
