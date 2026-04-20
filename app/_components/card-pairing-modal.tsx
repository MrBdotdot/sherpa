"use client";

import { createPortal } from "react-dom";
import { useFocusTrap } from "@/app/_hooks/useFocusTrap";

export function CardPairingModal({
  isOpen,
  cardTitle,
  onAddButton,
  onSkip,
}: {
  isOpen: boolean;
  cardTitle: string;
  onAddButton: () => void;
  onSkip: () => void;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onSkip(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onSkip(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pairing-modal-title"
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-1 text-base font-semibold text-neutral-900" id="pairing-modal-title">
          Add a Board button?
        </div>
        <p className="mb-5 text-sm text-neutral-500">
          Place a button on the Board so players can open{" "}
          <span className="font-medium text-neutral-700">{cardTitle || "this card"}</span>.
          You can reposition it anytime by dragging.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAddButton}
            className="flex-1 rounded-full bg-[#5B7AF5] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4059EB]"
          >
            Add button
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
          >
            Skip
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
