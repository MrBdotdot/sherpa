"use client";

import { useFocusTrap } from "@/app/_hooks/useFocusTrap";
import { APP_VERSION, PATCH_NOTES } from "@/app/_lib/authoring-utils";

export function ChangelogModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-title"
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <h2 id="changelog-title" className="text-base font-semibold text-neutral-900">
              What&apos;s new
            </h2>
            <div className="mt-0.5 text-xs text-neutral-400">Current version: {APP_VERSION}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close changelog"
            className="rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {PATCH_NOTES.map((release) => (
              <div key={release.version}>
                <div className="mb-3 flex items-baseline gap-2.5">
                  <span className="rounded-full bg-neutral-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    {release.version}
                  </span>
                  <span className="text-xs text-neutral-400">{release.date}</span>
                </div>
                <ul className="space-y-2">
                  {release.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm leading-6 text-neutral-700">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
