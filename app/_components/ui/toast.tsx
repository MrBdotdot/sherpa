"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastVariant = "error" | "warn" | "success" | "info";

type Toast = {
  id: string;
  variant: ToastVariant;
  title: string;
  body?: string;
  undoLabel?: string;
  onUndo?: () => void;
  duration?: number;
};

type ToastContextValue = {
  show: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ACCENT: Record<ToastVariant, string> = {
  error:   "#ff6b6b",
  warn:    "#c97a1f",
  success: "#6b85ff",
  info:    "#6b85ff",
};

const BORDER: Record<ToastVariant, string> = {
  error:   "rgba(255,107,107,0.28)",
  warn:    "rgba(201,122,31,0.32)",
  success: "rgba(107,133,255,0.28)",
  info:    "rgba(107,133,255,0.28)",
};

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const color = ACCENT[variant];
  if (variant === "error") return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" aria-hidden="true">
      <circle cx="10" cy="10" r="8"/><path d="M10 6v4" strokeLinecap="round"/><circle cx="10" cy="13.5" r=".8" fill={color}/>
    </svg>
  );
  if (variant === "warn") return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" aria-hidden="true">
      <path d="M10 2.5l8 14H2l8-14z" strokeLinejoin="round"/><path d="M10 8v4" strokeLinecap="round"/>
    </svg>
  );
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" aria-hidden="true">
      <circle cx="10" cy="10" r="8"/><path d="M7 10l2 2 4-4" strokeLinecap="round"/>
    </svg>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, toast.duration ?? 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast.duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-2.5 rounded-[10px] px-3.5 py-3 text-[#f1ede4] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]"
      style={{
        background: "#1f1b2b",
        border: `1px solid ${BORDER[toast.variant]}`,
        borderLeft: `3px solid ${ACCENT[toast.variant]}`,
      }}
    >
      <ToastIcon variant={toast.variant} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold leading-5">{toast.title}</div>
        {toast.body && (
          <p className="mt-0.5 text-xs leading-5" style={{ color: "rgba(255,255,255,0.65)" }}>
            {toast.body}
            {toast.onUndo && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => { toast.onUndo?.(); onDismiss(); }}
                  className="font-semibold"
                  style={{ color: "#8a9cff", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  {toast.undoLabel ?? "Undo"}
                </button>
              </>
            )}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 opacity-40 hover:opacity-80 transition-opacity"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M3 3l8 8M11 3l-8 8" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          aria-label="Notifications"
          className="fixed bottom-5 left-1/2 z-[9999] flex -translate-x-1/2 flex-col gap-2 w-full max-w-sm px-4 pointer-events-none"
        >
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onDismiss={() => dismiss(toast.id)} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
