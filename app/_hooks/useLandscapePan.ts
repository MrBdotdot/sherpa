"use client";

import React, { useEffect, useRef, useState } from "react";

type UseLandscapePanProps = {
  isLandscape: boolean;
  heroImage?: string;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
};

type UseLandscapePanResult = {
  landscapePanX: number;
  landscapePanY: number;
  landscapeImageAspect: number;
  landscapeOverflowX: number;
  landscapeOverflowY: number;
  landscapeHotspotOffsetX: number;
  landscapeHotspotOffsetY: number;
  setLandscapeImageAspect: (aspect: number) => void;
  landscapePanRef: React.RefObject<{ startX: number; startY: number; startPanX: number; startPanY: number; pointerId: number; moved: boolean } | null>;
  onLandscapePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onLandscapePointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onLandscapePointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onLandscapePointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
};

const LANDSCAPE_CANVAS_W = 667;
const LANDSCAPE_CANVAS_H = 375;
const LANDSCAPE_CANVAS_ASPECT = LANDSCAPE_CANVAS_W / LANDSCAPE_CANVAS_H;

export function useLandscapePan({
  isLandscape,
  heroImage,
  canvasRef,
}: UseLandscapePanProps): UseLandscapePanResult {
  const [landscapePanX, setLandscapePanX] = useState(50);
  const [landscapePanY, setLandscapePanY] = useState(50);
  const [landscapeImageAspect, setLandscapeImageAspect] = useState(0);
  const landscapePanRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number; pointerId: number; moved: boolean } | null>(null);

  // Hotspot layer offset for landscape mode. Canvas is always 667 × 375 px.
  // Only one axis overflows at a time depending on image vs canvas aspect ratio.
  const landscapeOverflowX = landscapeImageAspect > LANDSCAPE_CANVAS_ASPECT
    ? landscapeImageAspect * LANDSCAPE_CANVAS_H - LANDSCAPE_CANVAS_W : 0;
  const landscapeOverflowY = landscapeImageAspect > 0 && landscapeImageAspect < LANDSCAPE_CANVAS_ASPECT
    ? LANDSCAPE_CANVAS_W / landscapeImageAspect - LANDSCAPE_CANVAS_H : 0;
  const landscapeHotspotOffsetX = landscapeOverflowX * (50 - landscapePanX) / 100;
  const landscapeHotspotOffsetY = landscapeOverflowY * (50 - landscapePanY) / 100;

  // Probe image dimensions for landscape mode in case the image is already cached
  // (onLoad on the <img> won't fire when switching layout modes after first load).
  useEffect(() => {
    if (!isLandscape) return;
    const src = heroImage;
    if (!src || src.startsWith("color:")) return;
    const img = new Image();
    img.onload = () => setLandscapeImageAspect(img.naturalWidth / img.naturalHeight);
    img.src = src;
    if (img.complete && img.naturalWidth > 0) setLandscapeImageAspect(img.naturalWidth / img.naturalHeight);
  }, [heroImage, isLandscape]);

  function onLandscapePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-hotspot],[data-a11y-type]")) return;
    landscapePanRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: landscapePanX,
      startPanY: landscapePanY,
      pointerId: e.pointerId,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onLandscapePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const pan = landscapePanRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;
    const dx = e.clientX - pan.startX;
    const dy = e.clientY - pan.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) pan.moved = true;
    const containerWidth = canvasRef?.current?.offsetWidth ?? LANDSCAPE_CANVAS_W;
    const containerHeight = canvasRef?.current?.offsetHeight ?? LANDSCAPE_CANVAS_H;
    setLandscapePanX(Math.max(0, Math.min(100, pan.startPanX + (-(dx / containerWidth) * 100))));
    setLandscapePanY(Math.max(0, Math.min(100, pan.startPanY + (-(dy / containerHeight) * 100))));
  }

  function onLandscapePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (landscapePanRef.current?.pointerId === e.pointerId) {
      landscapePanRef.current = null;
    }
  }

  function onLandscapePointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (landscapePanRef.current?.pointerId === e.pointerId) landscapePanRef.current = null;
  }

  return {
    landscapePanX,
    landscapePanY,
    landscapeImageAspect,
    landscapeOverflowX,
    landscapeOverflowY,
    landscapeHotspotOffsetX,
    landscapeHotspotOffsetY,
    setLandscapeImageAspect,
    landscapePanRef,
    onLandscapePointerDown,
    onLandscapePointerMove,
    onLandscapePointerUp,
    onLandscapePointerCancel,
  };
}
