"use client";

import React, { useEffect, useRef, useState } from "react";
import { clamp, createHotspotPage, DEFAULT_HERO, HOME_PAGE_ID } from "@/app/_lib/authoring-utils";
import { DragState, LayoutMode, PageItem, PageButtonPlacement } from "@/app/_lib/authoring-types";

const SAFE_MARGIN = 10;

const SNAP_LINES = [33.333, 50, 66.666];

type FeatureDragState = {
  id: string;
  pointerOffsetX: number;
  pointerOffsetY: number;
  elementWidth: number;
  elementHeight: number;
  isContentZone?: boolean;
};

type ContentDragState = {
  pointerOffsetX: number;
  pointerOffsetY: number;
  elementWidth: number;
  elementHeight: number;
};

interface UseDragProps {
  pages: PageItem[];
  setPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
  selectedPageId: string;
  setSelectedPageId: (id: string) => void;
  isLayoutEditMode: boolean;
  setIsLayoutEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  isPreviewMode: boolean;
  setIsPreviewMode: React.Dispatch<React.SetStateAction<boolean>>;
  setIsContentModalOpen: (v: boolean) => void;
  setInspectorTab: (tab: "surface" | "content" | "setup") => void;
  pushPagesHistory: () => void;
  setSelectedFeatureId: (id: string | null) => void;
  showLayoutHelp: boolean;
  setShowLayoutHelp: (v: boolean) => void;
  homePage: PageItem | undefined;
  layoutMode: LayoutMode;
}

// Note: showLayoutHelp, setShowLayoutHelp, setSelectedFeatureId, and homePage are accepted
// as part of the interface for API symmetry but are not used in the current drag logic.

export function useDrag({
  pages,
  setPages,
  selectedPageId,
  setSelectedPageId,
  isLayoutEditMode,
  setIsLayoutEditMode,
  isPreviewMode,
  setIsPreviewMode,
  setIsContentModalOpen,
  setInspectorTab,
  pushPagesHistory,
  setSelectedFeatureId,
  showLayoutHelp,
  setShowLayoutHelp,
  homePage,
  layoutMode,
}: UseDragProps) {
  const isPortraitMode = layoutMode === "mobile-portrait";
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const imageStripRef = useRef<HTMLDivElement | null>(null);
  const contentZoneRef = useRef<HTMLDivElement | null>(null);
  const dragThresholdRef = useRef(false);

  // In portrait mode, hotspot drag coordinates are relative to the image strip.
  // Feature drag uses the zone the feature currently lives in.
  const getCoordEl = () =>
    isPortraitMode && imageStripRef.current ? imageStripRef.current : canvasRef.current;
  const getFeatureCoordEl = (isContentZone?: boolean) => {
    if (!isPortraitMode) return canvasRef.current;
    return isContentZone
      ? (contentZoneRef.current ?? canvasRef.current)
      : (imageStripRef.current ?? canvasRef.current);
  };
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [featureDragState, setFeatureDragState] = useState<FeatureDragState | null>(null);
  const [contentDragState, setContentDragState] = useState<ContentDragState | null>(null);

  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null;
  const hotspotPages = pages.filter(
    (page) => page.kind === "hotspot" && page.x !== null && page.y !== null
  );

  const handleHotspotPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    page: PageItem
  ) => {
    event.stopPropagation();
    if (!isLayoutEditMode) return;

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

  const handleCanvasFeaturePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    featureId: string
  ) => {
    event.stopPropagation();
    if (!isLayoutEditMode) return;

    const feature = selectedPage?.canvasFeatures.find((item) => item.id === featureId);
    if (!feature) return;
    const isContentZone = isPortraitMode && feature.portraitZone === "content";
    const activeEl = getFeatureCoordEl(isContentZone);
    if (!activeEl) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    const rect = activeEl.getBoundingClientRect();
    const featureRect = event.currentTarget.getBoundingClientRect();
    const effectiveFx = isPortraitMode ? (feature.mobileX ?? feature.x) : feature.x;
    const effectiveFy = isPortraitMode ? (feature.mobileY ?? feature.y) : feature.y;
    const featurePixelX = (effectiveFx / 100) * rect.width;
    const featurePixelY = (effectiveFy / 100) * rect.height;

    setFeatureDragState({
      id: featureId,
      pointerOffsetX: event.clientX - (rect.left + featurePixelX),
      pointerOffsetY: event.clientY - (rect.top + featurePixelY),
      elementWidth: featureRect.width,
      elementHeight: featureRect.height,
      isContentZone,
    });
  };

  const handleContentCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!isLayoutEditMode) return;
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

    setContentDragState({
      pointerOffsetX: event.clientX - (rect.left + contentPixelX),
      pointerOffsetY: event.clientY - (rect.top + contentPixelY),
      elementWidth: contentRect.width,
      elementHeight: contentRect.height,
    });
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (dragThresholdRef.current) {
      dragThresholdRef.current = false;
      return;
    }

    if (isPreviewMode) {
      setSelectedPageId(HOME_PAGE_ID);
      return;
    }

    // Dismiss an open page-kind container (side-sheet, full-page, modal…) on
    // any canvas background click rather than creating a new hotspot beneath it.
    if (selectedPage?.kind === "page") {
      setSelectedPageId(HOME_PAGE_ID);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    pushPagesHistory();
    const newHotspot = createHotspotPage(
      hotspotPages.length + 1,
      selectedPage?.heroImage || DEFAULT_HERO
    );

    newHotspot.x = x;
    newHotspot.y = y;
    if (isPortraitMode) {
      newHotspot.mobileX = x;
      newHotspot.mobileY = y;
    }

    setPages((prev) => [...prev, newHotspot]);
    setSelectedPageId(newHotspot.id);
    setInspectorTab("content");
    setIsContentModalOpen(true);
  };

  const handleDismissContent = () => {
    setSelectedPageId(HOME_PAGE_ID);
  };

  const handleTogglePreviewMode = () => {
    setIsPreviewMode((prev) => {
      // Entering preview mode exits layout edit mode
      if (!prev) setIsLayoutEditMode(false);
      return !prev;
    });
  };

  // Hotspot drag — pointer events (mouse + touch)
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

      dragThresholdRef.current = true;

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
        dragThresholdRef.current = false;
      }, 0);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState]);

  // Canvas feature drag — pointer events
  useEffect(() => {
    if (!featureDragState || !isLayoutEditMode) return;

    const snapTargets = SNAP_LINES;
    const snapThreshold = 2;

    const getSnappedValue = (value: number) => {
      const target = snapTargets.find((snapValue) => Math.abs(snapValue - value) <= snapThreshold);
      return target ?? value;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const el = getFeatureCoordEl(featureDragState.isContentZone);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const rawX = event.clientX - rect.left - featureDragState.pointerOffsetX;
      const rawY = event.clientY - rect.top - featureDragState.pointerOffsetY;
      const x = getSnappedValue(clamp((rawX / rect.width) * 100, 0, 100));
      const y = getSnappedValue(clamp((rawY / rect.height) * 100, 0, 100));

      setPages((prev) =>
        prev.map((page) =>
          page.id === selectedPageId
            ? {
                ...page,
                canvasFeatures: page.canvasFeatures.map((feature) =>
                  feature.id === featureDragState.id
                    ? isPortraitMode
                      ? { ...feature, mobileX: x, mobileY: y }
                      : { ...feature, x, y }
                    : feature
                ),
              }
            : page
        )
      );
    };

    const handlePointerUp = () => {
      setFeatureDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [featureDragState, isLayoutEditMode, selectedPageId]);

  // Content card drag — pointer events
  useEffect(() => {
    if (!contentDragState || !isLayoutEditMode || !selectedPageId) return;

    const snapTargets = SNAP_LINES;
    const snapThreshold = 2;

    const getSnappedValue = (value: number) => {
      const target = snapTargets.find((snapValue) => Math.abs(snapValue - value) <= snapThreshold);
      return target ?? value;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

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
      setContentDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [contentDragState, isLayoutEditMode, selectedPageId]);

  return {
    canvasRef,
    imageStripRef,
    contentZoneRef,
    dragState,
    dragThresholdRef,
    featureDragState,
    contentDragState,
    handleHotspotPointerDown,
    handleCanvasFeaturePointerDown,
    handleContentCardPointerDown,
    handleCanvasClick,
    handleDismissContent,
    handleTogglePreviewMode,
  };
}
