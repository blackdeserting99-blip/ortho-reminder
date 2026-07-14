"use client";

import { useId, useRef } from "react";

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
  const generatedId = useId();
  const inputId = id || generatedId;
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    // Try to use the new showPicker API when available (Chrome)
    try {
      // @ts-ignore
      if (typeof el.showPicker === "function") {
        // @ts-ignore
        el.showPicker();
        return;
      }
    } catch (e) {
      // ignore
    }

    // Fallback to focusing the input which should open the native UI on some platforms
    el.focus();
  };

  return (
    <div
      onClick={openPicker}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(); }}
      className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition duration-200 hover:border-teal-500 hover:shadow-md focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200 cursor-pointer ${className}`}
    >
      <input
        id={inputId}
        ref={inputRef}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="block h-10 w-full border-0 bg-transparent p-0 text-slate-900 outline-none"
      />
    </div>
  );
}

