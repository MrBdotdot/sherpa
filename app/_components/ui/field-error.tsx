import React from "react";

export function FieldError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="mt-2 flex items-start gap-1.5 text-xs leading-5" style={{ color: "var(--color-error)" }}>
      <svg
        width="13"
        height="13"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        aria-hidden="true"
        className="mt-px shrink-0"
      >
        <path d="M7 2v5" />
        <circle cx="7" cy="10.5" r=".75" fill="currentColor" />
      </svg>
      {children}
    </div>
  );
}
