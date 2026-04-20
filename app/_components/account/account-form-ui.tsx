"use client";

import React from "react";

export function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-neutral-500">{label}</label>
      {children}
    </div>
  );
}

export function TextInput({
  placeholder,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-500 focus:border-[#5B7AF5] focus:ring-2 focus:ring-[#5B7AF5]/25 disabled:bg-neutral-50 disabled:text-neutral-500"
    />
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-neutral-900">{label}</div>
        {description && <div className="mt-0.5 text-xs text-neutral-500">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-[#5B7AF5]" : "bg-neutral-200"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4" : ""}`}
        />
      </button>
    </div>
  );
}

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
    </div>
  );
}

export function Divider() {
  return <div className="my-5 border-t border-neutral-100" />;
}

export type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveButton({
  onSave,
  saveState,
  label = "Save changes",
}: {
  onSave: () => void;
  saveState: SaveState;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onSave}
        disabled={saveState === "saving"}
        className="rounded-full bg-[#5B7AF5] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4059EB] disabled:opacity-50"
      >
        {saveState === "saving" ? "Saving…" : label}
      </button>
      {saveState === "saved" && (
        <span className="text-xs font-medium text-emerald-600">Saved</span>
      )}
      {saveState === "error" && (
        <span className="text-xs font-medium text-red-500">Could not save. Try again.</span>
      )}
    </div>
  );
}
