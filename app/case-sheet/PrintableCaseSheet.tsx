"use client";

type Draft = Record<string, any>;

const eruptionQuadrants = [
  { key: "upper-right", label: "Upper right", numbers: ["8", "7", "6", "5", "4", "3", "2", "1"] },
  { key: "upper-left", label: "Upper left", numbers: ["1", "2", "3", "4", "5", "6", "7", "8"] },
  { key: "lower-right", label: "Lower right", numbers: ["8", "7", "6", "5", "4", "3", "2", "1"] },
  { key: "lower-left", label: "Lower left", numbers: ["1", "2", "3", "4", "5", "6", "7", "8"] },
];

function formatRelationSummary(pattern: string, classValue: string, leftValue: string, rightValue: string) {
  if (pattern === "Asymmetric") {
    return `Asymmetric (L: ${leftValue || "-"}, R: ${rightValue || "-"})`;
  }

  return classValue || "-";
}

function getHabitSummary(draft: Draft) {
  const items = [
    draft.habitThumb && "Thumb sucking",
    draft.habitLip && "Lip habit",
    draft.habitTongue && "Tongue habit",
    draft.habitMouth && "Mouth breathing",
    draft.habitNail && "Nail biting",
    draft.habitOther && `Other: ${draft.habitOther}`,
  ].filter(Boolean);

  return items.length > 0 ? items.join(", ") : "None";
}

export default function PrintableCaseSheet({ draft }: { draft: Draft }) {
  return (
    <div id="print-template" className="print-only print-template">
      <div className="print-page">
        <div className="print-title">ORTHODONTIC CASE SHEET</div>
        <div className="print-meta-row">
          <div className="print-field"><span>Exam Date</span><span>{draft.examDate || "-"}</span></div>
        </div>
        <div className="print-section">
          <div className="print-section-heading">Patient Details</div>
          <div className="print-grid-2">
            <div className="print-field"><span>Name</span><span>{draft.name || "-"}</span></div>
            <div className="print-field"><span>Age</span><span>{draft.age || "-"}</span></div>
            <div className="print-field"><span>Gender</span><span>{draft.gender || "-"}</span></div>
            <div className="print-field"><span>Address</span><span>{draft.homeAddress || "-"}</span></div>
            <div className="print-field"><span>Phone</span><span>{draft.mobile || draft.phone || draft.homePhone || "-"}</span></div>
            <div className="print-field"><span>Occupation</span><span>{draft.occupation || "-"}</span></div>
            <div className="print-field"><span>Guardian</span><span>{draft.guardianName || "-"}</span></div>
          </div>
        </div>
        <div className="print-section">
          <div className="print-section-heading">History</div>
          <div className="print-field"><span>Medical history</span><span>{draft.medicalHistory || "-"}</span></div>
          <div className="print-field"><span>Chief complaint</span><span>{draft.chiefComplaint || "-"}</span></div>
          <div className="print-field"><span>Past orthodontic treatment</span><span>{draft.pastTreatment === "yes" ? `Yes, removed ${draft.treatmentRemovedDate || "-"}` : "No"}</span></div>
        </div>
        <div className="print-section">
          <div className="print-section-heading">Clinical Examination</div>
          <div className="print-grid-2">
            <div className="print-field"><span>Profile maxilla</span><span>{draft.extraOralProfileMaxilla || "-"}</span></div>
            <div className="print-field"><span>Profile mandible</span><span>{draft.extraOralProfileMandible || "-"}</span></div>
            <div className="print-field"><span>Vertical height</span><span>{draft.extraOralVerticalHeight || "-"}</span></div>
            <div className="print-field"><span>Deviation</span><span>{draft.extraOralDeviation || "-"}</span></div>
            <div className="print-field"><span>Lip position</span><span>{draft.extraOralLipPosition || "-"}</span></div>
            <div className="print-field"><span>Tongue size</span><span>{draft.intraoralTongueSize || "-"}</span></div>
            <div className="print-field"><span>Arch ratio</span><span>{draft.intraoralToothArchRatio || "-"}</span></div>
            <div className="print-field"><span>Overjet</span><span>{draft.overjet || "-"}</span></div>
            <div className="print-field"><span>Overbite</span><span>{draft.overbite || "-"}</span></div>
            <div className="print-field"><span>AP relation</span><span>{formatRelationSummary(draft.apRelationPattern, draft.apRelationClass, draft.apRelationLeft, draft.apRelationRight)}</span></div>
            <div className="print-field"><span>Canine relation</span><span>{formatRelationSummary(draft.canineRelationPattern, draft.canineRelationClass, draft.canineRelationLeft, draft.canineRelationRight)}</span></div>
            <div className="print-field"><span>Molar relation</span><span>{formatRelationSummary(draft.molarRelationPattern, draft.molarRelationClass, draft.molarRelationLeft, draft.molarRelationRight)}</span></div>
          </div>
        </div>
        <div className="print-section">
          <div className="print-section-heading">Crossbite</div>
          <div className="print-grid-2">
            <div className="print-field"><span>Type</span><span>{draft.crossbiteType || "-"}</span></div>
            <div className="print-field"><span>Pattern</span><span>{draft.crossbitePattern || "-"}</span></div>
            <div className="print-field"><span>Side</span><span>{draft.crossbiteSide || "-"}</span></div>
            <div className="print-field"><span>Teeth</span><span>{draft.crossbiteTeethCount || "-"}</span></div>
          </div>
        </div>
        <div className="print-section">
          <div className="print-section-heading">Eruption Chart</div>
          <div className="print-eruption-grid">
            {eruptionQuadrants.map((quadrant) => (
              <div key={quadrant.key} className="print-eruption-card">
                <div className="print-eruption-label">{quadrant.label}</div>
                <div className="print-eruption-number-row">
                  {quadrant.numbers.map((number) => (
                    <div key={`${quadrant.key}-${number}-label`} className="print-eruption-number">
                      {number}
                    </div>
                  ))}
                </div>
                <div className="print-eruption-status-row">
                  {quadrant.numbers.map((number) => {
                    const key = `${quadrant.key}-${number}`;
                    const status = draft.eruptionStatus?.[key] || "not-present";
                    return (
                      <div key={`${quadrant.key}-${number}-status`} className={`print-eruption-cell ${status === "present" ? "present" : "not-present"}`}>
                        {status === "present" ? "✔" : "✕"}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="print-section">
          <div className="print-section-heading">Other Dental Findings</div>
          <div className="print-grid-2">
            <div className="print-field"><span>Supernumerary</span><span>{draft.supernumeraryTeeth || "-"}</span></div>
            <div className="print-field"><span>Missing teeth</span><span>{draft.congenitallyMissingTeeth || "-"}</span></div>
            <div className="print-field"><span>Impacted teeth</span><span>{draft.impactedTeeth || "-"}</span></div>
          </div>
        </div>
        <div className="print-section">
          <div className="print-section-heading">Habits</div>
          <div className="print-field"><span>Habit summary</span><span>{getHabitSummary(draft)}</span></div>
        </div>
        <div className="print-section">
          <div className="print-section-heading">Treatment Plan</div>
          <div className="print-field"><span>Plan</span><span>{draft.treatmentPlan || "-"}</span></div>
        </div>
      </div>
    </div>
  );
}
