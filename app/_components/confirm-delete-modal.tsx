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
          Delete page?
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          This will permanently remove <span className="font-medium">{pageTitle}</span>.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-2xl border border-red-300 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
