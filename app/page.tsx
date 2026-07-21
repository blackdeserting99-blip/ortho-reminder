"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "./components/Sidebar";
import DateInput from "./components/DateInput";
import { formatDateDMY } from "./lib/date";

type Patient = {
        id: number;
        name: string;
        phone: string;
        treatment: string;
        bracketType?: string;
        appointmentDate: string;
        appointmentTime?: string;
clinicName?: string;
clinicColor?: string;
        totalFee?: number;
        totalPaid?: number;
        visits?: any[];
      };

type AlignerPatchNotification = {
  id: string;
  patientId: number;
  patientName: string;
  patientPhone: string;
  appointmentDate: string;
  alignerReached: number;
  totalAligners: number;
  nextPatchStartsFrom: number;
  remainingAligners: number;
  overdue: boolean;
};

      export default function Home() {
        const router = useRouter();
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
      const [todayClinicSearch, setTodayClinicSearch] = useState("");
      const [upcomingClinicSearch, setUpcomingClinicSearch] = useState("");
      const [overdueClinicSearch, setOverdueClinicSearch] = useState("");
      const [expandedSections, setExpandedSections] = useState<Record<"today" | "upcoming" | "overdue", boolean>>({
        today: true,
        upcoming: true,
        overdue: true,
      });
      const [alignerAlerts, setAlignerAlerts] = useState<AlignerPatchNotification[]>([]);
      const [dismissedAlignerAlertIds, setDismissedAlignerAlertIds] = useState<string[]>([]);
      const todaySectionRef = useRef<HTMLDivElement | null>(null);
      const upcomingSectionRef = useRef<HTMLDivElement | null>(null);
      const overdueSectionRef = useRef<HTMLDivElement | null>(null);

      const scrollToSection = (section: "today" | "upcoming" | "overdue") => {
        setExpandedSections((prev) => ({ ...prev, [section]: true }));
        const target =
          section === "today"
            ? todaySectionRef.current
            : section === "upcoming"
              ? upcomingSectionRef.current
              : overdueSectionRef.current;

        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      };

      useEffect(() => {
        const checkAuth = async () => {
          try {
            const response = await fetch("/api/me");
            if (!response.ok) {
              router.push("/login");
            }
          } catch (error) {
            router.push("/login");
          }
        };
        checkAuth();
      }, [router]);

      useEffect(() => {
        const loadAlignerAlerts = async () => {
          try {
            const response = await fetch("/api/notifications/aligner-patches", { cache: "no-store" });
            if (!response.ok) {
              return;
            }

            const payload = await response.json();
            setAlignerAlerts(Array.isArray(payload?.notifications) ? payload.notifications : []);
          } catch {
            setAlignerAlerts([]);
          }
        };

        loadAlignerAlerts();
      }, []);

      const visibleAlignerAlerts = alignerAlerts.filter(
        (alert) => !dismissedAlignerAlertIds.includes(alert.id)
      );

      useEffect(() => {
        const loadPatients = async () => {
          try {
            const response = await fetch("/api/patients", { cache: "no-store" });
            if (!response.ok) {
              throw new Error("Failed to load patients");
            }
            const patients = await response.json();

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
          } catch {
            setPatientCount(0);
            setTodayPatients([]);
            setOverduePatients([]);
            setUpcomingPatients([]);
          }
        };

        loadPatients();
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

      const clinicMatches = (patient: any, query: string) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (patient.clinicName || "").toLowerCase().includes(q);
      };

      const filteredTodayPatients = (todayNotesSearch.trim() ? todayPatients.filter((patient) => noteMatches(patient, todayNotesSearch)) : todayPatients)
        .filter((p) => clinicMatches(p, todayClinicSearch));

      const filteredUpcomingPatients = upcomingPatients.filter((patient) => {
        const matchesDate = upcomingMode === "Manual" && upcomingDateSearch.trim()
          ? patient.appointmentDate === upcomingDateSearch.trim()
          : true;
        const matchesNotes = upcomingNotesSearch.trim()
          ? noteMatches(patient, upcomingNotesSearch)
          : true;
        const matchesClinic = upcomingClinicSearch.trim() ? (patient.clinicName || "").toLowerCase().includes(upcomingClinicSearch.trim().toLowerCase()) : true;
        return matchesDate && matchesNotes && matchesClinic;
      });

      const filteredOverduePatients = (overdueNotesSearch.trim() ? overduePatients.filter((patient) => noteMatches(patient, overdueNotesSearch)) : overduePatients)
        .filter((p) => (overdueClinicSearch.trim() ? (p.clinicName || "").toLowerCase().includes(overdueClinicSearch.trim().toLowerCase()) : true));

      const formatTreatment = (patient: any) => {
        if (patient.treatment === "Fixed Braces" && patient.bracketType) {
          return `Fixed Braces (${patient.bracketType})`;
        }
        return patient.treatment;
      };

      const getLatestVisit = (patient: any) =>
        patient.visits?.[patient.visits.length - 1] || {};

      const renderNextVisitInfo = (patient: any) => {
        const latestVisit = getLatestVisit(patient);
        const plannedNotes = getLatestPlannedNotes(patient);
        const hasCurrent =
          latestVisit.upperArch ||
          latestVisit.lowerArch ||
          latestVisit.elasticType ||
          latestVisit.tadsNote ||
          latestVisit.visitNotes;
        const hasPlanned =
          latestVisit.plannedUpperArch ||
          latestVisit.plannedLowerArch ||
          latestVisit.plannedElasticType ||
          latestVisit.plannedTadsNote ||
          plannedNotes;

        return (
          <div className="space-y-2 text-sm text-gray-700">
            {hasCurrent ? (
              <div>
                <div className="font-semibold text-gray-900">Current Visit</div>
                {(latestVisit.upperArch || latestVisit.lowerArch) && (
                  <div>Wire: U{latestVisit.upperArch || "-"} L{latestVisit.lowerArch || "-"}</div>
                )}
                {latestVisit.elasticType && <div>Elastic: {latestVisit.elasticType}</div>}
                {latestVisit.tadsNote && <div>TADs: {latestVisit.tadsNote}</div>}
                {latestVisit.visitNotes && <div>Notes: {latestVisit.visitNotes}</div>}
              </div>
            ) : null}

            {hasPlanned ? (
              <div>
                <div className="font-semibold text-gray-900">Next Planned Visit</div>
                {(latestVisit.plannedUpperArch || latestVisit.plannedLowerArch) && (
                  <div>Wire: U{latestVisit.plannedUpperArch || "-"} L{latestVisit.plannedLowerArch || "-"}</div>
                )}
                {latestVisit.plannedElasticType && <div>Elastic: {latestVisit.plannedElasticType}</div>}
                {latestVisit.plannedTadsNote && <div>TADs: {latestVisit.plannedTadsNote}</div>}
                {plannedNotes && <div>Notes: {plannedNotes}</div>}
              </div>
            ) : null}

            {!hasCurrent && !hasPlanned && <div className="text-gray-500">No visit details recorded</div>}
          </div>
        );
      };

 return (
  <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.16),_transparent_36%),linear-gradient(135deg,_#f4fcfb_0%,_#eef9f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
    <Sidebar />
    <main className="mx-auto flex max-w-7xl flex-col gap-6">
      {visibleAlignerAlerts.length > 0 && (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Doctor Alert</p>
              <h2 className="mt-2 text-2xl font-semibold text-amber-900">Clear aligner patch preparation needed</h2>
              <p className="mt-1 text-sm text-amber-800">Patient reached current patch end. Prepare the next patch if remaining aligners exist.</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {visibleAlignerAlerts.map((alert) => (
              <article key={alert.id} className="rounded-2xl border border-amber-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{alert.patientName}</div>
                    <div className="text-sm text-slate-600">Phone: {alert.patientPhone || "-"}</div>
                    <div className="mt-1 text-sm text-slate-700">
                      Reached aligner #{alert.alignerReached}. Next patch starts from #{alert.nextPatchStartsFrom}. Remaining: {alert.remainingAligners} aligners.
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Review date: {formatDateDMY(alert.appointmentDate)} {alert.overdue ? "(overdue)" : "(today)"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/patients/${alert.patientId}`}
                      className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                    >
                      Open Patient
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        setDismissedAlignerAlertIds((prev) => [...prev, alert.id])
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-600">Practice Overview</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Dashboard</h1>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/patients" className="group rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-xl">👥</div>
            <div>
              <h2 className="font-semibold text-slate-900">Patients</h2>
              <p className="text-sm text-slate-500">Total patients</p>
            </div>
          </div>
          <p className="mt-5 text-4xl font-semibold text-teal-700">{patientCount}</p>
        </Link>
              <button
                type="button"
                onClick={() => scrollToSection("today")}
                className="bg-gradient-to-br from-white via-cyan-50 to-teal-50 p-4 rounded-2xl shadow-sm border border-cyan-100 text-left hover:shadow-md transition"
              >
         <div className="flex items-center gap-3 mb-3">
  <div className="text-2xl">📅</div>

  <div>
<h2 className="text-xl font-semibold text-gray-900">
      Today
    </h2>

<p className="text-sm text-gray-500 mt-1">
        Scheduled today
    </p>
  </div>
</div>
                <p className="text-4xl font-bold mt-1 text-teal-700">
                  {todayPatients.length}
                </p>
              </button>
<button
  type="button"
  onClick={() => scrollToSection("upcoming")}
  className="bg-gradient-to-br from-white via-cyan-50 to-teal-50 p-4 rounded-2xl shadow-sm border border-cyan-100 text-left hover:shadow-md transition"
>
  <div className="flex items-center gap-3 mb-3">
<div className="text-2xl">⏳</div>
    <div>
<h2 className="text-xl font-semibold text-gray-900">
          Upcoming
      </h2>

<p className="text-sm text-gray-500 mt-1">
          {upcomingMode === "Manual" ? "Manual date search" : `Next ${upcomingMode}`}
      </p>
    </div>
  </div>

  <p className="text-4xl font-bold text-orange-600">
    {upcomingPatients.length}
  </p>
</button>
    <button
      type="button"
      onClick={() => scrollToSection("overdue")}
      className="bg-gradient-to-br from-white via-cyan-50 to-teal-50 p-4 rounded-2xl shadow-sm border border-cyan-100 text-left hover:shadow-md transition"
    >
  <div className="flex items-center gap-3 mb-3">
<div className="text-2xl">🚨</div>
    <div>
<h2 className="text-xl font-semibold text-gray-900">    
      Overdue
      </h2>

<p className="text-sm text-gray-500 mt-1">
  Overdue visits
      </p>
    </div>
  </div>

  <p className="text-4xl font-bold text-red-600">
    {overduePatients.length}
  </p>
</button>

            </div>
<div className="space-y-4">
<div ref={todaySectionRef} className="bg-gradient-to-br from-white via-cyan-50 to-teal-50 rounded-2xl shadow-sm border border-cyan-100 p-5 md:p-6">
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
  <div className="flex items-center gap-2">
    <span className="bg-teal-100 text-teal-600 px-3 py-2 rounded-full text-base font-bold">
      {todayPatients.length}
    </span>
    <button
      type="button"
      onClick={() => setExpandedSections((prev) => ({ ...prev, today: !prev.today }))}
      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
    >
      {expandedSections.today ? "Hide" : "Show"}
    </button>
  </div>
</div>
      {expandedSections.today && (
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
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm focus:border-teal-300 focus:ring-2 focus:ring-teal-200"
              />
            </div>
            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by clinic</label>
              <input
                type="text"
                value={todayClinicSearch}
                onChange={(e) => setTodayClinicSearch(e.target.value)}
                placeholder="Clinic name"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm focus:border-teal-300 focus:ring-2 focus:ring-teal-200"
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
                      return (
                        <tr key={patient.id} className="hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <Link
                              href={`/patient/${patient.id}`}
                              className="font-semibold text-gray-900 hover:text-teal-600"
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
                            {renderNextVisitInfo(patient)}
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
                            <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm font-medium">
                              Today
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2 flex-wrap">
                              <Link
                                href={`/new-appointment/${patient.id}?focus=current`}
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
           <div ref={upcomingSectionRef} className="bg-gradient-to-br from-white via-cyan-50 to-teal-50 rounded-2xl shadow-sm border border-cyan-100 p-5 md:p-6">
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

  <div className="flex items-center gap-2">
    <span className="bg-orange-100 text-orange-600 px-3 py-2 rounded-full text-base font-bold">
      {upcomingPatients.length}
    </span>
    <button
      type="button"
      onClick={() => setExpandedSections((prev) => ({ ...prev, upcoming: !prev.upcoming }))}
      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
    >
      {expandedSections.upcoming ? "Hide" : "Show"}
    </button>
  </div>
</div>

{expandedSections.upcoming && (
  <>
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
        <DateInput
          value={upcomingDateSearch}
          onChange={setUpcomingDateSearch}
          className="rounded-2xl"
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
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by clinic</label>
      <input
        type="text"
        value={upcomingClinicSearch}
        onChange={(e) => setUpcomingClinicSearch(e.target.value)}
        placeholder="Clinic name"
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
                      return (
                        <tr key={patient.id} className="hover:bg-orange-50/50">
                          <td className="py-4 px-4">
                            <Link
                              href={`/patient/${patient.id}`}
                              className="font-semibold text-gray-900 hover:text-teal-600"
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
                            {renderNextVisitInfo(patient)}
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
          </>
        )}
      </div>
      
      
<div ref={overdueSectionRef} className="bg-white rounded-2xl shadow-sm p-6 mt-8">
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

  <div className="flex items-center gap-2">
    <span className="bg-red-100 text-red-600 px-3 py-2 rounded-full text-base font-bold">
      {overduePatients.length}
    </span>
    <button
      type="button"
      onClick={() => setExpandedSections((prev) => ({ ...prev, overdue: !prev.overdue }))}
      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
    >
      {expandedSections.overdue ? "Hide" : "Show"}
    </button>
  </div>
</div>

{expandedSections.overdue && (
  <>
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
  <div className="mt-3">
    <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by clinic</label>
    <input
      type="text"
      value={overdueClinicSearch}
      onChange={(e) => setOverdueClinicSearch(e.target.value)}
      placeholder="Clinic name"
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
                  className="font-semibold text-gray-900 hover:text-teal-600"
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
                {renderNextVisitInfo(patient)}
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
  </>
)}
</div>

</div>

</main>
</div>
        );
      }
