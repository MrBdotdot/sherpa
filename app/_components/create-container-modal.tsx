"use client";

import { CreatePageConfig, NewContainerForm } from "@/app/_components/editor/new-container-form";
import { useFocusTrap } from "@/app/_hooks/useFocusTrap";

export function CreateContainerModal({
  isOpen,
  onClose,
  onCreatePageWithConfig,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreatePageWithConfig: (config: CreatePageConfig) => void;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-container-title"
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <div id="create-container-title" className="text-base font-semibold text-neutral-900">
              Create card
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Choose a template to get started.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <NewContainerForm
          onCreatePageWithConfig={(config) => {
            onCreatePageWithConfig(config);
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
