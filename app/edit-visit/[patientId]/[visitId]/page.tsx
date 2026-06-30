"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "../../../components/Sidebar";

type Visit = {
  date: string;
  time: string;

  payment: number;

  visitNotes: string;

  plannedNotes: string;

  upperArch?: string;
  lowerArch?: string;

  elasticEnabled: boolean;
  elasticType: string;
  elasticOther?: string;

  tadsEnabled?: boolean;
  tadsNote?: string;
};

export default function EditVisitPage() {
  const params = useParams();
  const router = useRouter();

  const patientId = params.patientId as string;
  const visitId = Number(params.visitId);

  const [visit, setVisit] =
    useState<Visit | null>(null);

  const [note, setNote] =
    useState("");

  const [payment, setPayment] =
    useState("");

  const [elasticEnabled, setElasticEnabled] =
    useState(false);

  const [elasticType, setElasticType] =
    useState("Class II");

  useEffect(() => {
    const patients = JSON.parse(
      localStorage.getItem("patients") || "[]"
    );

    const patient = patients.find(
      (p: any) =>
        p.id.toString() === patientId
    );

    if (!patient) return;

    const currentVisit =
      patient.visits?.[visitId];

    if (!currentVisit) return;

    setVisit(currentVisit);

    setNote(currentVisit.visitNotes || currentVisit.note || "");

    setPayment(
      currentVisit.payment
        ? currentVisit.payment.toString()
        : ""
    );

    setElasticEnabled(
      currentVisit.elasticEnabled || false
    );

    setElasticType(
      currentVisit.elasticType ||
        "Class II"
    );
  }, [patientId, visitId]);

  const saveVisit = () => {
    const patients = JSON.parse(
      localStorage.getItem("patients") || "[]"
    );

    const updatedPatients =
      patients.map((patient: any) => {

        if (
          patient.id.toString() !== patientId
        ) {
          return patient;
        }

        const visits =
          patient.visits || [];

        const oldPayment =
          visits[visitId]?.payment || 0;

        const newPayment =
          Number(
            payment.replace(/,/g, "")
          ) || 0;

        visits[visitId] = {
          ...visits[visitId],
          visitNotes: note,
          payment: newPayment,
          elasticEnabled,
          elasticType:
            elasticEnabled
              ? elasticType
              : "",
        };

        return {
          ...patient,

          totalPaid:
            (patient.totalPaid || 0) -
            oldPayment +
            newPayment,

          visits,
        };
      });

    localStorage.setItem(
      "patients",
      JSON.stringify(updatedPatients)
    );

    router.push(
      `/patient/${patientId}`
    );
  };

  if (!visit) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 p-8">
          <p>Visit not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-8">

      <h1 className="text-4xl font-bold text-blue-700 mb-8">
        Edit Visit
      </h1>

      <div className="bg-white rounded-xl shadow p-8 text-black">

        <div className="mb-6">
          <strong>Date:</strong>{" "}
          {visit.date}
          <br />
          <strong>Time:</strong>{" "}
          {visit.time}
        </div>

        <div className="mb-6">
          <label className="block mb-2 font-semibold">
            Visit Notes
          </label>

          <textarea
            value={note}
            onChange={(e) =>
              setNote(e.target.value)
            }
            rows={6}
            className="w-full border p-3 rounded"
          />
        </div>

        <div className="mb-6">
          <label className="block mb-2 font-semibold">
            Payment
          </label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={payment}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setPayment(digits);
              }}
              placeholder="0"
              className="flex-1 border p-3 rounded"
            />
            <span className="font-semibold text-slate-700">IQD</span>
          </div>
        </div>

        <div className="mb-6 border-t pt-6">

          <label className="flex items-center gap-3 font-semibold mb-4">

            <input
              type="checkbox"
              checked={elasticEnabled}
              onChange={(e) =>
                setElasticEnabled(
                  e.target.checked
                )
              }
            />

            Patient Using Elastics

          </label>

          {elasticEnabled && (
            <select
              value={elasticType}
              onChange={(e) =>
                setElasticType(
                  e.target.value
                )
              }
              className="w-full border p-3 rounded"
            >
              <option>Class II</option>
              <option>Class III</option>
              <option>Cross</option>
              <option>Box</option>
              <option>Triangle</option>
              <option>Midline</option>
              <option>Vertical</option>
            </select>
          )}

        </div>

        <button
          onClick={saveVisit}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg"
        >
          Save Visit
        </button>

      </div>
    </main>
    </div>
  );
}