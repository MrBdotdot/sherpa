"use client";

import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { ContentBlock, ImageBlockHotspot } from "@/app/_lib/authoring-types";

type HotspotPopoverPos = { top: number; left: number | null; right: number | null; showRight: boolean };

export function ImageBlock({ block, blockClass }: { block: ContentBlock; blockClass: string }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<HotspotPopoverPos | null>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);

  const fitClass = block.imageFit === "contain" ? "object-contain"
    : block.imageFit === "fill" ? "object-fill"
    : block.imageFit === "center" ? "object-none"
    : "object-cover";
  const pos = block.imagePosition;
  const posStyle = pos ? { objectPosition: `${pos.x}% ${pos.y}%` } : undefined;

  const sized = typeof block.imageSize === "number";
  const imgSizeStyle: React.CSSProperties | undefined = sized
    ? { maxWidth: block.imageSize, width: "100%" }
    : undefined;

  const hotspots = block.imageHotspots ?? [];
  const hasHotspots = hotspots.length > 0;

  function handlePinClick(hotspot: ImageBlockHotspot, e: React.MouseEvent) {
    e.stopPropagation();
    if (activeHotspotId === hotspot.id) {
      setActiveHotspotId(null);
      setPopoverPos(null);
      return;
    }
    setActiveHotspotId(hotspot.id);
    if (imageWrapperRef.current) {
      const rect = imageWrapperRef.current.getBoundingClientRect();
      const pinTop = rect.top + (hotspot.y / 100) * rect.height;
      const showRight = hotspot.x > 55;
      setPopoverPos({
        top: pinTop,
        left: showRight ? rect.right + 10 : null,
        right: !showRight ? window.innerWidth - rect.left + 10 : null,
        showRight,
      });
    }
  }

  if (!block.value) {
    return (
      <div className={`rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500 ${blockClass}`}>
        Empty image block
      </div>
    );
  }

  const activeHotspot = hotspots.find((h) => h.id === activeHotspotId);

  return (
    <figure
      className={`m-0 ${sized ? "flex flex-col items-center" : ""} ${blockClass}`}
      onClick={() => { if (activeHotspotId) { setActiveHotspotId(null); setPopoverPos(null); } }}
    >
      {/* Image wrapper */}
      <div ref={imageWrapperRef} className={`relative ${sized ? "inline-block" : "w-full"}`}>
        <img
          src={block.value}
          alt={block.imageCaption ?? ""}
          style={{ ...posStyle, ...imgSizeStyle }}
          className={`rounded-xl ${fitClass} ${!sized ? "max-h-56 w-full" : ""} ${block.imageLightbox && !hasHotspots ? "cursor-zoom-in" : ""}`}
          onClick={block.imageLightbox && !hasHotspots ? () => setLightboxOpen(true) : undefined}
        />

        {/* Hotspot pins */}
        {hotspots.map((hotspot) => {
          const isActive = activeHotspotId === hotspot.id;
          return (
            <button
              key={hotspot.id}
              type="button"
              aria-label={hotspot.label || "Hotspot"}
              aria-expanded={isActive}
              onClick={(e) => handlePinClick(hotspot, e)}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
            >
              {/* Outer ping ring */}
              <span className="absolute inset-0 animate-ping rounded-full bg-white/70" aria-hidden="true" />
              {/* Pin circle */}
              <span className={`relative flex h-5 w-5 items-center justify-center rounded-full border-2 shadow-md transition-colors ${
                isActive ? "border-white bg-white" : "border-white bg-neutral-900"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full transition-colors ${isActive ? "bg-neutral-900" : "bg-white"}`} aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Side popover — portaled to body so ancestor overflow:hidden doesn't clip it */}
      {activeHotspot && popoverPos && (activeHotspot.label || activeHotspot.content) ? createPortal(
        <div
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          className="fixed z-[9999] w-48 rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl"
          style={{
            top: popoverPos.top,
            transform: "translateY(-50%)",
            ...(popoverPos.left !== null ? { left: popoverPos.left } : { right: popoverPos.right ?? undefined }),
          }}
        >
          {/* Connector arrow pointing back toward the image */}
          <div
            aria-hidden="true"
            className={`absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rotate-45 bg-white ${
              popoverPos.showRight
                ? "-left-[6px] border-b border-l border-neutral-200"
                : "-right-[6px] border-t border-r border-neutral-200"
            }`}
          />
          {activeHotspot.label && (
            <div className="mb-1 text-sm font-semibold text-neutral-900 leading-tight">{activeHotspot.label}</div>
          )}
          {activeHotspot.content && (
            <div className="text-xs leading-5 text-neutral-600">{activeHotspot.content}</div>
          )}
        </div>,
        document.body
      ) : null}

      {block.imageCaption ? (
        <figcaption className="mt-1.5 text-center text-xs text-neutral-500">
          {block.imageCaption}
        </figcaption>
      ) : null}
      {lightboxOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            aria-label="Close lightbox"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setLightboxOpen(false)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M2 2l14 14M16 2 2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <img
            src={block.value}
            alt={block.imageCaption ?? ""}
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {block.imageCaption ? (
            <p className="mt-3 text-sm text-white/75">{block.imageCaption}</p>
          ) : null}
        </div>,
        document.body
      )}
    </figure>
  );
}
