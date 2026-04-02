"use client";

import React from "react";

export function FocalPointPicker({
  imageUrl,
  x,
  y,
  onChange,
}: {
  imageUrl: string;
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  function updateFromPointer(e: React.PointerEvent) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    const ny = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));
    onChange(nx, ny);
  }

  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
        Focal point — drag to reposition
      </div>
      <div
        ref={containerRef}
        className="relative h-28 w-full cursor-crosshair overflow-hidden rounded-xl border border-neutral-300 select-none"
        style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: `${x}% ${y}%` }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); updateFromPointer(e); }}
        onPointerMove={(e) => { if (e.buttons > 0) updateFromPointer(e); }}
      >
        {/* Crosshair dot */}
        <div
          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ring-1 ring-black/30"
          style={{ left: `${x}%`, top: `${y}%`, backgroundColor: "rgba(255,255,255,0.25)" }}
        />
        {/* Cross lines */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/50"
          style={{ left: `${x}%` }}
        />
        <div
          className="pointer-events-none absolute left-0 right-0 h-px bg-white/50"
          style={{ top: `${y}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] text-neutral-400">{x}% / {y}%</div>
    </div>
  );
}
