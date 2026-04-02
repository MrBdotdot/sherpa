"use client";

import React, { useEffect, useState } from "react";
import { clamp } from "@/app/_lib/authoring-utils";
import { DragState, PageButtonPlacement, PageItem } from "@/app/_lib/authoring-types";

type UseHotspotDragProps = {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  imageStripRef: React.RefObject<HTMLDivElement | null>;
  dragThresholdRef: React.RefObject<boolean>;
  isPortraitMode: boolean;
  pages: PageItem[];
  setPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
  setSelectedPageId: (id: string) => void;
};

export function useHotspotDrag({
  canvasRef,
  imageStripRef,
  dragThresholdRef,
  isPortraitMode,
  pages,
  setPages,
  setSelectedPageId,
}: UseHotspotDragProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);

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

    setSelectedPageId(page.id);
    setDragState({
      id: page.id,
      pointerOffsetX: event.clientX - (rect.left + hotspotPixelX),
      pointerOffsetY: event.clientY - (rect.top + hotspotPixelY),
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const el = getCoordEl();
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const rawX = event.clientX - rect.left - dragState.pointerOffsetX;
      const rawY = event.clientY - rect.top - dragState.pointerOffsetY;
      const x = clamp((rawX / rect.width) * 100, 0, 100);
      const y = clamp((rawY / rect.height) * 100, 0, 100);

      (dragThresholdRef as React.MutableRefObject<boolean>).current = true;

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

  return { dragState, handleHotspotPointerDown };
}
