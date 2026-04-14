"use client";

import React, { useEffect, useState } from "react";
import { clamp } from "@/app/_lib/authoring-utils";
import { PageItem } from "@/app/_lib/authoring-types";

const SAFE_MARGIN = 0;
const SNAP_LINES = [33.333, 50, 66.666];
const SNAP_THRESHOLD = 2;
const PANEL_COLLAPSE_PROXIMITY = 120;
const SIDEBAR_WIDTH_PX = 300;
const INSPECTOR_WIDTH_PX = 380;
const HEADER_HEIGHT_PX = 80;

type ContentDragState = {
  pointerOffsetX: number;
  pointerOffsetY: number;
  elementWidth: number;
  elementHeight: number;
};

function getSnappedValue(value: number): number {
  const target = SNAP_LINES.find((snap) => Math.abs(snap - value) <= SNAP_THRESHOLD);
  return target ?? value;
}

type UseContentDragProps = {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  dragThresholdRef: React.RefObject<boolean>;
  isPortraitMode: boolean;
  isPreviewMode: boolean;
  pages: PageItem[];
  setPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
  selectedPageId: string;
  onCollapseSidebar?: () => void;
  onCollapseInspector?: () => void;
  onCollapseHeader?: () => void;
};

export function useContentDrag({
  canvasRef,
  dragThresholdRef,
  isPortraitMode,
  isPreviewMode,
  pages,
  setPages,
  selectedPageId,
  onCollapseSidebar,
  onCollapseInspector,
  onCollapseHeader,
}: UseContentDragProps) {
  const [contentDragState, setContentDragState] = useState<ContentDragState | null>(null);

  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? null;

  const handleContentCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (isPreviewMode) return;
    // Content fills the portrait zone — no positional drag in portrait mode
    if (isPortraitMode) return;

    const canvas = canvasRef.current;
    const page = selectedPage;
    if (!canvas || !page) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    const rect = canvas.getBoundingClientRect();
    const contentRect = event.currentTarget.getBoundingClientRect();
    const effectiveCx = isPortraitMode ? (page.mobileContentX ?? page.contentX) : page.contentX;
    const effectiveCy = isPortraitMode ? (page.mobileContentY ?? page.contentY) : page.contentY;
    const contentPixelX = (effectiveCx / 100) * rect.width;
    const contentPixelY = (effectiveCy / 100) * rect.height;

    (dragThresholdRef as React.MutableRefObject<boolean>).current = true;
    setContentDragState({
      pointerOffsetX: event.clientX - (rect.left + contentPixelX),
      pointerOffsetY: event.clientY - (rect.top + contentPixelY),
      elementWidth: contentRect.width,
      elementHeight: contentRect.height,
    });
  };

  useEffect(() => {
    if (!contentDragState || isPreviewMode || !selectedPageId) return;

    let sidebarCollapsed = false;
    let inspectorCollapsed = false;
    let headerCollapsed = false;

    const handlePointerMove = (event: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

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

      const rect = canvas.getBoundingClientRect();
      const rawX = event.clientX - rect.left - contentDragState.pointerOffsetX;
      const rawY = event.clientY - rect.top - contentDragState.pointerOffsetY;
      const horizontalInset =
        SAFE_MARGIN + (contentDragState.elementWidth / 2 / rect.width) * 100;
      const verticalInset =
        SAFE_MARGIN + (contentDragState.elementHeight / 2 / rect.height) * 100;
      const contentX = getSnappedValue(
        clamp((rawX / rect.width) * 100, horizontalInset, 100 - horizontalInset)
      );
      const contentY = getSnappedValue(
        clamp((rawY / rect.height) * 100, verticalInset, 100 - verticalInset)
      );

      setPages((prev) =>
        prev.map((page) =>
          page.id === selectedPageId
            ? isPortraitMode
              ? { ...page, mobileContentX: contentX, mobileContentY: contentY }
              : { ...page, contentX, contentY }
            : page
        )
      );
    };

    const handlePointerUp = () => {
      (dragThresholdRef as React.MutableRefObject<boolean>).current = false;
      setContentDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [contentDragState, isPreviewMode, selectedPageId]);

  return { contentDragState, handleContentCardPointerDown };
}
