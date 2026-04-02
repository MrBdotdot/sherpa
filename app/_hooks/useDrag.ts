"use client";

import React, { useRef } from "react";
import { createHotspotPage, DEFAULT_HERO, HOME_PAGE_ID } from "@/app/_lib/authoring-utils";
import { LayoutMode, PageItem } from "@/app/_lib/authoring-types";
import { useHotspotDrag } from "@/app/_hooks/useHotspotDrag";
import { useFeatureDrag } from "@/app/_hooks/useFeatureDrag";
import { useContentDrag } from "@/app/_hooks/useContentDrag";

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
  layoutMode: LayoutMode;
}

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
  layoutMode,
}: UseDragProps) {
  const isPortraitMode = layoutMode === "mobile-portrait";
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const imageStripRef = useRef<HTMLDivElement | null>(null);
  const contentZoneRef = useRef<HTMLDivElement | null>(null);
  const dragThresholdRef = useRef(false);

  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null;
  const hotspotPages = pages.filter(
    (page) =>
      page.kind === "hotspot" &&
      ((page.x !== null && page.y !== null) || page.worldPosition !== undefined)
  );

  const { dragState, handleHotspotPointerDown } = useHotspotDrag({
    canvasRef,
    imageStripRef,
    dragThresholdRef,
    isPortraitMode,
    pages,
    setPages,
    setSelectedPageId,
  });

  const { featureDragState, handleCanvasFeaturePointerDown } = useFeatureDrag({
    canvasRef,
    imageStripRef,
    contentZoneRef,
    isPortraitMode,
    isLayoutEditMode,
    pages,
    setPages,
    selectedPageId,
  });

  const { contentDragState, handleContentCardPointerDown } = useContentDrag({
    canvasRef,
    isPortraitMode,
    isLayoutEditMode,
    pages,
    setPages,
    selectedPageId,
  });

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (dragThresholdRef.current) {
      dragThresholdRef.current = false;
      return;
    }

    if (isPreviewMode) {
      setSelectedPageId(HOME_PAGE_ID);
      return;
    }

    if (selectedPage?.kind === "page" || selectedPage?.kind === "hotspot") {
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

  const handle3dHotspotPlace = (
    worldPosition: [number, number, number],
    worldNormal: [number, number, number]
  ) => {
    if (isPreviewMode) return;
    if (selectedPage?.kind === "page" || selectedPage?.kind === "hotspot") {
      setSelectedPageId(HOME_PAGE_ID);
      return;
    }

    pushPagesHistory();
    const newHotspot = createHotspotPage(
      hotspotPages.length + 1,
      selectedPage?.heroImage || DEFAULT_HERO
    );
    newHotspot.worldPosition = worldPosition;
    newHotspot.worldNormal = worldNormal;

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
      if (!prev) setIsLayoutEditMode(false);
      return !prev;
    });
  };

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
    handle3dHotspotPlace,
    handleDismissContent,
    handleTogglePreviewMode,
  };
}
