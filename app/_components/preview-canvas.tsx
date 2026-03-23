import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_HERO,
  getFeatureTypeLabel,
  getPublishStatusClasses,
  getPublishStatusLabel,
} from "@/app/_lib/authoring-utils";
import {
  CanvasFeature,
  PageItem,
  SystemSettings,
} from "@/app/_lib/authoring-types";
import { PreviewBlocks } from "@/app/_components/canvas/preview-blocks";
import { CanvasFeatureCard } from "@/app/_components/canvas/canvas-feature-card";
import { ContentModule } from "@/app/_components/canvas/content-module";

type FeatureDragState = {
  id: string;
  pointerOffsetX: number;
  pointerOffsetY: number;
};

type ContentDragState = {
  pointerOffsetX: number;
  pointerOffsetY: number;
};

type PreviewCanvasProps = {
  activePage: PageItem;
  surfacePage: PageItem;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  contentDragState: ContentDragState | null;
  featureDragState: FeatureDragState | null;
  hotspotPages: PageItem[];
  isLayoutEditMode: boolean;
  isMobileView: boolean;
  systemSettings: SystemSettings;
  showLayoutHelp: boolean;
  onCanvasClick: React.MouseEventHandler<HTMLDivElement>;
  onCanvasFeaturePointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
    featureId: string
  ) => void;
  onContentCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDeleteHotspot: (pageId: string) => void;
  onDismissLayoutHelp: () => void;
  onHotspotPointerDown: (
    event: React.PointerEvent<HTMLButtonElement>,
    page: PageItem
  ) => void;
  onDismissContent: () => void;
  onSelectPage: (id: string) => void;
  onToggleLayoutEditMode: () => void;
  onToggleMobileView: () => void;
  onTogglePreviewMode: () => void;
  isPreviewMode: boolean;
  selectedPageId: string;
};

const DEFAULT_HOTSPOT_BLOCK = "Add contextual content for this hotspot.";

function isHotspotEmpty(page: PageItem): boolean {
  const hasRealSummary = page.summary.trim().length > 0;
  const hasRealBlocks = page.blocks.some(
    (b) => b.value.trim() !== "" && b.value.trim() !== DEFAULT_HOTSPOT_BLOCK
  );
  return !hasRealSummary && !hasRealBlocks;
}

const SNAP_LINES = [33.333, 50, 66.666];
const SAFE_MARGIN = 10;

function EmptySurfaceGuidance({
  featureCount,
  hotspotCount,
  onClose,
}: {
  featureCount: number;
  hotspotCount: number;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute left-4 top-4 z-20 max-w-sm rounded-2xl border border-dashed border-neutral-300 bg-white/92 p-4 text-sm text-neutral-600 shadow-sm backdrop-blur"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="font-medium text-neutral-900">Build the layout</div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Close
        </button>
      </div>
      <div className="mt-2 leading-6">
        {featureCount === 0
          ? "Add canvas features like logos, QR codes, disclaimers, buttons, and dropdowns."
          : "Turn on layout edit mode to move surface items directly on top of the image."}
      </div>
      <div className="mt-2 leading-6">
        {hotspotCount === 0
          ? "Click inside the image to create contextual hotspots."
          : "Drag hotspots inside the image to align them with the right object or area."}
      </div>
    </div>
  );
}


function SnapGuides({
  featureDragState,
  features,
}: {
  featureDragState: FeatureDragState | null;
  features: CanvasFeature[];
}) {
  const activeFeature = features.find((feature) => feature.id === featureDragState?.id);
  if (!featureDragState || !activeFeature) {
    return null;
  }

  const showVertical = SNAP_LINES.filter((line) => Math.abs(line - activeFeature.x) <= 0.4);
  const showHorizontal = SNAP_LINES.filter((line) => Math.abs(line - activeFeature.y) <= 0.4);

  return (
    <>
      {showVertical.map((line) => (
        <div
          key={`v-${line}`}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-sky-500/80"
          style={{ left: `${line}%` }}
        />
      ))}
      {showHorizontal.map((line) => (
        <div
          key={`h-${line}`}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 z-20 h-px bg-sky-500/80"
          style={{ top: `${line}%` }}
        />
      ))}
    </>
  );
}

export function PreviewCanvas({
  activePage,
  surfacePage,
  canvasRef,
  contentDragState,
  featureDragState,
  hotspotPages,
  isLayoutEditMode,
  isMobileView,
  isPreviewMode,
  systemSettings,
  showLayoutHelp,
  onCanvasClick,
  onCanvasFeaturePointerDown,
  onContentCardPointerDown,
  onDeleteHotspot,
  onDismissContent,
  onDismissLayoutHelp,
  onHotspotPointerDown,
  onSelectPage,
  onToggleLayoutEditMode,
  onToggleMobileView,
  onTogglePreviewMode,
  selectedPageId,
}: PreviewCanvasProps) {
  const isColorBackground = Boolean(surfacePage.heroImage?.startsWith("color:"));
  const heroColorValue = isColorBackground ? surfacePage.heroImage.slice(6) : "";
  const hasHeroImage = Boolean(surfacePage.heroImage?.trim()) && !isColorBackground;
  const surfaceStyleClass =
    systemSettings.surfaceStyle === "solid"
      ? "border-neutral-300 bg-white shadow-xl"
      : systemSettings.surfaceStyle === "contrast"
        ? "border-neutral-900/10 bg-neutral-950/95 text-white shadow-2xl"
        : "border-white/60 bg-white/90 shadow-lg backdrop-blur-2xl";

  const accentColor = systemSettings.accentColor || "";
  const accentActiveStyle = accentColor
    ? { backgroundColor: accentColor, borderColor: accentColor }
    : {};
  const accentRingStyle = accentColor
    ? { boxShadow: `0 0 0 4px ${accentColor}25` }
    : {};

  const hotspotSize = systemSettings.hotspotSize ?? "medium";
  const hotspotContainerSize = hotspotSize === "small" ? "h-5 w-5" : hotspotSize === "large" ? "h-8 w-8" : "h-6 w-6";
  const hotspotDotSize = hotspotSize === "small" ? "h-2.5 w-2.5" : hotspotSize === "large" ? "h-5 w-5" : "h-3.5 w-3.5";
  const hotspotLabelSize = hotspotSize === "large" ? "text-xs px-2.5 py-1" : "text-[10px] px-2 py-0.5";

  // ── Content module transition state ───────────────────────────
  const [modulePage, setModulePage] = useState<PageItem | null>(
    activePage.kind !== "home" ? activePage : null
  );
  const [isModuleExiting, setIsModuleExiting] = useState(false);
  const modulePageRef = useRef<PageItem | null>(modulePage);
  const isModuleExitingRef = useRef(false);

  function syncModuleState(page: PageItem | null, exiting: boolean) {
    modulePageRef.current = page;
    isModuleExitingRef.current = exiting;
    setModulePage(page);
    setIsModuleExiting(exiting);
  }

  useEffect(() => {
    if (activePage.kind !== "home") {
      if (
        modulePageRef.current?.id !== activePage.id ||
        isModuleExitingRef.current
      ) {
        syncModuleState(activePage, false);
      }
    } else if (
      modulePageRef.current !== null &&
      !isModuleExitingRef.current
    ) {
      isModuleExitingRef.current = true;
      setIsModuleExiting(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage.id, activePage.kind]);

  function handleModuleExitEnd() {
    syncModuleState(null, false);
  }

  return (
    <div className={isPreviewMode ? "fixed inset-0 z-50 flex flex-col bg-black" : "relative overflow-hidden rounded-3xl border border-neutral-200 bg-[#f4f5f7]"}>
      <div className={`border-b border-neutral-200 bg-white px-4 py-3 ${isPreviewMode ? "flex shrink-0 items-center justify-end" : ""}`}>
        {isPreviewMode ? (
          <button
            type="button"
            onClick={onTogglePreviewMode}
            className="rounded-xl border border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow-sm"
          >
            Stop preview <span className="opacity-70">Esc</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                Currently editing
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold text-neutral-900">
                  {activePage.title || "Untitled page"}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getPublishStatusClasses(activePage.publishStatus)}`}
                >
                  {getPublishStatusLabel(activePage.publishStatus)}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onToggleLayoutEditMode}
                className={`rounded-xl border px-3 py-2 text-xs font-medium shadow-sm ${
                  isLayoutEditMode
                    ? "border-black bg-black text-white"
                    : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                }`}
              >
                {isLayoutEditMode ? "Done editing" : "Edit layout"}
              </button>

              <button
                type="button"
                onClick={onToggleMobileView}
                className={`rounded-xl border px-3 py-2 text-xs font-medium shadow-sm ${
                  isMobileView
                    ? "border-black bg-black text-white"
                    : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                }`}
              >
                Mobile
              </button>

              <button
                type="button"
                onClick={onTogglePreviewMode}
                className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 shadow-sm hover:bg-neutral-50"
              >
                Preview
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={isPreviewMode ? "relative flex-1 overflow-hidden" : isMobileView ? "flex flex-col items-center bg-neutral-800 py-10 px-4" : "p-4"}>
        <div
          ref={canvasRef}
          className={`relative overflow-hidden ${
            isPreviewMode
              ? "h-full w-full"
              : isMobileView
              ? "w-[390px] rounded-[44px] border-[6px] border-neutral-700 bg-white shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
              : "min-h-[620px] rounded-[28px] border border-neutral-200 bg-white shadow-sm"
          }`}
          style={{ minHeight: isMobileView && !isPreviewMode ? 780 : undefined, touchAction: "none" }}
          onClick={onCanvasClick}
        >
          {isColorBackground ? (
            <div
              className="absolute inset-0"
              style={{ backgroundColor: heroColorValue || "#e5e5e5" }}
            />
          ) : hasHeroImage ? (
            <img
              src={surfacePage.heroImage || DEFAULT_HERO}
              alt="Preview background"
              className="h-full w-full select-none object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_#fafafa,_#e5e5e5)]">
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/90 px-5 py-4 text-sm text-neutral-600 shadow-sm">
                No hero image yet. Add one to create a layout surface.
              </div>
            </div>
          )}

          {featureDragState || contentDragState ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
              <div
                className="absolute border border-dashed border-white/35"
                style={{
                  left: `${SAFE_MARGIN}%`,
                  top: `${SAFE_MARGIN}%`,
                  right: `${SAFE_MARGIN}%`,
                  bottom: `${SAFE_MARGIN}%`,
                }}
              />
              {SNAP_LINES.map((line) => (
                <div
                  key={`grid-v-${line}`}
                  className="absolute top-0 bottom-0 w-px bg-white/20"
                  style={{ left: `${line}%` }}
                />
              ))}
              {SNAP_LINES.map((line) => (
                <div
                  key={`grid-h-${line}`}
                  className="absolute left-0 right-0 h-px bg-white/20"
                  style={{ top: `${line}%` }}
                />
              ))}
            </div>
          ) : null}

          <SnapGuides
            featureDragState={featureDragState}
            features={surfacePage.canvasFeatures}
          />

          {surfacePage.canvasFeatures.map((feature) => (
            <div
              key={feature.id}
              data-a11y-id={feature.id}
              data-a11y-type="feature"
              className={`absolute z-20 ${
                isLayoutEditMode ? "cursor-grab active:cursor-grabbing" : ""
              }`}
              style={{
                left: `${feature.x}%`,
                top: `${feature.y}%`,
                transform: "translate3d(-50%, -50%, 0)",
                touchAction: "none",
              }}
              onPointerDown={(event) => onCanvasFeaturePointerDown(event, feature.id)}
              onClick={(event) => {
                event.stopPropagation();
                if (!isLayoutEditMode && feature.type === "page-button" && feature.linkUrl) {
                  onSelectPage(feature.linkUrl);
                }
              }}
            >
              {isLayoutEditMode ? (
                <div className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap flex items-center gap-2 rounded-full bg-black/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  <span>{getFeatureTypeLabel(feature.type)}</span>
                  <span className="opacity-60">Move</span>
                </div>
              ) : null}
              <CanvasFeatureCard accentColor={accentColor} feature={feature} surfaceStyleClass={surfaceStyleClass} />
            </div>
          ))}

          {surfacePage.kind === "home" && hotspotPages.map((page, index) => {
            const isSelected = page.id === selectedPageId;
            if (page.x === null || page.y === null) {
              return null;
            }

            const dotBg = accentColor || "#0a0a0a";
            const showQuickDelete = !isPreviewMode && isHotspotEmpty(page);

            return (
              <div
                key={page.id}
                className="absolute"
                style={{
                  left: `${page.x}%`,
                  top: `${page.y}%`,
                  transform: "translate3d(-50%, -50%, 0)",
                  zIndex: isSelected ? 29 : 28,
                }}
              >
                {showQuickDelete ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteHotspot(page.id);
                    }}
                    aria-label="Delete hotspot"
                    className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-red-200 bg-white text-[10px] font-bold text-red-500 shadow-sm transition hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                    style={{ lineHeight: 1 }}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                ) : null}
                {isLayoutEditMode ? (
                  // Edit mode: labeled pill for clear draggability
                  <button
                    type="button"
                    draggable={false}
                    onPointerDown={(event) => onHotspotPointerDown(event, page)}
                    onDragStart={(event) => event.preventDefault()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectPage(page.id);
                    }}
                    className={`relative cursor-grab rounded-full border px-3 py-1.5 text-xs font-semibold shadow transition active:cursor-grabbing ${
                      isSelected
                        ? "border-black bg-black text-white"
                        : "border-white bg-white/90 text-neutral-900 hover:bg-white"
                    }`}
                    style={{
                      touchAction: "none",
                      ...(isSelected && accentColor ? accentActiveStyle : {}),
                      ...(isSelected && accentColor ? accentRingStyle : {}),
                    }}
                    aria-label={`Select and drag hotspot: ${page.title?.trim() ? page.title : `Hotspot ${index + 1}`}`}
                  >
                    {page.title?.trim() ? page.title : `Hotspot ${index + 1}`}
                  </button>
                ) : (
                  // Preview mode: pulsing dot with label
                  <button
                    type="button"
                    draggable={false}
                    onPointerDown={(event) => onHotspotPointerDown(event, page)}
                    onDragStart={(event) => event.preventDefault()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectPage(page.id);
                    }}
                    className="group flex flex-col items-center gap-1"
                    style={{ touchAction: "none" }}
                    aria-label={page.title?.trim() || `Hotspot ${index + 1}`}
                  >
                    <span className={`relative flex ${hotspotContainerSize} items-center justify-center`}>
                      {isSelected ? (
                        <span
                          className="absolute inset-0 animate-ping rounded-full opacity-40"
                          style={{ backgroundColor: dotBg }}
                        />
                      ) : (
                        <span
                          className="absolute inset-0 animate-pulse rounded-full opacity-20"
                          style={{ backgroundColor: dotBg }}
                        />
                      )}
                      <span
                        className={`relative ${hotspotDotSize} rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-125`}
                        style={{ backgroundColor: dotBg }}
                      />
                    </span>
                    <span
                      className={`rounded-full ${hotspotLabelSize} font-semibold shadow-sm backdrop-blur transition`}
                      style={
                        isSelected
                          ? { backgroundColor: dotBg, color: "#fff" }
                          : { backgroundColor: "rgba(255,255,255,0.92)", color: "#0a0a0a" }
                      }
                    >
                      {page.title?.trim() ? page.title : `Hotspot ${index + 1}`}
                    </span>
                  </button>
                )}
              </div>
            );
          })}


          {modulePage ? (
            <ContentModule
              key={modulePage.id}
              page={modulePage}
              isExiting={isModuleExiting}
              onExitEnd={handleModuleExitEnd}
              systemSettings={systemSettings}
              accentColor={accentColor}
              isLayoutEditMode={isLayoutEditMode}
              isPreviewMode={isPreviewMode}
              onDismissContent={onDismissContent}
              onContentCardPointerDown={onContentCardPointerDown}
            />
          ) : null}

          {(surfacePage.canvasFeatures.length === 0 || hotspotPages.length === 0) &&
          !isLayoutEditMode &&
          showLayoutHelp ? (
            <EmptySurfaceGuidance
              featureCount={surfacePage.canvasFeatures.length}
              hotspotCount={hotspotPages.length}
              onClose={onDismissLayoutHelp}
            />
          ) : null}
        </div>
        {isMobileView && !isPreviewMode ? (
          <div className="mt-3 h-1.5 w-28 rounded-full bg-neutral-600" />
        ) : null}
      </div>
    </div>
  );
}
