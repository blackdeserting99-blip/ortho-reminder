"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "../components/Sidebar";

type Patient = {
  id: number;
  name: string;
  phone: string;
  treatment: string;
  appointmentDate: string;
  appointmentTime?: string;

  caseStatus?:
    | "active"
    | "retainer"
    | "finished"
    | "cancelled"
    | "archived";
};

export default function ArchivePage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const router = useRouter();

  const restorePatient = (id: number) => {
    const allPatients = JSON.parse(localStorage.getItem("patients") || "[]");

    const updatedPatients = allPatients.map((p: any) => {
      if (p.id !== id) return p;
      const restoredStatus = p.previousCaseStatus || "active";
      const updated = { ...p, caseStatus: restoredStatus } as any;
      if (updated.previousCaseStatus) delete updated.previousCaseStatus;
      return updated;
    });

    localStorage.setItem("patients", JSON.stringify(updatedPatients));

    // Refresh archive list
    setPatients(updatedPatients.filter((p: any) => p.caseStatus === "archived"));

    // Navigate to restored patient's profile so user sees the correct status
    router.push(`/patient/${id}`);
  };
  useEffect(() => {
    const savedPatients = JSON.parse(
      localStorage.getItem("patients") || "[]"
    );

    const archivedPatients = savedPatients.filter(
      (p: Patient) =>
        p.caseStatus === "archived"
    );

    setPatients(archivedPatients);
  }, []);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 w-full">
      <h1 className="text-4xl font-bold text-gray-700 mb-8">
        Archived Records
      </h1>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {patients.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No archived records.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-black">

            <thead>
              <tr className="border-b bg-gray-100">
                <th className="p-4 text-left">
                  Patient
                </th>

                <th className="p-4 text-left">
                  Treatment
                </th>

                <th className="p-4 text-left">
                  Status
                </th>

                <th className="p-4 text-left">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>

              {patients.map((patient) => (
                <tr
                  key={patient.id}
                  className="border-b"
                >
                  <td className="p-4">
                    {patient.name}
                  </td>

                  <td className="p-4">
                    {patient.treatment}
                  </td>

                  <td className="p-4">
                    📦 Archived
                  </td>

                  <td className="p-4">

                    <Link
                      href={`/patient/${patient.id}`}
                      className="bg-teal-600 text-white px-3 py-1 rounded"
                    >
                      View Record
                    </Link>
                    <button
                      onClick={() =>
                        restorePatient(patient.id)
                      }
                      className="bg-green-600 text-white px-3 py-1 rounded ml-2"
                    >
                      Restore Record
                    </button>
                  </td>
                </tr>
              ))}

            </tbody>

            </table>
          </div>
        )}

      </div>
    </main>
    </div>
  );
}
