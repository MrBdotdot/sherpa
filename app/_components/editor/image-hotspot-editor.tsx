"use client";

import React from "react";
import { ContentBlock, ImageBlockHotspot } from "@/app/_lib/authoring-types";
import { createImageHotspot } from "@/app/_lib/authoring-utils";

export function ImageHotspotEditor({
  block,
  onBlockPropsChange,
}: {
  block: ContentBlock;
  onBlockPropsChange: (blockId: string, patch: Partial<ContentBlock>) => void;
}) {
  const hotspots: ImageBlockHotspot[] = block.imageHotspots ?? [];
  const containerRef = React.useRef<HTMLDivElement>(null);

  function placeHotspot(e: React.MouseEvent<HTMLDivElement>) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));
    onBlockPropsChange(block.id, { imageHotspots: [...hotspots, createImageHotspot(x, y)] });
  }

  function updateHotspot(id: string, patch: Partial<ImageBlockHotspot>) {
    onBlockPropsChange(block.id, {
      imageHotspots: hotspots.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    });
  }

  function removeHotspot(id: string) {
    onBlockPropsChange(block.id, {
      imageHotspots: hotspots.filter((h) => h.id !== id),
    });
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
        Hotspots
      </div>

      {/* Click-to-place image */}
      <div
        ref={containerRef}
        onClick={block.value ? placeHotspot : undefined}
        className={`relative h-32 w-full overflow-hidden rounded-lg border border-neutral-200 select-none ${block.value ? "cursor-crosshair" : "flex items-center justify-center bg-neutral-50"}`}
        style={block.value ? { backgroundImage: `url(${block.value})`, backgroundSize: "cover", backgroundPosition: "50% 50%" } : undefined}
      >
        {!block.value && (
          <span className="text-xs text-neutral-400">Add an image URL above to place hotspots</span>
        )}
        {block.value && (
          <div className="absolute bottom-1.5 right-1.5 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-medium text-white pointer-events-none">
            Click to place
          </div>
        )}
        {hotspots.map((h, i) => (
          <div
            key={h.id}
            className="pointer-events-none absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-neutral-900 text-[9px] font-bold text-white shadow-md"
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Per-hotspot editors */}
      {hotspots.map((h, i) => (
        <div key={h.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-600">
              Hotspot {i + 1} <span className="font-normal text-neutral-400">at {h.x}%, {h.y}%</span>
            </span>
            <button
              type="button"
              onClick={() => removeHotspot(h.id)}
              className="text-[11px] font-medium text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
          <input
            type="text"
            value={h.label}
            onChange={(e) => updateHotspot(h.id, { label: e.target.value })}
            placeholder="Label (e.g. Start Zone)"
            className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10"
          />
          <textarea
            value={h.content}
            onChange={(e) => updateHotspot(h.id, { content: e.target.value })}
            placeholder="Description shown when tapped"
            rows={2}
            className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10"
          />
        </div>
      ))}

      {hotspots.length === 0 && block.value && (
        <p className="text-xs text-neutral-400">No hotspots yet. Click the image to place one.</p>
      )}
    </div>
  );
}
