"use client";

import { useHint } from "@/app/_hooks/use-hint";

export function HintBubble({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { shouldShow, dismiss } = useHint(id);
  if (!shouldShow) return null;

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2 rounded-full border border-[#1e3a8a]/20 bg-[#1e3a8a] px-3.5 py-2 text-xs font-semibold text-white shadow-lg ${className ?? ""}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <span>{children}</span>
      <button
        type="button"
        onClick={dismiss}
        className="flex h-4 w-4 items-center justify-center rounded-full text-white/60 hover:bg-white/20 hover:text-white transition"
        aria-label="Dismiss hint"
      >
        ×
      </button>
    </div>
  );
}
