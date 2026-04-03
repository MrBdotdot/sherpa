import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { IntroScreen } from "@/app/_components/canvas/intro-screen";
import { CanvasBackground } from "@/app/_components/canvas/canvas-background";

const ModelViewer = dynamic(
  () => import("@/app/_components/canvas/model-viewer").then((m) => ({ default: m.ModelViewer })),
  { ssr: false }
);
import { HotspotPin } from "@/app/_components/canvas/hotspot-pin";
import { getExperienceStatusClasses, getExperienceStatusLabel } from "@/app/_lib/label-utils";
import {
  ExperienceStatus,
  LayoutMode,
  PageItem,
  SystemSettings,
} from "@/app/_lib/authoring-types";
import { ContentModule } from "@/app/_components/canvas/content-module";
import {
  ContentDragState,
  EmptySurfaceGuidance,
  FeatureDragState,
  FeaturePlacer,
  SNAP_LINES,
  SnapGuides,
} from "@/app/_components/canvas/preview-canvas-helpers";

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
  experienceStatus: ExperienceStatus;
  onExperienceStatusChange: (status: ExperienceStatus) => void;
  onCanvasClick: React.MouseEventHandler<HTMLDivElement>;
  onPlace3dHotspot?: (pos: [number, number, number], normal: [number, number, number]) => void;
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
  onOpenCommandPalette?: () => void;
  onHeroUpload?: (event: ChangeEvent<HTMLInputElement>) => void;
  isPreviewMode: boolean;
  selectedPageId: string;
  saveState?: "idle" | "saving" | "saved" | "error";
  gameName?: string;
  onRenameGame?: (name: string) => void;
  /** When true the canvas stretches to fill its parent height instead of using a fixed min-height.
   *  Use in the main studio layout; leave false (default) for modal/sidebar previews. */
  fillHeight?: boolean;
};

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
  experienceStatus,
  onExperienceStatusChange,
  onCanvasClick,
  onPlace3dHotspot,
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
  onOpenCommandPalette,
  onHeroUpload,
  selectedPageId,
  saveState = "idle",
  gameName,
  onRenameGame,
  fillHeight = false,
}: PreviewCanvasProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  function startEditName() {
    setNameInput(gameName ?? activePage.title ?? "");
    setEditingName(true);
  }

  function commitName() {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== (gameName ?? activePage.title)) onRenameGame?.(trimmed);
    setEditingName(false);
  }
  const surfaceStyleClass =
    systemSettings.surfaceStyle === "solid"
      ? "border-neutral-300 bg-white shadow-xl"
      : systemSettings.surfaceStyle === "contrast"
        ? "border-neutral-900/10 bg-neutral-950/95 text-white shadow-2xl"
        : "border-white/60 bg-white shadow-lg";

  const accentColor = systemSettings.accentColor || "";
  const accentActiveStyle = useMemo(
    () => (accentColor ? { backgroundColor: accentColor, borderColor: accentColor } : {}),
    [accentColor]
  );
  const accentRingStyle = useMemo(
    () => (accentColor ? { boxShadow: `0 0 0 4px ${accentColor}25` } : {}),
    [accentColor]
  );

  const hotspotSize = systemSettings.hotspotSize ?? "medium";
  const hotspotContainerSize = hotspotSize === "small" ? "h-5 w-5" : hotspotSize === "large" ? "h-8 w-8" : "h-6 w-6";
  const hotspotDotSize = hotspotSize === "small" ? "h-2.5 w-2.5" : hotspotSize === "large" ? "h-5 w-5" : "h-3.5 w-3.5";
  const hotspotLabelSize = hotspotSize === "large" ? "text-xs px-2.5 py-1" : "text-[10px] px-2 py-0.5";

  const isPortrait = layoutMode === "mobile-portrait";
  const isPortraitFull = isPortrait && systemSettings.portraitLayout === "full";
  const isPortraitSplit = isPortrait && !isPortraitFull;
  const isMobileFrame = layoutMode !== "desktop";
  const isModel3d = systemSettings.backgroundType === "model-3d" && !!systemSettings.modelUrl;

  // Build sphere marker list for the 3D viewer — only hotspots with a stored
  // group-local worldPosition are included; 2D hotspots are rendered as pins.
  const model3dMarkers = useMemo(
    () =>
      isModel3d
        ? hotspotPages
            .filter((p) => p.worldPosition !== undefined)
            .map((p) => ({
              id: p.id,
              position: p.worldPosition as [number, number, number],
              normal: p.worldNormal,
              title: p.title,
              isSelected: p.id === selectedPageId,
            }))
        : [],
    [isModel3d, hotspotPages, selectedPageId]
  );
  const portraitSplitRatio = systemSettings.portraitSplitRatio ?? 55;
  const portraitBackground = systemSettings.portraitBackground ?? "#1a1a2e";

  const [portraitPanX, setPortraitPanX] = useState(50);
  const [stripImageAspect, setStripImageAspect] = useState(0);
  const stripPanRef = useRef<{ startX: number; startPan: number; pointerId: number; moved: boolean } | null>(null);

  // Hotspot layer offset to track image pan in portrait split mode.
  // Portrait canvas is always 390 × (780 * ratio/100) px.
  const PORTRAIT_CANVAS_W = 390;
  const portraitStripH = PORTRAIT_CANVAS_W * 2 * portraitSplitRatio / 100; // 780 * ratio/100
  const stripOverflow = stripImageAspect > 0 ? Math.max(0, stripImageAspect * portraitStripH - PORTRAIT_CANVAS_W) : 0;
  const hotspotPanOffset = stripOverflow * (50 - portraitPanX) / 100;

  const [landscapePanX, setLandscapePanX] = useState(50);
  const [landscapePanY, setLandscapePanY] = useState(50);
  const [landscapeImageAspect, setLandscapeImageAspect] = useState(0);
  const landscapePanRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number; pointerId: number; moved: boolean } | null>(null);

  // Hotspot layer offset for landscape mode. Canvas is always 667 × 375 px.
  // Only one axis overflows at a time depending on image vs canvas aspect ratio.
  const LANDSCAPE_CANVAS_W = 667;
  const LANDSCAPE_CANVAS_H = 375;
  const LANDSCAPE_CANVAS_ASPECT = LANDSCAPE_CANVAS_W / LANDSCAPE_CANVAS_H;
  const landscapeOverflowX = landscapeImageAspect > LANDSCAPE_CANVAS_ASPECT
    ? landscapeImageAspect * LANDSCAPE_CANVAS_H - LANDSCAPE_CANVAS_W : 0;
  const landscapeOverflowY = landscapeImageAspect > 0 && landscapeImageAspect < LANDSCAPE_CANVAS_ASPECT
    ? LANDSCAPE_CANVAS_W / landscapeImageAspect - LANDSCAPE_CANVAS_H : 0;
  const landscapeHotspotOffsetX = landscapeOverflowX * (50 - landscapePanX) / 100;
  const landscapeHotspotOffsetY = landscapeOverflowY * (50 - landscapePanY) / 100;

  const effectiveHotspotPages = useMemo(
    () =>
      hotspotPages.map((page) => ({
        ...page,
        x: isPortrait ? (page.mobileX ?? page.x) : page.x,
        y: isPortrait ? (page.mobileY ?? page.y) : page.y,
      })),
    [hotspotPages, isPortrait]
  );

  const effectiveFeatures = useMemo(
    () =>
      surfacePage.canvasFeatures.map((f) => ({
        ...f,
        x: isPortrait ? (f.mobileX ?? f.x) : f.x,
        y: isPortrait ? (f.mobileY ?? f.y) : f.y,
      })),
    [surfacePage.canvasFeatures, isPortrait]
  );

  const contentZoneFeatures = useMemo(
    () => (isPortraitSplit ? effectiveFeatures.filter((f) => f.portraitZone === "content") : []),
    [isPortraitSplit, effectiveFeatures]
  );
  const stripFeatures = useMemo(
    () =>
      isPortraitSplit
        ? effectiveFeatures.filter((f) => f.portraitZone !== "content")
        : effectiveFeatures,
    [isPortraitSplit, effectiveFeatures]
  );

  // Probe image dimensions whenever layout mode or hero image changes — onLoad on the
  // <img> only fires on first load, but when switching layout modes the image is cached.
  useEffect(() => {
    if (!isPortraitSplit) return;
    const src = surfacePage.heroImage;
    if (!src || src.startsWith("color:")) return;
    const img = new Image();
    img.onload = () => setStripImageAspect(img.naturalWidth / img.naturalHeight);
    img.src = src;
    if (img.complete && img.naturalWidth > 0) setStripImageAspect(img.naturalWidth / img.naturalHeight);
  }, [surfacePage.heroImage, isPortraitSplit]);

  // Probe image dimensions for landscape mode in case the image is already cached
  // (onLoad on the <img> won't fire when switching layout modes after first load).
  useEffect(() => {
    if (layoutMode !== "mobile-landscape") return;
    const src = surfacePage.heroImage;
    if (!src || src.startsWith("color:")) return;
    const img = new Image();
    img.onload = () => setLandscapeImageAspect(img.naturalWidth / img.naturalHeight);
    img.src = src;
    if (img.complete && img.naturalWidth > 0) setLandscapeImageAspect(img.naturalWidth / img.naturalHeight);
  }, [surfacePage.heroImage, layoutMode]);

  // ── Experience status popover ─────────────────────────────────
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

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

  // ── 3D hotspot: track module position to the orbiting hotspot ─────────────
  const moduleElRef = useRef<HTMLDivElement | null>(null);
  const arrowElRef = useRef<HTMLDivElement | null>(null);

  // True when the open module belongs to a 3D hotspot — i.e. it has a
  // worldPosition and is a floating modal/tooltip (not full-page/side-sheet/bottom-sheet).
  const is3dTrackingModule = isModel3d && !!modulePage &&
    modulePage.worldPosition !== undefined &&
    (modulePage.interactionType === "modal" || modulePage.interactionType === "tooltip");

  // The selected 3D hotspot id to project — only when tracking is active.
  const tracked3dId = is3dTrackingModule ? modulePage!.id : undefined;

  const handle3dHotspotScreenPos = useCallback((xPct: number, yPct: number) => {
    if (!moduleElRef.current) return;
    moduleElRef.current.style.left = `${xPct}%`;
    moduleElRef.current.style.top = `${yPct}%`;
    if (arrowElRef.current) {
      arrowElRef.current.style.left = `${xPct}%`;
      arrowElRef.current.style.top = `${yPct}%`;
    }
  }, []);

  const sharedHotspotPinProps = {
    isLayoutEditMode: !isPreviewMode,
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
    isLayoutEditMode: !isPreviewMode,
    accentColor,
    surfaceStyleClass,
    pages,
    onCanvasFeaturePointerDown,
    onSelectPage,
  };

  const sharedContentModuleProps = {
    pages,
    isExiting: isModuleExiting,
    onExitEnd: handleModuleExitEnd,
    systemSettings,
    accentColor,
    isLayoutEditMode: !isPreviewMode,
    isPreviewMode,
    onDismissContent,
    onNavigate: onSelectPage,
    onContentCardPointerDown,
  };

  return (
    <div
      className={isPreviewMode ? "fixed inset-0 z-50 flex flex-col bg-black" : `relative overflow-hidden rounded-3xl border border-neutral-200 bg-[#f4f5f7]${fillHeight ? " flex flex-col flex-1 min-h-0" : ""}`}
      onClick={() => { if (statusMenuOpen) setStatusMenuOpen(false); }}
    >
      <div className={`shrink-0 border-b border-neutral-200 bg-white px-4 py-3 ${isPreviewMode ? "flex items-center justify-end" : ""}`}>
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
                {activePage.kind === "home" ? (
                  editingName ? (
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onBlur={commitName}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitName();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                      className="rounded-lg border border-neutral-300 px-2 py-0.5 text-sm font-semibold text-neutral-900 outline-none focus:border-black"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-neutral-900">{gameName || activePage.title || "Untitled"}</span>
                      <button
                        type="button"
                        onClick={startEditName}
                        title="Rename game"
                        className="rounded p-0.5 text-neutral-300 hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <path d="M1.5 8.5V9.5h1L8 4 7 3 1.5 8.5zM9.5 2.5a.707.707 0 000-1L8.5 0.5a.707.707 0 00-1 0L6.5 1.5 8.5 3.5 9.5 2.5z" fill="currentColor" />
                        </svg>
                      </button>
                    </div>
                  )
                ) : (
                  <div className="text-sm font-semibold text-neutral-900">{activePage.title || "Untitled page"}</div>
                )}

                {/* Global experience status — interactive */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setStatusMenuOpen((v) => !v)}
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition hover:opacity-80 ${getExperienceStatusClasses(experienceStatus)}`}
                  >
                    {getExperienceStatusLabel(experienceStatus)}
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                      <path d="M1 2.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {statusMenuOpen && (
                    <div
                      className="absolute left-0 top-full z-30 mt-1.5 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                        Experience status
                      </div>
                      {(["draft", "published"] as ExperienceStatus[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { onExperienceStatusChange(s); setStatusMenuOpen(false); }}
                          className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition hover:bg-neutral-50 ${experienceStatus === s ? "font-semibold text-neutral-900" : "text-neutral-600"}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${s === "published" ? "bg-emerald-500" : "bg-amber-400"}`} />
                          {getExperienceStatusLabel(s)}
                          {s === "draft" && <span className="ml-auto text-[10px] text-neutral-400">Not live</span>}
                          {s === "published" && <span className="ml-auto text-[10px] text-neutral-400">Live</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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

            <div className="flex flex-1 items-center justify-end gap-2">
              {/* Save indicator */}
              {saveState === "saving" && (
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400" aria-live="polite" aria-label="Saving">
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="14 8" strokeLinecap="round" />
                  </svg>
                  Saving
                </div>
              )}
              {saveState === "saved" && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600" aria-live="polite" aria-label="Saved">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Saved
                </div>
              )}
              {saveState === "error" && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-500" aria-live="polite" aria-label="Save failed">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M6 3.5v3M6 8.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Save failed
                </div>
              )}
              {onOpenCommandPalette && (
                <button
                  type="button"
                  onClick={onOpenCommandPalette}
                  className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-neutral-500 shadow-sm hover:bg-neutral-50 hover:text-neutral-800"
                  aria-label="Search and actions"
                  title="Search and actions (⌘K)"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M8.5 8.5L11.5 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
              )}
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

      <div className={
        isPreviewMode && isMobileFrame ? "relative flex-1 overflow-hidden flex items-center justify-center bg-neutral-900"
        : isPreviewMode ? "relative flex-1 overflow-hidden"
        : isMobileFrame ? "flex flex-col items-center bg-neutral-800 py-10 px-4"
        : fillHeight ? "flex flex-1 min-h-0 flex-col p-4"
        : "p-4"
      }>
        <div
          ref={canvasRef}
          className={`overflow-hidden ${
            isPreviewMode && layoutMode === "mobile-portrait"
              ? "relative flex flex-col w-[390px] rounded-[44px] border-[6px] border-neutral-700 shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
              : isPreviewMode && layoutMode === "mobile-landscape"
              ? "relative max-w-full w-[667px] rounded-[44px] border-[6px] border-neutral-700 bg-white shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
              : isPreviewMode
              ? "relative h-full w-full"
              : layoutMode === "mobile-portrait"
              ? "relative flex flex-col w-[390px] rounded-[44px] border-[6px] border-neutral-700 shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
              : layoutMode === "mobile-landscape"
              ? "relative max-w-full w-[667px] rounded-[44px] border-[6px] border-neutral-700 bg-white shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
              : fillHeight ? "relative flex-1 min-h-0 rounded-[28px] border border-neutral-200 bg-white shadow-sm"
              : "relative min-h-[620px] rounded-[28px] border border-neutral-200 bg-white shadow-sm"
          }`}
          style={{
            height: layoutMode === "mobile-portrait" ? 780
              : layoutMode === "mobile-landscape" ? 375
              : (!isPreviewMode ? undefined : undefined),
            touchAction: "none",
          }}
          onClick={isPortraitSplit ? undefined : (e) => {
            if (layoutMode === "mobile-landscape" && landscapePanRef.current?.moved) return;
            onCanvasClick(e);
          }}
          onPointerDown={layoutMode === "mobile-landscape" ? (e) => {
            if ((e.target as HTMLElement).closest("[data-hotspot],[data-a11y-type]")) return;
            landscapePanRef.current = { startX: e.clientX, startY: e.clientY, startPanX: landscapePanX, startPanY: landscapePanY, pointerId: e.pointerId, moved: false };
            e.currentTarget.setPointerCapture(e.pointerId);
          } : undefined}
          onPointerMove={layoutMode === "mobile-landscape" ? (e) => {
            const pan = landscapePanRef.current;
            if (!pan || pan.pointerId !== e.pointerId) return;
            const dx = e.clientX - pan.startX;
            const dy = e.clientY - pan.startY;
            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) pan.moved = true;
            const containerWidth = canvasRef?.current?.offsetWidth ?? LANDSCAPE_CANVAS_W;
            const containerHeight = canvasRef?.current?.offsetHeight ?? LANDSCAPE_CANVAS_H;
            setLandscapePanX(Math.max(0, Math.min(100, pan.startPanX + (-(dx / containerWidth) * 100))));
            setLandscapePanY(Math.max(0, Math.min(100, pan.startPanY + (-(dy / containerHeight) * 100))));
          } : undefined}
          onPointerUp={layoutMode === "mobile-landscape" ? (e) => {
            if (landscapePanRef.current?.pointerId === e.pointerId) landscapePanRef.current = null;
          } : undefined}
          onPointerCancel={layoutMode === "mobile-landscape" ? (e) => {
            if (landscapePanRef.current?.pointerId === e.pointerId) landscapePanRef.current = null;
          } : undefined}
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
                onClick={(e) => { if (!stripPanRef.current?.moved) onCanvasClick(e); }}
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).closest("[data-hotspot],[data-a11y-type]")) return;
                  stripPanRef.current = { startX: e.clientX, startPan: portraitPanX, pointerId: e.pointerId, moved: false };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  const pan = stripPanRef.current;
                  if (!pan || pan.pointerId !== e.pointerId) return;
                  const dx = e.clientX - pan.startX;
                  if (Math.abs(dx) > 4) pan.moved = true;
                  const containerWidth = imageStripRef?.current?.offsetWidth ?? 390;
                  const deltaPan = -(dx / containerWidth) * 100;
                  setPortraitPanX(Math.max(0, Math.min(100, pan.startPan + deltaPan)));
                }}
                onPointerUp={(e) => { if (stripPanRef.current?.pointerId === e.pointerId) stripPanRef.current = null; }}
                onPointerCancel={(e) => { if (stripPanRef.current?.pointerId === e.pointerId) stripPanRef.current = null; }}
              >
                {isModel3d ? (
                  <ModelViewer
                    modelUrl={systemSettings.modelUrl!}
                    scale={systemSettings.modelScale}
                    rotationX={systemSettings.modelRotationX}
                    rotationY={systemSettings.modelRotationY}
                    environment={systemSettings.modelEnvironment}
                    isAuthoring={!isPreviewMode}
                    hotspotMarkers={model3dMarkers}
                    accentColor={accentColor}
                    selectedHotspotId={tracked3dId}
                    onPlace3dHotspot={onPlace3dHotspot}
                    onSelectHotspot={onSelectPage}
                    onHotspotScreenPos={is3dTrackingModule ? handle3dHotspotScreenPos : undefined}
                  />
                ) : (
                  <CanvasBackground
                    heroImage={surfacePage.heroImage}
                    isPreviewMode={isPreviewMode}
                    onHeroUpload={onHeroUpload}
                    compact
                    objectPositionX={portraitPanX}
                    onImageLoad={(w, h) => setStripImageAspect(w / h)}
                  />
                )}

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

                {surfacePage.kind === "home" && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ transform: `translateX(${hotspotPanOffset}px)` }}
                  >
                    {effectiveHotspotPages.map((page, index) => {
                      if (page.x === null || page.y === null) return null;
                      return (
                        <HotspotPin key={page.id} page={page} index={index} isSelected={page.id === selectedPageId} {...sharedHotspotPinProps} />
                      );
                    })}
                  </div>
                )}

                {(surfacePage.canvasFeatures.length === 0 || hotspotPages.length === 0) && !isPreviewMode && showLayoutHelp ? (
                  <EmptySurfaceGuidance featureCount={surfacePage.canvasFeatures.length} hotspotCount={hotspotPages.length} onClose={onDismissLayoutHelp} />
                ) : null}
              </div>
            </>
          ) : (
            <>
              {isModel3d ? (
                <ModelViewer
                  modelUrl={systemSettings.modelUrl!}
                  scale={systemSettings.modelScale}
                  rotationX={systemSettings.modelRotationX}
                  rotationY={systemSettings.modelRotationY}
                  environment={systemSettings.modelEnvironment}
                  isAuthoring={!isPreviewMode}
                  hotspotMarkers={model3dMarkers}
                  accentColor={accentColor}
                  selectedHotspotId={tracked3dId}
                  onPlace3dHotspot={onPlace3dHotspot}
                  onSelectHotspot={onSelectPage}
                  onHotspotScreenPos={is3dTrackingModule ? handle3dHotspotScreenPos : undefined}
                />
              ) : (
                <CanvasBackground
                  heroImage={surfacePage.heroImage}
                  isPreviewMode={isPreviewMode}
                  onHeroUpload={onHeroUpload}
                  objectPositionX={layoutMode === "mobile-landscape" ? landscapePanX : undefined}
                  objectPositionY={layoutMode === "mobile-landscape" ? landscapePanY : undefined}
                  onImageLoad={layoutMode === "mobile-landscape" ? (w, h) => setLandscapeImageAspect(w / h) : undefined}
                />
              )}

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

              {surfacePage.kind === "home" && (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={layoutMode === "mobile-landscape" ? { transform: `translateX(${landscapeHotspotOffsetX}px) translateY(${landscapeHotspotOffsetY}px)` } : undefined}
                >
                  {effectiveHotspotPages.map((page, index) => {
                    if (page.x === null || page.y === null) return null;
                    return (
                      <HotspotPin key={page.id} page={page} index={index} isSelected={page.id === selectedPageId} {...sharedHotspotPinProps} />
                    );
                  })}
                </div>
              )}

              {modulePage && modulePage.kind === "hotspot" && !isModuleExiting && !isPreviewMode && (() => {
                const hp = effectiveHotspotPages.find((p) => p.id === modulePage.id);
                if (!hp || hp.x === null || hp.y === null) return null;
                return (
                  <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-visible"
                    style={{ width: "100%", height: "100%", zIndex: 25 }}
                  >
                    <line
                      x1={`${hp.x}%`} y1={`${hp.y}%`}
                      x2={`${modulePage.contentX}%`} y2={`${modulePage.contentY}%`}
                      stroke="white" strokeWidth="1.5" strokeOpacity="0.5"
                      strokeDasharray="4 4"
                    />
                    <circle cx={`${modulePage.contentX}%`} cy={`${modulePage.contentY}%`} r="3" fill="white" fillOpacity="0.5" />
                  </svg>
                );
              })()}

              {modulePage ? (
                <ContentModule
                  key={modulePage.id}
                  page={{ ...modulePage, contentX: modulePage.contentX, contentY: modulePage.contentY }}
                  {...sharedContentModuleProps}
                  moduleRef={is3dTrackingModule ? moduleElRef : undefined}
                  arrowRef={is3dTrackingModule ? arrowElRef : undefined}
                />
              ) : null}

              {(surfacePage.canvasFeatures.length === 0 || hotspotPages.length === 0) && !isPreviewMode && showLayoutHelp ? (
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
