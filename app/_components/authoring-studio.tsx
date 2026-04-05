"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CardPairingModal } from "@/app/_components/card-pairing-modal";
import { OnboardingModal, shouldShowOnboarding, dismissOnboarding } from "@/app/_components/onboarding-modal";
import { ConfirmDeleteModal } from "@/app/_components/confirm-delete-modal";
import { PageEditorModal } from "@/app/_components/page-editor-modal";
import { PageSidebar } from "@/app/_components/page-sidebar";
import { PreviewCanvas } from "@/app/_components/preview-canvas";
import { ChangelogModal } from "@/app/_components/changelog-modal";
import { AccountPanel } from "@/app/_components/account-panel";
import { GameSwitcherModal } from "@/app/_components/game-switcher-modal";
import { CommandPalette } from "@/app/_components/command-palette";
import { createId, createSamplePages, getHomePageId } from "@/app/_lib/authoring-utils";
import { ExperienceStatus, LayoutMode, PageItem, SystemSettings } from "@/app/_lib/authoring-types";
import {
  loadPersistedState,
  migrateLocaleFeature,
  migratePageButtons,
  sanitizePagesForPersistence,
  sanitizeSystemSettingsForPersistence,
} from "@/app/_lib/authoring-studio-utils";
import { loadGame, saveGame } from "@/app/_lib/supabase-game";
import { supabase } from "@/app/_lib/supabase";
import { useStudioHistory } from "@/app/_hooks/useStudioHistory";
import { useDrag } from "@/app/_hooks/useDrag";
import { usePageHandlers } from "@/app/_hooks/usePageHandlers";
import { useContentHandlers } from "@/app/_hooks/useContentHandlers";
import { useCanvasFeatureHandlers } from "@/app/_hooks/useCanvasFeatureHandlers";
import { useA11yMonitor } from "@/app/_hooks/useA11yMonitor";
import { A11yNotificationStack } from "@/app/_components/a11y-notification";
import { usePaletteEntries } from "@/app/_hooks/usePaletteEntries";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "sherpa-v2";
const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  fontTheme: "modern",
  surfaceStyle: "glass",
  accentColor: "",
  hotspotSize: "medium",
  modelEnvironment: "studio",
};
const SIDEBAR_WIDTH = 300;
const INSPECTOR_WIDTH = 380;
const STUDIO_CHROME_MARGIN = 18;
const STUDIO_CHROME_GAP = 24;
const PANEL_HANDLE_WIDTH = 32;
const SIDEBAR_WRAPPER_WIDTH = SIDEBAR_WIDTH + PANEL_HANDLE_WIDTH;
const INSPECTOR_WRAPPER_WIDTH = INSPECTOR_WIDTH + PANEL_HANDLE_WIDTH;

type InspectorTab = "surface" | "content" | "setup";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "";

export function AuthoringStudio({ userId, userEmail }: { userId: string; userEmail: string }) {
  const router = useRouter();
  const [pages, setPages] = useState<PageItem[]>(createSamplePages);
  const pagesRef = useRef(pages);
  useEffect(() => { pagesRef.current = pages; }, [pages]);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("desktop");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showLayoutHelp, setShowLayoutHelp] = useState(true);
  const [, setIsContentModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("surface");
  const [scrollToBlock, setScrollToBlock] = useState<{ id: string; ts: number } | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isHeaderOpen, setIsHeaderOpen] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isGameSwitcherOpen, setIsGameSwitcherOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [cardPairingPageId, setCardPairingPageId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentGameId, setCurrentGameId] = useState(userId);
  const [currentGameName, setCurrentGameName] = useState("Ugly Pickle");
  const [currentStudioName, setCurrentStudioName] = useState("Bee Studio");
  const [hydrated, setHydrated] = useState(false);
  const [hasLoadedInitialState, setHasLoadedInitialState] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [studioDarkMode, setStudioDarkMode] = useState(() => {
    try { return localStorage.getItem("sherpa-studio-dark") === "true"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("sherpa-studio-dark", studioDarkMode ? "true" : "false"); } catch { /* quota */ }
  }, [studioDarkMode]);

  // Keep the browser URL in sync with the active game
  useEffect(() => {
    if (currentGameId) {
      router.replace(`/?game=${currentGameId}`, { scroll: false });
    }
  }, [currentGameId, router]);

  // Refs for the keyboard handler — avoid stale closures without re-registering the listener
  const selectedFeatureIdRef = useRef(selectedFeatureId);
  useEffect(() => { selectedFeatureIdRef.current = selectedFeatureId; }, [selectedFeatureId]);
  const selectedPageIdRef = useRef(selectedPageId);
  useEffect(() => { selectedPageIdRef.current = selectedPageId; }, [selectedPageId]);
  const layoutModeRef = useRef(layoutMode);
  useEffect(() => { layoutModeRef.current = layoutMode; }, [layoutMode]);
  const isPreviewModeRef = useRef(isPreviewMode);
  useEffect(() => { isPreviewModeRef.current = isPreviewMode; }, [isPreviewMode]);
  const isSidebarOpenRef = useRef(isSidebarOpen);
  useEffect(() => { isSidebarOpenRef.current = isSidebarOpen; }, [isSidebarOpen]);
  const isInspectorOpenRef = useRef(isInspectorOpen);
  useEffect(() => { isInspectorOpenRef.current = isInspectorOpen; }, [isInspectorOpen]);
  const isHeaderOpenRef = useRef(isHeaderOpen);
  useEffect(() => { isHeaderOpenRef.current = isHeaderOpen; }, [isHeaderOpen]);
  const lastNudgeTimeRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load: try Supabase first, fall back to localStorage
  useEffect(() => {
    if (hydrated) return;
    setHydrated(true);
    let cancelled = false;
    async function load() {
      try {
        const remote = await loadGame(currentGameId);
        if (cancelled) return;
        if (remote) {
          const loaded = migrateLocaleFeature(migratePageButtons(remote.pages));
          setPages(loaded.length > 0 ? loaded : createSamplePages());
          if (remote.systemSettings) setSystemSettings(remote.systemSettings);
          if (remote.gameTitle) setCurrentGameName(remote.gameTitle);
          return;
        } else {
          const persisted = loadPersistedState();
          if (persisted) {
            if (persisted.pages) setPages(migrateLocaleFeature(migratePageButtons(persisted.pages)));
            if (persisted.systemSettings) setSystemSettings(persisted.systemSettings);
          }
          return;
        }
      } catch { /* network unavailable — fall through */ }
      const persisted = loadPersistedState();
      if (persisted) {
        if (persisted.pages) setPages(migrateLocaleFeature(migratePageButtons(persisted.pages)));
        if (persisted.systemSettings) setSystemSettings(persisted.systemSettings);
      }
    }
    load().finally(() => {
      if (!cancelled) setHasLoadedInitialState(true);
    });
    if (shouldShowOnboarding()) setShowOnboarding(true);
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist: localStorage immediately + Supabase debounced
  useEffect(() => {
    if (!hasLoadedInitialState) return;

    const persistablePages = sanitizePagesForPersistence(pages);
    const persistableSystemSettings = sanitizeSystemSettingsForPersistence(systemSettings);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          pages: persistablePages,
          systemSettings: persistableSystemSettings,
        })
      );
    } catch { /* quota exceeded — fail silently */ }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveState("saving");
      saveGame(
        currentGameId,
        userId,
        currentGameName,
        persistablePages,
        persistableSystemSettings
      )
        .then(() => {
          setSaveState("saved");
          if (savedResetRef.current) clearTimeout(savedResetRef.current);
          savedResetRef.current = setTimeout(() => setSaveState("idle"), 2000);
        })
        .catch((err) => { console.error("[saveGame]", err); setSaveState("error"); });
    }, 2000);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [pages, systemSettings, currentGameId, currentGameName, hasLoadedInitialState, userId]);

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedPageId) ?? null,
    [pages, selectedPageId]
  );

  const hotspotPages = useMemo(
    () => pages.filter(
      (page) =>
        page.kind === "hotspot" &&
        ((page.x !== null && page.y !== null) || page.worldPosition !== undefined)
    ),
    [pages]
  );

  const homePage = useMemo(
    () => pages.find((page) => page.kind === "home") ?? pages[0],
    [pages]
  );
  const homePageId = useMemo(
    () => getHomePageId(pages, selectedPageId || userId),
    [pages, selectedPageId, userId]
  );

  useEffect(() => {
    if (pages.length === 0) return;
    if (!selectedPageId || !pages.some((page) => page.id === selectedPageId)) {
      setSelectedPageId(homePageId);
    }
  }, [homePageId, pages, selectedPageId]);

  const activePreviewPage = selectedPage ?? homePage ?? pages[0];
  // All containers (hotspots and nav pages) appear on top of the home surface —
  // always render the home canvas as the background so the context is correct.
  const previewSurfacePage = activePreviewPage
    ? activePreviewPage.kind === "home" ? activePreviewPage : homePage
    : undefined;

  const updateSelectedPage = useCallback((updater: (page: PageItem) => PageItem) => {
    setPages((prev) =>
      prev.map((page) => (page.id === selectedPageId ? updater(page) : page))
    );
  }, [selectedPageId]);

  const { pagesHistoryRef, pagesRedoRef, pushPagesHistory, HISTORY_LIMIT } = useStudioHistory(pages, setPages);
  const experienceStatus: ExperienceStatus = homePage?.publishStatus === "published" ? "published" : "draft";
  const liveViewHref = currentGameId
    ? BASE_DOMAIN
      ? `https://${currentGameId}.${BASE_DOMAIN}`
      : `/play/${currentGameId}`
    : null;

  const handleExperienceStatusChange = useCallback((status: ExperienceStatus) => {
    pushPagesHistory();
    setPages((prev) =>
      prev.map((page) =>
        page.kind === "home"
          ? { ...page, publishStatus: status }
          : page
      )
    );
  }, [pushPagesHistory]);

  const {
    canvasRef,
    imageStripRef,
    contentZoneRef,
    dragThresholdRef,
    featureDragState,
    contentDragState,
    handleHotspotPointerDown,
    handleCanvasFeaturePointerDown,
    handleContentCardPointerDown,
    handleCanvasClick,
    handle3dHotspotPlace,
    handleDismissContent,
    handleTogglePreviewMode,
  } = useDrag({
    pages,
    setPages,
    selectedPageId,
    setSelectedPageId,
    isPreviewMode,
    setIsPreviewMode,
    setIsContentModalOpen,
    setInspectorTab,
    pushPagesHistory,
    selectedFeatureId,
    setSelectedFeatureId,
    layoutMode,
  });

  const {
    openPageEditor,
    handleSidebarFeatureClick,
    handleCreatePageWithConfig,
    handleCreatePageForButton,
    handleDeleteSelectedPage,
    handleDeleteHotspot,
    handleResetPagePosition,
    handlePageHeroUrlChange,
    handlePageHeroUpload,
    handleTitleChange,
    handleDisplayStyleChange,
    handlePageButtonPlacementChange,
    handlePublishStatusChange,
    handleSidebarPublishStatusChange,
    handlePublicUrlChange,
    handleQrToggle,
  } = usePageHandlers({
    pages,
    setPages,
    selectedPageId,
    setSelectedPageId,
    pushPagesHistory,
    updateSelectedPage,
    setIsContentModalOpen,
    setInspectorTab,
    setSelectedFeatureId,
    setShowDeleteModal,
    userId,
    gameId: currentGameId,
  });

  const {
    handleAddBlock,
    handleBlockChange,
    handleBlockVariantChange,
    handleBlockImageFitChange,
    handleMoveBlockUp,
    handleMoveBlockDown,
    handleReorderBlocks,
    handleBlockImageUpload,
    handleRemoveBlock,
    handleAddSocialLink,
    handleSocialLinkChange,
    handleRemoveSocialLink,
    handleContentTintChange,
    handleBlockWidthChange,
    handleBlockTextAlignChange,
    handleBlockVerticalAlignChange,
    handleBlockFormatChange,
    handleBlockImagePositionChange,
    handleBlockPropsChange,
  } = useContentHandlers({ pushPagesHistory, updateSelectedPage, userId, gameId: currentGameId });

  const {
    handleAddCanvasFeature,
    handleCanvasFeatureChange,
    handleCanvasFeatureImageUpload,
    handleRemoveCanvasFeature,
    handleAddPageButton,
    handleSystemSettingChange,
  } = useCanvasFeatureHandlers({
    pages,
    setPages,
    pushPagesHistory,
    updateSelectedPage,
    setSystemSettings,
    setShowLayoutHelp,
    userId,
    gameId: currentGameId,
  });

  const handleSelectPage = useCallback((id: string) => {
    setSelectedPageId(id);
    setIsInspectorOpen(true);
    const page = pages.find((p) => p.id === id);
    if (page?.kind === "hotspot" || page?.kind === "page") setInspectorTab("content");
  }, [pages, setSelectedPageId, setInspectorTab]);

  const extraPaletteEntries = usePaletteEntries({
    selectedFeatureId,
    selectedPage,
    handleSystemSettingChange,
    handlePublishStatusChange,
    pushPagesHistory,
    setPages,
    setSelectedFeatureId,
    setInspectorTab,
    setShowDeleteModal,
    setIsGameSwitcherOpen,
    setIsChangelogOpen,
    setIsAccountOpen,
    handleDismissContent,
  });

  // Accessibility monitor — scans the preview canvas after each change
  const { violations, dismissViolation } = useA11yMonitor(canvasRef);

  const handleA11yNavigate = useCallback(
    (entityId: string, entityType: "feature" | "block") => {
      if (entityType === "feature") {
        // Find which page owns this feature and select it
        const ownerPage = pages.find((p) =>
          p.canvasFeatures.some((f) => f.id === entityId)
        );
        if (ownerPage) {
          setSelectedPageId(ownerPage.id);
          setSelectedFeatureId(entityId);
          setInspectorTab("surface");
          setIsContentModalOpen(true);
        }
      } else {
        // Find which page owns this block and open the content tab
        const ownerPage = pages.find((p) =>
          p.blocks.some((b) => b.id === entityId)
        );
        if (ownerPage) {
          setSelectedPageId(ownerPage.id);
          setInspectorTab("content");
          setIsContentModalOpen(true);
        }
      }

      // Scroll the element into view and flash it
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-a11y-id="${entityId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
          el.classList.add("a11y-highlight");
          setTimeout(() => el.classList.remove("a11y-highlight"), 1600);
        }
      });
    },
    [pages, setSelectedPageId, setSelectedFeatureId, setInspectorTab, setIsContentModalOpen]
  );

  // Keyboard shortcuts — all state read via refs so the listener never needs re-registration
  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      return (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      );
    };

    const pushHistory = () => {
      pagesHistoryRef.current = [...pagesHistoryRef.current.slice(-(HISTORY_LIMIT - 1)), pagesRef.current];
      pagesRedoRef.current = [];
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;

      // Ctrl/Cmd+Z — undo
      if (mod && event.key === "z" && !event.shiftKey) {
        const history = pagesHistoryRef.current;
        if (history.length === 0) return;
        event.preventDefault();
        const prev = history[history.length - 1];
        pagesHistoryRef.current = history.slice(0, -1);
        pagesRedoRef.current = [...pagesRedoRef.current.slice(-(HISTORY_LIMIT - 1)), pagesRef.current];
        setPages(prev);
        return;
      }

      // Ctrl/Cmd+Shift+Z — redo
      if (mod && event.key.toLowerCase() === "z" && event.shiftKey) {
        const redoStack = pagesRedoRef.current;
        if (redoStack.length === 0) return;
        event.preventDefault();
        const next = redoStack[redoStack.length - 1];
        pagesRedoRef.current = redoStack.slice(0, -1);
        pagesHistoryRef.current = [...pagesHistoryRef.current.slice(-(HISTORY_LIMIT - 1)), pagesRef.current];
        setPages(next);
        return;
      }

      // Escape — exit preview mode
      if (event.key === "Escape" && isPreviewModeRef.current) {
        setIsPreviewMode(false);
        return;
      }

      // Ctrl/Cmd+D — duplicate selected canvas feature
      if (mod && event.key === "d") {
        const featureId = selectedFeatureIdRef.current;
        if (!featureId) return;
        event.preventDefault();
        pushHistory();
        setPages((prev) => {
          const pageIdx = prev.findIndex((p) => p.canvasFeatures.some((f) => f.id === featureId));
          if (pageIdx === -1) return prev;
          const feature = prev[pageIdx].canvasFeatures.find((f) => f.id === featureId);
          if (!feature) return prev;
          const clone = {
            ...feature,
            id: createId("feature"),
            x: Math.min(feature.x + 3, 95),
            y: Math.min(feature.y + 3, 95),
          };
          return prev.map((p, i) =>
            i === pageIdx ? { ...p, canvasFeatures: [...p.canvasFeatures, clone] } : p
          );
        });
        return;
      }

      // Guard — bare keys must not fire while typing in an input
      if (isTyping()) return;

      // A — open command palette
      if (!mod && !event.altKey && !event.shiftKey && event.code === "KeyA") {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // Space — toggle header + left nav + editing panel together
      if (!mod && !event.altKey && event.code === "Space") {
        if (isPreviewModeRef.current) return;
        event.preventDefault();
        const shouldOpen = !(
          isSidebarOpenRef.current &&
          isInspectorOpenRef.current &&
          isHeaderOpenRef.current
        );
        setIsSidebarOpen(shouldOpen);
        setIsInspectorOpen(shouldOpen);
        setIsHeaderOpen(shouldOpen);
        return;
      }

      // Delete / Backspace — delete selected canvas feature, or selected hotspot
      if (event.key === "Delete" || event.key === "Backspace") {
        const featureId = selectedFeatureIdRef.current;
        if (featureId) {
          event.preventDefault();
          pushHistory();
          setPages((prev) =>
            prev.map((p) => ({
              ...p,
              canvasFeatures: p.canvasFeatures.filter((f) => f.id !== featureId),
            }))
          );
          setSelectedFeatureId(null);
          return;
        }
        const pageId = selectedPageIdRef.current;
        const page = pagesRef.current.find((p) => p.id === pageId);
        if (page?.kind === "hotspot") {
          event.preventDefault();
          pushHistory();
          setPages((prev) => prev.filter((p) => p.id !== pageId));
          setSelectedPageId(getHomePageId(pagesRef.current, pageId));
        }
        return;
      }

      // 1 / 2 / 3 — layout mode
      if (event.key === "1") { setLayoutMode("desktop"); return; }
      if (event.key === "2") { setLayoutMode("mobile-landscape"); return; }
      if (event.key === "3") { setLayoutMode("mobile-portrait"); return; }

      // P — toggle preview mode
      if (event.key === "p" || event.key === "P") {
        setIsPreviewMode((prev) => !prev);
        return;
      }

      // [ / ] — cycle through pages
      if (event.key === "[" || event.key === "]") {
        const allPages = pagesRef.current;
        const idx = allPages.findIndex((p) => p.id === selectedPageIdRef.current);
        if (idx === -1) return;
        const newIdx =
          event.key === "["
            ? (idx - 1 + allPages.length) % allPages.length
            : (idx + 1) % allPages.length;
        setSelectedPageId(allPages[newIdx].id);
        return;
      }

      // Arrow keys — nudge selected canvas feature by 0.25% (Shift = 1%)
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        const featureId = selectedFeatureIdRef.current;
        if (!featureId) return;
        event.preventDefault();
        const now = Date.now();
        if (now - lastNudgeTimeRef.current > 400) pushHistory();
        lastNudgeTimeRef.current = now;
        const step = event.shiftKey ? 1 : 0.25;
        const portrait = layoutModeRef.current === "mobile-portrait";
        setPages((prev) =>
          prev.map((p) => ({
            ...p,
            canvasFeatures: p.canvasFeatures.map((f) => {
              if (f.id !== featureId) return f;
              if (portrait) {
                const mx = f.mobileX ?? f.x;
                const my = f.mobileY ?? f.y;
                return {
                  ...f,
                  mobileX: event.key === "ArrowLeft" ? Math.max(0, mx - step) : event.key === "ArrowRight" ? Math.min(100, mx + step) : mx,
                  mobileY: event.key === "ArrowUp" ? Math.max(0, my - step) : event.key === "ArrowDown" ? Math.min(100, my + step) : my,
                };
              }
              return {
                ...f,
                x: event.key === "ArrowLeft" ? Math.max(0, f.x - step) : event.key === "ArrowRight" ? Math.min(100, f.x + step) : f.x,
                y: event.key === "ArrowUp" ? Math.max(0, f.y - step) : event.key === "ArrowDown" ? Math.min(100, f.y + step) : f.y,
              };
            }),
          }))
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activePreviewPage || !previewSurfacePage) return null;

  const sharedEditorProps = {
    activePreviewPage,
    hotspotPages,
    inspectorTab,
    onAddCanvasFeature: handleAddCanvasFeature,
    onAddBlock: handleAddBlock,
    onAddSocialLink: handleAddSocialLink,
    onCanvasFeatureChange: handleCanvasFeatureChange,
    onCanvasFeatureImageUpload: handleCanvasFeatureImageUpload,
    onBlockChange: handleBlockChange,
    onBlockFitChange: handleBlockImageFitChange,
    onBlockImageUpload: handleBlockImageUpload,
    onBlockVariantChange: handleBlockVariantChange,
    onClose: () => setIsContentModalOpen(false),
    onCreatePageWithConfig: handleCreatePageWithConfig,
    onCreatePageForButton: handleCreatePageForButton,
    onDeleteRequest: () => setShowDeleteModal(true),
    onHeroUpload: handlePageHeroUpload,
    onHotspotPointerDown: handleHotspotPointerDown,
    onDisplayStyleChange: handleDisplayStyleChange,
    onInspectorTabChange: (tab: InspectorTab) => {
      if (tab === "surface") handleDismissContent();
      setInspectorTab(tab);
    },
    onMoveBlockDown: handleMoveBlockDown,
    onMoveBlockUp: handleMoveBlockUp,
    onReorderBlocks: handleReorderBlocks,
    onPageButtonPlacementChange: handlePageButtonPlacementChange,
    onPageHeroUrlChange: handlePageHeroUrlChange,
    onPublicUrlChange: handlePublicUrlChange,
    onPublishStatusChange: handlePublishStatusChange,
    onQrToggle: handleQrToggle,
    onRemoveCanvasFeature: handleRemoveCanvasFeature,
    onRemoveBlock: handleRemoveBlock,
    onRemoveSocialLink: handleRemoveSocialLink,
    onResetPagePosition: handleResetPagePosition,
    onSelectPage: handleSelectPage,
    onSocialLinkChange: handleSocialLinkChange,
    onSystemSettingChange: handleSystemSettingChange,
    onBggImport: (data: { name: string; complexity: number; bggId: string }) => {
      setCurrentGameName(data.name);
      setPages((prev) => prev.map((p) => p.kind === "home" ? { ...p, title: data.name } : p));
      setSystemSettings((prev) => ({ ...prev, bggId: data.bggId, bggComplexity: data.complexity }));
    },
    onTitleChange: handleTitleChange,
    onContentTintChange: handleContentTintChange,
    onBlockWidthChange: handleBlockWidthChange,
    onBlockTextAlignChange: handleBlockTextAlignChange,
    onBlockVerticalAlignChange: handleBlockVerticalAlignChange,
    onBlockFormatChange: handleBlockFormatChange,
    onBlockImagePositionChange: handleBlockImagePositionChange,
    onBlockPropsChange: handleBlockPropsChange,
    onOpenPage: openPageEditor,
    scrollToBlockId: scrollToBlock?.id ?? null,
    isPortraitMode: layoutMode === "mobile-portrait" && systemSettings.portraitLayout !== "full",
    selectedPage,
    selectedPageId,
    selectedFeatureId,
    surfacePreviewPage: previewSurfacePage,
    pages,
    systemSettings,
  } as const;

  const dk = studioDarkMode;
  const chromeBg    = dk ? "bg-neutral-900"   : "bg-[#fcfaf7]";
  const chromeBord  = dk ? "border-neutral-700" : "border-[#e7dfd2]";
  const chromeToggle = dk
    ? "border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-neutral-200"
    : "border-[#e7dfd2] bg-[#fcfaf7] text-neutral-500 hover:text-neutral-800";
  const chromeShadow = "shadow-[0_22px_60px_rgba(15,23,42,0.14)]";
  const chromeToggleShadow = "shadow-[0_18px_36px_rgba(15,23,42,0.14)]";

  const headerLeftInset = isSidebarOpen
    ? STUDIO_CHROME_MARGIN + SIDEBAR_WIDTH + STUDIO_CHROME_GAP
    : STUDIO_CHROME_MARGIN;
  const headerRightInset = isInspectorOpen
    ? STUDIO_CHROME_MARGIN + INSPECTOR_WIDTH + STUDIO_CHROME_GAP
    : STUDIO_CHROME_MARGIN;
  const sidebarTransform =
    !isPreviewMode && isSidebarOpen
      ? "translateX(0)"
      : `translateX(-${SIDEBAR_WRAPPER_WIDTH}px)`;
  const inspectorTransform =
    !isPreviewMode && isInspectorOpen
      ? "translateX(0)"
      : `translateX(${INSPECTOR_WRAPPER_WIDTH}px)`;

  const sharedCanvasProps = {
    activePage: activePreviewPage,
    surfacePage: previewSurfacePage,
    experienceStatus,
    onExperienceStatusChange: handleExperienceStatusChange,
    canvasRef,
    imageStripRef,
    contentZoneRef,
    dragThresholdRef,
    contentDragState,
    featureDragState,
    hotspotPages,
    pages,
    layoutMode,
    systemSettings,
    showLayoutHelp,
    onCanvasClick: handleCanvasClick,
    onPlace3dHotspot: handle3dHotspotPlace,
    onCanvasFeaturePointerDown: (event: React.PointerEvent<HTMLDivElement>, featureId: string) => {
      setIsInspectorOpen(true);
      handleCanvasFeaturePointerDown(event, featureId);
    },
    onContentCardPointerDown: handleContentCardPointerDown,
    onDeleteHotspot: handleDeleteHotspot,
    onDismissContent: handleDismissContent,
    onDismissLayoutHelp: () => setShowLayoutHelp(false),
    onHotspotPointerDown: handleHotspotPointerDown,
    onSelectPage: handleSelectPage,
    onSetLayoutMode: setLayoutMode,
    onTogglePreviewMode: handleTogglePreviewMode,
    onHeroUpload: handlePageHeroUpload,
    onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
    isPreviewMode,
    selectedPageId,
    saveState,
    gameName: currentGameName,
    liveViewHref,
    onRenameGame: (name: string) => {
      setCurrentGameName(name);
      setPages((prev) => prev.map((p) => p.kind === "home" ? { ...p, title: name } : p));
    },
    studioChrome: {
      headerOpen: isHeaderOpen,
      leftInset: headerLeftInset,
      rightInset: headerRightInset,
      topInset: 0,
      onToggleHeader: () => setIsHeaderOpen((prev) => !prev),
      darkMode: studioDarkMode,
    },
  } as const;

  return (
    <main className="fixed inset-0 overflow-hidden text-neutral-900">
      {/* Full-screen canvas */}
      <div className="absolute inset-0">
        <PreviewCanvas {...sharedCanvasProps} fillHeight />
      </div>

      {/* Left panel toggle — visible when sidebar is hidden and not in preview */}
      {!isPreviewMode && !isSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className={`absolute left-0 top-1/2 z-50 -translate-y-1/2 rounded-r-2xl border border-l-0 px-2 py-3 ${chromeToggleShadow} transition ${chromeToggle}`}
          aria-label="Open sidebar"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* Left overlay — PageSidebar */}
      <div
        className="absolute bottom-0 left-0 top-0 z-40 transition-transform duration-300 ease-in-out"
        style={{ width: SIDEBAR_WRAPPER_WIDTH, transform: sidebarTransform }}
      >
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          tabIndex={!isPreviewMode && isSidebarOpen ? 0 : -1}
          aria-hidden={isPreviewMode || !isSidebarOpen}
          style={{ right: PANEL_HANDLE_WIDTH }}
          className={`absolute top-1/2 z-10 -translate-y-1/2 translate-x-full rounded-r-2xl border border-l-0 px-2 py-3 ${chromeToggleShadow} transition ${chromeToggle}`}
          aria-label="Close sidebar"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div
          className={`h-full overflow-hidden border-r ${chromeBord} ${chromeBg} ${chromeShadow}`}
          style={{ width: SIDEBAR_WIDTH }}
        >
          <PageSidebar
            onAddPage={() => {
              const id = handleCreatePageForButton();
              openPageEditor(id);
              setIsInspectorOpen(true);
              setCardPairingPageId(id);
            }}
            onReorderBlocks={(pageId, fromIndex, toIndex) => {
              pushPagesHistory();
              setPages((prev) => prev.map((p) => {
                if (p.id !== pageId) return p;
                const blocks = [...p.blocks];
                const [moved] = blocks.splice(fromIndex, 1);
                blocks.splice(toIndex, 0, moved);
                return { ...p, blocks };
              }));
            }}
            onOpenPage={(pageId, blockId) => {
              openPageEditor(pageId);
              setIsInspectorOpen(true);
              if (blockId) {
                setInspectorTab("content");
                setScrollToBlock({ id: blockId, ts: Date.now() });
              } else {
                setScrollToBlock(null);
              }
            }}
            onPublishStatusChange={handleSidebarPublishStatusChange}
            onSelectFeature={(pageId, featureId) => {
              setIsInspectorOpen(true);
              handleSidebarFeatureClick(pageId, featureId);
            }}
            pages={pages}
            selectedFeatureId={selectedFeatureId}
            selectedPageId={selectedPageId}
            currentGameName={currentGameName}
            currentStudioName={currentStudioName}
            currentGameId={currentGameId}
            userEmail={userEmail}
            onOpenChangelog={() => setIsChangelogOpen(true)}
            onOpenAccount={() => setIsAccountOpen(true)}
            onOpenGameSwitcher={() => setIsGameSwitcherOpen(true)}
            darkMode={studioDarkMode}
          />
        </div>
      </div>

      {/* Right panel toggle — visible when inspector is hidden and not in preview */}
      {!isPreviewMode && !isInspectorOpen && (
        <button
          type="button"
          onClick={() => setIsInspectorOpen(true)}
          className={`absolute right-0 top-1/2 z-50 -translate-y-1/2 rounded-l-2xl border border-r-0 px-2 py-3 ${chromeToggleShadow} transition ${chromeToggle}`}
          aria-label="Open editing panel"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* Right overlay — Editing Panel */}
      <div
        className="absolute bottom-0 right-0 top-0 z-40 transition-transform duration-300 ease-in-out"
        style={{ width: INSPECTOR_WRAPPER_WIDTH, transform: inspectorTransform }}
      >
        <button
          type="button"
          onClick={() => setIsInspectorOpen(false)}
          tabIndex={!isPreviewMode && isInspectorOpen ? 0 : -1}
          aria-hidden={isPreviewMode || !isInspectorOpen}
          style={{ left: PANEL_HANDLE_WIDTH }}
          className={`absolute top-1/2 z-10 -translate-x-full -translate-y-1/2 rounded-l-2xl border border-r-0 px-2 py-4 ${chromeToggleShadow} transition ${chromeToggle}`}
          aria-label="Close editing panel"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div
          className={`ml-auto flex h-full flex-col overflow-hidden border-l ${chromeBord} ${chromeBg} ${chromeShadow}`}
          style={{ width: INSPECTOR_WIDTH }}
        >
          <div className={`shrink-0 border-b ${chromeBord} px-5 py-4`}>
            <div className="flex items-center justify-between gap-2">
              <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${dk ? "text-neutral-400" : "text-neutral-500"}`}>
                Editing Panel
              </div>
              {experienceStatus === "published" && liveViewHref ? (
                <a
                  href={liveViewHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </a>
              ) : null}
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <PageEditorModal
              {...sharedEditorProps}
              isOpen={!!selectedPage}
              isOverlay={false}
              showCloseButton={false}
              showPreview={false}
              studioDarkMode={studioDarkMode}
            />
          </div>
        </div>
      </div>

      {isCommandPaletteOpen && (
        <CommandPalette
          pages={pages}
          context={inspectorTab === "content" ? "content" : null}
          extraEntries={extraPaletteEntries}
          onSelectPage={(id) => openPageEditor(id)}
          onAddCanvasFeature={handleAddCanvasFeature}
          onAddBlock={handleAddBlock}
          onCreatePage={() => {
              const id = handleCreatePageForButton();
              openPageEditor(id);
              setIsInspectorOpen(true);
              setCardPairingPageId(id);
            }}
          onSetLayoutMode={setLayoutMode}
          onTogglePreview={() => setIsPreviewMode((prev) => !prev)}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      )}

      <ConfirmDeleteModal
        isOpen={showDeleteModal && !!selectedPage}
        pageTitle={selectedPage?.title || "this page"}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteSelectedPage}
      />

      <A11yNotificationStack
        violations={violations}
        onDismiss={dismissViolation}
        onNavigate={handleA11yNavigate}
      />

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => { dismissOnboarding(); setShowOnboarding(false); }}
      />

      <CardPairingModal
        isOpen={!!cardPairingPageId}
        cardTitle={pages.find((p) => p.id === cardPairingPageId)?.title || ""}
        onAddButton={() => {
          if (cardPairingPageId) {
            const title = pages.find((p) => p.id === cardPairingPageId)?.title || "Card";
            handleAddPageButton(cardPairingPageId, title);
          }
          setCardPairingPageId(null);
        }}
        onSkip={() => setCardPairingPageId(null)}
      />

      <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
      <AccountPanel
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        userEmail={userEmail}
        onSignOut={() => supabase.auth.signOut()}
        onStudioNameChange={setCurrentStudioName}
        studioDarkMode={studioDarkMode}
        onStudioDarkModeChange={setStudioDarkMode}
      />
      <GameSwitcherModal
        isOpen={isGameSwitcherOpen}
        currentGameId={currentGameId}
        userId={userId}
        onClose={() => setIsGameSwitcherOpen(false)}
        onSelectGame={(id, name, studio) => {
          if (studio) setCurrentStudioName(studio);
          loadGame(id).then((remote) => {
            // Batch ALL state updates together so the persist effect always sees a
            // consistent (gameId, pages) pair — never the old pages under the new ID.
            if (remote) {
              const loaded = migrateLocaleFeature(migratePageButtons(remote.pages));
              const nextPages = loaded.length > 0 ? loaded : createSamplePages();
              setPages(nextPages);
              setSystemSettings(remote.systemSettings ?? DEFAULT_SYSTEM_SETTINGS);
              setSelectedPageId(getHomePageId(nextPages, id));
            } else {
              const nextPages = createSamplePages();
              setPages(nextPages);
              setSystemSettings(DEFAULT_SYSTEM_SETTINGS);
              setSelectedPageId(getHomePageId(nextPages, id));
            }
            setSelectedFeatureId(null);
            setInspectorTab("surface");
            setIsContentModalOpen(false);
            setCurrentGameId(id);
            setCurrentGameName(name);
          }).catch(() => {/* stay on current state */});
        }}
      />
    </main>
  );
}
