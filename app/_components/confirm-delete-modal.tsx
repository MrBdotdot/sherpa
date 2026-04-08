"use client";

import { useFocusTrap } from "@/app/_hooks/useFocusTrap";

type ConfirmDeleteModalProps = {
  isOpen: boolean;
  pageTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({
  isOpen,
  pageTitle,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <h2 id="delete-dialog-title" className="text-lg font-semibold text-neutral-900">
          Delete card?
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          <span className="font-medium">{pageTitle}</span> will be permanently deleted. This cannot be undone.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-full border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            Delete card
          </button>
        </div>
      </div>
    </div>
  );
}
