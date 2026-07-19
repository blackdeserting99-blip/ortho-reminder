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

  const restorePatient = async (id: number) => {
    try {
      const response = await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseStatus: "active" }),
      });
      if (!response.ok) {
        throw new Error("Restore failed");
      }
      router.push(`/patients/${id}`);
    } catch {
      // keep current behavior on failure
    }
  };

  useEffect(() => {
    const loadArchivedPatients = async () => {
      try {
        const response = await fetch("/api/patients", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load patients");
        }
        const savedPatients = await response.json();
        const archivedPatients = savedPatients.filter((p: Patient) => p.caseStatus === "archived");
        setPatients(archivedPatients);
      } catch {
        setPatients([]);
      }
    };

    loadArchivedPatients();
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
                      href={`/patients/${patient.id}`}
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
