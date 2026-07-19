"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import { formatDateDMY } from "../lib/date";

type Patient = {
  id: number;
  name: string;
  phone: string;
  treatment: string;
  appointmentDate: string;
  appointmentTime?: string;
  caseStatus?: "active" | "retainer" | "finished" | "cancelled" | "archived";
};

type DayAppointments = {
  date: string;
  day: number;
  patients: Array<{ id: number; name: string; time: string }>;
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [daysInMonth, setDaysInMonth] = useState<DayAppointments[]>([]);
  const [calendarExpanded, setCalendarExpanded] = useState(false);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const normalizeAppointmentDate = (value: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
    return value;
  };

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const response = await fetch("/api/patients", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load patients");
        }
        const rawPatients = await response.json();
        const patients = rawPatients.map((p: any) => ({
          ...p,
          appointmentDate: normalizeAppointmentDate(p.appointmentDate),
        }));

        const { daysInMonth: totalDays, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

    const days: DayAppointments[] = [];

    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const dayPatients = patients
        .filter(
          (p: Patient) =>
            p.appointmentDate === dateStr &&
            p.caseStatus !== "archived" &&
            p.caseStatus !== "finished" &&
            p.caseStatus !== "retainer"
        )
        .map((p: Patient) => ({
          id: p.id,
          name: p.name,
          time: p.appointmentTime || "TBD",
          clinicName: (p as any).clinicName,
          clinicColor: (p as any).clinicColor,
        }))
        .sort((a: { time: string }, b: { time: string }) => {
          // Sort by time
          const timeA = a.time === "TBD" ? "23:59" : convertTo24Hour(a.time);
          const timeB = b.time === "TBD" ? "23:59" : convertTo24Hour(b.time);
          return timeA.localeCompare(timeB);
        });

      days.push({
        date: dateStr,
        day: i,
        patients: dayPatients,
      });
    }

        setDaysInMonth(days);
      } catch {
        setDaysInMonth([]);
      }
    };

    loadPatients();
  }, [currentDate]);

  const convertTo24Hour = (time: string) => {
    if (time === "TBD") return "23:59";
    const [timePart, period] = time.split(" ");
    let [hours, minutes] = timePart.split(":").map(Number);

    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const { startingDayOfWeek } = getDaysInMonth(currentDate);

  const emptyDays = Array(startingDayOfWeek).fill(null);
  const allDays = [...emptyDays, ...daysInMonth];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 w-full">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Appointment Calendar</h1>
            <p className="text-slate-600">View all scheduled appointments by day</p>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-900">{monthName}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setCalendarExpanded((current) => !current)}
                  className="md:hidden px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium transition"
                >
                  {calendarExpanded ? "Collapse calendar" : "Expand calendar"}
                </button>
                <button
                  onClick={previousMonth}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium transition"
                >
                  ← Previous
                </button>
                <button
                  onClick={goToToday}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium transition"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
            <div className={calendarExpanded ? "min-w-[960px] sm:min-w-full" : "min-w-[760px] sm:min-w-full"}>
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 min-w-full bg-slate-100 border-b border-slate-200">
                {daysOfWeek.map((day) => (
                  <div key={day} className="p-4 text-center font-semibold text-slate-700 border-r border-slate-200 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 min-w-full">
              {allDays.map((dayData, idx) => {
                const isToday =
                  dayData &&
                  dayData.date === new Date().toISOString().split("T")[0];

                return (
                  <div
                    key={idx}
                    className={`min-h-[200px] border-r border-b border-slate-200 p-4 last:border-r-0 ${
                      isToday ? "bg-teal-50" : dayData ? "bg-white hover:bg-slate-50" : "bg-slate-50"
                    } transition`}
                  >
                    {dayData ? (
                      <>
                        <div className={`text-lg font-bold mb-3 ${isToday ? "text-teal-600" : "text-slate-900"}`}>
                          {dayData.day}
                        </div>

                        {dayData.patients.length === 0 ? (
                          <div className="text-sm text-slate-400">No appointments</div>
                        ) : (
                          <div className="space-y-2">
                            {dayData.patients.map((patient: any) => (
                              <Link
                                key={patient.id}
                                href={`/patients/${patient.id}`}
                                className="block p-2 bg-teal-100 hover:bg-teal-200 rounded-lg transition group"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-semibold text-teal-900 group-hover:text-teal-700">
                                    {patient.time}
                                  </div>
                                  {patient.clinicName && (
                                    <div className="flex items-center gap-2 ml-3">
                                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: patient.clinicColor || '#ddd' }} />
                                      <span className="text-xs text-teal-900 truncate max-w-[120px]">{patient.clinicName}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-sm font-semibold text-teal-800 group-hover:text-teal-600 truncate">
                                  {patient.name}
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500 mb-2">Total Appointments</p>
              <p className="text-4xl font-semibold text-teal-600">
                {daysInMonth.reduce((sum, day) => sum + day.patients.length, 0)}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500 mb-2">Days with Appointments</p>
              <p className="text-4xl font-semibold text-emerald-600">
                {daysInMonth.filter((day) => day.patients.length > 0).length}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500 mb-2">Busiest Day</p>
              <p className="text-4xl font-semibold text-purple-600">
                {Math.max(...daysInMonth.map((day) => day.patients.length), 0)}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

