import { ChangeEvent, useEffect, useRef, useState } from "react";
import { IntroScreen } from "@/app/_components/canvas/intro-screen";
import { CanvasBackground } from "@/app/_components/canvas/canvas-background";
import { HotspotPin } from "@/app/_components/canvas/hotspot-pin";
import {
  getFeatureTypeLabel,
  getPublishStatusClasses,
  getPublishStatusLabel,
} from "@/app/_lib/authoring-utils";
import {
  CanvasFeature,
  LayoutMode,
  PageItem,
  SystemSettings,
} from "@/app/_lib/authoring-types";
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
  imageStripRef?: React.RefObject<HTMLDivElement | null>;
  contentZoneRef?: React.RefObject<HTMLDivElement | null>;
  dragThresholdRef?: React.RefObject<boolean>;
  contentDragState: ContentDragState | null;
  featureDragState: FeatureDragState | null;
  hotspotPages: PageItem[];
  pages?: PageItem[];
  isLayoutEditMode: boolean;
  layoutMode: LayoutMode;
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
  onSetLayoutMode: (mode: LayoutMode) => void;
  onTogglePreviewMode: () => void;
  onHeroUpload?: (event: ChangeEvent<HTMLInputElement>) => void;
  isPreviewMode: boolean;
  selectedPageId: string;
};

const SNAP_LINES = [33.333, 50, 66.666];

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
      className="absolute left-4 top-4 z-20 max-w-sm rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-600 shadow-sm"
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
          ? "Add canvas features like images, QR codes, disclaimers, buttons, and dropdowns."
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
  const activeFeature = features.find((f) => f.id === featureDragState?.id);
  if (!featureDragState || !activeFeature) return null;

  const showVertical = SNAP_LINES.filter((line) => Math.abs(line - activeFeature.x) <= 0.4);
  const showHorizontal = SNAP_LINES.filter((line) => Math.abs(line - activeFeature.y) <= 0.4);

  return (
    <>
      {showVertical.map((line) => (
        <div key={`v-${line}`} aria-hidden="true" className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-sky-500/80" style={{ left: `${line}%` }} />
      ))}
      {showHorizontal.map((line) => (
        <div key={`h-${line}`} aria-hidden="true" className="pointer-events-none absolute left-0 right-0 z-20 h-px bg-sky-500/80" style={{ top: `${line}%` }} />
      ))}
    </>
  );
}

/** Shared feature placer used in both portrait and landscape layouts */
function FeaturePlacer({
  features,
  isLayoutEditMode,
  accentColor,
  surfaceStyleClass,
  onCanvasFeaturePointerDown,
  onSelectPage,
}: {
  features: CanvasFeature[];
  isLayoutEditMode: boolean;
  accentColor: string;
  surfaceStyleClass: string;
  onCanvasFeaturePointerDown: (event: React.PointerEvent<HTMLDivElement>, featureId: string) => void;
  onSelectPage: (id: string) => void;
}) {
  return (
    <>
      {features.map((feature) => (
        <div
          key={feature.id}
          data-a11y-id={feature.id}
          data-a11y-type="feature"
          className={`absolute z-20 ${isLayoutEditMode ? "cursor-grab active:cursor-grabbing" : ""}`}
          style={{ left: `${feature.x}%`, top: `${feature.y}%`, transform: "translate3d(-50%, -50%, 0)", touchAction: "none" }}
          onPointerDown={(event) => onCanvasFeaturePointerDown(event, feature.id)}
          onClick={(event) => {
            event.stopPropagation();
            if (!isLayoutEditMode && feature.linkUrl) {
              if (feature.type === "page-button") onSelectPage(feature.linkUrl);
              else if (feature.type === "button" && feature.buttonLinkMode === "page") onSelectPage(feature.linkUrl);
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
    </>
  );
}

const LAYOUT_MODES: { mode: LayoutMode; label: string }[] = [
  { mode: "desktop", label: "Desktop" },
  { mode: "mobile-landscape", label: "Landscape" },
  { mode: "mobile-portrait", label: "Portrait" },
];

export function PreviewCanvas({
  activePage,
  surfacePage,
  canvasRef,
  imageStripRef,
  contentZoneRef,
  dragThresholdRef,
  contentDragState,
  featureDragState,
  hotspotPages,
  pages,
  isLayoutEditMode,
  layoutMode,
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
  onSetLayoutMode,
  onTogglePreviewMode,
  onHeroUpload,
  selectedPageId,
}: PreviewCanvasProps) {
  const surfaceStyleClass =
    systemSettings.surfaceStyle === "solid"
      ? "border-neutral-300 bg-white shadow-xl"
      : systemSettings.surfaceStyle === "contrast"
        ? "border-neutral-900/10 bg-neutral-950/95 text-white shadow-2xl"
        : "border-white/60 bg-white shadow-lg";

  const accentColor = systemSettings.accentColor || "";
  const accentActiveStyle = accentColor ? { backgroundColor: accentColor, borderColor: accentColor } : {};
  const accentRingStyle = accentColor ? { boxShadow: `0 0 0 4px ${accentColor}25` } : {};

  const hotspotSize = systemSettings.hotspotSize ?? "medium";
  const hotspotContainerSize = hotspotSize === "small" ? "h-5 w-5" : hotspotSize === "large" ? "h-8 w-8" : "h-6 w-6";
  const hotspotDotSize = hotspotSize === "small" ? "h-2.5 w-2.5" : hotspotSize === "large" ? "h-5 w-5" : "h-3.5 w-3.5";
  const hotspotLabelSize = hotspotSize === "large" ? "text-xs px-2.5 py-1" : "text-[10px] px-2 py-0.5";

  const isPortrait = layoutMode === "mobile-portrait";
  const isPortraitFull = isPortrait && systemSettings.portraitLayout === "full";
  const isPortraitSplit = isPortrait && !isPortraitFull;
  const isMobileFrame = layoutMode !== "desktop";
  const portraitSplitRatio = systemSettings.portraitSplitRatio ?? 55;
  const portraitBackground = systemSettings.portraitBackground ?? "#1a1a2e";

  const effectiveHotspotPages = hotspotPages.map((page) => ({
    ...page,
    x: isPortrait ? (page.mobileX ?? page.x) : page.x,
    y: isPortrait ? (page.mobileY ?? page.y) : page.y,
  }));

  const effectiveFeatures = surfacePage.canvasFeatures.map((f) => ({
    ...f,
    x: isPortrait ? (f.mobileX ?? f.x) : f.x,
    y: isPortrait ? (f.mobileY ?? f.y) : f.y,
  }));

  const contentZoneFeatures = isPortraitSplit
    ? effectiveFeatures.filter((f) => f.portraitZone === "content")
    : [];
  const stripFeatures = isPortraitSplit
    ? effectiveFeatures.filter((f) => f.portraitZone !== "content")
    : effectiveFeatures;

  // ── Intro screen ──────────────────────────────────────────────
  const introEnabled = !!(systemSettings.introScreen?.enabled && systemSettings.introScreen.youtubeUrl);
  const [introVisible, setIntroVisible] = useState(false);

  useEffect(() => {
    if (!isPreviewMode) { setIntroVisible(false); return; }
    if (introEnabled) setIntroVisible(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewMode]);

  // ── Content module transition ──────────────────────────────────
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
      if (modulePageRef.current?.id !== activePage.id || isModuleExitingRef.current) {
        syncModuleState(activePage, false);
      } else if (!isModuleExitingRef.current) {
        modulePageRef.current = activePage;
        setModulePage(activePage);
      }
    } else if (modulePageRef.current !== null && !isModuleExitingRef.current) {
      isModuleExitingRef.current = true;
      setIsModuleExiting(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage]);

  function handleModuleExitEnd() {
    syncModuleState(null, false);
  }

  const sharedHotspotPinProps = {
    isLayoutEditMode,
    isPreviewMode,
    accentColor,
    hotspotContainerSize,
    hotspotDotSize,
    hotspotLabelSize,
    accentActiveStyle,
    accentRingStyle,
    dragThresholdRef,
    onSelectPage,
    onHotspotPointerDown,
    onDeleteHotspot,
  };

  const sharedFeaturePlacerProps = {
    isLayoutEditMode,
    accentColor,
    surfaceStyleClass,
    onCanvasFeaturePointerDown,
    onSelectPage,
  };

  const sharedContentModuleProps = {
    pages,
    isExiting: isModuleExiting,
    onExitEnd: handleModuleExitEnd,
    systemSettings,
    accentColor,
    isLayoutEditMode,
    isPreviewMode,
    onDismissContent,
    onNavigate: onSelectPage,
    onContentCardPointerDown,
  };

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
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Currently editing</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold text-neutral-900">{activePage.title || "Untitled page"}</div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getPublishStatusClasses(activePage.publishStatus)}`}>
                  {getPublishStatusLabel(activePage.publishStatus)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center rounded-xl border border-neutral-200 bg-neutral-100 p-0.5 shadow-sm">
              {LAYOUT_MODES.map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onSetLayoutMode(mode)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    layoutMode === mode ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-1 justify-end gap-2">
              <button
                type="button"
                onClick={onToggleLayoutEditMode}
                className={`rounded-xl border px-3 py-2 text-xs font-medium shadow-sm ${
                  isLayoutEditMode ? "border-black bg-black text-white" : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                }`}
              >
                {isLayoutEditMode ? "Done editing" : "Edit layout"}
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

      <div className={isPreviewMode ? "relative flex-1 overflow-hidden" : isMobileFrame ? "flex flex-col items-center bg-neutral-800 py-10 px-4" : "p-4"}>
        <div
          ref={canvasRef}
          className={`overflow-hidden ${
            isPreviewMode
              ? "relative h-full w-full"
              : layoutMode === "mobile-portrait"
              ? "relative flex flex-col w-[390px] rounded-[44px] border-[6px] border-neutral-700 shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
              : layoutMode === "mobile-landscape"
              ? "relative max-w-full w-[667px] rounded-[44px] border-[6px] border-neutral-700 bg-white shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
              : "relative min-h-[620px] rounded-[28px] border border-neutral-200 bg-white shadow-sm"
          }`}
          style={{
            height: !isPreviewMode
              ? layoutMode === "mobile-portrait" ? 780
              : layoutMode === "mobile-landscape" ? 375
              : undefined
              : undefined,
            touchAction: "none",
          }}
          onClick={isPortraitSplit ? undefined : onCanvasClick}
        >
          {isPortraitSplit ? (
            <>
              {/* Content zone — top portion */}
              <div
                ref={contentZoneRef}
                className="relative flex-none overflow-hidden"
                style={{ flex: 100 - portraitSplitRatio, background: portraitBackground }}
                onClick={onDismissContent}
              >
                <FeaturePlacer features={contentZoneFeatures} {...sharedFeaturePlacerProps} />
                {modulePage ? (
                  <ContentModule key={modulePage.id} page={modulePage} {...sharedContentModuleProps} portraitZone />
                ) : (
                  <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-1.5 px-6 text-center">
                    <div className="text-xl opacity-20 text-white">↓</div>
                    <p className="text-xs font-medium opacity-30 text-white">Tap a hotspot on the board below</p>
                  </div>
                )}
              </div>

              {/* Image strip — bottom portion */}
              <div
                ref={imageStripRef}
                className="relative overflow-hidden"
                style={{ flex: portraitSplitRatio }}
                onClick={onCanvasClick}
              >
                <CanvasBackground heroImage={surfacePage.heroImage} isPreviewMode={isPreviewMode} onHeroUpload={onHeroUpload} compact />

                {featureDragState ? (
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
                    {SNAP_LINES.map((line) => (
                      <div key={`grid-v-${line}`} className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${line}%` }} />
                    ))}
                    {SNAP_LINES.map((line) => (
                      <div key={`grid-h-${line}`} className="absolute left-0 right-0 h-px bg-white/20" style={{ top: `${line}%` }} />
                    ))}
                  </div>
                ) : null}

                <SnapGuides featureDragState={featureDragState} features={stripFeatures} />
                <FeaturePlacer features={stripFeatures} {...sharedFeaturePlacerProps} />

                {surfacePage.kind === "home" && effectiveHotspotPages.map((page, index) => {
                  if (page.x === null || page.y === null) return null;
                  return (
                    <HotspotPin key={page.id} page={page} index={index} isSelected={page.id === selectedPageId} {...sharedHotspotPinProps} />
                  );
                })}

                {(surfacePage.canvasFeatures.length === 0 || hotspotPages.length === 0) && !isLayoutEditMode && showLayoutHelp ? (
                  <EmptySurfaceGuidance featureCount={surfacePage.canvasFeatures.length} hotspotCount={hotspotPages.length} onClose={onDismissLayoutHelp} />
                ) : null}
              </div>
            </>
          ) : (
            <>
              <CanvasBackground heroImage={surfacePage.heroImage} isPreviewMode={isPreviewMode} onHeroUpload={onHeroUpload} />

              {featureDragState || contentDragState ? (
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
                  {SNAP_LINES.map((line) => (
                    <div key={`grid-v-${line}`} className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${line}%` }} />
                  ))}
                  {SNAP_LINES.map((line) => (
                    <div key={`grid-h-${line}`} className="absolute left-0 right-0 h-px bg-white/20" style={{ top: `${line}%` }} />
                  ))}
                </div>
              ) : null}

              <SnapGuides featureDragState={featureDragState} features={effectiveFeatures} />
              <FeaturePlacer features={effectiveFeatures} {...sharedFeaturePlacerProps} />

              {surfacePage.kind === "home" && effectiveHotspotPages.map((page, index) => {
                if (page.x === null || page.y === null) return null;
                return (
                  <HotspotPin key={page.id} page={page} index={index} isSelected={page.id === selectedPageId} {...sharedHotspotPinProps} />
                );
              })}

              {modulePage ? (
                <ContentModule
                  key={modulePage.id}
                  page={{ ...modulePage, contentX: modulePage.contentX, contentY: modulePage.contentY }}
                  {...sharedContentModuleProps}
                />
              ) : null}

              {(surfacePage.canvasFeatures.length === 0 || hotspotPages.length === 0) && !isLayoutEditMode && showLayoutHelp ? (
                <EmptySurfaceGuidance featureCount={surfacePage.canvasFeatures.length} hotspotCount={hotspotPages.length} onClose={onDismissLayoutHelp} />
              ) : null}
            </>
          )}

          {isPreviewMode && introVisible && systemSettings.introScreen?.youtubeUrl ? (
            <IntroScreen
              youtubeUrl={systemSettings.introScreen.youtubeUrl}
              pages={pages ?? []}
              onStart={() => setIntroVisible(false)}
            />
          ) : null}
        </div>
        {isMobileFrame && !isPreviewMode ? (
          <div className="mt-3 h-1.5 w-28 rounded-full bg-neutral-600" />
        ) : null}
      </div>
    </div>
  );
}
