"use client";

import React, { useEffect, useState } from "react";
import { clamp } from "@/app/_lib/authoring-utils";
import { InspectorTab, LayoutMode, PageItem } from "@/app/_lib/authoring-types";
import { resolveCanvasFeatureForLayout, updateFeaturePositionForLayout } from "@/app/_lib/responsive-board";

const SNAP_LINES = [33.333, 50, 66.666];
const SNAP_THRESHOLD = 2;

// Pixel distance from a panel edge that triggers auto-collapse while dragging
const PANEL_COLLAPSE_PROXIMITY = 120;
const SIDEBAR_WIDTH_PX = 300;
const INSPECTOR_WIDTH_PX = 380;
const HEADER_HEIGHT_PX = 80;

type FeatureDragState = {
  id: string;
  ownerPageId: string;
  pointerOffsetX: number;
  pointerOffsetY: number;
  elementWidth: number;
  elementHeight: number;
  isContentZone?: boolean;
};

function getSnappedValue(value: number): number {
  const target = SNAP_LINES.find((snap) => Math.abs(snap - value) <= SNAP_THRESHOLD);
  return target ?? value;
}

type UseFeatureDragProps = {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  imageStripRef: React.RefObject<HTMLDivElement | null>;
  contentZoneRef: React.RefObject<HTMLDivElement | null>;
  dragThresholdRef: React.RefObject<boolean>;
  layoutMode: LayoutMode;
  isPreviewMode: boolean;
  pages: PageItem[];
  setPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
  setSelectedPageId: (id: string) => void;
  setSelectedFeatureId: (id: string | null) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  onCollapseSidebar?: () => void;
  onCollapseInspector?: () => void;
  onCollapseHeader?: () => void;
};

export function useFeatureDrag({
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
}: UseFeatureDragProps) {
  const [featureDragState, setFeatureDragState] = useState<FeatureDragState | null>(null);
  const [shiftActive, setShiftActive] = useState(false);
  const isPortraitMode = layoutMode === "mobile-portrait";

  const getFeatureCoordEl = (isContentZone?: boolean) => {
    if (!isPortraitMode) return canvasRef.current;
    return isContentZone
      ? (contentZoneRef.current ?? canvasRef.current)
      : (imageStripRef.current ?? canvasRef.current);
  };

  const handleCanvasFeaturePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    featureId: string
  ) => {
    event.stopPropagation();
    if (isPreviewMode) return;

    // Find the feature's owner page — it may not be the currently selected page
    // (e.g. a hotspot is selected while canvas features belong to the home page).
    const ownerPage = pages.find((p) => p.canvasFeatures.some((f) => f.id === featureId));
    const feature = ownerPage?.canvasFeatures.find((f) => f.id === featureId);
    if (!ownerPage || !feature) return;
    const resolvedFeature = resolveCanvasFeatureForLayout(feature, layoutMode)?.feature ?? feature;

    const isContentZone = isPortraitMode && resolvedFeature.portraitZone === "content";
    const activeEl = getFeatureCoordEl(isContentZone);
    if (!activeEl) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    const rect = activeEl.getBoundingClientRect();
    const featureRect = event.currentTarget.getBoundingClientRect();
    const effectiveFx = resolvedFeature.x;
    const effectiveFy = resolvedFeature.y;
    const featurePixelX = (effectiveFx / 100) * rect.width;
    const featurePixelY = (effectiveFy / 100) * rect.height;

    setFeatureDragState({
      id: featureId,
      ownerPageId: ownerPage.id,
      pointerOffsetX: event.clientX - (rect.left + featurePixelX),
      pointerOffsetY: event.clientY - (rect.top + featurePixelY),
      elementWidth: featureRect.width,
      elementHeight: featureRect.height,
      isContentZone,
    });
  };

  useEffect(() => {
    if (!featureDragState || isPreviewMode) return;

    let sidebarCollapsed = false;
    let inspectorCollapsed = false;
    let headerCollapsed = false;

    const handlePointerMove = (event: PointerEvent) => {
      const el = getFeatureCoordEl(featureDragState.isContentZone);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const rawX = event.clientX - rect.left - featureDragState.pointerOffsetX;
      const rawY = event.clientY - rect.top - featureDragState.pointerOffsetY;
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
          page.id === featureDragState.ownerPageId
            ? {
                ...page,
                canvasFeatures: page.canvasFeatures.map((feature) =>
                  feature.id === featureDragState.id
                    ? updateFeaturePositionForLayout(
                        feature,
                        layoutMode,
                        x,
                        y,
                        featureDragState.isContentZone ? "content" : undefined
                      )
                    : feature
                ),
              }
            : page
        )
      );
    };

    const handlePointerUp = () => {
      setShiftActive(false);
      setFeatureDragState(null);
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
  }, [featureDragState, isPreviewMode, isPortraitMode, layoutMode, setPages]);

  const handleSelectCanvasFeature = (featureId: string) => {
    const ownerPage = pages.find((p) => p.canvasFeatures.some((f) => f.id === featureId));
    if (!ownerPage) return;
    setSelectedPageId(ownerPage.id);
    setSelectedFeatureId(featureId);
    setInspectorTab("board");
  };

  return { featureDragState, shiftActive, handleCanvasFeaturePointerDown, handleSelectCanvasFeature };
}
