"use client";

import React, { useEffect, useRef, useState } from "react";
import { clamp, createHotspotPage, DEFAULT_HERO, HOME_PAGE_ID } from "@/app/_lib/authoring-utils";
import { DragState, PageItem, PageButtonPlacement } from "@/app/_lib/authoring-types";
import { constrainToEdgeBand } from "@/app/_lib/authoring-studio-utils";

const SAFE_MARGIN = 10;

const SNAP_LINES = [33.333, 50, 66.666];

type FeatureDragState = {
  id: string;
  pointerOffsetX: number;
  pointerOffsetY: number;
  elementWidth: number;
  elementHeight: number;
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
  pushPagesHistory: () => void;
  setSelectedFeatureId: (id: string | null) => void;
  showLayoutHelp: boolean;
  setShowLayoutHelp: (v: boolean) => void;
  homePage: PageItem | undefined;
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
  pushPagesHistory,
  setSelectedFeatureId,
  showLayoutHelp,
  setShowLayoutHelp,
  homePage,
}: UseDragProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragThresholdRef = useRef(false);
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

    const canvas = canvasRef.current;
    if (!canvas) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    const rect = canvas.getBoundingClientRect();

    let startX = page.x;
    let startY = page.y;
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

    const canvas = canvasRef.current;
    const feature = selectedPage?.canvasFeatures.find((item) => item.id === featureId);
    if (!canvas || !feature) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    const rect = canvas.getBoundingClientRect();
    const featureRect = event.currentTarget.getBoundingClientRect();
    const featurePixelX = (feature.x / 100) * rect.width;
    const featurePixelY = (feature.y / 100) * rect.height;

    setFeatureDragState({
      id: featureId,
      pointerOffsetX: event.clientX - (rect.left + featurePixelX),
      pointerOffsetY: event.clientY - (rect.top + featurePixelY),
      elementWidth: featureRect.width,
      elementHeight: featureRect.height,
    });
  };

  const handleContentCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!isLayoutEditMode) return;

    const canvas = canvasRef.current;
    const page = selectedPage;
    if (!canvas || !page) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    const rect = canvas.getBoundingClientRect();
    const contentRect = event.currentTarget.getBoundingClientRect();
    const contentPixelX = (page.contentX / 100) * rect.width;
    const contentPixelY = (page.contentY / 100) * rect.height;

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

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    if (
      x < SAFE_MARGIN ||
      x > 100 - SAFE_MARGIN ||
      y < SAFE_MARGIN ||
      y > 100 - SAFE_MARGIN
    ) {
      return;
    }

    pushPagesHistory();
    const newHotspot = createHotspotPage(
      hotspotPages.length + 1,
      selectedPage?.heroImage || DEFAULT_HERO
    );

    newHotspot.x = x;
    newHotspot.y = y;

    setPages((prev) => [...prev, newHotspot]);
    setSelectedPageId(newHotspot.id);
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
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const rawX = event.clientX - rect.left - dragState.pointerOffsetX;
      const rawY = event.clientY - rect.top - dragState.pointerOffsetY;
      const x = clamp((rawX / rect.width) * 100, SAFE_MARGIN, 100 - SAFE_MARGIN);
      const y = clamp((rawY / rect.height) * 100, SAFE_MARGIN, 100 - SAFE_MARGIN);

      dragThresholdRef.current = true;

      setPages((prev) =>
        prev.map((page) =>
          page.id === dragState.id ? { ...page, x, y } : page
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
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const rawX = event.clientX - rect.left - featureDragState.pointerOffsetX;
      const rawY = event.clientY - rect.top - featureDragState.pointerOffsetY;
      const horizontalInset = (featureDragState.elementWidth / 2 / rect.width) * 100;
      const verticalInset = (featureDragState.elementHeight / 2 / rect.height) * 100;
      const edgePosition = constrainToEdgeBand(
        (rawX / rect.width) * 100,
        (rawY / rect.height) * 100,
        horizontalInset,
        verticalInset
      );
      const x = getSnappedValue(edgePosition.x);
      const y = getSnappedValue(edgePosition.y);

      setPages((prev) =>
        prev.map((page) =>
          page.id === selectedPageId
            ? {
                ...page,
                canvasFeatures: page.canvasFeatures.map((feature) =>
                  feature.id === featureDragState.id ? { ...feature, x, y } : feature
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
          page.id === selectedPageId ? { ...page, contentX, contentY } : page
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
    dragState,
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
