"use client";

import React, { useRef } from "react";
import { createHotspotPage, DEFAULT_HERO, getHomePageId } from "@/app/_lib/authoring-utils";
import { InspectorTab, LayoutMode, PageItem } from "@/app/_lib/authoring-types";
import { useHotspotDrag } from "@/app/_hooks/useHotspotDrag";
import { useFeatureDrag } from "@/app/_hooks/useFeatureDrag";
import { useContentDrag } from "@/app/_hooks/useContentDrag";

interface UseDragProps {
  pages: PageItem[];
  setPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
  selectedPageId: string;
  setSelectedPageId: (id: string) => void;
  isPreviewMode: boolean;
  setIsPreviewMode: React.Dispatch<React.SetStateAction<boolean>>;
  setIsContentModalOpen: (v: boolean) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  pushPagesHistory: () => void;
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;
  layoutMode: LayoutMode;
  onCollapseSidebar?: () => void;
  onCollapseInspector?: () => void;
  onCollapseHeader?: () => void;
}


export function useDrag({
  pages,
  setPages,
  selectedPageId,
  setSelectedPageId,
  isPreviewMode,
  setIsPreviewMode,
  setIsContentModalOpen,
  setInspectorTab,
  pushPagesHistory,
  selectedFeatureId,
  setSelectedFeatureId,
  layoutMode,
  onCollapseSidebar,
  onCollapseInspector,
  onCollapseHeader,
}: UseDragProps) {
  const isPortraitMode = layoutMode === "mobile-portrait";
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const imageStripRef = useRef<HTMLDivElement | null>(null);
  const contentZoneRef = useRef<HTMLDivElement | null>(null);
  const dragThresholdRef = useRef(false);

  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null;
  const homePageId = getHomePageId(pages, selectedPageId);
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
    onCollapseSidebar,
    onCollapseInspector,
    onCollapseHeader,
  });

  const { featureDragState, handleCanvasFeaturePointerDown, handleSelectCanvasFeature } = useFeatureDrag({
    canvasRef,
    imageStripRef,
    contentZoneRef,
    dragThresholdRef,
    layoutMode,
    isPreviewMode,
    pages,
    setPages,
    setSelectedPageId,
    setSelectedFeatureId,
    setInspectorTab,
    onCollapseSidebar,
    onCollapseInspector,
    onCollapseHeader,
  });

  const { contentDragState, handleContentCardPointerDown } = useContentDrag({
    canvasRef,
    isPortraitMode,
    isPreviewMode,
    pages,
    setPages,
    selectedPageId,
    onCollapseSidebar,
    onCollapseInspector,
    onCollapseHeader,
  });

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (dragThresholdRef.current) {
      dragThresholdRef.current = false;
      return;
    }

    if (isPreviewMode) {
      // Backdrop click does not dismiss in preview mode — use the close button.
      return;
    }

    if (selectedFeatureId) {
      setSelectedFeatureId(null);
      return;
    }

    if (selectedPage?.kind === "page" || selectedPage?.kind === "hotspot") {
      setSelectedPageId(homePageId);
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
      setSelectedPageId(homePageId);
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
    setSelectedPageId(homePageId);
  };

  const handleTogglePreviewMode = () => {
    setIsPreviewMode((prev) => !prev);
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
    handleSelectCanvasFeature,
    handleContentCardPointerDown,
    handleCanvasClick,
    handle3dHotspotPlace,
    handleDismissContent,
    handleTogglePreviewMode,
  };
}
