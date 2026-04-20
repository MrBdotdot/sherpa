"use client";

import React from "react";

type BannerVariant = "error" | "warn";

type BannerAction = {
  label: string;
  onClick: () => void;
  primary?: boolean;
};

type ErrorBannerProps = {
  variant?: BannerVariant;
  title: string;
  body?: React.ReactNode;
  actions?: BannerAction[];
  onDismiss?: () => void;
};

function ErrorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="10" cy="10" r="8" />
      <path d="M10 6v4" strokeLinecap="round" />
      <circle cx="10" cy="13.5" r=".8" fill="currentColor" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M10 2.5l8 14H2l8-14z" strokeLinejoin="round" />
      <path d="M10 8v4" strokeLinecap="round" />
      <circle cx="10" cy="14.5" r=".8" fill="currentColor" />
    </svg>
  );
}

export function ErrorBanner({ variant = "error", title, body, actions, onDismiss }: ErrorBannerProps) {
  const isWarn = variant === "warn";

  const containerStyle: React.CSSProperties = isWarn
    ? { background: "var(--color-warn-bg)", borderColor: "var(--color-warn-border)", color: "#5a3a0b" }
    : { background: "var(--color-error-bg)", borderColor: "var(--color-error-border)", color: "#7f1d1d" };

  const iconStyle: React.CSSProperties = { color: isWarn ? "var(--color-warn)" : "var(--color-error)" };
  const titleStyle: React.CSSProperties = { color: isWarn ? "#3f2804" : "#450a0a" };
  const actionBorderColor = isWarn
    ? "rgba(201,122,31,0.4)"
    : "rgba(185,28,28,0.4)";
  const actionColor = isWarn ? "var(--color-warn)" : "var(--color-error)";
  const actionHoverBg = isWarn ? "rgba(201,122,31,0.08)" : "rgba(185,28,28,0.08)";

  return (
    <div
      role="alert"
      className="flex gap-3 rounded-[10px] border p-3.5"
      style={containerStyle}
    >
      <span className="mt-px shrink-0" style={iconStyle}>
        {isWarn ? <WarnIcon /> : <ErrorIcon />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="mb-0.5 text-sm font-semibold leading-5" style={titleStyle}>{title}</div>
        {body && <div className="text-[12.5px] leading-5">{body}</div>}
        {actions && actions.length > 0 && (
          <div className="mt-2.5 flex gap-2">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="rounded-full px-3 py-1 font-sans text-xs font-semibold transition"
                style={action.primary
                  ? { background: isWarn ? "var(--color-warn)" : "var(--color-error)", color: "#fff", border: "none" }
                  : { background: "transparent", border: `1px solid ${actionBorderColor}`, color: actionColor }
                }
                onMouseEnter={(e) => {
                  if (!action.primary) (e.currentTarget as HTMLButtonElement).style.background = actionHoverBg;
                }}
                onMouseLeave={(e) => {
                  if (!action.primary) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded p-0.5 opacity-50 hover:opacity-100 transition-opacity"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      )}
    </div>
  );
}
