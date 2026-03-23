"use client";

import React from "react";
import { PageItem, SystemSettings } from "@/app/_lib/authoring-types";
import { getQrImageUrl } from "@/app/_lib/authoring-utils";
import { PreviewBlocks } from "@/app/_components/canvas/preview-blocks";

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

function getContainerAnimClass(ctype: string): string {
  if (ctype === "side-sheet") return "container-side-sheet-in";
  if (ctype === "full-page") return "container-full-page-in";
  if (ctype === "tooltip") return "container-tooltip-in";
  if (ctype === "external-link") return "container-external-link-in";
  return "container-modal-in";
}

export function getContainerExitClass(ctype: string): string {
  if (ctype === "side-sheet") return "container-side-sheet-out";
  if (ctype === "full-page") return "container-full-page-out";
  if (ctype === "tooltip") return "container-tooltip-out";
  if (ctype === "external-link") return "container-external-link-out";
  return "container-modal-out";
}

export type ContentModuleProps = {
  page: PageItem;
  isExiting: boolean;
  onExitEnd: () => void;
  systemSettings: SystemSettings;
  accentColor: string;
  isLayoutEditMode: boolean;
  isPreviewMode: boolean;
  onDismissContent: () => void;
  onContentCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export function ContentModule({
  page,
  isExiting,
  onExitEnd,
  systemSettings,
  accentColor,
  isLayoutEditMode,
  isPreviewMode,
  onDismissContent,
  onContentCardPointerDown,
}: ContentModuleProps) {
  const ctype = page.interactionType;
  const cardSize = page.cardSize ?? "medium";
  const isHotspotSelection = page.kind === "hotspot" && !isLayoutEditMode;
  const isContentDraggable =
    !isExiting && isLayoutEditMode && (ctype === "modal" || ctype === "tooltip");

  const contentCardWidth =
    cardSize === "compact" ? "w-[360px]"
    : cardSize === "xl" ? "w-[660px]"
    : cardSize === "large" ? "w-[70%] max-w-[1100px]"
    : "w-[520px]";
  const sideSheetWidth =
    cardSize === "compact" ? "w-[260px]" : cardSize === "large" ? "w-[480px]" : "w-[320px]";

  const fontThemeClass =
    systemSettings.fontTheme === "editorial" ? "font-serif"
    : systemSettings.fontTheme === "friendly" ? "font-sans tracking-[0.01em]"
    : "font-sans";
  const surfaceStyleClass =
    systemSettings.surfaceStyle === "solid"
      ? "border-neutral-300 bg-white shadow-xl"
      : systemSettings.surfaceStyle === "contrast"
      ? "border-neutral-900/10 bg-neutral-950/95 text-white shadow-2xl"
      : "border-white/60 bg-white shadow-lg";
  const mutedTextClass =
    systemSettings.surfaceStyle === "contrast" ? "text-neutral-300" : "text-neutral-600";
  const solidBg =
    systemSettings.surfaceStyle === "contrast" ? "bg-neutral-950/95 text-white"
    : systemSettings.surfaceStyle === "solid" ? "bg-white"
    : "bg-white";
  const tooltipArrowColor =
    systemSettings.surfaceStyle === "contrast" ? "rgba(10,10,10,0.95)"
    : systemSettings.surfaceStyle === "solid" ? "#ffffff"
    : "rgba(255,255,255,0.90)";
  const backBtnClass = [
    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition shadow-sm",
    systemSettings.surfaceStyle === "contrast"
      ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
  ].join(" ");

  // side-sheet and full-page always use their own slide animations — the
  // hotspot-preview-modal animation applies translate(-50%,-50%) which
  // completely breaks the edge-anchored positioning of these layouts.
  const entryClass =
    ctype === "side-sheet" || ctype === "full-page"
      ? getContainerAnimClass(ctype)
      : isHotspotSelection
      ? "hotspot-preview-modal"
      : page.kind === "page"
      ? getContainerAnimClass(ctype)
      : "";
  const animClass = isExiting ? getContainerExitClass(ctype) : entryClass;
  const pointerEventsStyle: React.CSSProperties = isExiting
    ? { pointerEvents: "none" }
    : {};

  function handleAnimEnd(e: React.AnimationEvent) {
    if (isExiting && e.currentTarget === e.target) onExitEnd();
  }

  const tintStyle: React.CSSProperties = page.contentTintColor
    ? { backgroundColor: hexToRgba(page.contentTintColor, page.contentTintOpacity ?? 85) }
    : {};

  // ── External link ──────────────────────────────────────────────
  if (ctype === "external-link") {
    const linkUrl = page.publicUrl || page.socialLinks[0]?.url || "";
    const contrastText = systemSettings.surfaceStyle === "contrast" ? "text-white" : "text-neutral-900";
    const dimText = systemSettings.surfaceStyle === "contrast" ? "text-neutral-400" : "text-neutral-500";
    return (
      <div
        className={`absolute z-30 ${animClass}`}
        style={{
          left: `${page.contentX}%`,
          top: `${page.contentY}%`,
          transform: "translate3d(-50%, -50%, 0)",
          touchAction: "none",
          ...pointerEventsStyle,
        }}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handleAnimEnd}
      >
        {isLayoutEditMode && !isExiting ? (
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-black/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            <span>Content module</span>
          </div>
        ) : null}
        <div className={`w-[260px] rounded-2xl border px-4 py-4 text-center shadow-xl ${surfaceStyleClass} ${fontThemeClass}`}>
          <div className={`text-2xl ${contrastText}`}>↗</div>
          <div className={`mt-1.5 text-sm font-semibold ${contrastText}`}>
            {page.title || "External link"}
          </div>
          {linkUrl ? (
            <div className={`mt-1 truncate text-[11px] ${dimText}`}>{linkUrl}</div>
          ) : null}
          <div className={`mt-3 rounded-xl border px-3 py-2 text-[11px] font-medium ${
            systemSettings.surfaceStyle === "contrast"
              ? "border-white/15 text-neutral-300"
              : "border-neutral-200 text-neutral-500"
          }`}>
            Opens in new tab
          </div>
        </div>
      </div>
    );
  }

  // ── Shared inner content ───────────────────────────────────────
  const innerContent = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className={`text-sm font-semibold ${
            systemSettings.surfaceStyle === "contrast" ? "text-white" : "text-neutral-900"
          }`}
        >
          {page.title || "Untitled page"}
        </div>
        {isPreviewMode && isHotspotSelection ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDismissContent(); }}
            className={`-mr-1 -mt-1 rounded-full p-1.5 text-xs leading-none transition ${
              systemSettings.surfaceStyle === "contrast"
                ? "text-neutral-400 hover:bg-white/10 hover:text-white"
                : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            }`}
            aria-label="Close"
          >
            <span aria-hidden="true">✕</span>
          </button>
        ) : null}
      </div>

      <div className={`mt-3 ${mutedTextClass}`}>
        <PreviewBlocks accentColor={accentColor} page={page} />
      </div>

      {page.socialLinks.length > 0 || page.showQrCode ? (
        <div className="mt-4 flex items-start gap-4">
          {page.socialLinks.length > 0 ? (
            <div className="flex-1">
              <div
                className={`mb-2 text-xs font-medium uppercase tracking-wide ${
                  systemSettings.surfaceStyle === "contrast" ? "text-neutral-300" : "text-neutral-500"
                }`}
              >
                Follow
              </div>
              <div className="flex flex-wrap gap-2">
                {page.socialLinks.map((item) => (
                  <a
                    key={item.id}
                    href={item.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={`rounded-full border px-2.5 py-1.5 text-xs ${
                      systemSettings.surfaceStyle === "contrast"
                        ? "border-white/20 text-white hover:bg-white/10"
                        : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    {item.label || "Social"}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {page.showQrCode ? (
            <div className="shrink-0">
              <img
                src={getQrImageUrl(page.publicUrl)}
                alt="QR code"
                className={`h-20 w-20 rounded-lg border ${
                  systemSettings.surfaceStyle === "contrast"
                    ? "border-white/15 bg-white"
                    : "border-neutral-200 bg-white"
                }`}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );

  // ── Full-page & side-sheet ─────────────────────────────────────
  if (ctype === "full-page" || ctype === "side-sheet") {
    const moduleClass = ctype === "full-page"
      ? `absolute inset-0 z-30 overflow-y-auto pt-0 pb-6 px-6 ${solidBg} ${fontThemeClass} ${animClass}`
      : `absolute top-0 right-0 bottom-0 z-30 ${sideSheetWidth} max-w-[calc(100%-3rem)] overflow-y-auto rounded-l-2xl pt-3 pb-6 px-5 ${solidBg} border-l border-neutral-200 ${fontThemeClass} ${animClass}`;

    return (
      <div
        className={moduleClass}
        style={{ ...tintStyle, ...pointerEventsStyle }}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handleAnimEnd}
      >
        {ctype === "full-page" ? (
          <div className="sticky top-0 z-10 mb-4 flex pt-4">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDismissContent(); }}
              aria-label="Back"
              className={backBtnClass}
            >
              <span aria-hidden="true">←</span> Back
            </button>
          </div>
        ) : (
          <div className="mb-4 flex justify-end pt-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDismissContent(); }}
              aria-label="Back"
              className={backBtnClass}
            >
              <span aria-hidden="true">←</span> Back
            </button>
          </div>
        )}
        {isLayoutEditMode && !isExiting ? (
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-black/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            <span>Content module</span>
          </div>
        ) : null}
        {innerContent}
      </div>
    );
  }

  // ── Modal & tooltip ────────────────────────────────────────────
  const innerCardClass = ctype === "tooltip"
    ? `max-w-[220px] rounded-xl p-3 text-sm ${isContentDraggable ? "cursor-grab active:cursor-grabbing" : ""} ${fontThemeClass} ${surfaceStyleClass} ${animClass}`
    : `rounded-2xl p-4 ${isContentDraggable ? "cursor-grab active:cursor-grabbing" : ""} ${contentCardWidth} max-w-[calc(100%-2rem)] ${fontThemeClass} ${surfaceStyleClass} ${animClass}`;

  const wrapperStyle: React.CSSProperties = {
    left: `${page.contentX}%`,
    top: `${page.contentY}%`,
    transform: ctype === "tooltip" ? "translate3d(-50%, -110%, 0)" : "translate3d(-50%, -50%, 0)",
    touchAction: "none",
    ...pointerEventsStyle,
  };

  return (
    <>
      {isHotspotSelection && isPreviewMode ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[26] hotspot-preview-veil"
        />
      ) : null}
      <div
        className="absolute z-30 flex flex-col items-end"
        style={wrapperStyle}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handleAnimEnd}
      >
        {isLayoutEditMode && !isExiting ? (
          <div
            aria-hidden="true"
            className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap inline-flex items-center gap-2 rounded-full bg-black/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white pointer-events-none"
          >
            <span>Content module</span>
            {isContentDraggable ? <span className="opacity-60">Move</span> : null}
          </div>
        ) : null}
        {!isExiting ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDismissContent(); }}
            aria-label="Back"
            className={`mb-1.5 ${backBtnClass}`}
          >
            <span aria-hidden="true">←</span> Back
          </button>
        ) : null}
        <div
          className={innerCardClass}
          style={ctype === "modal" ? tintStyle : undefined}
          onPointerDown={isContentDraggable ? onContentCardPointerDown : undefined}
        >
          {innerContent}
        </div>
      </div>
      {ctype === "tooltip" ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-30"
          style={{
            left: `${page.contentX}%`,
            top: `${page.contentY}%`,
            transform: "translate3d(-50%, -10%, 0)",
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: `8px solid ${tooltipArrowColor}`,
            filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.08))",
          }}
        />
      ) : null}
    </>
  );
}
