"use client";

import React, { useEffect, useRef } from "react";

type Props = {
  title?: string;
  description?: string;
  show: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  children?: React.ReactNode;
  variant?: "default" | "danger";
};

export default function Modal({
  title,
  description,
  show,
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  children,
  variant = "default",
}: Props) {
  if (!show) return null;
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);

    // focus the first focusable element in the dialog
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) focusable[0].focus();
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  const onOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onCancel();
  };

  return (
    <div
      ref={overlayRef}
      onMouseDown={onOverlayMouseDown}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      aria-hidden={!show}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        aria-describedby={description ? "modal-desc" : undefined}
        className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 transform transition-all duration-150 ease-out scale-100"
      >
        {title && (
          <h3 id="modal-title" className="text-xl font-semibold mb-2">
            {title}
          </h3>
        )}
        {description && (
          <p id="modal-desc" className="text-sm text-slate-600 mb-4">
            {description}
          </p>
        )}

        {children}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="bg-slate-200 px-4 py-2 rounded"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded ${variant === "danger" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}
          >
            {variant === "danger" ? "\u274C " : ""}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
