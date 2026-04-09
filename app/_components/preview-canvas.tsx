import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlan } from "@/app/_hooks/usePlan";
import dynamic from "next/dynamic";
import { IntroScreen } from "@/app/_components/canvas/intro-screen";
import { CanvasBackground } from "@/app/_components/canvas/canvas-background";
import { useGameNameEditing } from "@/app/_hooks/useGameNameEditing";
import { usePortraitPan } from "@/app/_hooks/usePortraitPan";
import { useLandscapePan } from "@/app/_hooks/useLandscapePan";
import { useContentModuleTransitions } from "@/app/_hooks/useContentModuleTransitions";

const ModelViewer = dynamic(
  () => import("@/app/_components/canvas/model-viewer").then((m) => ({ default: m.ModelViewer })),
  { ssr: false }
);
import { HotspotPin } from "@/app/_components/canvas/hotspot-pin";
import { getExperienceStatusLabel } from "@/app/_lib/label-utils";
import {
  ExperienceStatus,
  LayoutMode,
  PageItem,
  SystemSettings,
} from "@/app/_lib/authoring-types";
import { LocaleLanguage } from "@/app/_lib/localization";
import { getFontThemeClass } from "@/app/_lib/font-theme";
import { getResolvedCanvasFeatures } from "@/app/_lib/responsive-board";
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
  layoutMode: LayoutMode;
  systemSettings: SystemSettings;
  activeLanguageCode?: string;
  availableLanguages?: LocaleLanguage[];
  showLayoutHelp: boolean;
  experienceStatus: ExperienceStatus;
  onExperienceStatusChange: (status: ExperienceStatus) => void;
  onCanvasClick: React.MouseEventHandler<HTMLDivElement>;
  onPlace3dHotspot?: (pos: [number, number, number], normal: [number, number, number]) => void;
  onCanvasFeaturePointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
    featureId: string
  ) => void;
  onSelectCanvasFeature: (featureId: string) => void;
  onContentCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDeleteHotspot: (pageId: string) => void;
  onDismissLayoutHelp: () => void;
  onHotspotPointerDown: (
    event: React.PointerEvent<HTMLButtonElement>,
    page: PageItem
  ) => void;
  onLanguageChange?: (languageCode: string) => void;
  onDismissContent: () => void;
  onSelectPage: (id: string) => void;
  onSetLayoutMode: (mode: LayoutMode) => void;
  onTogglePreviewMode: () => void;
  onOpenCommandPalette?: () => void;
  onHeroUpload?: (event: ChangeEvent<HTMLInputElement>) => void;
  isPreviewMode: boolean;
  selectedPageId: string;
  saveState?: "idle" | "saving" | "saved" | "error";
  gameName?: string;
  studioName?: string;
  onRenameGame?: (name: string) => void;
  liveViewHref?: string | null;
  conventionMode?: boolean;
  onStartConventionMode?: () => void;
  onStopConventionMode?: () => void;
  /** When true the canvas stretches to fill its parent height instead of using a fixed min-height.
   *  Use in the main studio layout; leave false (default) for modal/sidebar previews. */
  fillHeight?: boolean;
  studioChrome?: {
    headerOpen: boolean;
    leftInset: number;
    rightInset: number;
    topInset?: number;
    onToggleHeader: () => void;
    darkMode?: boolean;
  };
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
  layoutMode,
  isPreviewMode,
  systemSettings,
  activeLanguageCode,
  availableLanguages,
  showLayoutHelp,
  experienceStatus,
  onExperienceStatusChange,
  onCanvasClick,
  onPlace3dHotspot,
  onCanvasFeaturePointerDown,
  onSelectCanvasFeature,
  onContentCardPointerDown,
  onDeleteHotspot,
  onDismissContent,
  onDismissLayoutHelp,
  onHotspotPointerDown,
  onLanguageChange,
  onSelectPage,
  onSetLayoutMode,
  onTogglePreviewMode,
  onOpenCommandPalette,
  onHeroUpload,
  selectedPageId,
  saveState = "idle",
  gameName,
  studioName,
  onRenameGame,
  liveViewHref,
  fillHeight = false,
  studioChrome,
  conventionMode = false,
  onStartConventionMode,
  onStopConventionMode,
}: PreviewCanvasProps) {
  const { canPublish } = usePlan();
  const {
    editingName,
    nameInput,
    nameInputRef,
    setNameInput,
    setEditingName,
    startEditName,
    commitName,
  } = useGameNameEditing({ gameName, activePageTitle: activePage.title, onRenameGame });
  const effectiveSurfaceStyle = systemSettings.darkMode ? "contrast" : systemSettings.surfaceStyle;
  const fontThemeClass = getFontThemeClass(systemSettings.fontTheme);
  const surfaceStyleClass =
    effectiveSurfaceStyle === "solid"
      ? "border-neutral-300 bg-white shadow-xl"
      : effectiveSurfaceStyle === "contrast"
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

  const {
    portraitPanX,
    hotspotPanOffset,
    setStripImageAspect,
    stripPanRef,
    onStripPointerDown,
    onStripPointerMove,
    onStripPointerUp,
    onStripPointerCancel,
  } = usePortraitPan({
    isPortraitSplit,
    heroImage: surfacePage.heroImage,
    portraitSplitRatio,
    imageStripRef,
  });

  const {
    landscapePanX,
    landscapePanY,
    landscapeHotspotOffsetX,
    landscapeHotspotOffsetY,
    setLandscapeImageAspect,
    landscapePanRef,
    onLandscapePointerDown,
    onLandscapePointerMove,
    onLandscapePointerUp,
    onLandscapePointerCancel,
  } = useLandscapePan({
    isLandscape: layoutMode === "mobile-landscape",
    heroImage: surfacePage.heroImage,
    canvasRef,
  });

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
      getResolvedCanvasFeatures(surfacePage.canvasFeatures, layoutMode).map((item) => item.feature),
    [layoutMode, surfacePage.canvasFeatures]
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

  // ── Intro screen ──────────────────────────────────────────────
  const introEnabled = !!(systemSettings.introScreen?.enabled && systemSettings.introScreen.youtubeUrl);
  const [introVisible, setIntroVisible] = useState(false);

  useEffect(() => {
    if (!isPreviewMode) { setIntroVisible(false); return; }
    if (introEnabled) setIntroVisible(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewMode]);

  // ── Content module transition ──────────────────────────────────
  const {
    modulePage,
    isModuleExiting,
    modulePageRef,
    isModuleExitingRef,
    handleModuleExitEnd,
  } = useContentModuleTransitions({ activePage });

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
    fontThemeClass,
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
    fontThemeClass,
    surfaceStyleClass,
    pages,
    activeLanguageCode,
    availableLanguages,
    isPreviewMode,
    dragThresholdRef,
    onCanvasFeaturePointerDown,
    onSelectCanvasFeature,
    onLanguageChange,
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

  const hasStudioChrome = fillHeight && !isPreviewMode && !!studioChrome;
  const studioHeaderTopInset = studioChrome?.topInset ?? 18;
  const studioHeaderOpen = studioChrome?.headerOpen ?? true;
  const studioHeaderLeftInset = studioChrome?.leftInset ?? 18;
  const studioHeaderRightInset = studioChrome?.rightInset ?? 18;
  const headerDark = studioChrome?.darkMode ?? false;
  const headerBg    = headerDark ? "bg-neutral-900"   : "bg-[#fcfaf7]";
  const headerBord  = headerDark ? "border-neutral-700" : "border-[#e7dfd2]";
  const headerLabel = headerDark ? "text-neutral-400" : "text-neutral-500";

  function renderSaveStateIndicator({ dark = false }: { dark?: boolean } = {}) {
    if (saveState === "idle") return null;

    const savingClass = dark ? "text-neutral-300" : "text-neutral-500";
    const savedClass = dark ? "text-emerald-300" : "text-emerald-700";
    const errorClass = dark ? "text-red-300" : "text-red-600";

    if (saveState === "saving") {
      return (
        <div className={`flex items-center gap-1.5 text-[11px] ${savingClass}`} aria-live="polite" aria-label="Saving">
          <svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="14 8" strokeLinecap="round" />
          </svg>
          Saving
        </div>
      );
    }

    if (saveState === "saved") {
      return (
        <div className={`flex items-center gap-1.5 text-[11px] ${savedClass}`} aria-live="polite" aria-label="Saved">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Saved
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-1.5 text-[11px] ${errorClass}`} aria-live="polite" aria-label="Save failed">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 3.5v3M6 8.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Save failed
      </div>
    );
  }

  function renderExperienceStatusControl({ dark = false }: { dark?: boolean } = {}) {
    const containerClass = dark
      ? "border-neutral-700 bg-neutral-800/90"
      : "border-[#d8cfbf] bg-white";
    const inactiveClass = dark
      ? "text-neutral-400 hover:bg-neutral-700 hover:text-neutral-100"
      : "text-neutral-500 hover:bg-[#f7f3ea] hover:text-neutral-900";

    const publishToggle = canPublish ? (
      <div
        role="group"
        aria-label="Publish status"
        className={`inline-flex items-center rounded-xl border p-1 shadow-sm ${containerClass}`}
      >
        {(["draft", "published"] as ExperienceStatus[]).map((status) => {
          const isActive = experienceStatus === status;
          const activeClass =
            status === "published"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-amber-500 text-white shadow-sm";

          return (
            <button
              key={status}
              type="button"
              aria-pressed={isActive}
              disabled={isActive}
              onClick={() => onExperienceStatusChange(status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-default ${
                isActive ? activeClass : inactiveClass
              }`}
            >
              {getExperienceStatusLabel(status)}
            </button>
          );
        })}
      </div>
    ) : (
      <button
        type="button"
        onClick={() => onExperienceStatusChange("published")}
        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 shadow-sm"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M8.5 5V3.5a2.5 2.5 0 00-5 0V5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="1.5" y="5" width="9" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        Publish (Pro)
      </button>
    );

    const conventionButton = conventionMode ? (
      <button
        type="button"
        onClick={onStopConventionMode}
        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        Convention mode — Exit
      </button>
    ) : (
      <button
        type="button"
        onClick={onStartConventionMode}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium shadow-sm transition ${
          dark
            ? "border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <polygon points="2,1 11,6 2,11" fill="currentColor" opacity="0.8" />
        </svg>
        Convention
      </button>
    );

    return (
      <>
        {publishToggle}
        {conventionButton}
      </>
    );
  }

  const authoringHeaderContent = (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:items-center">
      <div className="min-w-0 flex-1">
        <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${headerLabel}`}>
          Currently editing
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {activePage.kind === "home" ? (
            editingName ? (
              <input
                ref={nameInputRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName();
                  if (e.key === "Escape") setEditingName(false);
                }}
                className="rounded-xl border border-[#d8cfbf] bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900 outline-none focus:border-neutral-900"
              />
            ) : (
              <div className="flex min-w-0 items-center gap-1.5">
                {studioName ? (
                  <span className={`shrink-0 text-xs font-medium ${headerDark ? "text-neutral-400" : "text-neutral-500"}`}>
                    {studioName} /
                  </span>
                ) : null}
                <span className="truncate text-sm font-semibold text-neutral-900">
                  {gameName || activePage.title || "Untitled"}
                </span>
                <button
                  type="button"
                  onClick={startEditName}
                  title="Rename game"
                  className="rounded-lg p-1 text-neutral-400 transition hover:bg-[#f1ebdf] hover:text-neutral-700"
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M1.5 8.5V9.5h1L8 4 7 3 1.5 8.5zM9.5 2.5a.707.707 0 000-1L8.5 0.5a.707.707 0 00-1 0L6.5 1.5 8.5 3.5 9.5 2.5z" fill="currentColor" />
                  </svg>
                </button>
              </div>
            )
          ) : (
            <div className="text-sm font-semibold text-neutral-900">
              {activePage.title || "Untitled page"}
            </div>
          )}
          {renderSaveStateIndicator({ dark: headerDark })}
        </div>
      </div>

      <div className="flex shrink-0 self-center xl:justify-self-center">
        <div className="flex justify-center">
          <div className="relative inline-flex items-center justify-center">
            <div className="flex items-center rounded-2xl border border-[#ddd3c3] bg-[#f1ebdf] p-1 shadow-sm">
              {LAYOUT_MODES.map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onSetLayoutMode(mode)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                    layoutMode === mode
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-600 hover:text-neutral-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className={`absolute left-full top-1/2 ml-2 -translate-y-1/2 rounded-xl border px-3 py-2 shadow-sm transition ${
                  headerDark
                    ? "border-neutral-700 bg-neutral-800/90 text-neutral-300 hover:bg-neutral-700 hover:text-white"
                    : "border-[#d8cfbf] bg-white text-neutral-600 hover:bg-[#f7f3ea] hover:text-neutral-900"
                }`}
                aria-label="Search and actions"
                title="Search and actions (A)"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8.5 8.5L11.5 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 xl:justify-self-end xl:justify-end">
        <button
          type="button"
          onClick={onTogglePreviewMode}
          className="rounded-xl border border-[#d8cfbf] bg-white px-3 py-2 text-xs font-medium text-neutral-800 shadow-sm transition hover:bg-[#f7f3ea]"
        >
          Preview
        </button>
        {renderExperienceStatusControl({ dark: headerDark })}
        {experienceStatus === "published" && liveViewHref ? (
          <a
            href={liveViewHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100"
          >
            Open live view
          </a>
        ) : null}
      </div>
    </div>
  );

  return (
    <div
      className={fillHeight ? "absolute inset-0" : isPreviewMode ? "fixed inset-0 z-50 flex flex-col bg-black" : "relative overflow-hidden rounded-3xl border border-neutral-200 bg-[#f4f5f7]"}
    >
      {hasStudioChrome ? (
        <div
          className="absolute z-30 transition-transform duration-300 ease-in-out"
          style={{
            top: studioHeaderTopInset,
            left: studioHeaderLeftInset,
            right: studioHeaderRightInset,
            transform: studioHeaderOpen ? "translateY(0)" : "translateY(-100%)",
          }}
        >
          <div
            className={`relative rounded-[28px] px-5 py-4 transition-[background-color,border-color,box-shadow] duration-300 ease-in-out ${
              studioHeaderOpen
                ? `border ${headerBord} ${headerBg} shadow-[0_22px_60px_rgba(15,23,42,0.14)]`
                : "border border-transparent bg-transparent shadow-none"
            }`}
          >
            {authoringHeaderContent}
            <button
              type="button"
              onClick={() => studioChrome?.onToggleHeader()}
              aria-label={studioHeaderOpen ? "Collapse header controls" : "Expand header controls"}
              className={`absolute left-1/2 top-full flex -translate-x-1/2 -translate-y-px items-center justify-center rounded-b-[18px] border border-t-0 px-4 py-2 shadow-[0_14px_24px_rgba(15,23,42,0.12)] transition ${headerBord} ${headerBg} ${headerLabel} hover:text-neutral-700`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
                style={{
                  transform: studioHeaderOpen ? "rotate(0deg)" : "rotate(180deg)",
                  transition: "transform 300ms ease-in-out",
                }}
              >
                <path
                  d="M3 9l4-4 4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
      {!hasStudioChrome && <div className={
        fillHeight && isPreviewMode ? "absolute left-1/2 top-0 z-50 flex -translate-x-1/2 items-center justify-center p-4"
        : fillHeight ? "absolute top-0 left-0 right-0 z-30 border-b border-neutral-200/40 bg-white/60 px-4 py-3"
        : isPreviewMode ? "shrink-0 border-b border-neutral-200 bg-white px-4 py-3 flex items-center justify-center"
        : "shrink-0 border-b border-neutral-200 bg-white px-4 py-3"
      }>
        {isPreviewMode ? (
          <button
            type="button"
            onClick={onTogglePreviewMode}
            className="rounded-xl border border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow-sm"
          >
            Stop preview <span className="opacity-70">Esc</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Currently editing</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {activePage.kind === "home" ? (
                  editingName ? (
                    <input
                      ref={nameInputRef}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onBlur={commitName}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitName();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                      className="rounded-lg border border-neutral-200 px-2 py-0.5 text-sm font-semibold text-neutral-900 outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10"
                    />
                  ) : (
                    <div className="flex min-w-0 items-center gap-1.5">
                      {studioName ? (
                        <span className="shrink-0 text-xs font-medium text-neutral-500">
                          {studioName} /
                        </span>
                      ) : null}
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900">{gameName || activePage.title || "Untitled"}</span>
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
                {renderSaveStateIndicator()}
              </div>
            </div>

            <div className="flex shrink-0 justify-center">
              <div className="relative inline-flex items-center justify-center">
                <div className="flex items-center rounded-xl border border-neutral-200 bg-neutral-100 p-0.5 shadow-sm">
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
                {onOpenCommandPalette && (
                  <button
                    type="button"
                    onClick={onOpenCommandPalette}
                    className="absolute left-full top-1/2 ml-2 -translate-y-1/2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-neutral-500 shadow-sm hover:bg-neutral-50 hover:text-neutral-800"
                    aria-label="Search and actions"
                    title="Search and actions (A)"
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                      <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M8.5 8.5L11.5 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-1 items-center justify-end gap-2">
              <button
                type="button"
                onClick={onTogglePreviewMode}
                className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 shadow-sm hover:bg-neutral-50"
              >
                Preview
              </button>
              {renderExperienceStatusControl()}
              {experienceStatus === "published" && liveViewHref ? (
                <a
                  href={liveViewHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 shadow-sm hover:bg-emerald-100"
                >
                  Open live view
                </a>
              ) : null}
            </div>
          </div>
        )}
      </div>}

      <div
        className={
        isPreviewMode && isMobileFrame && fillHeight ? "absolute inset-0 overflow-hidden flex items-center justify-center bg-neutral-900"
        : isPreviewMode && isMobileFrame ? "relative flex-1 overflow-hidden flex items-center justify-center bg-neutral-900"
        : isPreviewMode && fillHeight ? "absolute inset-0 overflow-hidden"
        : isPreviewMode ? "relative flex-1 overflow-hidden flex items-center justify-center bg-black"
        : isMobileFrame && fillHeight ? "absolute inset-0 flex flex-col items-center justify-center bg-neutral-800 overflow-y-auto"
        : isMobileFrame ? "flex flex-col items-center bg-neutral-800 py-10 px-4"
        : fillHeight ? "absolute inset-0 overflow-hidden"
        : "p-4"
      }
      >
        <div
          ref={canvasRef}
          className={`overflow-hidden ${
            isPreviewMode && layoutMode === "mobile-portrait"
              ? "relative flex flex-col w-[390px] rounded-[44px] border-[6px] border-neutral-700 shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
              : isPreviewMode && layoutMode === "mobile-landscape"
              ? "relative max-w-full w-[667px] rounded-[44px] border-[6px] border-neutral-700 bg-white shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
              : isPreviewMode && fillHeight
              ? "absolute inset-0"
              : isPreviewMode
              ? "relative w-full max-h-full"
              : layoutMode === "mobile-portrait"
              ? "relative flex flex-col w-[390px] rounded-[44px] border-[6px] border-neutral-700 shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
              : layoutMode === "mobile-landscape"
              ? "relative max-w-full w-[667px] rounded-[44px] border-[6px] border-neutral-700 bg-white shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
              : fillHeight ? "absolute inset-0"
              : "relative w-full rounded-[28px] border border-neutral-200 bg-white shadow-sm"
          }`}
          style={{
            height: layoutMode === "mobile-portrait" ? 780
              : layoutMode === "mobile-landscape" ? 375
              : undefined,
            touchAction: "none",
          }}
          onPointerDown={layoutMode === "mobile-landscape" ? onLandscapePointerDown : undefined}
          onPointerMove={layoutMode === "mobile-landscape" ? onLandscapePointerMove : undefined}
          onPointerUp={(e) => {
            const landscapePan =
              layoutMode === "mobile-landscape" ? landscapePanRef.current : null;
            const clickedInteractive = (e.target as HTMLElement).closest(
              "[data-hotspot],[data-a11y-type]"
            );

            if (layoutMode === "mobile-landscape") {
              onLandscapePointerUp(e);
            }

            if (
              isPortraitSplit ||
              clickedInteractive ||
              (layoutMode === "mobile-landscape" && landscapePan?.moved)
            ) {
              return;
            }

            onCanvasClick(e as unknown as React.MouseEvent<HTMLDivElement>);
          }}
          onPointerCancel={layoutMode === "mobile-landscape" ? onLandscapePointerCancel : undefined}
        >
          {isPortraitSplit ? (
            <>
              {/* Content zone — top portion */}
              <div
                ref={contentZoneRef}
                className="relative flex-none overflow-hidden"
                style={{ flex: 100 - portraitSplitRatio, background: portraitBackground }}
                onPointerUp={onDismissContent}
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
                onPointerDown={onStripPointerDown}
                onPointerMove={onStripPointerMove}
                onPointerUp={(e) => onStripPointerUp(e, (pe) => onCanvasClick(pe as unknown as React.MouseEvent<HTMLDivElement>))}
                onPointerCancel={onStripPointerCancel}
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
                  onImageLoad={
                    layoutMode === "mobile-landscape"
                      ? (w, h) => setLandscapeImageAspect(w / h)
                      : undefined
                  }
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
        {conventionMode && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Convention mode — session ends when you close this tab
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
