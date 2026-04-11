"use client";

import React from "react";
import { PageItem, SystemSettings } from "@/app/_lib/authoring-types";
import { getQrImageUrl } from "@/app/_lib/label-utils";
import { getFontThemeClass } from "@/app/_lib/font-theme";
import { PreviewBlocks } from "@/app/_components/canvas/preview-blocks";
import { StepRailBlock, parseSRPreview } from "@/app/_components/canvas/step-rail-block";

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

function getContainerAnimClass(ctype: string): string {
  if (ctype === "side-sheet") return "container-side-sheet-in";
  if (ctype === "bottom-sheet") return "container-bottom-sheet-in";
  if (ctype === "full-page") return "container-full-page-in";
  if (ctype === "tooltip") return "container-tooltip-in";
  if (ctype === "external-link") return "container-external-link-in";
  return "container-modal-in";
}

export function getContainerExitClass(ctype: string): string {
  if (ctype === "side-sheet") return "container-side-sheet-out";
  if (ctype === "bottom-sheet") return "container-bottom-sheet-out";
  if (ctype === "full-page") return "container-full-page-out";
  if (ctype === "tooltip") return "container-tooltip-out";
  if (ctype === "external-link") return "container-external-link-out";
  return "container-modal-out";
}

export type ContentModuleProps = {
  page: PageItem;
  pages?: PageItem[];
  isExiting: boolean;
  onExitEnd: () => void;
  systemSettings: SystemSettings;
  accentColor: string;
  isLayoutEditMode: boolean;
  isPreviewMode: boolean;
  onDismissContent: () => void;
  onNavigate?: (pageId: string) => void;
  onNavigateBack?: () => void;
  canNavigateBack?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onContentCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  /** When true, fills the portrait content zone instead of positioning as a floating card */
  portraitZone?: boolean;
};

export function ContentModule({
  page,
  pages,
  isExiting,
  onExitEnd,
  systemSettings,
  accentColor,
  isLayoutEditMode,
  isPreviewMode,
  onDismissContent,
  onNavigate,
  onNavigateBack,
  canNavigateBack,
  scrollContainerRef,
  onContentCardPointerDown,
  portraitZone = false,
  moduleRef,
}: ContentModuleProps & {
  moduleRef?: React.Ref<HTMLDivElement>;
}) {
  const ctype = page.interactionType;
  const cardSize = page.cardSize ?? "medium";
  const isHotspotSelection = page.kind === "hotspot" && !isPreviewMode;
  const isContentDraggable =
    !isExiting && isLayoutEditMode && (ctype === "modal" || ctype === "tooltip");

  const contentCardWidth =
    cardSize === "compact" ? "w-[360px]"
    : cardSize === "xl" ? "w-[660px]"
    : cardSize === "large" ? "w-[800px]"
    : "w-[520px]";
  const sideSheetWidth =
    cardSize === "compact" ? "w-[260px]" : cardSize === "large" ? "w-[480px]" : "w-[320px]";

  const fontThemeClass = getFontThemeClass(systemSettings.fontTheme);
  const effectiveSurfaceStyle = systemSettings.darkMode ? "contrast" : systemSettings.surfaceStyle;
  const surfaceStyleClass =
    effectiveSurfaceStyle === "solid"
      ? "border-neutral-300 bg-white shadow-xl"
      : effectiveSurfaceStyle === "contrast"
      ? "border-neutral-900/10 bg-neutral-950/95 text-white shadow-2xl"
      : "border-white/60 bg-white shadow-lg";
  const mutedTextClass =
    effectiveSurfaceStyle === "contrast" ? "text-neutral-300" : "text-neutral-600";
  const solidBg =
    effectiveSurfaceStyle === "contrast" ? "bg-neutral-950/95 text-white"
    : effectiveSurfaceStyle === "solid" ? "bg-white"
    : "bg-white";
  // side-sheet and full-page always use their own slide animations — the
  // hotspot-preview-modal animation applies translate(-50%,-50%) which
  // completely breaks the edge-anchored positioning of these layouts.
  const entryClass =
    ctype === "side-sheet" || ctype === "bottom-sheet" || ctype === "full-page"
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
    const contrastText = effectiveSurfaceStyle === "contrast" ? "text-white" : "text-neutral-900";
    const dimText = effectiveSurfaceStyle === "contrast" ? "text-neutral-400" : "text-neutral-500";
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
        <div className={`w-[260px] max-w-[calc(100%-2rem)] rounded-2xl border px-4 py-4 text-center shadow-xl ${surfaceStyleClass} ${fontThemeClass}`}>
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

  // ── Step rail helpers ──────────────────────────────────────────
  const stepRailBlock = page.blocks.find((b) => b.type === "step-rail");
  const pageWithoutRail = stepRailBlock
    ? { ...page, blocks: page.blocks.filter((b) => b.type !== "step-rail") }
    : page;
  const srOrientation: "horizontal" | "vertical" = (() => {
    if (!stepRailBlock) return "vertical";
    try { return (JSON.parse(stepRailBlock.value).orientation as "horizontal" | "vertical") ?? "vertical"; }
    catch { return "vertical"; }
  })();

  // Split blocks into three ranges: before the first linked section, the linked span, and after.
  const srBlocks = pageWithoutRail.blocks;
  const srLinkedSectionIds = stepRailBlock
    ? parseSRPreview(stepRailBlock.value).steps.filter((s) => s.sectionBlockId).map((s) => s.sectionBlockId)
    : [];
  // Use the section that appears LATEST in the blocks array (highest index), not the last in step order.
  // When steps loop back to an earlier section, the step-order last entry would be earlier in the
  // document, wrongly truncating the rail span before later sections.
  const srLastLinkedId = srLinkedSectionIds.reduce<string | undefined>((best, id) => {
    const idx = srBlocks.findIndex((b) => b.id === id);
    const bestIdx = best !== undefined ? srBlocks.findIndex((b) => b.id === best) : -1;
    return idx > bestIdx ? id : best;
  }, undefined);
  const srFirstLinkedIdx = srLinkedSectionIds[0] ? srBlocks.findIndex((b) => b.id === srLinkedSectionIds[0]) : -1;
  const srLastLinkedIdx = srLastLinkedId !== undefined ? srBlocks.findIndex((b) => b.id === srLastLinkedId) : -1;
  // First section block after the last linked section is the trailing cutoff
  const srFirstBeyondIdx = srLastLinkedIdx >= 0
    ? (() => { const idx = srBlocks.findIndex((b, i) => i > srLastLinkedIdx && b.type === "section"); return idx; })()
    : -1;
  const srPreBlocks = srFirstLinkedIdx > 0 ? srBlocks.slice(0, srFirstLinkedIdx) : [];
  const srRailEnd = srFirstBeyondIdx >= 0 ? srFirstBeyondIdx : srBlocks.length;
  const srRailSpanBlocks = srFirstLinkedIdx >= 0 ? srBlocks.slice(srFirstLinkedIdx, srRailEnd) : srBlocks;
  const srPostBlocks = srFirstBeyondIdx >= 0 ? srBlocks.slice(srFirstBeyondIdx) : [];

  // ── Shared inner content ───────────────────────────────────────
  function renderContent(showInlineClose: boolean) {
    const titleNode = (
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {canNavigateBack && onNavigateBack && !isExiting ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onNavigateBack(); }}
              className={`-ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
                systemSettings.surfaceStyle === "contrast"
                  ? "text-neutral-400 hover:bg-white/10 hover:text-white"
                  : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              }`}
              aria-label="Back"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M6.5 2L3 5l3.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
          <div
            className={`truncate text-sm font-semibold ${
              systemSettings.surfaceStyle === "contrast" ? "text-white" : "text-neutral-900"
            }`}
          >
            {page.title || "Untitled page"}
          </div>
        </div>
        {showInlineClose && !isExiting ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDismissContent(); }}
            className={`-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition ${
              systemSettings.surfaceStyle === "contrast"
                ? "text-neutral-400 hover:bg-white/10 hover:text-white"
                : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            }`}
            aria-label="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>
    );

    function previewBlocks(blocks: typeof srBlocks, withHeader?: React.ReactNode) {
      return (
        <PreviewBlocks
          accentColor={accentColor}
          onNavigate={onNavigate}
          onDismissContent={onDismissContent}
          page={{ ...pageWithoutRail, blocks, summary: "" }}
          pages={pages}
          header={withHeader}
        />
      );
    }

    const noRailContent = (
      <PreviewBlocks accentColor={accentColor} onNavigate={onNavigate} onDismissContent={onDismissContent} page={pageWithoutRail} pages={pages} header={titleNode} />
    );

    return (
      <>
        <div className={mutedTextClass}>
          {!stepRailBlock && noRailContent}
          {stepRailBlock && srOrientation === "vertical" && (
            // All three regions use the same two-column layout so the content
            // column stays at a consistent left edge throughout.
            // Rail column is w-10 (40px) + gap-2 (8px) = 48px gutter.
            <div className="space-y-2">
              {/* Title always in the content column */}
              <div className="flex gap-2">
                <div className="w-10 flex-shrink-0" />
                <div className="min-w-0 flex-1">{titleNode}</div>
              </div>
              {/* Pre-section content */}
              {(srPreBlocks.length > 0 || page.summary.trim()) && (
                <div className="flex gap-2">
                  <div className="w-10 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <PreviewBlocks
                      accentColor={accentColor}
                      onNavigate={onNavigate}
                      onDismissContent={onDismissContent}
                      page={{ ...pageWithoutRail, blocks: srPreBlocks, summary: page.summary }}
                      pages={pages}
                    />
                  </div>
                </div>
              )}
              {/* Rail beside linked sections — sticky within scroll container */}
              {srRailSpanBlocks.length > 0 && (
                <div className="flex items-start gap-2">
                  <div className="w-10 flex-shrink-0 self-start" style={{ position: "sticky", top: 0 }}>
                    <StepRailBlock block={stepRailBlock} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {previewBlocks(srRailSpanBlocks)}
                  </div>
                </div>
              )}
              {/* Post-section content */}
              {srPostBlocks.length > 0 && (
                <div className="flex gap-2">
                  <div className="w-10 flex-shrink-0" />
                  <div className="min-w-0 flex-1">{previewBlocks(srPostBlocks)}</div>
                </div>
              )}
            </div>
          )}
          {stepRailBlock && srOrientation === "horizontal" && (
            <div className="space-y-2">
              {titleNode}
              {(srPreBlocks.length > 0 || page.summary.trim()) && (
                <PreviewBlocks
                  accentColor={accentColor}
                  onNavigate={onNavigate}
                  onDismissContent={onDismissContent}
                  page={{ ...pageWithoutRail, blocks: srPreBlocks, summary: page.summary }}
                  pages={pages}
                />
              )}
              {srRailSpanBlocks.length > 0 && (
                <div>
                  <div style={{ position: "sticky", top: 0, zIndex: 10 }}>
                    <StepRailBlock block={stepRailBlock} />
                  </div>
                  {previewBlocks(srRailSpanBlocks)}
                </div>
              )}
              {srPostBlocks.length > 0 && previewBlocks(srPostBlocks)}
            </div>
          )}
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
                {page.socialLinks.map((item) => {
                  const btnClass = `rounded-full px-2.5 py-1.5 text-xs ${
                    systemSettings.surfaceStyle === "contrast"
                      ? "text-white hover:bg-white/10"
                      : "text-neutral-700 hover:bg-neutral-50"
                  }`;
                  if ((item.linkMode ?? "external") === "page" && item.linkPageId) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onNavigate?.(item.linkPageId!); }}
                        className={btnClass}
                      >
                        {item.label || "Go to card"}
                      </button>
                    );
                  }
                  return (
                    <a
                      key={item.id}
                      href={item.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className={btnClass}
                    >
                      {item.label || "Social"}
                    </a>
                  );
                })}
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
  }

  // ── Portrait content zone fill ─────────────────────────────────
  // Fills the dedicated content zone at the top of the portrait split layout.
  // Ignores the page's interactionType — content always fills the zone.
  if (portraitZone) {
    const portraitAnimClass = isExiting
      ? "container-external-link-out"
      : "container-external-link-in";
    return (
      <div
        ref={scrollContainerRef}
        className={`absolute inset-0 z-30 overflow-y-auto px-5 py-5 ${solidBg} ${fontThemeClass} ${portraitAnimClass}`}
        style={{ ...tintStyle, ...pointerEventsStyle }}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handleAnimEnd}
      >
        {renderContent(true)}
      </div>
    );
  }

  // ── Bottom sheet ───────────────────────────────────────────────
  if (ctype === "bottom-sheet") {
    return (
      <div
        ref={scrollContainerRef}
        className={`absolute bottom-0 left-0 right-0 z-30 max-h-[65%] overflow-y-auto rounded-t-2xl border-t border-neutral-200 px-5 pb-6 pt-3 ${solidBg} ${fontThemeClass} ${animClass}`}
        style={{ ...tintStyle, ...pointerEventsStyle }}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handleAnimEnd}
      >
        {/* Drag handle */}
        <div className="mb-3 flex justify-center">
          <div className={`h-1 w-10 rounded-full ${systemSettings.surfaceStyle === "contrast" ? "bg-white/20" : "bg-neutral-300"}`} />
        </div>
        {renderContent(true)}
      </div>
    );
  }

  // ── Full-page & side-sheet ─────────────────────────────────────
  if (ctype === "full-page" || ctype === "side-sheet") {
    if (ctype === "full-page") {
      return (
        <div
          className={`absolute inset-0 z-30 flex flex-col ${solidBg} ${fontThemeClass} ${animClass}`}
          style={{ ...tintStyle, ...pointerEventsStyle }}
          onClick={(e) => e.stopPropagation()}
          onAnimationEnd={handleAnimEnd}
        >
          {/* Dedicated close button — top-right of the full-page container */}
          {!isExiting ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDismissContent(); }}
              className={`absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full transition ${
                systemSettings.surfaceStyle === "contrast"
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-neutral-900/8 text-neutral-700 hover:bg-neutral-900/15"
              }`}
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
            <div className="mx-auto w-full max-w-md py-4">
              {renderContent(false)}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={scrollContainerRef}
        className={`absolute top-0 right-0 bottom-0 z-30 ${sideSheetWidth} max-w-[calc(100%-3rem)] overflow-y-auto rounded-l-2xl pt-4 pb-6 px-5 ${solidBg} border-l border-neutral-200 ${fontThemeClass} ${animClass}`}
        style={{ ...tintStyle, ...pointerEventsStyle }}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handleAnimEnd}
      >
        {renderContent(true)}
      </div>
    );
  }

  // ── Modal & tooltip ────────────────────────────────────────────
  const innerCardClass = ctype === "tooltip"
    ? `max-w-[220px] rounded-xl p-3 text-sm ${isContentDraggable ? "cursor-grab active:cursor-grabbing" : ""} ${fontThemeClass} ${surfaceStyleClass} ${animClass}`
    : `rounded-2xl p-4 ${isContentDraggable ? "cursor-grab active:cursor-grabbing" : ""} ${contentCardWidth} max-w-[calc(100%-2rem)] max-h-[80%] overflow-y-auto ${fontThemeClass} ${surfaceStyleClass} ${animClass}`;

  const wrapperStyle: React.CSSProperties = {
    left: `${page.contentX}%`,
    top: `${page.contentY}%`,
    transform: "translate3d(-50%, -50%, 0)",
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
        ref={moduleRef}
        className="absolute z-30 flex flex-col items-end"
        style={wrapperStyle}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handleAnimEnd}
      >
        <div
          ref={scrollContainerRef}
          className={innerCardClass}
          style={ctype === "modal" ? tintStyle : undefined}
          onPointerDown={isContentDraggable ? onContentCardPointerDown : undefined}
        >
          {renderContent(true)}
        </div>
      </div>
    </>
  );
}
