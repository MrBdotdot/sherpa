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

const STEPS = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="24" height="18" rx="3" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1.5" />
        <rect x="5" y="7" width="18" height="12" rx="1.5" fill="#f9fafb" />
        <circle cx="14" cy="13" r="2.5" fill="#6b7280" />
        <circle cx="14" cy="13" r="1.2" fill="#374151" />
      </svg>
    ),
    title: "Main Page",
    description:
      "Your game's background image or 3D model. This is what players see first — set the scene with box art or a board photo.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x="4" y="3" width="20" height="22" rx="3" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1.5" />
        <rect x="7" y="7" width="14" height="2" rx="1" fill="#9ca3af" />
        <rect x="7" y="11" width="10" height="2" rx="1" fill="#9ca3af" />
        <rect x="7" y="15" width="12" height="2" rx="1" fill="#9ca3af" />
      </svg>
    ),
    title: "Cards",
    description:
      "Each card holds rules content — text, images, videos, steps. Cards pop up when players tap a hotspot or button on the Main Page.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="5" fill="#374151" opacity="0.15" />
        <circle cx="14" cy="14" r="3" fill="#374151" />
        <circle cx="14" cy="14" r="1.5" fill="white" />
        <circle cx="14" cy="14" r="5" stroke="#374151" strokeWidth="1.2" fill="none" opacity="0.5" />
      </svg>
    ),
    title: "Hotspots",
    description:
      "Click anywhere on the Main Page to drop a hotspot. Players tap it to open the linked card. Drag to reposition anytime.",
  },
];

export function OnboardingModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
      >
        <div className="mb-1 text-xl font-bold text-neutral-900" id="onboarding-title">
          Welcome to Sherpa
        </div>
        <p className="mb-6 text-sm text-neutral-500">
          Build a live rules experience for your game in three simple pieces.
        </p>

        <div className="mb-7 space-y-5">
          {STEPS.map((step) => (
            <div key={step.title} className="flex gap-4">
              <div className="mt-0.5 shrink-0">{step.icon}</div>
              <div>
                <div className="mb-0.5 font-semibold text-neutral-900">{step.title}</div>
                <div className="text-sm leading-5 text-neutral-500">{step.description}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700"
        >
          Get started
        </button>
      </div>
    </div>,
    document.body
  );
}
