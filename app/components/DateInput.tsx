"use client";

import { useRef } from "react";

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  id?: string;
};

export default function DateInput({
  value,
  onChange,
  className = "",
  placeholder = "Select date",
  min,
  max,
  id,
}: DateInputProps) {
  const nativeInputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    const input = nativeInputRef.current;
    if (!input) return;

    input.focus();

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.click();
  };

  return (
    <div className="relative w-full">
      <input
        id={id}
        type="text"
        value={value}
        readOnly
        onClick={openPicker}
        onFocus={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm ${className}`}
      />
      <input
        ref={nativeInputRef}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-hidden="true"
      />
    </div>
  );
}
