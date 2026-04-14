"use client";

import { createPortal } from "react-dom";
import { useFocusTrap } from "@/app/_hooks/useFocusTrap";

const STORAGE_KEY = "sherpa-onboarding-v1";

export function shouldShowOnboarding(): boolean {
  try {
    return !localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

export function dismissOnboarding(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "done");
  } catch { /* noop */ }
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* noop */ }
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="shrink-0 text-neutral-300">
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CHOICES = [
  {
    id: "tutorial",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="1" y="3" width="20" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 8l6 3-6 3V8z" fill="currentColor" opacity="0.7" />
      </svg>
    ),
    title: "Take the tutorial",
    description: "Walk through the studio with an interactive guide",
    comingSoon: false,
  },
  {
    id: "import",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="3" y="1" width="13" height="18" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 6h6M8 9h6M8 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M15 15l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Import a rulebook",
    description: "Upload a PDF and we'll structure your cards",
    comingSoon: false,
  },
  {
    id: "fresh",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.4" />
        <path d="M11 7v8M7 11h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
    title: "Start from scratch",
    description: "Blank canvas, build exactly what you need",
    comingSoon: false,
  },
  {
    id: "template",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <rect x="12" y="2" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <rect x="2" y="12" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <rect x="12" y="12" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
    title: "Start from a template",
    description: "Pre-built starting points for common game types",
    comingSoon: true,
  },
];

export function OnboardingModal({
  isOpen,
  onClose,
  onImportPdf,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImportPdf: () => void;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);
  if (!isOpen) return null;

  function handleChoice(id: string) {
    if (id === "tutorial") {
      window.open("/play/tutorial-sherpa-v1", "_blank", "noopener,noreferrer");
      onClose();
    } else if (id === "import") {
      onImportPdf();
    } else if (id === "fresh") {
      onClose();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl"
      >
        <div className="mb-1 text-xl font-bold text-neutral-900" id="onboarding-title">
          Welcome to Sherpa
        </div>
        <p className="mb-4 text-sm text-neutral-500">
          How would you like to get started?
        </p>

        {/* Video placeholder — swap for real embed when walkthrough is ready */}
        <div className="mb-4 flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-neutral-100">
          <div className="flex flex-col items-center gap-2 text-neutral-400">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" />
              <polygon points="13,10 24,16 13,22" fill="currentColor" opacity="0.6" />
            </svg>
            <span className="text-xs font-medium">Walkthrough coming soon</span>
          </div>
        </div>

        <div className="space-y-2">
          {CHOICES.map((choice) =>
            choice.comingSoon ? (
              <div
                key={choice.id}
                className="flex w-full items-center gap-4 rounded-2xl border border-neutral-100 px-4 py-3.5 opacity-40 cursor-not-allowed"
              >
                <div className="shrink-0 text-neutral-400">{choice.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-900">{choice.title}</span>
                    <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                      Coming soon
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-400">{choice.description}</div>
                </div>
              </div>
            ) : (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleChoice(choice.id)}
                className="flex w-full items-center gap-4 rounded-2xl border border-neutral-200 px-4 py-3.5 text-left transition hover:border-neutral-300 hover:bg-neutral-50"
              >
                <div className="shrink-0 text-neutral-600">{choice.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-neutral-900">{choice.title}</div>
                  <div className="mt-0.5 text-xs text-neutral-500">{choice.description}</div>
                </div>
                <ChevronRight />
              </button>
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
