"use client";

import React from "react";
import { PageItem } from "@/app/_lib/authoring-types";

function isHotspotEmpty(page: PageItem): boolean {
  const DEFAULT_HOTSPOT_BLOCK = "Add contextual content for this hotspot.";
  const hasRealSummary = page.summary.trim().length > 0;
  const hasRealBlocks = page.blocks.some(
    (b) => b.value.trim() !== "" && b.value.trim() !== DEFAULT_HOTSPOT_BLOCK
  );
  return !hasRealSummary && !hasRealBlocks;
}

export function HotspotPin({
  page,
  index,
  isSelected,
  isLayoutEditMode,
  isPreviewMode,
  accentColor,
  hotspotContainerSize,
  hotspotDotSize,
  hotspotLabelSize,
  accentActiveStyle,
  accentRingStyle,
  dragThresholdRef,
  onSelectPage,
  onHotspotPointerDown,
  onDeleteHotspot,
}: {
  page: PageItem;
  index: number;
  isSelected: boolean;
  isLayoutEditMode: boolean;
  isPreviewMode: boolean;
  accentColor: string;
  hotspotContainerSize: string;
  hotspotDotSize: string;
  hotspotLabelSize: string;
  accentActiveStyle: React.CSSProperties;
  accentRingStyle: React.CSSProperties;
  dragThresholdRef?: React.RefObject<boolean>;
  onSelectPage: (id: string) => void;
  onHotspotPointerDown: (event: React.PointerEvent<HTMLButtonElement>, page: PageItem) => void;
  onDeleteHotspot: (pageId: string) => void;
}) {
  const dotBg = accentColor || "#0a0a0a";
  const showQuickDelete = !isPreviewMode && isHotspotEmpty(page);
  const title = page.title?.trim() ? page.title : `Hotspot ${index + 1}`;

  return (
    <div
      className="absolute"
      style={{
        left: `${page.x}%`,
        top: `${page.y}%`,
        transform: "translate3d(-50%, -50%, 0)",
        zIndex: isSelected ? 29 : 28,
      }}
    >
      {showQuickDelete ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDeleteHotspot(page.id); }}
          aria-label="Delete hotspot"
          className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-red-200 bg-white text-[10px] font-bold text-red-500 shadow-sm transition hover:border-red-400 hover:bg-red-50 hover:text-red-600"
          style={{ lineHeight: 1 }}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}

      {isLayoutEditMode ? (
        <button
          type="button"
          draggable={false}
          onPointerDown={(e) => onHotspotPointerDown(e, page)}
          onDragStart={(e) => e.preventDefault()}
          onClick={(e) => { e.stopPropagation(); if (!dragThresholdRef?.current) onSelectPage(page.id); }}
          className={`relative cursor-grab rounded-full border px-3 py-1.5 text-xs font-semibold shadow transition active:cursor-grabbing ${
            isSelected
              ? "border-black bg-black text-white"
              : "border-white bg-white/90 text-neutral-900 hover:bg-white"
          }`}
          style={{
            touchAction: "none",
            ...(isSelected && accentColor ? accentActiveStyle : {}),
            ...(isSelected && accentColor ? accentRingStyle : {}),
          }}
          aria-label={`Select and drag hotspot: ${title}`}
        >
          {title}
        </button>
      ) : (
        <button
          type="button"
          draggable={false}
          onPointerDown={(e) => onHotspotPointerDown(e, page)}
          onDragStart={(e) => e.preventDefault()}
          onClick={(e) => { e.stopPropagation(); if (!dragThresholdRef?.current) onSelectPage(page.id); }}
          className="group flex flex-col items-center gap-1"
          style={{ touchAction: "none" }}
          aria-label={title}
        >
          <span className={`relative flex ${hotspotContainerSize} items-center justify-center`}>
            {isSelected
              ? <span className="absolute inset-0 animate-ping rounded-full opacity-40" style={{ backgroundColor: dotBg }} />
              : <span className="absolute inset-0 animate-pulse rounded-full opacity-20" style={{ backgroundColor: dotBg }} />
            }
            <span
              className={`relative ${hotspotDotSize} rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-125`}
              style={{ backgroundColor: dotBg }}
            />
          </span>
          <span
            className={`rounded-full ${hotspotLabelSize} font-semibold shadow-sm transition`}
            style={isSelected
              ? { backgroundColor: dotBg, color: "#fff" }
              : { backgroundColor: "rgba(255,255,255,0.92)", color: "#0a0a0a" }
            }
          >
            {title}
          </span>
        </button>
      )}
    </div>
  );
}
