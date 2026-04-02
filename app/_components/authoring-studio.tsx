"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ConfirmDeleteModal } from "@/app/_components/confirm-delete-modal";
import { PageEditorModal } from "@/app/_components/page-editor-modal";
import { PageSidebar } from "@/app/_components/page-sidebar";
import { PreviewCanvas } from "@/app/_components/preview-canvas";
import { ChangelogModal } from "@/app/_components/changelog-modal";
import { AccountPanel } from "@/app/_components/account-panel";
import { GameSwitcherModal } from "@/app/_components/game-switcher-modal";
import { CommandPalette } from "@/app/_components/command-palette";
import { createId, createSamplePages, HOME_PAGE_ID } from "@/app/_lib/authoring-utils";
import { ExperienceStatus, LayoutMode, PageItem, SystemSettings } from "@/app/_lib/authoring-types";
import {
  loadPersistedState,
  migrateLocaleFeature,
  migratePageButtons,
} from "@/app/_lib/authoring-studio-utils";
import { useStudioHistory } from "@/app/_hooks/useStudioHistory";
import { useDrag } from "@/app/_hooks/useDrag";
import { usePageHandlers } from "@/app/_hooks/usePageHandlers";
import { useContentHandlers } from "@/app/_hooks/useContentHandlers";
import { useCanvasFeatureHandlers } from "@/app/_hooks/useCanvasFeatureHandlers";
import { useA11yMonitor } from "@/app/_hooks/useA11yMonitor";
import { A11yNotificationStack } from "@/app/_components/a11y-notification";
import { usePaletteEntries } from "@/app/_hooks/usePaletteEntries";

const STORAGE_KEY = "sherpa-v1";

type InspectorTab = "surface" | "content" | "setup";

export function AuthoringStudio() {
  const [pages, setPages] = useState<PageItem[]>(createSamplePages);
  const pagesRef = useRef(pages);
  useEffect(() => { pagesRef.current = pages; }, [pages]);
  const [selectedPageId, setSelectedPageId] = useState<string>(HOME_PAGE_ID);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    fontTheme: "modern",
    surfaceStyle: "glass",
    accentColor: "",
    hotspotSize: "medium",
    modelEnvironment: "studio",
  });
  const [experienceStatus, setExperienceStatus] = useState<ExperienceStatus>("draft");
  const [isLayoutEditMode, setIsLayoutEditMode] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("desktop");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showLayoutHelp, setShowLayoutHelp] = useState(true);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("surface");
  const [scrollToBlock, setScrollToBlock] = useState<{ id: string; ts: number } | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isGameSwitcherOpen, setIsGameSwitcherOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [currentGameId, setCurrentGameId] = useState("game-1");
  const [currentGameName, setCurrentGameName] = useState("Ugly Pickle");
  const [currentStudioName, setCurrentStudioName] = useState("Bee Studio");
  const [hydrated, setHydrated] = useState(false);

  // Refs for the keyboard handler — avoid stale closures without re-registering the listener
  const selectedFeatureIdRef = useRef(selectedFeatureId);
  useEffect(() => { selectedFeatureIdRef.current = selectedFeatureId; }, [selectedFeatureId]);
  const selectedPageIdRef = useRef(selectedPageId);
  useEffect(() => { selectedPageIdRef.current = selectedPageId; }, [selectedPageId]);
  const layoutModeRef = useRef(layoutMode);
  useEffect(() => { layoutModeRef.current = layoutMode; }, [layoutMode]);
  const isPreviewModeRef = useRef(isPreviewMode);
  useEffect(() => { isPreviewModeRef.current = isPreviewMode; }, [isPreviewMode]);
  const isFocusModeRef = useRef(isFocusMode);
  useEffect(() => { isFocusModeRef.current = isFocusMode; }, [isFocusMode]);
  const lastNudgeTimeRef = useRef(0);

  // Load persisted state after first mount to avoid SSR/client hydration mismatch
  useEffect(() => {
    if (hydrated) return;
    setHydrated(true);
    const persisted = loadPersistedState();
    if (persisted) {
      if (persisted.pages) setPages(migrateLocaleFeature(migratePageButtons(persisted.pages)));
      if (persisted.systemSettings) setSystemSettings(persisted.systemSettings);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist state on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pages, systemSettings }));
    } catch {
      // storage unavailable or quota exceeded — fail silently
    }
  }, [pages, systemSettings]);

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

  const activePreviewPage = selectedPage ?? pages[0];
  // All containers (hotspots and nav pages) appear on top of the home surface —
  // always render the home canvas as the background so the context is correct.
  const previewSurfacePage =
    activePreviewPage.kind === "home" ? activePreviewPage : homePage;

  const updateSelectedPage = useCallback((updater: (page: PageItem) => PageItem) => {
    setPages((prev) =>
      prev.map((page) => (page.id === selectedPageId ? updater(page) : page))
    );
  }, [selectedPageId]);

  const { pagesHistoryRef, pagesRedoRef, pushPagesHistory, HISTORY_LIMIT } = useStudioHistory(pages, setPages);

  const {
    canvasRef,
    imageStripRef,
    contentZoneRef,
    dragState: _dragState,
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
    isLayoutEditMode,
    setIsLayoutEditMode,
    isPreviewMode,
    setIsPreviewMode,
    setIsContentModalOpen,
    setInspectorTab,
    pushPagesHistory,
    setSelectedFeatureId,
    layoutMode,
  });

  const {
    openPageEditor,
    handleSidebarFeatureClick,
    handleCreatePage,
    handleCreateTemplatePage: _handleCreateTemplatePage,
    handleCreatePageWithConfig,
    handleCreatePageForButton,
    handleDeleteSelectedPage,
    handleDeleteHotspot,
    handleResetPagePosition,
    handlePageHeroUrlChange,
    handlePageHeroUpload,
    handleTitleChange,
    handleInteractionTypeChange: _handleInteractionTypeChange,
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
  } = useContentHandlers({ pushPagesHistory, updateSelectedPage });

  const {
    handleAddCanvasFeature,
    handleCanvasFeatureChange,
    handleCanvasFeatureImageUpload,
    handleRemoveCanvasFeature,
    handleSystemSettingChange,
  } = useCanvasFeatureHandlers({
    pages,
    setPages,
    pushPagesHistory,
    updateSelectedPage,
    setSystemSettings,
    setShowLayoutHelp,
  });

  const handleSelectPage = useCallback((id: string) => {
    setSelectedPageId(id);
    const page = pages.find((p) => p.id === id);
    if (page?.kind === "hotspot" || page?.kind === "page") setInspectorTab("content");
  }, [pages, setSelectedPageId, setInspectorTab]);

  const extraPaletteEntries = usePaletteEntries({
    selectedFeatureId,
    selectedPage,
    isLayoutEditMode,
    handleSystemSettingChange,
    handlePublishStatusChange,
    pushPagesHistory,
    setPages,
    setSelectedFeatureId,
    setIsLayoutEditMode,
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

      // Ctrl/Cmd+K — open command palette
      if (mod && event.key === "k") {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
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
          setSelectedPageId(HOME_PAGE_ID);
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

      // F — toggle focus mode (hide sidebar + inspector)
      if (event.key === "f" || event.key === "F") {
        setIsFocusMode((prev) => !prev);
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

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const sharedCanvasProps = {
    activePage: activePreviewPage,
    surfacePage: previewSurfacePage,
    experienceStatus,
    onExperienceStatusChange: setExperienceStatus,
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
    systemSettings,
    showLayoutHelp,
    onCanvasClick: handleCanvasClick,
    onPlace3dHotspot: handle3dHotspotPlace,
    onCanvasFeaturePointerDown: handleCanvasFeaturePointerDown,
    onContentCardPointerDown: handleContentCardPointerDown,
    onDeleteHotspot: handleDeleteHotspot,
    onDismissContent: handleDismissContent,
    onDismissLayoutHelp: () => setShowLayoutHelp(false),
    onHotspotPointerDown: handleHotspotPointerDown,
    onSelectPage: handleSelectPage,
    onToggleLayoutEditMode: () => setIsLayoutEditMode((prev) => !prev),
    onSetLayoutMode: setLayoutMode,
    onTogglePreviewMode: handleTogglePreviewMode,
    onHeroUpload: handlePageHeroUpload,
    onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
    isPreviewMode,
    selectedPageId,
  } as const;

  return (
    <main className="min-h-screen bg-[#f3f4f6] text-neutral-900">
      <div className="flex min-h-screen">
        <div className={`${isFocusMode ? "hidden" : "hidden lg:block"} h-screen w-[300px] shrink-0 overflow-hidden border-r border-neutral-200 bg-white`}>
          <PageSidebar
            onAddPage={handleCreatePage}
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
              if (blockId) {
                setInspectorTab("content");
                setScrollToBlock({ id: blockId, ts: Date.now() });
              } else {
                setScrollToBlock(null);
              }
            }}
            onPublishStatusChange={handleSidebarPublishStatusChange}
            onSelectFeature={handleSidebarFeatureClick}
            pages={pages}
            selectedFeatureId={selectedFeatureId}
            selectedPageId={selectedPageId}
            currentGameName={currentGameName}
            currentStudioName={currentStudioName}
            onOpenChangelog={() => setIsChangelogOpen(true)}
            onOpenAccount={() => setIsAccountOpen(true)}
            onOpenGameSwitcher={() => setIsGameSwitcherOpen(true)}
          />
        </div>

        <section className="min-w-0 flex-1 bg-[#eef1f4] p-4 md:p-6 lg:flex lg:h-screen lg:overflow-hidden lg:p-0">
          {/* Canvas column — padded uniformly on all sides */}
          <div className="min-w-0 flex-1 lg:flex lg:flex-col lg:overflow-hidden lg:p-8">
            <div className="mb-4 flex items-center gap-2 xl:hidden">
              <select
                value={selectedPageId}
                onChange={(e) => {
                  setSelectedPageId(e.target.value);
                  setIsContentModalOpen(false);
                }}
                aria-label="Navigate to page"
                className="min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 outline-none focus:border-black"
              >
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.kind === "home" ? "Home" : page.title || "Untitled"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsContentModalOpen(true)}
                className="shrink-0 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 shadow-sm hover:bg-neutral-50"
              >
                Inspect
              </button>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white p-2 sm:p-4 md:p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
              <PreviewCanvas {...sharedCanvasProps} fillHeight />
            </div>
          </div>

          {/* Editing Panel column — flush to top, right, and bottom edges */}
          <div className={`${isFocusMode ? "hidden" : "hidden xl:flex"} xl:w-[380px] xl:shrink-0 xl:flex-col`}>
            <div className="flex h-full flex-col overflow-hidden border-l border-neutral-200 bg-[#f7f7f8]">
              <div className="border-b border-neutral-200 px-5 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  Editing Panel
                </div>
              </div>

              <div className="min-h-0 flex-1">
                <PageEditorModal
                  {...sharedEditorProps}
                  isOpen={!!selectedPage}
                  isOverlay={false}
                  showCloseButton={false}
                  showPreview={false}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Mobile/tablet editor overlay — hidden at xl where the sticky inspector takes over */}
      <div className="xl:hidden">
        <PageEditorModal
          {...sharedEditorProps}
          isOpen={isContentModalOpen}
          showPreview={false}
        />
      </div>

      {isFocusMode && (
        <button
          type="button"
          onClick={() => setIsFocusMode(false)}
          className="fixed right-4 top-4 z-50 rounded-lg bg-black/30 px-3 py-1.5 text-xs text-white backdrop-blur-sm hover:bg-black/50"
        >
          Exit focus mode <span className="opacity-60">F</span>
        </button>
      )}

      {isCommandPaletteOpen && (
        <CommandPalette
          pages={pages}
          context={inspectorTab === "content" ? "content" : null}
          extraEntries={extraPaletteEntries}
          onSelectPage={(id) => openPageEditor(id)}
          onAddCanvasFeature={handleAddCanvasFeature}
          onAddBlock={handleAddBlock}
          onCreatePage={handleCreatePage}
          onSetLayoutMode={setLayoutMode}
          onTogglePreview={() => setIsPreviewMode((prev) => !prev)}
          onToggleFocus={() => setIsFocusMode((prev) => !prev)}
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

      <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
      <AccountPanel isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
      <GameSwitcherModal
        isOpen={isGameSwitcherOpen}
        currentGameId={currentGameId}
        onClose={() => setIsGameSwitcherOpen(false)}
        onSelectGame={(id, name, studio) => {
          setCurrentGameId(id);
          setCurrentGameName(name);
          setCurrentStudioName(studio);
        }}
      />
    </main>
  );
}
