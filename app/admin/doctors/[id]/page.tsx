import { notFound } from "next/navigation";
import { getAdminDoctorById, requireAdmin } from "@/app/lib/admin";
import { DoctorDeleteButton } from "@/app/admin/components/DoctorDeleteButton";
import { DoctorSubscriptionForm } from "@/app/admin/components/DoctorSubscriptionForm";
import { DoctorRowActions } from "@/app/admin/components/DoctorRowActions";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default async function AdminDoctorDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const details = await getAdminDoctorById(id);

  if (!details) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Doctor Details</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <p><span className="font-medium text-gray-700">Name:</span> {details.doctor.name || "Unnamed Doctor"}</p>
          <p><span className="font-medium text-gray-700">Email:</span> {details.doctor.email}</p>
          <p><span className="font-medium text-gray-700">Clinic:</span> {details.doctor.clinicName || "-"}</p>
          <p><span className="font-medium text-gray-700">Registered:</span> {formatDate(details.doctor.createdAt)}</p>
          <p><span className="font-medium text-gray-700">Status:</span> {details.doctor.isDisabled ? "DISABLED" : "ACTIVE"}</p>
          <p><span className="font-medium text-gray-700">Subscription:</span> {details.doctor.subscriptionStatus}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <DoctorRowActions doctorId={details.doctor.id} isDisabled={details.doctor.isDisabled} />
          <DoctorDeleteButton doctorId={details.doctor.id} />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">Usage</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
          <p><span className="font-medium text-gray-700">Total patients:</span> {details.doctor.patientCount}</p>
          <p><span className="font-medium text-gray-700">Total visits:</span> {details.totalVisits}</p>
          <p><span className="font-medium text-gray-700">Upcoming appointments:</span> {details.upcomingAppointments}</p>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">Subscription</h3>
        <DoctorSubscriptionForm doctorId={details.doctor.id} currentStatus={details.doctor.subscriptionStatus} />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">Patients</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Treatment</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {details.patients.map((patient) => (
                <tr key={patient.id}>
                  <td className="px-3 py-3 font-medium text-gray-900">{patient.name}</td>
                  <td className="px-3 py-3 text-gray-700">{patient.treatmentCategory || "-"}</td>
                  <td className="px-3 py-3 text-gray-700">{formatDate(patient.createdAt)}</td>
                </tr>
              ))}
              {details.patients.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-gray-500" colSpan={3}>No patients found for this doctor.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
