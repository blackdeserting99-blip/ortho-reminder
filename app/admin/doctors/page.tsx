import Link from "next/link";
import { getAdminDoctors, requireAdmin } from "@/app/lib/admin";
import { DoctorRowActions } from "@/app/admin/components/DoctorRowActions";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default async function AdminDoctorsPage() {
  await requireAdmin();
  const doctors = await getAdminDoctors();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Doctors</h2>
        <span className="text-sm text-gray-500">{doctors.length} accounts</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="px-3 py-2">Doctor</th>
              <th className="px-3 py-2">Clinic</th>
              <th className="px-3 py-2">Registered</th>
              <th className="px-3 py-2">Patients</th>
              <th className="px-3 py-2">Appointments</th>
              <th className="px-3 py-2">Subscription</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {doctors.map((doctor) => (
              <tr key={doctor.id}>
                <td className="px-3 py-3">
                  <p className="font-medium text-gray-900">{doctor.name || "Unnamed Doctor"}</p>
                  <p className="text-xs text-gray-500">{doctor.email}</p>
                </td>
                <td className="px-3 py-3 text-gray-700">{doctor.clinicName || "-"}</td>
                <td className="px-3 py-3 text-gray-700">{formatDate(doctor.createdAt)}</td>
                <td className="px-3 py-3 text-gray-700">{doctor.patientCount}</td>
                <td className="px-3 py-3 text-gray-700">{doctor.appointmentCount}</td>
                <td className="px-3 py-3 text-gray-700">{doctor.subscriptionStatus}</td>
                <td className="px-3 py-3">
                  <span className={doctor.isDisabled ? "rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700" : "rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700"}>
                    {doctor.isDisabled ? "DISABLED" : "ACTIVE"}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/doctors/${doctor.id}`}
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      View
                    </Link>
                    <DoctorRowActions doctorId={doctor.id} isDisabled={doctor.isDisabled} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
