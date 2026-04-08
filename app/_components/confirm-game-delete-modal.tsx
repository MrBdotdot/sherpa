"use client";

import { useFocusTrap } from "@/app/_hooks/useFocusTrap";

type ConfirmGameDeleteModalProps = {
  isOpen: boolean;
  gameTitle: string;
  isCurrentGame: boolean;
  isDeleting: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmGameDeleteModal({
  isOpen,
  gameTitle,
  isCurrentGame,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: ConfirmGameDeleteModalProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isDeleting) onCancel(); }}
      onKeyDown={(e) => { if (e.key === "Escape" && !isDeleting) onCancel(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-game-title"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <h2 id="delete-game-title" className="text-lg font-semibold text-neutral-900">
          Delete game?
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          This will delete <span className="font-medium text-neutral-900">{gameTitle}</span> and all of its cards, content, and settings. This cannot be undone.
        </p>
        {isCurrentGame && (
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            This is the game you have open right now. After deleting, Sherpa will open your next game, or start fresh if this is your only one.
          </p>
        )}
        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-full border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-full border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete game"}
          </button>
        </div>
      </div>
    </div>
  );
}
