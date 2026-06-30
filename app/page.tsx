"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "./components/Sidebar";
import { formatDateDMY } from "./lib/date";

type Patient = {
        id: number;
        name: string;
        phone: string;
        treatment: string;
        bracketType?: string;
        appointmentDate: string;
        appointmentTime?: string;

        totalFee?: number;
        totalPaid?: number;
        visits?: any[];
      };

      export default function Home() {
        const [patientCount, setPatientCount] = useState(0);
        const [todayPatients, setTodayPatients] =
          useState<Patient[]>([]);
      const [overduePatients, setOverduePatients] =
        useState<Patient[]>([]);

      const [showToday, setShowToday] =
        useState(true);
      const [upcomingPatients, setUpcomingPatients] =
        useState<Patient[]>([]);

      const [upcomingMode, setUpcomingMode] =
        useState<"3 Days" | "7 Days" | "15 Days" | "30 Days" | "Manual">(
          "7 Days"
        );
      const [upcomingDateSearch, setUpcomingDateSearch] =
        useState("");
      const [todayNotesSearch, setTodayNotesSearch] =
        useState("");
      const [upcomingNotesSearch, setUpcomingNotesSearch] =
        useState("");
      const [overdueNotesSearch, setOverdueNotesSearch] =
        useState("");
      useEffect(() => {
        const patients = JSON.parse(
          localStorage.getItem("patients") || "[]"
        );

        setPatientCount(
          patients.filter(
            (p: any) =>
              p.caseStatus !== "archived" &&
              p.caseStatus !== "finished" &&
              p.caseStatus !== "retainer"
          ).length
        );

        const today =
          new Date().toLocaleDateString("en-CA");

        const todaysAppointments = patients
          .filter(
            (patient: any) =>
              patient.appointmentDate === today &&
              patient.appointmentStatus !==
                "cancelled" &&
              patient.caseStatus !== "archived" &&
              patient.caseStatus !== "finished" &&
              patient.caseStatus !== "retainer"
          )
          .sort((a: any, b: any) =>
            (a.appointmentTime || "").localeCompare(
              b.appointmentTime || ""
            )
          );

        const overdueAppointments = patients
          .filter(
            (patient: any) =>
              patient.appointmentDate &&
              patient.appointmentDate < today &&
              patient.appointmentStatus !==
                "cancelled" &&
              patient.caseStatus !== "archived" &&
              patient.caseStatus !== "finished" &&
              patient.caseStatus !== "retainer"
          )
          .sort((a: any, b: any) =>
            a.appointmentDate.localeCompare(
              b.appointmentDate
            )
          );

    const upcomingAppointments = patients
      .filter((patient: any) => {
        if (
          !patient.appointmentDate ||
          patient.appointmentStatus === "cancelled" ||
          patient.caseStatus === "archived" ||
          patient.caseStatus === "finished" ||
          patient.caseStatus === "retainer"
        ) {
          return false;
        }

        const appointment = new Date(
          patient.appointmentDate
        );

        const todayDate = new Date(today);

        const diffDays = Math.ceil(
          (appointment.getTime() -
            todayDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (upcomingMode === "Manual") {
          return diffDays > 0;
        }

        const maxDays = parseInt(upcomingMode);

        return diffDays > 0 && diffDays <= maxDays;
      })
      .sort((a: any, b: any) =>
        a.appointmentDate.localeCompare(
          b.appointmentDate
        )
      );
      setTodayPatients(todaysAppointments);
      setOverduePatients(overdueAppointments);
      setUpcomingPatients(upcomingAppointments);
      }, [upcomingMode]);

      const noteMatches = (patient: any, query: string) => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return true;

        const patientNotes = (patient.notes || "").toLowerCase();
        if (patientNotes.includes(normalized)) return true;

        const initialPlannedNotes = (patient.plannedNotes || "").toLowerCase();
        if (initialPlannedNotes.includes(normalized)) return true;

        return (patient.visits || []).some((visit: any) => {
          const visitNotes = (visit.visitNotes || "").toLowerCase();
          const plannedNotes = (visit.plannedNotes || "").toLowerCase();
          return (
            visitNotes.includes(normalized) ||
            plannedNotes.includes(normalized)
          );
        });
      };

      const getInitialPlannedNotes = (patient: any) =>
        !patient.visits?.length ? patient.plannedNotes || "" : "";

      const getLatestPlannedNotes = (patient: any) => {
        const latestVisit = getLatestVisit(patient);
        return latestVisit.plannedNotes || getInitialPlannedNotes(patient);
      };

      const filteredTodayPatients = todayNotesSearch.trim()
        ? todayPatients.filter((patient) => noteMatches(patient, todayNotesSearch))
        : todayPatients;

      const filteredUpcomingPatients = upcomingPatients.filter((patient) => {
        const matchesDate = upcomingMode === "Manual" && upcomingDateSearch.trim()
          ? patient.appointmentDate === upcomingDateSearch.trim()
          : true;
        const matchesNotes = upcomingNotesSearch.trim()
          ? noteMatches(patient, upcomingNotesSearch)
          : true;
        return matchesDate && matchesNotes;
      });

      const filteredOverduePatients = overdueNotesSearch.trim()
        ? overduePatients.filter((patient) => noteMatches(patient, overdueNotesSearch))
        : overduePatients;

      const formatTreatment = (patient: any) => {
        if (patient.treatment === "Fixed Braces" && patient.bracketType) {
          return `Fixed Braces (${patient.bracketType})`;
        }
        return patient.treatment;
      };

      const getLatestVisit = (patient: any) =>
        patient.visits?.[patient.visits.length - 1] || {};

 return (
  <div className="min-h-screen flex flex-col md:flex-row">

    <Sidebar />

    <main className="flex-1 min-h-screen bg-gray-100 p-6 md:p-8 text-black">
        

<div className="mb-10">
  <h1 className="text-3xl font-bold text-gray-900">
    Practice Overview
  </h1>

  <p className="text-gray-500 mt-2">
    Review the current patient schedule and upcoming activity.
  </p>
</div>
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
  <Link
  href="/patients"
  className="bg-white p-6 rounded-2xl shadow-sm block hover:bg-gray-50 transition"
>
  <div className="flex items-center gap-3 mb-4">
    <div className="text-3xl">👥</div>

    <div>
      <h2 className="font-semibold">
        Patients
      </h2>

      <p className="text-sm text-gray-500">
        Total patients
      </p>
    </div>
  </div>

  <p className="text-5xl font-bold text-blue-700">
    {patientCount}
  </p>
  </Link>
              <div className="bg-white p-6 rounded-2xl shadow-sm">
         <div className="flex items-center gap-3 mb-3">
  <div className="text-3xl">📅</div>

  <div>
<h2 className="text-xl font-semibold text-gray-900">
      Today
    </h2>

<p className="text-sm text-gray-500 mt-1">
        Scheduled today
    </p>
  </div>
</div>
                <p className="text-5xl font-bold mt-1 text-blue-700">
                  {todayPatients.length}
                </p>
              </div>
<div className="bg-white p-6 rounded-2xl shadow-sm">
  <div className="flex items-center gap-3 mb-3">
<div className="text-3xl">⏳</div>
    <div>
<h2 className="text-xl font-semibold text-gray-900">
          Upcoming
      </h2>

<p className="text-sm text-gray-500 mt-1">
          {upcomingMode === "Manual" ? "Manual date search" : `Next ${upcomingMode}`}
      </p>
    </div>
  </div>

  <p className="text-5xl font-bold text-orange-600">
    {upcomingPatients.length}
  </p>
</div>
    <div className="bg-white p-6 rounded-2xl shadow-sm">
  <div className="flex items-center gap-3 mb-3">
<div className="text-3xl">🚨</div>
    <div>
<h2 className="text-xl font-semibold text-gray-900">    
      Overdue
      </h2>

<p className="text-sm text-gray-500 mt-1">
  Overdue visits
      </p>
    </div>
  </div>

  <p className="text-5xl font-bold text-red-600">
    {overduePatients.length}
  </p>
</div>

            </div>
<div className="space-y-8">
<div className="bg-white rounded-2xl shadow-sm p-6">
    <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
  <div className="text-3xl">📅</div>

  <div>
    <h2 className="text-xl font-semibold text-gray-900">
      Today
    </h2>

    <p className="text-sm text-gray-500 mt-1">
      Appointments scheduled today
    </p>
  </div>
</div>
  <span className="bg-blue-100 text-blue-600 px-3 py-2 rounded-full text-base font-bold">
    {todayPatients.length}
  </span>
</div>
      {showToday && (
          <>
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Search today notes
              </label>
              <input
                type="text"
                value={todayNotesSearch}
                onChange={(e) => setTodayNotesSearch(e.target.value)}
                placeholder="Search notes only"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {todayPatients.length === 0 ? (
              <div className="border border-gray-200 rounded-2xl py-10 text-center">
                <div className="text-7xl mb-4">📅</div>
                <h3 className="text-xl font-semibold text-gray-800">
                  No Appointments Today
                </h3>
                <p className="text-gray-500 mt-2">
                  No patients scheduled for today.
                </p>
              </div>
            ) : filteredTodayPatients.length === 0 ? (
              <div className="border border-gray-200 rounded-2xl py-10 text-center">
                <div className="text-7xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-800">
                  No Matching Today Appointments
                </h3>
                <p className="text-gray-500 mt-2">
                  No today appointments match "{todayNotesSearch}".
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full min-w-[900px] divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4">Patient</th>
                      <th className="text-left py-3 px-4">Next Appointment</th>
                      <th className="text-left py-3 px-4">Treatment</th>
                      <th className="text-left py-3 px-4">Planned Treatment</th>
                      <th className="text-left py-3 px-4">Fee</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTodayPatients.map((patient) => {
                      const latestVisit = patient.visits?.at(-1) || {};
                      const plannedNotes = getLatestPlannedNotes(patient);
                      return (
                        <tr key={patient.id} className="hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <Link
                              href={`/patient/${patient.id}`}
                              className="font-semibold text-gray-900 hover:text-blue-600"
                            >
                              {patient.name}
                            </Link>
                            <div className="text-sm text-gray-500 mt-1">📞 {patient.phone}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-gray-900">
                              {formatDateDMY(patient.appointmentDate)} • {patient.appointmentTime || "-"}
                            </div>
                          </td>
                          <td className="py-4 px-4">{formatTreatment(patient)}</td>
                          <td className="py-4 px-4">
                            <div className="space-y-1 text-sm text-gray-700">
                              {(latestVisit.plannedUpperArch || latestVisit.plannedLowerArch) && (
                                <div>
                                  Wire: U{latestVisit.plannedUpperArch || "-"} L{latestVisit.plannedLowerArch || "-"}
                                </div>
                              )}
                              {latestVisit.plannedElasticType && (
                                <div>Elastic: {latestVisit.plannedElasticType}</div>
                              )}
                              {latestVisit.plannedTadsNote && (
                                <div>Tads: {latestVisit.plannedTadsNote}</div>
                              )}
                              {plannedNotes && <div>{plannedNotes}</div>}
                              {!latestVisit.plannedUpperArch && !latestVisit.plannedLowerArch && !latestVisit.plannedElasticType && !latestVisit.plannedTadsNote && !plannedNotes && (
                                <div className="text-gray-500">No future plan recorded</div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-green-700">
                              {(patient.totalPaid || 0).toLocaleString()} IQD
                            </div>
                            <div className="text-sm text-gray-500">
                              / {patient.totalFee ? `${patient.totalFee.toLocaleString()} IQD` : "Not Set"}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                              Today
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2 flex-wrap">
                              <Link
                                href={`/new-appointment/${patient.id}`}
                                className="bg-green-100 text-green-700 px-3 py-2 rounded-lg hover:bg-green-200 text-sm"
                              >
                                ✓
                              </Link>
                              <Link
                                href={`/missed-appointment/${patient.id}`}
                                className="bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200 text-sm"
                              >
                                ✗
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
      )}

            </div>
           <div className="bg-white rounded-2xl shadow-sm p-6">
   <div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-3 mb-3">
<div className="text-3xl">⏳</div>
  <div>
<h2 className="text-xl font-semibold text-gray-900">
        Upcoming
    </h2>

<p className="text-sm text-gray-500 mt-1">
        {upcomingMode === "Manual" ? "Manual date search" : `Next ${upcomingMode}`}
    </p>
  </div>
</div>

  <span className="bg-orange-100 text-orange-600 px-3 py-2 rounded-full text-base font-bold">
    {upcomingPatients.length}
  </span>
</div>

<p className="text-sm text-gray-500 mt-1">
    {upcomingMode === "Manual"
      ? "Select a specific date to filter upcoming patients."
      : `Showing upcoming appointments over ${upcomingMode.toLowerCase()}.`}  </p>
<div className="flex gap-2 mt-4 flex-wrap">
    {["3 Days", "7 Days", "15 Days", "30 Days", "Manual"].map((mode) => (
      <button
        key={mode}
        onClick={() => {
          setUpcomingMode(mode as any);
          if (mode !== "Manual") {
            setUpcomingDateSearch("");
          }
        }}
        className={`px-4 py-2 rounded-lg text-sm border transition ${
          upcomingMode === mode
            ? "bg-orange-50 border-orange-300 text-orange-600"
            : "bg-white border-gray-200 text-gray-600"
        }`}
      >
        {mode}
      </button>
    ))}
  </div>

  <div className="mt-6 grid gap-4 sm:grid-cols-2">
    {upcomingMode === "Manual" && (
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Search upcoming by date
        </label>
        <input
          type="date"
          value={upcomingDateSearch}
          onChange={(e) => setUpcomingDateSearch(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm focus:border-orange-300 focus:ring-2 focus:ring-orange-200"
        />
      </div>
    )}
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        Search upcoming notes
      </label>
      <input
        type="text"
        value={upcomingNotesSearch}
        onChange={(e) => setUpcomingNotesSearch(e.target.value)}
        placeholder="Search notes only"
        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm focus:border-orange-300 focus:ring-2 focus:ring-orange-200"
      />
    </div>
  </div>

            {upcomingPatients.length === 0 ? (
          <div className="border border-gray-200 rounded-2xl py-10 text-center mt-4">
<div className="text-7xl mb-4">📅</div>
  <h3 className="text-xl font-semibold text-gray-800">
    No Upcoming Appointments
  </h3>

  <p className="text-gray-500 mt-2">
    {upcomingMode === "Manual"
      ? "No upcoming appointments match the manual date filter."
      : `No appointments scheduled in the next ${upcomingMode.toLowerCase()}.`}
  </p>
</div>
            ) : filteredUpcomingPatients.length === 0 ? (
              <div className="border border-gray-200 rounded-2xl py-10 text-center mt-4">
                <div className="text-7xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-800">
                  No Matching Upcoming Appointments
                </h3>
                <p className="text-gray-500 mt-2">
                  No upcoming appointments match "{upcomingDateSearch || upcomingNotesSearch}".
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full min-w-[900px] divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-orange-50">
                      <th className="text-left py-3 px-4">Patient</th>
                      <th className="text-left py-3 px-4">Next Appointment</th>
                      <th className="text-left py-3 px-4">Treatment</th>
                      <th className="text-left py-3 px-4">Planned Treatment</th>
                      <th className="text-left py-3 px-4">Fee</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUpcomingPatients.map((patient) => {
                      const latestVisit = patient.visits?.at(-1) || {};
                      const plannedNotes = getLatestPlannedNotes(patient);
                      return (
                        <tr key={patient.id} className="hover:bg-orange-50/50">
                          <td className="py-4 px-4">
                            <Link
                              href={`/patient/${patient.id}`}
                              className="font-semibold text-gray-900 hover:text-blue-600"
                            >
                              {patient.name}
                            </Link>
                            <div className="text-sm text-gray-500 mt-1">📞 {patient.phone}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-gray-900">
                              {formatDateDMY(patient.appointmentDate)} • {patient.appointmentTime || "-"}
                            </div>
                          </td>
                          <td className="py-4 px-4">{formatTreatment(patient)}</td>
                          <td className="py-4 px-4">
                            <div className="space-y-1 text-sm text-gray-700">
                              {(latestVisit.plannedUpperArch || latestVisit.plannedLowerArch) && (
                                <div>
                                  Wire: U{latestVisit.plannedUpperArch || "-"} L{latestVisit.plannedLowerArch || "-"}
                                </div>
                              )}
                              {latestVisit.plannedElasticType && (
                                <div>Elastic: {latestVisit.plannedElasticType}</div>
                              )}
                              {latestVisit.plannedTadsNote && <div>Tads: {latestVisit.plannedTadsNote}</div>}
                              {plannedNotes && <div>{plannedNotes}</div>}
                              {!latestVisit.plannedUpperArch && !latestVisit.plannedLowerArch && !latestVisit.plannedElasticType && !latestVisit.plannedTadsNote && !plannedNotes && (
                                <div className="text-gray-500">No future plan recorded</div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-green-700">
                              {(patient.totalPaid || 0).toLocaleString()} IQD
                            </div>
                            <div className="text-sm text-gray-500">
                              / {patient.totalFee ? `${patient.totalFee.toLocaleString()} IQD` : "Not Set"}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                              Upcoming
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}


      </div>
      
      
<div className="bg-white rounded-2xl shadow-sm p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
  <div>
<div className="flex items-center gap-3 mb-3">
<div className="text-3xl">🚨</div>
  <div>
<h2 className="text-xl font-semibold text-gray-900">
        Overdue
    </h2>

<p className="text-sm text-gray-500 mt-1">
  Overdue visits
    </p>
  </div>
</div>
<p className="text-sm text-gray-500 mt-1">
        Patients with overdue appointments
    </p>
  </div>

  <span className="bg-red-100 text-red-600 px-3 py-2 rounded-full text-base font-bold">
    {overduePatients.length}
  </span>
</div>

  <div className="mt-4">
    <label className="text-sm font-medium text-gray-700 mb-2 block">
      Search overdue notes
    </label>
    <input
      type="text"
      value={overdueNotesSearch}
      onChange={(e) => setOverdueNotesSearch(e.target.value)}
      placeholder="Search notes only"
      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm focus:border-red-300 focus:ring-2 focus:ring-red-200"
    />
  </div>

{overduePatients.length === 0 ? (
  <div className="border border-gray-200 rounded-2xl py-10 text-center">
    <div className="text-7xl mb-4">📅</div>

    <h3 className="text-xl font-semibold text-gray-800">
      No Overdue Appointments
    </h3>

    <p className="text-gray-500 mt-2">
      All patients are up to date.
    </p>
  </div>
) : filteredOverduePatients.length === 0 ? (
  <div className="border border-gray-200 rounded-2xl py-10 text-center">
    <div className="text-7xl mb-4">🔍</div>

    <h3 className="text-xl font-semibold text-gray-800">
      No Matching Overdue Appointments
    </h3>

    <p className="text-gray-500 mt-2">
      No overdue appointments match "{overdueNotesSearch}".
    </p>
  </div>
) : (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="text-left py-3 px-4">Patient</th>
          <th className="text-left py-3 px-4">Next Appointment</th>
          <th className="text-left py-3 px-4">Treatment</th>
          <th className="text-left py-3 px-4">Planned Treatment</th>
          <th className="text-left py-3 px-4">Fee</th>
          <th className="text-left py-3 px-4">Status</th>
          <th className="text-left py-3 px-4">Action</th>
        </tr>
      </thead>

      <tbody>
        {filteredOverduePatients.map((patient) => {
          const overdueDays = Math.floor(
            (new Date().getTime() -
              new Date(patient.appointmentDate).getTime()) /
              (1000 * 60 * 60 * 24)
          );

          return (
            <tr
              key={patient.id}
              className="border-b hover:bg-gray-50 transition"
            >
              <td className="py-4 px-4">
                <Link
                  href={`/patient/${patient.id}`}
                  className="font-semibold text-gray-900 hover:text-blue-600"
                >
                  {patient.name}
                </Link>

                <div className="text-sm text-gray-500">
                  📞 {patient.phone}
                </div>
              </td>

              <td className="py-4 px-4">
                <div>{formatDateDMY(patient.appointmentDate)} • {patient.appointmentTime || "-"}</div>
                <div className="text-red-500 text-sm">{overdueDays} days overdue</div>
              </td>

              <td className="py-4 px-4">
                {formatTreatment(patient)}
              </td>

              <td className="py-4 px-4">
                    <div className="space-y-1 text-sm text-gray-700">
                      {(patient.visits?.at(-1)?.plannedUpperArch || patient.visits?.at(-1)?.plannedLowerArch) && (
                        <div>
                          Wire: U{patient.visits?.at(-1)?.plannedUpperArch || "-"} L{patient.visits?.at(-1)?.plannedLowerArch || "-"}
                        </div>
                      )}
                      {patient.visits?.at(-1)?.plannedElasticType && (
                        <div>Elastic: {patient.visits?.at(-1)?.plannedElasticType}</div>
                      )}
                      {patient.visits?.at(-1)?.plannedTadsNote && (
                        <div>Tads: {patient.visits?.at(-1)?.plannedTadsNote}</div>
                      )}
                      {(() => {
                        const latestVisit = patient.visits?.at(-1) || {};
                        const plannedNotes = getLatestPlannedNotes(patient);
                        return (
                          <>
                            {plannedNotes && <div>{plannedNotes}</div>}
                            {!latestVisit.plannedUpperArch && !latestVisit.plannedLowerArch && !latestVisit.plannedElasticType && !latestVisit.plannedTadsNote && !plannedNotes && (
                              <div className="text-sm text-gray-500">No future plan recorded</div>
                            )}
                          </>
                        );
                      })()}
                    </div>
              </td>

              <td className="py-4 px-4">
                <div className="font-semibold">
                  {(patient.totalPaid || 0).toLocaleString()} IQD
                </div>

                <div className="text-sm text-gray-500">
                  / {patient.totalFee ? `${patient.totalFee.toLocaleString()} IQD` : "Not Set"}
                </div>
              </td>

              <td className="py-4 px-4">
                <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                  Overdue
                </span>
              </td>

              <td className="py-4 px-4">
                <div className="flex gap-2">
                  <Link
                    href={`/new-appointment/${patient.id}`}
                    className="bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200"
                  >
                    ✓
                  </Link>

                  <Link
                    href={`/missed-appointment/${patient.id}`}
                    className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200"
                  >
                    ✗
                  </Link>
                </div>
              </td>
            </tr>
          );
        })}
</tbody>
</table>
</div>
)}
</div>

</div>

</main>
</div>
        );
      }