"use client";

import React from "react";

interface CanvasEmptyOverlayProps {
  onImport: () => void;
  onStartBlank: () => void;
}

export function CanvasEmptyOverlay({ onImport, onStartBlank }: CanvasEmptyOverlayProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto border-2 border-dashed border-neutral-300 rounded-2xl bg-white/95 backdrop-blur-sm px-8 py-7 text-center max-w-xs shadow-lg">
        <div className="text-2xl mb-2">📄</div>
        <div className="text-sm font-semibold text-neutral-900 mb-1">Import your rulebook</div>
        <p className="text-xs text-neutral-500 leading-relaxed mb-4">
          Paste your rules text or upload a PDF — we'll build your cards for you to edit.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={onImport}
            className="rounded-full bg-[#1e3a8a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1e3a8a]/90 transition"
          >
            Import rulebook
          </button>
          <button
            type="button"
            onClick={onStartBlank}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition"
          >
            Start blank
          </button>
        </div>
      </div>
    </div>
  );
}
