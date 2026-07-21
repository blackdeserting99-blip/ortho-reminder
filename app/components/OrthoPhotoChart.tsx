"use client";

import { useRef } from "react";

export type OrthoPhotoSlotKey =
  | "frontFace"
  | "smile"
  | "profile"
  | "upperOcclusal"
  | "lowerOcclusal"
  | "leftBuccal"
  | "frontalIntraoral"
  | "rightBuccal";

export type OrthoPhotoSlotValue = {
  name: string;
  previewUrl: string;
};

type OrthoPhotoChartProps = {
  photos: Partial<Record<OrthoPhotoSlotKey, OrthoPhotoSlotValue>>;
  onSelectPhoto: (slotKey: OrthoPhotoSlotKey, file: File) => void;
  onRemovePhoto: (slotKey: OrthoPhotoSlotKey) => void;
  patientName: string;
  ageText?: string;
  dentistText?: string;
  bracesText?: string;
  dateText?: string;
};

type SlotDefinition = {
  key: OrthoPhotoSlotKey;
  label: string;
  category: string;
};

export const ORTHO_PHOTO_UPLOAD_SLOTS: SlotDefinition[] = [
  { key: "frontFace", label: "Patient Normal", category: "Front Face" },
  { key: "smile", label: "Patient Smiling", category: "Smile" },
  { key: "profile", label: "Patient Profile", category: "Profile" },
  { key: "upperOcclusal", label: "Upper Arch", category: "Upper Occlusal" },
  { key: "lowerOcclusal", label: "Lower Arch", category: "Lower Occlusal" },
  { key: "leftBuccal", label: "Left", category: "Left Buccal" },
  { key: "frontalIntraoral", label: "Middle", category: "Frontal Intraoral" },
  { key: "rightBuccal", label: "Right", category: "Right Buccal" },
];

const SLOT_LAYOUT: Array<SlotDefinition | { key: "infoCard"; label: string }> = [
  ORTHO_PHOTO_UPLOAD_SLOTS[0],
  ORTHO_PHOTO_UPLOAD_SLOTS[1],
  ORTHO_PHOTO_UPLOAD_SLOTS[2],
  ORTHO_PHOTO_UPLOAD_SLOTS[3],
  { key: "infoCard", label: "Patient Information" },
  ORTHO_PHOTO_UPLOAD_SLOTS[4],
  ORTHO_PHOTO_UPLOAD_SLOTS[5],
  ORTHO_PHOTO_UPLOAD_SLOTS[6],
  ORTHO_PHOTO_UPLOAD_SLOTS[7],
];

export default function OrthoPhotoChart({
  photos,
  onSelectPhoto,
  onRemovePhoto,
  patientName,
  ageText,
  dentistText,
  bracesText,
  dateText,
}: OrthoPhotoChartProps) {
  const fileInputRefs = useRef<Partial<Record<OrthoPhotoSlotKey, HTMLInputElement | null>>>({});

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {SLOT_LAYOUT.map((slot) => {
        if (slot.key === "infoCard") {
          return (
            <div
              key="infoCard"
              className="flex min-h-[190px] flex-col items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-5 text-center"
            >
              <p className="text-lg font-semibold text-slate-900">{patientName || "Patient"}</p>
              <p className="mt-2 text-sm text-slate-700">Age: {ageText || "-"}</p>
              <p className="text-sm text-slate-700">Dentist: {dentistText || "-"}</p>
              <p className="text-sm text-slate-700">Braces: {bracesText || "-"}</p>
              <p className="mt-2 text-sm font-medium text-slate-800">{dateText || "-"}</p>
            </div>
          );
        }

        const photo = photos[slot.key];

        return (
          <div
            key={slot.key}
            className="rounded-2xl border border-slate-300 bg-white p-2"
          >
            <input
              ref={(node) => {
                fileInputRefs.current[slot.key] = node;
              }}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onSelectPhoto(slot.key, file);
                }
                event.target.value = "";
              }}
            />

            {photo ? (
              <img
                src={photo.previewUrl}
                alt={photo.name}
                className="h-44 w-full rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-44 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-center text-xs text-slate-500">
                Add {slot.label}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="truncate text-xs font-medium text-slate-700">{slot.label}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[slot.key]?.click()}
                  className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
                >
                  {photo ? "Replace" : "Add"}
                </button>
                {photo ? (
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(slot.key)}
                    className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
