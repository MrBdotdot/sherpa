"use client";

import React, { useEffect, useState } from "react";
import { clamp } from "@/app/_lib/authoring-utils";
import { DragState, PageButtonPlacement, PageItem } from "@/app/_lib/authoring-types";

const SNAP_LINES = [33.333, 50, 66.666];
const SNAP_THRESHOLD = 2;

function getSnappedValue(value: number): number {
  const target = SNAP_LINES.find((snap) => Math.abs(snap - value) <= SNAP_THRESHOLD);
  return target ?? value;
}

const PANEL_COLLAPSE_PROXIMITY = 120;
const SIDEBAR_WIDTH_PX = 300;
const INSPECTOR_WIDTH_PX = 380;
const HEADER_HEIGHT_PX = 80;

type UseHotspotDragProps = {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  imageStripRef: React.RefObject<HTMLDivElement | null>;
  dragThresholdRef: React.RefObject<boolean>;
  isPortraitMode: boolean;
  pages: PageItem[];
  setPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
  onCollapseSidebar?: () => void;
  onCollapseInspector?: () => void;
  onCollapseHeader?: () => void;
};

export function useHotspotDrag({
  canvasRef,
  imageStripRef,
  dragThresholdRef,
  isPortraitMode,
  pages,
  setPages,
  onCollapseSidebar,
  onCollapseInspector,
  onCollapseHeader,
}: UseHotspotDragProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [shiftActive, setShiftActive] = useState(false);

  const getCoordEl = () =>
    isPortraitMode && imageStripRef.current ? imageStripRef.current : canvasRef.current;

  const handleHotspotPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    page: PageItem
  ) => {
    event.stopPropagation();

    event.currentTarget.setPointerCapture(event.pointerId);

    const activeEl = getCoordEl();
    if (!activeEl) return;
    const rect = activeEl.getBoundingClientRect();

    let startX = isPortraitMode ? (page.mobileX ?? page.x) : page.x;
    let startY = isPortraitMode ? (page.mobileY ?? page.y) : page.y;
    if (startX === null || startY === null) {
      const placementInit: Record<PageButtonPlacement, [number, number]> = {
        top: [50, 10],
        bottom: [50, 90],
        left: [10, 50],
        right: [90, 50],
        stack: [50, 50],
      };
      const [px, py] = placementInit[page.pageButtonPlacement] ?? [50, 50];
      startX = px;
      startY = py;
      setPages((prev) =>
        prev.map((p) => (p.id === page.id ? { ...p, x: startX, y: startY } : p))
      );
    }

    const hotspotPixelX = (startX / 100) * rect.width;
    const hotspotPixelY = (startY / 100) * rect.height;

    setDragState({
      id: page.id,
      pointerOffsetX: event.clientX - (rect.left + hotspotPixelX),
      pointerOffsetY: event.clientY - (rect.top + hotspotPixelY),
    });
  };

  useEffect(() => {
    if (!dragState) return;

    let sidebarCollapsed = false;
    let inspectorCollapsed = false;
    let headerCollapsed = false;

    const handlePointerMove = (event: PointerEvent) => {
      const el = getCoordEl();
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const rawX = event.clientX - rect.left - dragState.pointerOffsetX;
      const rawY = event.clientY - rect.top - dragState.pointerOffsetY;
      const pctX = clamp((rawX / rect.width) * 100, 0, 100);
      const pctY = clamp((rawY / rect.height) * 100, 0, 100);
      const x = event.shiftKey ? getSnappedValue(pctX) : pctX;
      const y = event.shiftKey ? getSnappedValue(pctY) : pctY;
      setShiftActive(event.shiftKey);

      (dragThresholdRef as React.MutableRefObject<boolean>).current = true;

      if (!sidebarCollapsed && onCollapseSidebar && event.clientX < SIDEBAR_WIDTH_PX + PANEL_COLLAPSE_PROXIMITY) {
        sidebarCollapsed = true;
        onCollapseSidebar();
      }
      if (!inspectorCollapsed && onCollapseInspector && event.clientX > window.innerWidth - INSPECTOR_WIDTH_PX - PANEL_COLLAPSE_PROXIMITY) {
        inspectorCollapsed = true;
        onCollapseInspector();
      }
      if (!headerCollapsed && onCollapseHeader && event.clientY < HEADER_HEIGHT_PX + PANEL_COLLAPSE_PROXIMITY) {
        headerCollapsed = true;
        onCollapseHeader();
      }

      setPages((prev) =>
        prev.map((page) =>
          page.id === dragState.id
            ? isPortraitMode
              ? { ...page, mobileX: x, mobileY: y }
              : { ...page, x, y }
            : page
        )
      );
    };

    const handlePointerUp = () => {
      setShiftActive(false);
      setDragState(null);
      window.setTimeout(() => {
        (dragThresholdRef as React.MutableRefObject<boolean>).current = false;
      }, 0);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState]);

  return { dragState, shiftActive, handleHotspotPointerDown };
}
