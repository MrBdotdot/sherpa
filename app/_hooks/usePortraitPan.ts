"use client";

import React, { useEffect, useRef, useState } from "react";

type UsePortraitPanProps = {
  isPortraitSplit: boolean;
  heroImage?: string;
  portraitSplitRatio: number;
  imageStripRef?: React.RefObject<HTMLDivElement | null>;
};

type UsePortraitPanResult = {
  portraitPanX: number;
  stripImageAspect: number;
  hotspotPanOffset: number;
  setStripImageAspect: (aspect: number) => void;
  stripPanRef: React.RefObject<{ startX: number; startPan: number; pointerId: number; moved: boolean } | null>;
  onStripPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onStripPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onStripPointerUp: (e: React.PointerEvent<HTMLDivElement>, onCanvasClick: (e: React.PointerEvent<HTMLDivElement>) => void) => void;
  onStripPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
};

const PORTRAIT_CANVAS_W = 390;

export function usePortraitPan({
  isPortraitSplit,
  heroImage,
  portraitSplitRatio,
  imageStripRef,
}: UsePortraitPanProps): UsePortraitPanResult {
  const [portraitPanX, setPortraitPanX] = useState(50);
  const [stripImageAspect, setStripImageAspect] = useState(0);
  const stripPanRef = useRef<{ startX: number; startPan: number; pointerId: number; moved: boolean } | null>(null);

  // Hotspot layer offset to track image pan in portrait split mode.
  // Portrait canvas is always 390 × (780 * ratio/100) px.
  const portraitStripH = PORTRAIT_CANVAS_W * 2 * portraitSplitRatio / 100; // 780 * ratio/100
  const stripOverflow = stripImageAspect > 0 ? Math.max(0, stripImageAspect * portraitStripH - PORTRAIT_CANVAS_W) : 0;
  const hotspotPanOffset = stripOverflow * (50 - portraitPanX) / 100;

  // Probe image dimensions whenever layout mode or hero image changes — onLoad on the
  // <img> only fires on first load, but when switching layout modes the image is cached.
  useEffect(() => {
    if (!isPortraitSplit) return;
    const src = heroImage;
    if (!src || src.startsWith("color:")) return;
    const img = new Image();
    img.onload = () => setStripImageAspect(img.naturalWidth / img.naturalHeight);
    img.src = src;
    if (img.complete && img.naturalWidth > 0) setStripImageAspect(img.naturalWidth / img.naturalHeight);
  }, [heroImage, isPortraitSplit]);

  function onStripPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-hotspot],[data-a11y-type]")) return;
    stripPanRef.current = { startX: e.clientX, startPan: portraitPanX, pointerId: e.pointerId, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onStripPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const pan = stripPanRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;
    const dx = e.clientX - pan.startX;
    if (Math.abs(dx) > 4) pan.moved = true;
    const containerWidth = imageStripRef?.current?.offsetWidth ?? 390;
    const deltaPan = -(dx / containerWidth) * 100;
    setPortraitPanX(Math.max(0, Math.min(100, pan.startPan + deltaPan)));
  }

  function onStripPointerUp(
    e: React.PointerEvent<HTMLDivElement>,
    onCanvasClick: (e: React.PointerEvent<HTMLDivElement>) => void
  ) {
    const stripPan = stripPanRef.current;
    const clickedInteractive = (e.target as HTMLElement).closest("[data-hotspot],[data-a11y-type]");

    if (stripPan?.pointerId === e.pointerId) {
      stripPanRef.current = null;
    }

    if (stripPan?.moved || clickedInteractive) return;
    onCanvasClick(e);
  }

  function onStripPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (stripPanRef.current?.pointerId === e.pointerId) stripPanRef.current = null;
  }

  return {
    portraitPanX,
    stripImageAspect,
    hotspotPanOffset,
    setStripImageAspect,
    stripPanRef,
    onStripPointerDown,
    onStripPointerMove,
    onStripPointerUp,
    onStripPointerCancel,
  };
}
