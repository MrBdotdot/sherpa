"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ConfirmDeleteModal } from "@/app/_components/confirm-delete-modal";
import { PageEditorModal } from "@/app/_components/page-editor-modal";
import { PageSidebar } from "@/app/_components/page-sidebar";
import { PreviewCanvas } from "@/app/_components/preview-canvas";
import { createInitialPages, HOME_PAGE_ID } from "@/app/_lib/authoring-utils";
import { LayoutMode, PageItem, SystemSettings } from "@/app/_lib/authoring-types";
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

const STORAGE_KEY = "sherpa-v1";

type InspectorTab = "surface" | "content" | "setup";

export function AuthoringStudio() {
  const [pages, setPages] = useState<PageItem[]>(createInitialPages);
  const pagesRef = useRef(pages);
  useEffect(() => { pagesRef.current = pages; }, [pages]);
  const [selectedPageId, setSelectedPageId] = useState<string>(HOME_PAGE_ID);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    fontTheme: "modern",
    surfaceStyle: "glass",
    accentColor: "",
    hotspotSize: "medium",
  });
  const [isLayoutEditMode, setIsLayoutEditMode] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("desktop");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showLayoutHelp, setShowLayoutHelp] = useState(true);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("surface");
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

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
    () => pages.filter((page) => page.kind === "hotspot" && page.x !== null && page.y !== null),
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

  const { pagesHistoryRef, pagesRedoRef, pushPagesHistory } = useStudioHistory(pages, setPages);

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
    handleCreatePage: _handleCreatePage,
    handleCreateTemplatePage: _handleCreateTemplatePage,
    handleCreatePageWithConfig,
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
    handleBlockImageUpload,
    handleRemoveBlock,
    handleAddSocialLink,
    handleSocialLinkChange,
    handleRemoveSocialLink,
    handleContentTintChange,
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

  // ESC exits preview mode; Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z redoes
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isPreviewMode) {
        setIsPreviewMode(false);
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "z" && !event.shiftKey) {
        const history = pagesHistoryRef.current;
        if (history.length === 0) return;
        event.preventDefault();
        const prev = history[history.length - 1];
        pagesHistoryRef.current = history.slice(0, -1);
        pagesRedoRef.current = [...pagesRedoRef.current.slice(-49), pagesRef.current];
        setPages(prev);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && event.shiftKey) {
        const redoStack = pagesRedoRef.current;
        if (redoStack.length === 0) return;
        event.preventDefault();
        const next = redoStack[redoStack.length - 1];
        pagesRedoRef.current = redoStack.slice(0, -1);
        pagesHistoryRef.current = [...pagesHistoryRef.current.slice(-49), pagesRef.current];
        setPages(next);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPreviewMode]);

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
    onDeleteRequest: () => setShowDeleteModal(true),
    onHeroUpload: handlePageHeroUpload,
    onHotspotPointerDown: handleHotspotPointerDown,
    onDisplayStyleChange: handleDisplayStyleChange,
    onInspectorTabChange: setInspectorTab,
    onMoveBlockDown: handleMoveBlockDown,
    onMoveBlockUp: handleMoveBlockUp,
    onPageButtonPlacementChange: handlePageButtonPlacementChange,
    onPageHeroUrlChange: handlePageHeroUrlChange,
    onPublicUrlChange: handlePublicUrlChange,
    onPublishStatusChange: handlePublishStatusChange,
    onQrToggle: handleQrToggle,
    onRemoveCanvasFeature: handleRemoveCanvasFeature,
    onRemoveBlock: handleRemoveBlock,
    onRemoveSocialLink: handleRemoveSocialLink,
    onResetPagePosition: handleResetPagePosition,
    onSelectPage: setSelectedPageId,
    onSocialLinkChange: handleSocialLinkChange,
    onSystemSettingChange: handleSystemSettingChange,
    onTitleChange: handleTitleChange,
    onContentTintChange: handleContentTintChange,
    onOpenPage: openPageEditor,
    isPortraitMode: layoutMode === "mobile-portrait",
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
    onCanvasFeaturePointerDown: handleCanvasFeaturePointerDown,
    onContentCardPointerDown: handleContentCardPointerDown,
    onDeleteHotspot: handleDeleteHotspot,
    onDismissContent: handleDismissContent,
    onDismissLayoutHelp: () => setShowLayoutHelp(false),
    onHotspotPointerDown: handleHotspotPointerDown,
    onSelectPage: setSelectedPageId,
    onToggleLayoutEditMode: () => setIsLayoutEditMode((prev) => !prev),
    onSetLayoutMode: setLayoutMode,
    onTogglePreviewMode: handleTogglePreviewMode,
    onHeroUpload: handlePageHeroUpload,
    isPreviewMode,
    selectedPageId,
  } as const;

  return (
    <main className="min-h-screen bg-[#f3f4f6] text-neutral-900">
      <div className="flex min-h-screen">
        <div className="hidden h-screen w-[300px] shrink-0 overflow-hidden border-r border-neutral-200 bg-white lg:block">
          <PageSidebar
            onOpenPage={openPageEditor}
            onPublishStatusChange={handleSidebarPublishStatusChange}
            onSelectFeature={handleSidebarFeatureClick}
            pages={pages}
            selectedFeatureId={selectedFeatureId}
            selectedPageId={selectedPageId}
          />
        </div>

        <section className="min-w-0 flex-1 bg-[#eef1f4] p-4 md:p-6 lg:h-screen lg:overflow-auto lg:p-8">
          <div className="mx-auto">
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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
              <div className="min-w-0">
                <div className="rounded-[28px] border border-white/70 bg-white p-2 sm:p-4 md:p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                  <PreviewCanvas {...sharedCanvasProps} />
                </div>
              </div>

              <div className="hidden xl:sticky xl:top-0 xl:block xl:h-screen">
                <div className="flex h-full flex-col overflow-hidden border-l border-neutral-200 bg-[#f7f7f8]">
                  <div className="border-b border-neutral-200 px-5 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      Inspector
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
    </main>
  );
}
