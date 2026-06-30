"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { formatDateDMY } from "../../lib/date";

type Visit = {
  date: string;
  time: string;

  nextDate?: string;
  nextTime?: string;

  visitNotes?: string;
  plannedNotes?: string;

  payment?: number;

  elasticEnabled: boolean;
  elasticType: string;
};

type Patient = {
  id: number;
  name: string;
  phone: string;
  treatment: string;
  appointmentDate: string;
  appointmentTime?: string;
  firstAppointment?: boolean;
  plannedNotes?: string;
  treatmentCategory?: string;
  bracketType?: string;

  elasticEnabled?: boolean;
  elasticType?: string;

  totalFee?: number;
  totalPaid?: number;

  visits?: Visit[];
};

export default function NewAppointmentPage() {
  const params = useParams();
  const router = useRouter();

  const [patient, setPatient] =
    useState<Patient | null>(null);

  const [appointmentMode, setAppointmentMode] =
    useState("30 Days");

  const [appointmentDate, setAppointmentDate] =
    useState("");

  const [appointmentTime, setAppointmentTime] =
    useState("04:00 PM");

  const [elasticEnabled, setElasticEnabled] =
    useState(false);

const [elasticType, setElasticType] =
  useState("None");
  const [elasticOther, setElasticOther] =
  useState("");

const [visitNotes, setVisitNotes] =
  useState("");

const [plannedNotes, setPlannedNotes] =
  useState("");

const [paymentReceived, setPaymentReceived] =
  useState("");

    const [upperWireSystem, setUpperWireSystem] =
  useState<"MBT/Roth" | "Damon">("MBT/Roth");
const [upperWireType, setUpperWireType] =
  useState<"Niti" | "SS">("Niti");
const [upperWireGauge, setUpperWireGauge] =
  useState("12");
const [upperWireOther, setUpperWireOther] =
  useState("");
const [upperDamonWire, setUpperDamonWire] =
  useState("0.014 CuNiTi");
const [upperDamonWireOther, setUpperDamonWireOther] =
  useState("");

const [lowerWireSystem, setLowerWireSystem] =
  useState<"MBT/Roth" | "Damon">("MBT/Roth");
const [lowerWireType, setLowerWireType] =
  useState<"Niti" | "SS">("Niti");
const [lowerWireGauge, setLowerWireGauge] =
  useState("12");
const [lowerWireOther, setLowerWireOther] =
  useState("");
const [lowerDamonWire, setLowerDamonWire] =
  useState("0.014 CuNiTi");
const [lowerDamonWireOther, setLowerDamonWireOther] =
  useState("");

const [upperArchEnabled, setUpperArchEnabled] =
  useState(false);

const [lowerArchEnabled, setLowerArchEnabled] =
  useState(false);
const [plannedUpperArchEnabled, setPlannedUpperArchEnabled] =
  useState(false);

const [plannedLowerArchEnabled, setPlannedLowerArchEnabled] =
  useState(false);
const [tadsEnabled, setTadsEnabled] =
  useState(false);

const [tadsNote, setTadsNote] =
  useState("");
  const [plannedUpperArch, setPlannedUpperArch] =
  useState("");

const [plannedLowerArch, setPlannedLowerArch] =
  useState("");

const [plannedElasticEnabled, setPlannedElasticEnabled] =
  useState(false);

const [plannedElasticType, setPlannedElasticType] =
  useState("Class II");

const [plannedTadsEnabled, setPlannedTadsEnabled] =
  useState(false);

const [plannedTadsNote, setPlannedTadsNote] =
  useState("");

const [conflictWarning, setConflictWarning] =
  useState("");
  const [timeConflictMessage, setTimeConflictMessage] = useState("");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const patients = JSON.parse(
      localStorage.getItem("patients") || "[]"
    );

    const foundPatient = patients.find(
      (p: Patient) =>
        p.id.toString() === params.id
    );

    if (foundPatient) {
      setPatient(foundPatient);

      setAppointmentDate("");

      setAppointmentTime(
        foundPatient.appointmentTime ||
          "04:00 PM"
      );

      setElasticEnabled(
        foundPatient.elasticEnabled || false
      );

      setElasticType(
        foundPatient.elasticType ||
          "Class II"
      );

      const wireSystem =
        foundPatient.bracketType &&
        foundPatient.bracketType
          .toLowerCase()
          .includes("damon")
          ? "Damon"
          : "MBT/Roth";

      setUpperWireSystem(
        wireSystem as "MBT/Roth" | "Damon"
      );
      setLowerWireSystem(
        wireSystem as "MBT/Roth" | "Damon"
      );
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [params.id]);

  const getSelectedDate = () => {
    if (appointmentMode === "Manual") {
      return appointmentDate;
    }

    const days = parseInt(appointmentMode);

    const futureDate = new Date();

    futureDate.setDate(
      futureDate.getDate() + days
    );

    return futureDate
      .toISOString()
      .split("T")[0];
  };

  const damonWireOptions = [
    "0.014 CuNiTi",
    "0.014 × 0.025 CuNiTi",
    "0.018 × 0.025 CuNiTi",
    "0.019 × 0.025 Stainless Steel",
    "Other",
  ];

  const wireGauges = (type: "Niti" | "SS") =>
    type === "Niti"
      ? ["12", "14", "16", "18", "16x22", "17x25", "18x25", "Other"]
      : ["18", "16x22", "17x25", "18x25", "Other"];

  const formatWireLabel = (
    system: "MBT/Roth" | "Damon",
    type: "Niti" | "SS",
    gauge: string,
    other: string,
    damonWire: string,
    damonOther: string
  ) => {
    if (system === "Damon") {
      if (damonWire === "Other") {
        return damonOther.trim() || "Other";
      }

      return damonWire;
    }

    if (gauge === "Other") {
      return other.trim() || `${type} Other`;
    }

    return `${gauge} ${type}`;
  };

  const selectedDate =
    getSelectedDate();

  const isFriday =
    selectedDate &&
    new Date(selectedDate).getDay() === 5;

  const getWireSystemLabel = (
    system: "MBT/Roth" | "Damon",
    bracketType?: string
  ) => {
    if (bracketType) {
      return bracketType;
    }

    return system === "Damon"
      ? "Damon System"
      : "MBT / Roth";
  };

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const patients = JSON.parse(
      localStorage.getItem("patients") || "[]"
    );

    if (!selectedDate || !appointmentTime) {
      setTimeConflictMessage("");
      return;
    }

    const conflict = patients.some(
      (p: Patient) =>
        p.id.toString() !== params.id &&
        p.appointmentDate === selectedDate &&
        p.appointmentTime === appointmentTime
    );

    if (conflict) {
      setTimeConflictMessage(
        `Warning: Another patient is scheduled on ${formatDateDMY(selectedDate)} at ${appointmentTime}.`
      );
    } else {
      setTimeConflictMessage("");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedDate, appointmentTime, params.id]);

  const saveAppointment = () => {
    const patients = JSON.parse(
      localStorage.getItem("patients") || "[]"
    );

    const payment =
      Number(
        paymentReceived.replace(/,/g, "")
      ) || 0;

    const conflict = patients.some(
      (p: Patient) =>
        p.id.toString() !== params.id &&
        p.appointmentDate === selectedDate &&
        p.appointmentTime === appointmentTime
    );

    if (conflict) {
      setConflictWarning(
        `Warning: Another patient already has an appointment on ${formatDateDMY(selectedDate)} at ${appointmentTime}.`
      );
    } else {
      setConflictWarning("");
    }

    const updatedPatients = patients.map(
      (p: Patient) => {
        if (p.id.toString() === params.id) {
          const existingVisits = p.visits || [];
          const today = new Date().toISOString().split("T")[0];
          const initialPlannedNotes = existingVisits.length === 0 ? p.plannedNotes || "" : "";

          const finalUpperWire = formatWireLabel(
            upperWireSystem,
            upperWireType,
            upperWireGauge,
            upperWireOther,
            upperDamonWire,
            upperDamonWireOther
          );
          const finalLowerWire = formatWireLabel(
            lowerWireSystem,
            lowerWireType,
            lowerWireGauge,
            lowerWireOther,
            lowerDamonWire,
            lowerDamonWireOther
          );

          const newVisit = {
            date: today,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            nextDate: selectedDate,
            nextTime: appointmentTime,
            payment,
            visitNotes,
            plannedNotes: plannedNotes || initialPlannedNotes,
            plannedUpperArch,
            plannedLowerArch,
            plannedElasticType: plannedElasticEnabled
              ? plannedElasticType
              : "",
            plannedTadsNote: plannedTadsEnabled
              ? plannedTadsNote
              : "",
            upperWire: finalUpperWire,
            lowerWire: finalLowerWire,
            upperArch: finalUpperWire,
            lowerArch: finalLowerWire,
            elasticEnabled,
            elasticType: elasticEnabled ? elasticType : "",
            elasticOther,
            tadsEnabled,
            tadsNote,
          };

          return {
            ...p,
            appointmentDate: selectedDate,
            appointmentTime,
            firstAppointment: false,
            elasticEnabled,
            elasticType: elasticEnabled ? elasticType : "",
            totalPaid: (p.totalPaid || 0) + payment,
            plannedNotes: existingVisits.length === 0 ? "" : p.plannedNotes,
            visits: [...existingVisits, newVisit],
          };
        }

        return p;
      }
    );

    localStorage.setItem(
      "patients",
      JSON.stringify(updatedPatients)
    );

    router.push(`/patient/${params.id}`);
  };

  if (!patient) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 p-8">
        <p>Patient not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 w-full">
        <h1 className="text-4xl font-bold text-blue-700 mb-8">
          Schedule Appointment
        </h1>

        <div className="bg-white rounded-xl shadow p-8 text-black">

        <div className="mb-6">
          <strong>Patient:</strong>{" "}
          {patient.name}
        </div>
<div className="grid md:grid-cols-2 gap-8">
  {/* CURRENT APPOINTMENT */}

  <div className="border rounded-xl p-5 bg-blue-50">

    <h2 className="text-xl font-bold text-blue-700 mb-5">
      Current Appointment
    </h2>

<label className="flex items-center gap-3 font-semibold mb-3">
  <input
    type="checkbox"
    checked={upperArchEnabled}
    onChange={(e) =>
      setUpperArchEnabled(
        e.target.checked
      )
    }
  />
  Upper Arch
</label>

{upperArchEnabled && (
  <div className="space-y-4 mb-4">
    <div className="text-sm text-slate-700">
      Wire system: {getWireSystemLabel(upperWireSystem, patient?.bracketType)}
    </div>

    {upperWireSystem === "MBT/Roth" ? (
      <>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-3 py-2">
            <input
              type="radio"
              name="upperWireType"
              value="Niti"
              checked={upperWireType === "Niti"}
              onChange={() => {
                setUpperWireType("Niti");
                if (!wireGauges("Niti").includes(upperWireGauge)) {
                  setUpperWireGauge("12");
                }
              }}
            />
            Niti
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-3 py-2">
            <input
              type="radio"
              name="upperWireType"
              value="SS"
              checked={upperWireType === "SS"}
              onChange={() => {
                setUpperWireType("SS");
                if (!wireGauges("SS").includes(upperWireGauge)) {
                  setUpperWireGauge("18");
                }
              }}
            />
            SS
          </label>
        </div>

        <div>
          <label className="block mb-2 font-semibold text-sm">
            Wire gauge
          </label>
          <select
            value={upperWireGauge}
            onChange={(e) => setUpperWireGauge(e.target.value)}
            className="w-full border p-3 rounded"
          >
            {wireGauges(upperWireType).map((gauge) => (
              <option key={gauge} value={gauge}>
                {gauge}
              </option>
            ))}
          </select>
        </div>

        {upperWireGauge === "Other" && (
          <input
            type="text"
            value={upperWireOther}
            onChange={(e) => setUpperWireOther(e.target.value)}
            placeholder="Enter custom wire"
            className="w-full border p-3 rounded"
          />
        )}
      </>
    ) : (
      <div>
        <label className="block mb-2 font-semibold text-sm">
          Damon wire
        </label>
        <select
          value={upperDamonWire}
          onChange={(e) => setUpperDamonWire(e.target.value)}
          className="w-full border p-3 rounded"
        >
          {damonWireOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {upperDamonWire === "Other" && (
          <input
            type="text"
            value={upperDamonWireOther}
            onChange={(e) => setUpperDamonWireOther(e.target.value)}
            placeholder="Enter custom Damon wire"
            className="w-full border p-3 rounded mt-2"
          />
        )}
      </div>
    )}

    <div className="text-sm text-slate-600">
      Selected: {formatWireLabel(upperWireSystem, upperWireType, upperWireGauge, upperWireOther, upperDamonWire, upperDamonWireOther)}
    </div>
  </div>
)}

<label className="flex items-center gap-3 font-semibold mb-3">
  <input
    type="checkbox"
    checked={lowerArchEnabled}
    onChange={(e) =>
      setLowerArchEnabled(
        e.target.checked
      )
    }
  />
  Lower Arch
</label>

{lowerArchEnabled && (
  <div className="space-y-4 mb-4">
    <div className="text-sm text-slate-700">
      Wire system: {getWireSystemLabel(lowerWireSystem, patient?.bracketType)}
    </div>

    {lowerWireSystem === "MBT/Roth" ? (
      <>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-3 py-2">
            <input
              type="radio"
              name="lowerWireType"
              value="Niti"
              checked={lowerWireType === "Niti"}
              onChange={() => {
                setLowerWireType("Niti");
                if (!wireGauges("Niti").includes(lowerWireGauge)) {
                  setLowerWireGauge("12");
                }
              }}
            />
            Niti
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-300 px-3 py-2">
            <input
              type="radio"
              name="lowerWireType"
              value="SS"
              checked={lowerWireType === "SS"}
              onChange={() => {
                setLowerWireType("SS");
                if (!wireGauges("SS").includes(lowerWireGauge)) {
                  setLowerWireGauge("18");
                }
              }}
            />
            SS
          </label>
        </div>

        <div>
          <label className="block mb-2 font-semibold text-sm">
            Wire gauge
          </label>
          <select
            value={lowerWireGauge}
            onChange={(e) => setLowerWireGauge(e.target.value)}
            className="w-full border p-3 rounded"
          >
            {wireGauges(lowerWireType).map((gauge) => (
              <option key={gauge} value={gauge}>
                {gauge}
              </option>
            ))}
          </select>
        </div>

        {lowerWireGauge === "Other" && (
          <input
            type="text"
            value={lowerWireOther}
            onChange={(e) => setLowerWireOther(e.target.value)}
            placeholder="Enter custom wire"
            className="w-full border p-3 rounded"
          />
        )}
      </>
    ) : (
      <div>
        <label className="block mb-2 font-semibold text-sm">
          Damon wire
        </label>
        <select
          value={lowerDamonWire}
          onChange={(e) => setLowerDamonWire(e.target.value)}
          className="w-full border p-3 rounded"
        >
          {damonWireOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {lowerDamonWire === "Other" && (
          <input
            type="text"
            value={lowerDamonWireOther}
            onChange={(e) => setLowerDamonWireOther(e.target.value)}
            placeholder="Enter custom Damon wire"
            className="w-full border p-3 rounded mt-2"
          />
        )}
      </div>
    )}

    <div className="text-sm text-slate-600">
      Selected: {formatWireLabel(lowerWireSystem, lowerWireType, lowerWireGauge, lowerWireOther, lowerDamonWire, lowerDamonWireOther)}
    </div>
  </div>
)}

<label className="flex items-center gap-3 font-semibold mb-3">
  <input
    type="checkbox"
    checked={elasticEnabled}
    onChange={(e) =>
      setElasticEnabled(e.target.checked)
    }
  />
  Elastics
</label>

{elasticEnabled && (
  <div className="mb-4">
    <select
      value={elasticType}
      onChange={(e) =>
        setElasticType(e.target.value)
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
      <option>Other</option>
    </select>

    {elasticType === "Other" && (
      <input
        type="text"
        value={elasticOther}
        onChange={(e) =>
          setElasticOther(e.target.value)
        }
        placeholder="Custom elastic"
        className="w-full border p-3 rounded mt-2"
      />
    )}
  </div>
)}

<label className="flex items-center gap-3 font-semibold mb-3">
  <input
    type="checkbox"
    checked={tadsEnabled}
    onChange={(e) =>
      setTadsEnabled(e.target.checked)
    }
  />
  TADs
</label>

{tadsEnabled && (
  <input
    type="text"
    value={tadsNote}
    onChange={(e) =>
      setTadsNote(e.target.value)
    }
    placeholder="TAD note"
    className="w-full border p-3 rounded mb-4"
  />
)}
      <div className="mb-4">
  <label className="block mb-2 font-semibold">
    Visit Notes
  </label>

  <textarea
    value={visitNotes}
    onChange={(e) =>
      setVisitNotes(
        e.target.value
      )
    }
    rows={8}
    placeholder="What was done during this visit?"
    className="w-full border p-3 rounded"
  />
</div>
      <div className="mb-4">
  <label className="block mb-2 font-semibold">
    Payment Received Today
  </label>

  <div className="flex items-center gap-2">
    <input
      type="text"
      value={
        paymentReceived ? Number(paymentReceived).toLocaleString() : ""
      }
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        setPaymentReceived(digits);
      }}
      placeholder="0"
      className="flex-1 border p-3 rounded"
    />
    <span className="font-semibold text-slate-700">IQD</span>
  </div>
</div>
    </div>



  {/* NEXT APPOINTMENT */}

  <div className="border rounded-xl p-5 bg-green-50">

    <h2 className="text-xl font-bold text-green-700 mb-5">
      Next Appointment
    </h2>

  <div className="mb-4">
  <label className="flex items-center gap-3 font-semibold mb-3">
  <input
    type="checkbox"
    checked={plannedUpperArchEnabled}
    onChange={(e) =>
      setPlannedUpperArchEnabled(
        e.target.checked
      )
    }
  />
  Planned Upper Arch
</label>

{plannedUpperArchEnabled && (
  <input
    type="text"
    value={plannedUpperArch}
    onChange={(e) =>
      setPlannedUpperArch(
        e.target.value
      )
    }
    className="w-full border p-3 rounded mb-4"
  />
)}

</div>

<div className="mb-4">
<label className="flex items-center gap-3 font-semibold mb-3">
  <input
    type="checkbox"
    checked={plannedLowerArchEnabled}
    onChange={(e) =>
      setPlannedLowerArchEnabled(
        e.target.checked
      )
    }
  />
  Planned Lower Arch
</label>

{plannedLowerArchEnabled && (
  <input
    type="text"
    value={plannedLowerArch}
    onChange={(e) =>
      setPlannedLowerArch(
        e.target.value
      )
    }
    className="w-full border p-3 rounded mb-4"
  />
)}

</div>

<label className="flex items-center gap-3 font-semibold mb-3">
  <input
    type="checkbox"
    checked={plannedElasticEnabled}
    onChange={(e) =>
      setPlannedElasticEnabled(
        e.target.checked
      )
    }
  />
  Planned Elastics
</label>

{plannedElasticEnabled && (
  <div className="mb-4">
    <select
      value={plannedElasticType}
      onChange={(e) =>
        setPlannedElasticType(
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
      <option>Other</option>
    </select>
  </div>
)}

<label className="flex items-center gap-3 font-semibold mb-3">
  <input
    type="checkbox"
    checked={plannedTadsEnabled}
    onChange={(e) =>
      setPlannedTadsEnabled(
        e.target.checked
      )
    }
  />
  Planned TADs
</label>

{plannedTadsEnabled && (
  <input
    type="text"
    value={plannedTadsNote}
    onChange={(e) =>
      setPlannedTadsNote(
        e.target.value
      )
    }
    placeholder="Planned TAD note"
    className="w-full border p-3 rounded mb-4"
  />
)}
<div className="mb-4">
  <label className="block mb-2 font-semibold">
    Future Notes
  </label>

  <textarea
    value={plannedNotes}
    onChange={(e) =>
      setPlannedNotes(
        e.target.value
      )
    }
    rows={5}
    placeholder="Instructions for next visit..."
    className="w-full border p-3 rounded"
  />
</div>
 <div className="mb-4">
  <label className="block mb-2 font-semibold">
    Next Appointment Date
  </label>
  <select
    value={appointmentMode}
    onChange={(e) =>
      setAppointmentMode(
        e.target.value
      )
    }
    className="w-full border p-3 rounded"
  >
    <option>15 Days</option>
    <option>30 Days</option>
    <option>45 Days</option>
    <option>60 Days</option>
    <option>Manual</option>
  </select>
  {isFriday && (
    <p className="text-sm text-orange-700 mt-2">
      Note: The selected appointment falls on Friday.
    </p>
  )}
</div>

{appointmentMode === "Manual" && (
  <div className="mb-4">
    <input
      type="date"
      value={appointmentDate}
      onChange={(e) =>
        setAppointmentDate(
          e.target.value
        )
      }
      className="w-full border p-3 rounded"
    />
      {isFriday && (
        <p className="text-sm text-orange-700 mt-2">
          Note: The selected appointment falls on Friday.
        </p>
      )}
  </div>
)}
<div className="mb-4">
  <div className="bg-white border rounded-lg p-3">
    <strong>Selected Date:</strong>{" "}
    {selectedDate}
  </div>

  {isFriday && (
    <div className="mt-2 bg-red-100 border border-red-300 text-red-700 p-3 rounded">
      Note: This appointment is scheduled on Friday
    </div>
  )}
</div>
<div className="mb-4">
  <label className="block mb-2 font-semibold">
    Next Appointment Time
  </label>

  <select
    value={appointmentTime}
    onChange={(e) =>
      setAppointmentTime(
        e.target.value
      )
    }
    className="w-full border p-3 rounded"
  >
    <option>09:00 AM</option>
    <option>10:00 AM</option>
    <option>11:00 AM</option>
    <option>12:00 PM</option>
    <option>01:00 PM</option>
    <option>02:00 PM</option>
    <option>03:00 PM</option>
    <option>04:00 PM</option>
    <option>05:00 PM</option>
    <option>06:00 PM</option>
    <option>07:00 PM</option>
    <option>08:00 PM</option>
  </select>
  {timeConflictMessage && (
    <p className="text-sm text-red-700 mt-2">{timeConflictMessage}</p>
  )}
</div>

  {conflictWarning && (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
      {conflictWarning}
    </div>
  )}
  <div className="mt-8 text-center">
    <button
      onClick={saveAppointment}
      className="bg-blue-600 text-white px-6 py-3 rounded-lg"
    >
      Save Appointment
    </button>
  </div>

  <div className="border-t border-gray-200 mt-8 pt-6">
    <h3 className="text-lg font-bold mb-3 text-slate-800">Case Actions</h3>
    <p className="text-sm text-slate-600 mb-4">Finish the case or move it to retainer after scheduling the next visit.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => router.push(`/finish-case/${params.id}`)}
        className="w-full bg-green-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
      >
        Finish Case
      </button>
      <button
        type="button"
        onClick={() => router.push(`/finish-case/${params.id}?mode=retainer`)}
        className="w-full bg-purple-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
      >
        Move to Retainer
      </button>
    </div>
  </div>
</div>
        </div>
      </div>
      </main>
    </div>
  );
}
