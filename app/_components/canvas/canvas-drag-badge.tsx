"use client";

type CanvasDragBadgeProps = {
  label: string;
  showMove?: boolean;
  preferBelow?: boolean;
  onMovePointerDown?: (e: React.PointerEvent<HTMLSpanElement>) => void;
};

export function CanvasDragBadge({
  label,
  showMove = false,
  preferBelow = false,
  onMovePointerDown,
}: CanvasDragBadgeProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute left-1/2 z-10 inline-flex -translate-x-1/2 select-none items-center gap-2 whitespace-nowrap rounded-full bg-black/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white ${
        preferBelow ? "top-full mt-1" : "bottom-full mb-1"
      }`}
    >
      <span>{label}</span>
      {showMove ? (
        <span
          className="pointer-events-auto cursor-grab opacity-60 transition-opacity hover:opacity-100 active:cursor-grabbing"
          onPointerDown={(e) => {
            e.stopPropagation();
            onMovePointerDown?.(e);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          Move
        </span>
      ) : null}
    </div>
  );
}
