"use client";

import { ChangeEvent } from "react";
import { DEFAULT_HERO } from "@/app/_lib/authoring-utils";

export function CanvasBackground({
  heroImage,
  isPreviewMode,
  onHeroUpload,
  compact = false,
  objectPositionX = 50,
  objectPositionY = 50,
  onImageLoad,
}: {
  heroImage: string;
  isPreviewMode: boolean;
  onHeroUpload?: (event: ChangeEvent<HTMLInputElement>) => void;
  compact?: boolean;
  objectPositionX?: number;
  objectPositionY?: number;
  onImageLoad?: (naturalWidth: number, naturalHeight: number) => void;
}) {
  const isColorBackground = heroImage?.startsWith("color:");
  const heroColorValue = isColorBackground ? heroImage.slice(6) : "";
  const hasHeroImage = Boolean(heroImage?.trim()) && !isColorBackground;

  if (isColorBackground) {
    return <div className="absolute inset-0" style={{ backgroundColor: heroColorValue || "#e5e5e5" }} />;
  }

  if (hasHeroImage) {
    return (
      <img
        src={heroImage || DEFAULT_HERO}
        alt="Preview background"
        className="h-full w-full select-none object-cover"
        style={{ objectPosition: `${objectPositionX}% ${objectPositionY}%` }}
        draggable={false}
        onLoad={(e) => onImageLoad?.(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_#fafafa,_#e5e5e5)]">
      {!isPreviewMode && onHeroUpload ? (
        <label
          className={`cursor-pointer rounded-2xl border border-dashed border-neutral-400 bg-white/90 shadow-sm transition hover:border-neutral-500 hover:bg-white ${
            compact ? "px-4 py-3 text-xs" : "px-5 py-4 text-sm"
          } font-medium text-neutral-600`}
        >
          Set background
          <input type="file" accept="image/*" onChange={onHeroUpload} className="hidden" />
        </label>
      ) : null}
    </div>
  );
}
