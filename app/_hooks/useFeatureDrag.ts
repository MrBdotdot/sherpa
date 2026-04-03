"use client";

import React, { useEffect, useState } from "react";
import { clamp } from "@/app/_lib/authoring-utils";
import { PageItem } from "@/app/_lib/authoring-types";

const SNAP_LINES = [33.333, 50, 66.666];
const SNAP_THRESHOLD = 2;

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
  isPortraitMode: boolean;
  isPreviewMode: boolean;
  pages: PageItem[];
  setPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
  setSelectedPageId: (id: string) => void;
  setSelectedFeatureId: (id: string | null) => void;
  setInspectorTab: (tab: "surface" | "content" | "setup") => void;
};

export function useFeatureDrag({
  canvasRef,
  imageStripRef,
  contentZoneRef,
  isPortraitMode,
  isPreviewMode,
  pages,
  setPages,
  setSelectedPageId,
  setSelectedFeatureId,
  setInspectorTab,
}: UseFeatureDragProps) {
  const [featureDragState, setFeatureDragState] = useState<FeatureDragState | null>(null);

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

    // Select the feature in the sidebar and editing panel immediately on pointer-down.
    setSelectedPageId(ownerPage.id);
    setSelectedFeatureId(featureId);
    setInspectorTab("surface");
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
          page.id === featureDragState.ownerPageId
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
  }, [featureDragState, isPreviewMode]);

  return { featureDragState, handleCanvasFeaturePointerDown };
}
