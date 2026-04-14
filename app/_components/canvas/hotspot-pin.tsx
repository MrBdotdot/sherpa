"use client";

import React from "react";
import { PageItem } from "@/app/_lib/authoring-types";
import { DEFAULT_HOTSPOT_BLOCK_TEXT } from "@/app/_lib/authoring-utils";
import { CanvasDragBadge } from "@/app/_components/canvas/canvas-drag-badge";

function isHotspotEmpty(page: PageItem): boolean {
  const hasRealSummary = page.summary.trim().length > 0;
  const hasRealBlocks = page.blocks.some(
    (b) => b.value.trim() !== "" && b.value.trim() !== DEFAULT_HOTSPOT_BLOCK_TEXT
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
  fontThemeClass,
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
  fontThemeClass: string;
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
      data-hotspot
      className="absolute pointer-events-auto"
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
          className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 shadow-sm transition hover:border-red-400 hover:bg-red-50 hover:text-red-600"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1.5 2.5h7M4 2.5V2a1 1 0 0 1 2 0v.5M3.5 2.5l.5 5.5h3l.5-5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}

      {isLayoutEditMode ? (
        <button
          type="button"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onClick={(e) => { e.stopPropagation(); if (!dragThresholdRef?.current) onSelectPage(page.id); }}
          className={`relative rounded-full px-3 py-1.5 text-xs font-semibold shadow transition ${fontThemeClass} ${
            isSelected
              ? "bg-[#3B82F6] text-white"
              : "bg-white/90 text-neutral-900 hover:bg-white"
          }`}
          style={{
            touchAction: "none",
            ...(isSelected && accentColor ? accentActiveStyle : {}),
            ...(isSelected && accentColor ? accentRingStyle : {}),
          }}
          aria-label={`Select hotspot: ${title}`}
        >
          <CanvasDragBadge
            label="Hotspot"
            showMove
            preferBelow={(page.y ?? 50) <= 12}
            onMovePointerDown={(e) => {
              e.stopPropagation();
              onHotspotPointerDown(e as unknown as React.PointerEvent<HTMLButtonElement>, page);
            }}
          />
          {title}
        </button>
      ) : (
        <button
          type="button"
          draggable={false}
          onPointerDown={(e) => onHotspotPointerDown(e, page)}
          onDragStart={(e) => e.preventDefault()}
          onClick={(e) => { e.stopPropagation(); if (!dragThresholdRef?.current) onSelectPage(page.id); }}
          className={`sherpa-hotspot-pin group flex flex-col items-center gap-1 ${fontThemeClass}`}
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
