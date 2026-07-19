"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDateDMY } from "../lib/date";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import DateInput from "../components/DateInput";
import {
  Patient,
  normalizeDateIso,
  hasAppointmentConflict,
  validatePatientRecord,
  CLINIC_COLORS,
} from "../lib/patient";

export default function AddPatientPage() {
  const router = useRouter();

const [name, setName] = useState("");
const [phone, setPhone] = useState("");

const formatPhoneInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0,3)} ${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`;
  return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6,10)} ${digits.slice(10)}`;
};
const [address, setAddress] = useState("");
const [age, setAge] = useState("");
const [occupation, setOccupation] = useState("");
const [clinicEnabled, setClinicEnabled] = useState(false);
const [clinicName, setClinicName] = useState("");
const [clinicColor, setClinicColor] = useState(CLINIC_COLORS[0]);
  const [treatmentType, setTreatmentType] =
    useState("Fixed Braces");

  const [MyofunctionalType, setMyofunctionalType] =
    useState("Fixed");

  const [treatment, setTreatment] =
    useState("Fixed Braces");

  const [bracketType, setBracketType] =
    useState("MBT System");

  const [caseSheet, setCaseSheet] = useState("");
  const [caseSheetAttachments, setCaseSheetAttachments] = useState<any[]>([]);

  const [appointmentMode, setAppointmentMode] =
    useState("30 Days");
  useEffect(() => {
    try {
      const draft = JSON.parse(
        localStorage.getItem("newPatientCaseSheetDraft") || "null"
      );

      if (
        draft &&
        draft.draftPresent === true &&
        typeof draft.caseSheetText === "string"
      ) {
        setCaseSheet(draft.caseSheetText);
      }

      if (draft && typeof draft === "object") {
        if (typeof draft.name === "string" && draft.name.trim()) {
          setName(draft.name);
        }
        if (typeof draft.mobile === "string" && draft.mobile.trim()) {
          setPhone(draft.mobile);
        } else if (typeof draft.homePhone === "string" && draft.homePhone.trim()) {
          setPhone(draft.homePhone);
        }
        if (typeof draft.homeAddress === "string" && draft.homeAddress.trim()) {
          setAddress(draft.homeAddress);
        }
        if (typeof draft.age === "string" && draft.age.trim()) {
          setAge(draft.age);
        }
        if (typeof draft.occupation === "string" && draft.occupation.trim()) {
          setOccupation(draft.occupation);
        }
        if (Array.isArray(draft.attachments)) {
          setCaseSheetAttachments(draft.attachments);
        }
      }
    } catch (error) {
      console.warn("Failed to load case sheet draft", error);
    }
  }, []);
  const [appointmentDate, setAppointmentDate] =
    useState("");

  const [appointmentTime, setAppointmentTime] =
    useState("04:00 PM");

  const [firstAppointment, setFirstAppointment] =
    useState(false);

  const [myofunctionalMode, setMyofunctionalMode] =
    useState<"daily" | "weekly">("daily");
  const [myofunctionalCount, setMyofunctionalCount] =
    useState(1);
  const [myofunctionalDailyOption, setMyofunctionalDailyOption] =
    useState<"day" | "night" | "day and night" | "2 day" | "2 night">(
      "day"
    );
  const [myofunctionalWeeklyDays, setMyofunctionalWeeklyDays] =
    useState<string[]>([]);

  // Clear aligner states
  const [plannedAligners, setPlannedAligners] = useState(30);
  const [givenCount, setGivenCount] = useState(10);
  const [alignerWearDays, setAlignerWearDays] = useState(14);

const [notes, setNotes] = useState("");
const [plannedNotesEnabled, setPlannedNotesEnabled] = useState(false);
const [plannedNotes, setPlannedNotes] = useState("");

const [showNotes, setShowNotes] =
  useState(false);

const [totalFee, setTotalFee] = useState("");
  const [additionalEnabled, setAdditionalEnabled] = useState(false);
  const [additionalAmount, setAdditionalAmount] = useState("");
  const [additionalReason, setAdditionalReason] = useState("");
  const [retainerFee, setRetainerFee] = useState("");
  const [conflictWarning, setConflictWarning] = useState("");
  const [timeConflictMessage, setTimeConflictMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const getSelectedDate = () => {
    if (appointmentMode === "Manual") return normalizeDateIso(appointmentDate);

    // Clear Aligners Auto mode: schedule after given aligners * wearDays
    if (treatmentType === "Clear Aligners" && appointmentMode === "Auto") {
      const today = new Date();
      const daysToAdd = Number(givenCount) * Number(alignerWearDays);
      const future = new Date(today);
      future.setDate(future.getDate() + daysToAdd);
      return normalizeDateIso(future.toISOString().split("T")[0]);
    }

    // If appointmentMode is numeric (e.g., "15 Days" -> 15), parse and add
    const parsed = parseInt(appointmentMode, 10);
    if (!Number.isNaN(parsed)) {
      const future = new Date();
      future.setDate(future.getDate() + parsed);
      return normalizeDateIso(future.toISOString().split("T")[0]);
    }

    // Fallback: 30 days
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    return normalizeDateIso(fallback.toISOString().split("T")[0]);
  };

  const selectedDate = getSelectedDate();
  const isFriday = selectedDate && new Date(selectedDate).getDay() === 5;

  useEffect(() => {
    const loadExistingPatients = async () => {
      try {
        const response = await fetch("/api/patients", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load patients");
        }
        const patients = await response.json();
        if (!selectedDate || !appointmentTime) {
          setTimeConflictMessage("");
          return;
        }

        const conflict = hasAppointmentConflict(
          patients,
          selectedDate,
          appointmentTime
        );

        if (conflict) {
          setTimeConflictMessage(
            `Warning: Another patient is scheduled on ${formatDateDMY(selectedDate)} at ${appointmentTime}.`
          );
        } else {
          setTimeConflictMessage("");
        }
      } catch {
        setTimeConflictMessage("");
      }
    };

    loadExistingPatients();
  }, [selectedDate, appointmentTime]);

  const fixedAppliances = [
    "Hyrax",
    "Quad Helix",
    "TPA",
    "Nance Appliance",
    "Fixed Habit Breaker",
  ];

  const removableAppliances = [
    "Twin Block",
    "Myobrace",
    "Trainer T4K",
    "Frankel",
    "Bionator",
    "Activator",
  ];

  const savePatient = async () => {
    const existingPatients = [] as Patient[];
    try {
      const response = await fetch("/api/patients", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        existingPatients.push(...(Array.isArray(data) ? data : []));
      }
    } catch {
      // ignore and continue with empty list
    }

    const finalDate = selectedDate;
    const finalTreatment =
      treatmentType === "Myofunctional Appliance"
        ? treatment
        : treatmentType;

    const newPatient: Patient = {
      id: Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      clinicName: clinicEnabled ? clinicName.trim() || undefined : undefined,
      clinicColor: clinicEnabled ? clinicColor : undefined,
      address: address.trim() || undefined,
      age: age ? Number(age) : undefined,
      occupation: occupation.trim() || undefined,
      treatment: finalTreatment,
      treatmentCategory: treatmentType,
      bracketType: treatmentType === "Fixed Braces" ? bracketType : undefined,
      caseSheet: caseSheet || "",
      attachments: caseSheetAttachments,
      appointmentDate: finalDate,
      appointmentTime,
      firstAppointment,
      notes: notes.trim(),
      plannedNotes: plannedNotesEnabled ? plannedNotes.trim() : "",
      totalFee: Number(totalFee) || 0,
      totalPaid: Number(additionalAmount) || 0,
      retainerFee: Number(retainerFee) || 0,
      elasticEnabled: false,
      elasticType: "",
      tadsNote: "",
      caseStatus: "active",
      myofunctionalType:
        treatmentType === "Myofunctional Appliance"
          ? finalTreatment
          : undefined,
      myofunctionalProgram:
        treatmentType === "Myofunctional Appliance"
          ? {
              mode: myofunctionalMode,
              count: myofunctionalCount,
              dailyOption:
                myofunctionalMode === "daily"
                  ? myofunctionalDailyOption
                  : undefined,
              weeklyDays:
                myofunctionalMode === "weekly"
                  ? myofunctionalWeeklyDays
                  : undefined,
            }
          : undefined,
          clearAlignersPlan:
            treatmentType === "Clear Aligners"
              ? {
                  total: plannedAligners,
                  given: givenCount,
                  wearDays: alignerWearDays,
                }
              : undefined,
          visits: [],
    };

    const validation = validatePatientRecord(newPatient, existingPatients);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    const conflict = hasAppointmentConflict(
      existingPatients,
      finalDate,
      appointmentTime
    );

    if (conflict) {
      setConflictWarning(
        `Warning: Another patient already has an appointment on ${formatDateDMY(finalDate)} at ${appointmentTime}.`
      );
      // Do not block patient creation for appointment conflicts; warn only.
    }

    setConflictWarning("");
    setValidationErrors([]);

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPatient,
          id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        }),
      });

      if (!response.ok) {
        // Try to show server-provided error details for debugging and clearer UX.
        let msg = "Unable to save the patient right now.";
        try {
          const data = await response.json();
          if (data && data.error) msg = data.error;
          else if (data && data.details) msg = JSON.stringify(data.details);
        } catch (e) {
          // ignore JSON parse errors
        }
        setValidationErrors([msg]);
        return;
      }

      // Read created patient from server and navigate to its profile.
      const created = await response.json().catch(() => null);
      // Debug: log the created object and the id we will navigate to
      try {
        console.log('[DEBUG][client add-patient] server created response:', created);
        console.log('[DEBUG][client add-patient] navigating to id:', created?.id);
      } catch (e) {
        // ignore
      }
      localStorage.removeItem("newPatientCaseSheetDraft");
      if (created && created.id) {
        router.push(`/patients/${created.id}`);
      } else {
        router.push("/patients");
      }
    } catch (error: any) {
      setValidationErrors([error?.message || "Unable to save the patient right now."]);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 w-full">
      <h1 className="text-4xl font-bold text-teal-700 mb-8">
        New Patient
      </h1>

      <div className="bg-white p-8 rounded-xl shadow max-w-full w-full mx-auto max-w-2xl text-black">

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">New Patient</h2>
            <p className="text-sm text-slate-500">Create a patient record directly, or open the dedicated orthodontic case sheet page first.</p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <Link
              href="/case-sheet"
              className="inline-flex items-center justify-center rounded-full bg-teal-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
            >
              Open case sheet page
            </Link>
            <p className="text-xs text-slate-500 max-w-sm text-right">
              The case sheet is saved as a draft. If you fill it first, it will attach when you save the new patient.
            </p>
          </div>
        </div>
        {validationErrors.length > 0 && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-semibold">Please fix the following:</p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        {conflictWarning && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            {conflictWarning}
          </div>
        )}
        {caseSheet && (
          <div className="mb-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-slate-700">
            <p className="font-medium">Case sheet draft loaded.</p>
            <p className="text-sm">Continue on this page to save the new patient, or edit the draft on the case sheet page.</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block mb-2">
            Patient Name
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            className="w-full border p-3 rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2">
            Contact Number
          </label>

          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            className="w-full border p-3 rounded"
            placeholder="e.g., 0770 123 4567"
          />
        </div>
<div className="mb-4">
  <label className="block mb-2">
    Address
  </label>

  <input
    type="text"
    value={address}
    onChange={(e) =>
      setAddress(e.target.value)
    }
    className="w-full border p-3 rounded"
    placeholder="Patient address"
  />
</div>

<div className="mb-4">
  <label className="block mb-2">
    Age (years)
  </label>

  <input
    type="number"
    value={age}
    onChange={(e) =>
      setAge(e.target.value)
    }
    className="w-full border p-3 rounded"
    placeholder="e.g., 25"
    min="0"
    max="120"
  />
</div>

<div className="mb-4">
  <label className="block mb-2">
    Occupation
  </label>

  <input
    type="text"
    value={occupation}
    onChange={(e) =>
      setOccupation(e.target.value)
    }
    className="w-full border p-3 rounded"
    placeholder="Patient occupation"
  />
</div>

<div className="mb-4">
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={clinicEnabled}
      onChange={(e) => setClinicEnabled(e.target.checked)}
    />
    Choose Clinic
  </label>

  {clinicEnabled && (
    <div className="mt-3 space-y-3">
      <div>
        <label className="block mb-2">Clinic Name</label>
        <input
          type="text"
          value={clinicName}
          onChange={(e) => setClinicName(e.target.value)}
          className="w-full border p-3 rounded"
          placeholder="Clinic name"
        />
      </div>

      <div>
        <label className="block mb-2">Color Coding</label>
        <div className="flex items-center gap-2 flex-wrap">
          {CLINIC_COLORS.map((c) => {
            const selected = c === clinicColor;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setClinicColor(c)}
                title={c}
                className={`w-8 h-8 rounded-full ${selected ? 'ring-2 ring-offset-1 ring-teal-500' : 'border border-slate-200'}`}
                style={{ backgroundColor: c }}
              />
            );
          })}
        </div>
      </div>
    </div>
  )}
</div>

        <div className="mb-4">
          <label className="block mb-2">
            Treatment
          </label>

          <select
            value={treatmentType}
            onChange={(e) => {
              const value = e.target.value;

              setTreatmentType(value);

              if (
                value !==
                "Myofunctional Appliance"
              ) {
                setTreatment(value);
              } else {
                setTreatment("Hyrax");
              }
            }}
            className="w-full border p-3 rounded"
          >
            <option>Fixed Braces</option>
<option>Clear Aligners</option>
<option>Retainers</option>
<option>
  Myofunctional Appliance
</option>
</select>

{treatmentType === "Fixed Braces" && (
  <div className="mt-4">
    <label className="block mb-2">
      Bracket System
    </label>

    <select
      value={bracketType}
      onChange={(e) =>
        setBracketType(e.target.value)
      }
      className="w-full border p-3 rounded"
    >
      <option>MBT System</option>
      <option>Roth System</option>
      <option>Damon System</option>
    </select>
  </div>
)}
{treatmentType === "Retainers" && (
  <div className="mt-4">
    <label className="block mb-2">Retainer Fee</label>
    <div className="flex items-center gap-2">
      <input type="text" value={retainerFee ? Number(retainerFee).toLocaleString() : retainerFee} onChange={(e) => setRetainerFee(e.target.value.replace(/\D/g, ""))} placeholder="0" className="flex-1 border p-3 rounded" />
      <span className="font-semibold text-slate-700">IQD</span>
    </div>
    <p className="text-sm text-slate-500 mt-2">This will be recorded as the retainer charge for this patient.</p>
  </div>
)}
</div>

        {treatmentType ===
          "Myofunctional Appliance" && (
          <>
            <div className="mb-4">
              <label className="block mb-2">
                Myofunctional Type
              </label>

              <select
                value={MyofunctionalType}
                onChange={(e) => {
                  const value =
                    e.target.value;

                  setMyofunctionalType(
                    value
                  );

                  if (
                    value === "Fixed"
                  ) {
                    setTreatment(
                      "Hyrax"
                    );
                  } else {
                    setTreatment(
                      "Twin Block"
                    );
                  }
                }}
                className="w-full border p-3 rounded"
              >
                <option value="Fixed">
                  Fixed
                </option>

                <option value="Removable">
                  Removable
                </option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block mb-2">
                Appliance
              </label>

              <select
                value={treatment}
                onChange={(e) =>
                  setTreatment(
                    e.target.value
                  )
                }
                className="w-full border p-3 rounded"
              >
                {MyofunctionalType ===
                "Fixed"
                  ? fixedAppliances.map(
                      (
                        appliance
                      ) => (
                        <option
                          key={
                            appliance
                          }
                        >
                          {appliance}
                        </option>
                      )
                    )
                  : removableAppliances.map(
                      (
                        appliance
                      ) => (
                        <option
                          key={
                            appliance
                          }
                        >
                          {appliance}
                        </option>
                      )
                    )}
              </select>
            </div>

              <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="text-sm font-semibold text-slate-700 mb-3">
                  Myofunctional activation plan
                </div>

                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() =>
                      setMyofunctionalMode("daily")
                    }
                    className={`px-3 py-2 rounded-lg border ${
                      myofunctionalMode === "daily"
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMyofunctionalMode("weekly")
                    }
                    className={`px-3 py-2 rounded-lg border ${
                      myofunctionalMode === "weekly"
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    Weekly
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block mb-2">
                    How many times?
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={myofunctionalCount}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setMyofunctionalCount(
                        value > 10 ? 10 : value < 1 ? 1 : value
                      );
                      if (
                        myofunctionalMode === "weekly" &&
                        myofunctionalWeeklyDays.length > value
                      ) {
                        setMyofunctionalWeeklyDays(
                          myofunctionalWeeklyDays.slice(0, value)
                        );
                      }
                    }}
                    className="w-full border p-3 rounded"
                  />
                </div>

                {myofunctionalMode === "daily" ? (
                  <div className="mb-4">
                    <label className="block mb-2">
                      Choose daily timing
                    </label>
                    <select
                      value={myofunctionalDailyOption}
                      onChange={(e) =>
                        setMyofunctionalDailyOption(
                          e.target.value as
                            | "day"
                            | "night"
                            | "day and night"
                            | "2 day"
                            | "2 night"
                        )
                      }
                      className="w-full border p-3 rounded"
                    >
                      <option value="day">
                        1 time - day
                      </option>
                      <option value="night">
                        1 time - night
                      </option>
                      <option value="day and night">
                        2 times - day and night
                      </option>
                      <option value="2 day">
                        2 times - day only
                      </option>
                      <option value="2 night">
                        2 times - night only
                      </option>
                    </select>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="block mb-2">
                      Choose the weekdays to activate
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        "Sunday",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                      ].map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setMyofunctionalWeeklyDays((current) => {
                              if (current.includes(day)) {
                                return current.filter(
                                  (item) => item !== day
                                );
                              }
                              if (current.length >= myofunctionalCount) {
                                return current;
                              }
                              return [...current, day];
                            });
                          }}
                          className={`rounded-lg border px-3 py-2 text-sm text-slate-700 ${
                            myofunctionalWeeklyDays.includes(day)
                              ? "border-teal-600 bg-teal-50"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Select up to {myofunctionalCount} day(s).
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

        {treatmentType === "Clear Aligners" && (
          <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-sm font-semibold text-slate-700 mb-3">Clear Aligners plan</div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center mb-3">
              <div>
                <label className="block mb-1 text-sm">Planned total aligners</label>
                <input
                  type="number"
                  min={1}
                  value={plannedAligners}
                  onChange={(e) => setPlannedAligners(Number(e.target.value) || 0)}
                  className="w-full border p-2 rounded"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm">Mark given at this visit</label>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-slate-600">Click dots below to mark</div>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-sm">Days per aligner</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setAlignerWearDays((v) => Math.max(1, v - 1))} className="px-3 py-1 bg-white border rounded">-</button>
                  <input type="number" min={1} value={alignerWearDays} onChange={(e) => setAlignerWearDays(Number(e.target.value) || 0)} className="w-20 text-center border p-2 rounded" />
                  <button type="button" onClick={() => setAlignerWearDays((v) => v + 1)} className="px-3 py-1 bg-white border rounded">+</button>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="block mb-1 text-sm">Aligners (total)</label>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: Math.max(0, plannedAligners) }).map((_, i) => {
                  const selected = i < givenCount;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setGivenCount((cur) => (cur === i + 1 ? i : i + 1))}
                      title={`Aligner ${i + 1}`}
                      className={`w-3 h-3 rounded-full transition-colors ${selected ? 'bg-teal-700' : 'bg-slate-300'}`}
                    />
                  );
                })}
              </div>
              <div className="text-sm text-slate-700 mt-2">Given this visit: <strong>{givenCount}</strong></div>
            </div>

            <div className="text-sm text-slate-700">
              Next appointment (auto): <strong>{treatmentType === "Clear Aligners" ? `${givenCount * alignerWearDays} days from today` : "N/A"}</strong>
            </div>
          </div>
        )}

          <div className="mb-4">
            <label className="block mb-2">
              Next Appointment Date
            </label>

            <select
              value={appointmentMode}
              onChange={(e) => setAppointmentMode(e.target.value)}
              className="w-full border p-3 rounded"
            >
              {treatmentType === "Clear Aligners" ? (
                <>
                  <option>Auto</option>
                  <option>Manual</option>
                </>
              ) : (
                <>
                  <option>15</option>
                  <option>30</option>
                  <option>45</option>
                  <option>60</option>
                  <option>Manual</option>
                </>
              )}
            </select>
            {isFriday && (
              <p className="text-sm text-orange-700 mt-2">
                Note: The selected appointment falls on Friday.
              </p>
            )}
          </div>

          {appointmentMode === "Manual" && (
            <div className="mb-4">
              <label className="block mb-2">
                Appointment Date
              </label>

              <DateInput
                value={appointmentDate}
                onChange={setAppointmentDate}
                className="w-full border p-3 rounded"
              />
                {isFriday && (
                  <p className="text-sm text-orange-700 mt-2">
                    Note: The selected appointment falls on Friday.
                  </p>
                )}
            </div>
          )}

          <div className="mb-6">
            <div className="bg-teal-50 border rounded-lg p-3">
              <strong>Selected Date:</strong>{" "}

              {selectedDate || "-"}
            </div>

            {isFriday && (
              <div className="mt-2 bg-red-100 border border-red-300 text-red-700 p-3 rounded">
                Note: This appointment is scheduled on Friday
              </div>
            )}
          </div>

        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={firstAppointment}
              onChange={(e) =>
                setFirstAppointment(
                  e.target.checked
                )
              }
            />
            First Appointment
          </label>
        </div>

        {firstAppointment && (
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={plannedNotesEnabled}
                onChange={(e) =>
                  setPlannedNotesEnabled(
                    e.target.checked
                  )
                }
              />
              Planned Notes for first visit
            </label>
            {plannedNotesEnabled && (
              <textarea
                value={plannedNotes}
                onChange={(e) =>
                  setPlannedNotes(e.target.value)
                }
                rows={4}
                placeholder="Enter a future note for the first appointment"
                className="w-full border p-3 rounded mt-3"
              />
            )}
          </div>
        )}

       <div className="mb-4">

  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={showNotes}
      onChange={(e) =>
        setShowNotes(
          e.target.checked
        )
      }
    />

    Treatment Notes
  </label>

</div>

{showNotes && (
  <div className="mb-4">

    <textarea
      value={notes}
      onChange={(e) =>
        setNotes(e.target.value)
      }
      rows={5}
      placeholder="Write treatment notes..."
      className="w-full border p-3 rounded"
    />

  </div>
)}

        <div className="mb-4">
          <label className="block mb-2">
            Total Treatment Fee (Optional)
          </label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={totalFee ? Number(totalFee).toLocaleString() : ""}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setTotalFee(digits);
              }}
              placeholder="1,500,000"
              className="flex-1 border p-3 rounded"
            />
            <span className="font-semibold text-slate-700">IQD</span>
          </div>

          <p className="text-sm text-gray-500 mt-1">
            Optional field.
          </p>
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={additionalEnabled}
              onChange={(e) => setAdditionalEnabled(e.target.checked)}
            />
            Additional payment
          </label>

          {additionalEnabled && (
            <div className="mt-3 space-y-2">
              <div>
                <label className="block mb-1 text-sm">Additional fees</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={additionalAmount ? Number(additionalAmount).toLocaleString() : ""}
                    onChange={(e) => setAdditionalAmount(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    className="flex-1 border p-3 rounded"
                  />
                  <span className="font-semibold text-slate-700">IQD</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">This amount will be added to total paid.</p>
              </div>
              <div>
                <label className="block mb-1 text-sm">Reason for additional fee</label>
                <input type="text" value={additionalReason} onChange={(e) => setAdditionalReason(e.target.value)} className="w-full border p-2 rounded" />
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="block mb-2">
            Appointment Time
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
            <option>09:00 PM</option>
            <option>10:00 PM</option>
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

        <button
          type="button"
          onClick={savePatient}
          className="bg-teal-600 text-white px-6 py-3 rounded-lg relative z-10"
        >
          Save Patient
        </button>

      </div>
    </main>
    </div>
  );
}
