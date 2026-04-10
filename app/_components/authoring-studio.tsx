"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CardPairingModal } from "@/app/_components/card-pairing-modal";
import { OnboardingModal, dismissOnboarding } from "@/app/_components/onboarding-modal";
import { ConfirmDeleteModal } from "@/app/_components/confirm-delete-modal";
import { PageEditorModal } from "@/app/_components/page-editor-modal";
import { PageSidebar } from "@/app/_components/page-sidebar";
import { PreviewCanvas } from "@/app/_components/preview-canvas";
import { CreateContainerModal } from "@/app/_components/create-container-modal";
import { ChangelogModal } from "@/app/_components/changelog-modal";
import { AccountPanel } from "@/app/_components/account-panel";
import { GameSwitcherModal, type GameEntry } from "@/app/_components/game-switcher-modal";
import { CommandPalette } from "@/app/_components/command-palette";
import { A11yNotificationStack } from "@/app/_components/a11y-notification";
import { createInitialPages, getHomePageId } from "@/app/_lib/authoring-utils";
import { ExperienceStatus, InspectorTab, LayoutMode, PageItem, SystemSettings } from "@/app/_lib/authoring-types";
import { supabase } from "@/app/_lib/supabase";
import { useSearchParams } from "next/navigation";
import { UserMetadata } from "@/app/_lib/user-profile";
import { useStudioModals } from "@/app/_hooks/useStudioModals";
import { useStudioPanels } from "@/app/_hooks/useStudioPanels";
import { useStudioHistory } from "@/app/_hooks/useStudioHistory";
import { useGameLoader } from "@/app/_hooks/useGameLoader";
import { useLocalization } from "@/app/_hooks/useLocalization";
import { useKeyboardShortcuts } from "@/app/_hooks/useKeyboardShortcuts";
import { useDrag } from "@/app/_hooks/useDrag";
import { usePageHandlers } from "@/app/_hooks/usePageHandlers";
import { useContentHandlers } from "@/app/_hooks/useContentHandlers";
import { useCanvasFeatureHandlers } from "@/app/_hooks/useCanvasFeatureHandlers";
import { useA11yMonitor } from "@/app/_hooks/useA11yMonitor";
import { usePaletteEntries } from "@/app/_hooks/usePaletteEntries";
import { usePlan } from "@/app/_hooks/usePlan";
import { PricingModal } from "@/app/_components/pricing-modal";

const SIDEBAR_WIDTH = 300;
const INSPECTOR_WIDTH = 380;
const PANEL_HANDLE_WIDTH = 32;
const SIDEBAR_WRAPPER_WIDTH = SIDEBAR_WIDTH + PANEL_HANDLE_WIDTH;

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "";

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  fontTheme: "modern",
  surfaceStyle: "glass",
  accentColor: "",
  defaultLanguageCode: "EN",
  gameIcon: "",
  hotspotSize: "medium",
  modelEnvironment: "studio",
};

export function AuthoringStudio({
  userId,
  userEmail,
  userMetadata: incomingUserMetadata = {},
}: {
  userId: string;
  userEmail: string;
  userMetadata?: UserMetadata;
}) {
  const { canPublish, hasBranding } = usePlan();
  const [showPricingModal, setShowPricingModal] = useState<"upgrade-prompt" | "pricing" | null>(null);

  const searchParams = useSearchParams();
  const gameIdFromUrl = searchParams.get("game");

  // Core data state
  const [pages, setPages] = useState<PageItem[]>(() => createInitialPages());
  const pagesRef = useRef(pages);
  useEffect(() => { pagesRef.current = pages; }, [pages]);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("desktop");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [conventionMode, setConventionMode] = useState(false);
  const [showLayoutHelp, setShowLayoutHelp] = useState(true);
  const [, setIsContentModalOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("overview");
  const [scrollToBlock, setScrollToBlock] = useState<{ id: string; ts: number } | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [userMetadata, setUserMetadata] = useState<UserMetadata>(incomingUserMetadata);

  useEffect(() => { setUserMetadata(incomingUserMetadata); }, [incomingUserMetadata]);

  // Stale-closure refs for keyboard handler
  const selectedFeatureIdRef = useRef(selectedFeatureId);
  useEffect(() => { selectedFeatureIdRef.current = selectedFeatureId; }, [selectedFeatureId]);
  const selectedPageIdRef = useRef(selectedPageId);
  useEffect(() => { selectedPageIdRef.current = selectedPageId; }, [selectedPageId]);
  const systemSettingsRef = useRef(systemSettings);
  useEffect(() => { systemSettingsRef.current = systemSettings; }, [systemSettings]);
  const layoutModeRef = useRef(layoutMode);
  useEffect(() => { layoutModeRef.current = layoutMode; }, [layoutMode]);
  const isPreviewModeRef = useRef(isPreviewMode);
  useEffect(() => { isPreviewModeRef.current = isPreviewMode; }, [isPreviewMode]);

  // Shared page updaters
  const updateSelectedPage = useCallback((updater: (page: PageItem) => PageItem) => {
    setPages((prev) =>
      prev.map((page) => (page.id === selectedPageId ? updater(page) : page))
    );
  }, [selectedPageId]);

  const updateCanvasFeatureAcrossPages = useCallback(
    (featureId: string, updater: (feature: PageItem["canvasFeatures"][number]) => PageItem["canvasFeatures"][number]) => {
      setPages((prev) =>
        prev.map((page) => ({
          ...page,
          canvasFeatures: page.canvasFeatures.map((feature) =>
            feature.id === featureId ? updater(feature) : feature
          ),
        }))
      );
    },
    []
  );

  // Hooks
  const modals = useStudioModals();
  const panels = useStudioPanels({ isPreviewMode });
  const { pagesHistoryRef, pagesRedoRef, pushPagesHistory, HISTORY_LIMIT } = useStudioHistory(pages, setPages);

  const {
    currentGameId, currentGameName, setCurrentGameName, currentStudioName, setCurrentStudioName,
    saveState, switchToGame, openFreshWorkspace, onRenameGame,
    publishStatus, setPublishStatus,
  } = useGameLoader({
    pages, setPages, systemSettings, setSystemSettings,
    setSelectedPageId, setSelectedFeatureId, setInspectorTab,
    setIsContentModalOpen, setShowOnboarding: modals.setShowOnboarding,
    userId, gameIdFromUrl,
  });

  const {
    activeLanguageCode, setActiveLanguageCode,
    localeFeature, localeLanguages,
    localizedPages,
    handleLocaleLanguagesChange,
    handleLocalePromoteLanguageToDefault,
    handleLocaleSourceTextChange,
    handleLocaleTranslationChange,
  } = useLocalization({
    pages, setPages, setSystemSettings, pushPagesHistory,
    updateCanvasFeatureAcrossPages, pagesRef, systemSettingsRef,
    translations: systemSettings.translations,
  });

  const {
    canvasRef, imageStripRef, contentZoneRef, dragThresholdRef,
    featureDragState, contentDragState,
    handleHotspotPointerDown, handleCanvasFeaturePointerDown,
    handleContentCardPointerDown, handleCanvasClick,
    handle3dHotspotPlace, handleDismissContent, handleTogglePreviewMode,
    handleSelectCanvasFeature,
  } = useDrag({
    pages, setPages, selectedPageId, setSelectedPageId,
    isPreviewMode, setIsPreviewMode, setIsContentModalOpen,
    setInspectorTab, pushPagesHistory, selectedFeatureId, setSelectedFeatureId,
    layoutMode,
    onCollapseSidebar: panels.onCollapseSidebar,
    onCollapseInspector: panels.onCollapseInspector,
    onCollapseHeader: panels.onCollapseHeader,
  });

  const {
    openPageEditor, handleSidebarFeatureClick, handleCreatePageWithConfig,
    handleCreatePageForButton, handleDeleteSelectedPage, handleDeleteHotspot,
    handleResetPagePosition, handlePageHeroUrlChange, handlePageHeroUpload,
    handleTitleChange, handleDisplayStyleChange, handlePageButtonPlacementChange,
    handlePublicUrlChange, handleQrToggle,
  } = usePageHandlers({
    pages, setPages, selectedPageId, setSelectedPageId, pushPagesHistory,
    updateSelectedPage, setIsContentModalOpen, setInspectorTab,
    setSelectedFeatureId, setShowDeleteModal: modals.setShowDeleteModal,
    userId, gameId: currentGameId,
  });

  const {
    handleAddBlock, handleBlockChange, handleBlockVariantChange,
    handleBlockImageFitChange, handleMoveBlockUp, handleMoveBlockDown,
    handleReorderBlocks, handleBlockImageUpload, handleRemoveBlock,
    handleAddSocialLink, handleSocialLinkChange, handleRemoveSocialLink,
    handleContentTintChange, handleBlockWidthChange, handleBlockTextAlignChange,
    handleBlockVerticalAlignChange, handleBlockFormatChange,
    handleBlockImagePositionChange, handleBlockPropsChange,
  } = useContentHandlers({ pushPagesHistory, updateSelectedPage, userId, gameId: currentGameId });

  const {
    handleAddCanvasFeature, handleCanvasFeatureChange,
    handleCanvasFeatureImageUpload, handleCanvasFeatureVisibilityChange,
    handleGameIconUpload, handleRemoveCanvasFeature, handleAddPageButton,
    handleSystemSettingChange,
  } = useCanvasFeatureHandlers({
    pages, setPages, pushPagesHistory, updateSelectedPage, setSystemSettings,
    setShowLayoutHelp, layoutMode, userId, gameId: currentGameId,
  });

  const handleSelectPage = useCallback((id: string) => {
    setSelectedPageId(id);
    panels.setIsInspectorOpen(true);
    const page = pages.find((p) => p.id === id);
    if (page?.kind === "hotspot" || page?.kind === "page") setInspectorTab("content");
  }, [pages, panels, setSelectedPageId, setInspectorTab]);

  const extraPaletteEntries = usePaletteEntries({
    selectedFeatureId, selectedPage: pages.find((p) => p.id === selectedPageId) ?? null,
    handleSystemSettingChange, pushPagesHistory,
    setPages, setSelectedFeatureId, setInspectorTab,
    setShowDeleteModal: modals.setShowDeleteModal,
    setIsGameSwitcherOpen: modals.setIsGameSwitcherOpen,
    setIsChangelogOpen: modals.setIsChangelogOpen,
    setIsAccountOpen: modals.setIsAccountOpen,
    handleDismissContent,
  });

  const { violations, dismissViolation } = useA11yMonitor(canvasRef);

  const handleA11yNavigate = useCallback(
    (entityId: string, entityType: "feature" | "block") => {
      if (entityType === "feature") {
        const ownerPage = pages.find((p) => p.canvasFeatures.some((f) => f.id === entityId));
        if (ownerPage) {
          setSelectedPageId(ownerPage.id);
          setSelectedFeatureId(entityId);
          setInspectorTab("board");
          setIsContentModalOpen(true);
        }
      } else {
        const ownerPage = pages.find((p) => p.blocks.some((b) => b.id === entityId));
        if (ownerPage) {
          setSelectedPageId(ownerPage.id);
          setInspectorTab("content");
          setIsContentModalOpen(true);
        }
      }

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

  useKeyboardShortcuts({
    pagesHistoryRef, pagesRedoRef, HISTORY_LIMIT,
    pagesRef, selectedFeatureIdRef, selectedPageIdRef,
    layoutModeRef, isPreviewModeRef,
    isSidebarOpenRef: panels.isSidebarOpenRef,
    isInspectorOpenRef: panels.isInspectorOpenRef,
    isHeaderOpenRef: panels.isHeaderOpenRef,
    setPages, setIsPreviewMode,
    setIsSidebarOpen: panels.setIsSidebarOpen,
    setIsInspectorOpen: panels.setIsInspectorOpen,
    setIsHeaderOpen: panels.setIsHeaderOpen,
    setSelectedFeatureId, setSelectedPageId, setLayoutMode,
    setIsCommandPaletteOpen: modals.setIsCommandPaletteOpen,
  });

  // Derived values
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
  const homePageId = useMemo(
    () => getHomePageId(pages, selectedPageId || userId),
    [pages, selectedPageId, userId]
  );

  // Ensure a page is always selected
  useEffect(() => {
    if (pages.length === 0) return;
    if (!selectedPageId || !pages.some((page) => page.id === selectedPageId)) {
      setSelectedPageId(homePageId);
    }
  }, [homePageId, pages, selectedPageId]);

  const localizedSelectedPage = useMemo(
    () => localizedPages.find((page) => page.id === selectedPageId) ?? null,
    [localizedPages, selectedPageId]
  );
  const localizedHotspotPages = useMemo(
    () => localizedPages.filter(
      (page) =>
        page.kind === "hotspot" &&
        ((page.x !== null && page.y !== null) || page.worldPosition !== undefined)
    ),
    [localizedPages]
  );
  const localizedHomePage = useMemo(
    () => localizedPages.find((page) => page.kind === "home") ?? localizedPages[0],
    [localizedPages]
  );
  const activePreviewPage = localizedSelectedPage ?? localizedHomePage ?? localizedPages[0];
  const previewSurfacePage = activePreviewPage
    ? activePreviewPage.kind === "home" ? activePreviewPage : localizedHomePage
    : undefined;

  const experienceStatus: ExperienceStatus = publishStatus;
  const liveViewHref = currentGameId
    ? BASE_DOMAIN
      ? `https://${currentGameId}.${BASE_DOMAIN}`
      : `/play/${currentGameId}`
    : null;

  const handleExperienceStatusChange = useCallback((status: ExperienceStatus) => {
    if (status === "published" && !canPublish) {
      setShowPricingModal("upgrade-prompt");
      return;
    }
    setPublishStatus(status);
  }, [setPublishStatus, canPublish]);

  const handleStartConventionMode = useCallback(() => {
    setIsPreviewMode(true);
    setConventionMode(true);
  }, []);

  const handleStopConventionMode = useCallback(() => {
    setConventionMode(false);
    setIsPreviewMode(false);
  }, []);

  if (!activePreviewPage || !previewSurfacePage) return null;

  // Chrome style derivations
  const dk = panels.studioDarkMode;
  const chromeBg    = dk ? "bg-neutral-900"   : "bg-[#fcfaf7]";
  const chromeBord  = dk ? "border-neutral-700" : "border-[#e7dfd2]";
  const chromeToggle = dk
    ? "border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-neutral-200"
    : "border-[#e7dfd2] bg-[#fcfaf7] text-neutral-500 hover:text-neutral-800";
  const chromeShadow = "shadow-[0_22px_60px_rgba(15,23,42,0.14)]";
  const chromeToggleShadow = "shadow-[0_18px_36px_rgba(15,23,42,0.14)]";

  const sharedEditorProps = {
    activePreviewPage,
    hotspotPages: localizedHotspotPages,
    inspectorTab,
    onAddCanvasFeature: handleAddCanvasFeature,
    onAddBlock: handleAddBlock,
    onAddSocialLink: handleAddSocialLink,
    onCanvasFeatureChange: handleCanvasFeatureChange,
    onCanvasFeatureImageUpload: handleCanvasFeatureImageUpload,
    onCanvasFeatureVisibilityChange: handleCanvasFeatureVisibilityChange,
    onLocaleLanguagesChange: handleLocaleLanguagesChange,
    onLocalePromoteLanguageToDefault: handleLocalePromoteLanguageToDefault,
    onLocaleSourceTextChange: handleLocaleSourceTextChange,
    onLocaleTranslationChange: handleLocaleTranslationChange,
    onBlockChange: handleBlockChange,
    onBlockFitChange: handleBlockImageFitChange,
    onBlockImageUpload: handleBlockImageUpload,
    onBlockVariantChange: handleBlockVariantChange,
    onClose: () => setIsContentModalOpen(false),
    onCreatePageWithConfig: handleCreatePageWithConfig,
    onCreatePageForButton: handleCreatePageForButton,
    onDeleteRequest: () => modals.setShowDeleteModal(true),
    onHeroUpload: handlePageHeroUpload,
    onGameIconUpload: handleGameIconUpload,
    onHotspotPointerDown: handleHotspotPointerDown,
    onDisplayStyleChange: handleDisplayStyleChange,
    onInspectorTabChange: (tab: InspectorTab) => {
      if (tab === "board") handleDismissContent();
      setInspectorTab(tab);
    },
    onMoveBlockDown: handleMoveBlockDown,
    onMoveBlockUp: handleMoveBlockUp,
    onReorderBlocks: handleReorderBlocks,
    onPageButtonPlacementChange: handlePageButtonPlacementChange,
    onPageHeroUrlChange: handlePageHeroUrlChange,
    onPublicUrlChange: handlePublicUrlChange,
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
    previewPages: localizedPages,
    activeLanguageCode,
    availableLanguages: localeLanguages,
    currentGameName,
    layoutMode,
    localeFeature,
    surfacePreviewPage: previewSurfacePage,
    onLanguageChange: setActiveLanguageCode,
    pages,
    systemSettings,
  } as const;

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
    hotspotPages: localizedHotspotPages,
    pages: localizedPages,
    layoutMode,
    systemSettings,
    activeLanguageCode,
    availableLanguages: localeLanguages,
    showLayoutHelp,
    onCanvasClick: handleCanvasClick,
    onPlace3dHotspot: handle3dHotspotPlace,
    onCanvasFeaturePointerDown: (event: React.PointerEvent<HTMLDivElement>, featureId: string) => {
      handleCanvasFeaturePointerDown(event, featureId);
    },
    onSelectCanvasFeature: (featureId: string) => {
      panels.setIsInspectorOpen(true);
      handleSelectCanvasFeature(featureId);
    },
    onContentCardPointerDown: handleContentCardPointerDown,
    onDeleteHotspot: handleDeleteHotspot,
    onDismissContent: handleDismissContent,
    onDismissLayoutHelp: () => setShowLayoutHelp(false),
    onHotspotPointerDown: handleHotspotPointerDown,
    onLanguageChange: setActiveLanguageCode,
    onSelectPage: handleSelectPage,
    onSetLayoutMode: setLayoutMode,
    onTogglePreviewMode: handleTogglePreviewMode,
    onHeroUpload: handlePageHeroUpload,
    onOpenCommandPalette: () => modals.setIsCommandPaletteOpen(true),
    isPreviewMode,
    selectedPageId,
    saveState,
    gameName: currentGameName,
    studioName: currentStudioName,
    liveViewHref,
    onRenameGame,
    conventionMode,
    onStartConventionMode: handleStartConventionMode,
    onStopConventionMode: handleStopConventionMode,
    hasBranding: hasBranding || conventionMode,
    studioChrome: {
      headerOpen: panels.isHeaderOpen,
      leftInset: panels.headerLeftInset,
      rightInset: panels.headerRightInset,
      topInset: 0,
      onToggleHeader: () => panels.setIsHeaderOpen((prev) => !prev),
      darkMode: panels.studioDarkMode,
    },
  } as const;

  return (
    <main className="fixed inset-0 overflow-hidden text-neutral-900">
      {/* Full-screen canvas */}
      <div className="absolute inset-0">
        <PreviewCanvas {...sharedCanvasProps} fillHeight />
      </div>

      {/* Left panel toggle — visible when sidebar is hidden and not in preview */}
      {!isPreviewMode && !panels.isSidebarOpen && (
        <button
          type="button"
          onClick={() => panels.setIsSidebarOpen(true)}
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
        style={{ width: SIDEBAR_WRAPPER_WIDTH, transform: panels.sidebarTransform }}
      >
        <button
          type="button"
          onClick={() => panels.setIsSidebarOpen(false)}
          tabIndex={!isPreviewMode && panels.isSidebarOpen ? 0 : -1}
          aria-hidden={isPreviewMode || !panels.isSidebarOpen}
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
            onAddPage={() => modals.setIsCreateContainerOpen(true)}
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
              panels.setIsInspectorOpen(true);
              if (blockId) {
                setInspectorTab("content");
                setScrollToBlock({ id: blockId, ts: Date.now() });
              } else {
                setScrollToBlock(null);
              }
            }}
            onSelectFeature={(pageId, featureId) => {
              panels.setIsInspectorOpen(true);
              handleSidebarFeatureClick(pageId, featureId);
            }}
            pages={pages}
            selectedFeatureId={selectedFeatureId}
            selectedPageId={selectedPageId}
            currentGameName={currentGameName}
            currentGameIcon={systemSettings.gameIcon}
            currentGameId={currentGameId}
            experienceStatus={experienceStatus}
            userEmail={userEmail}
            userMetadata={userMetadata}
            onOpenChangelog={() => modals.setIsChangelogOpen(true)}
            onOpenAccount={() => modals.setIsAccountOpen(true)}
            onOpenGameSwitcher={() => modals.setIsGameSwitcherOpen(true)}
            darkMode={panels.studioDarkMode}
          />
        </div>
      </div>

      {/* Right panel open button — visible when inspector is hidden */}
      {!isPreviewMode && !panels.isInspectorOpen && (
        <button
          type="button"
          onClick={() => panels.setIsInspectorOpen(true)}
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
        style={{ width: INSPECTOR_WIDTH, transform: panels.inspectorTransform }}
      >
        {/* Close button rides with the panel */}
        <button
          type="button"
          onClick={() => panels.setIsInspectorOpen(false)}
          tabIndex={!isPreviewMode && panels.isInspectorOpen ? 0 : -1}
          aria-hidden={isPreviewMode || !panels.isInspectorOpen}
          className={`absolute left-0 top-1/2 z-10 -translate-x-full -translate-y-1/2 rounded-l-2xl border border-r-0 px-2 py-3 ${chromeToggleShadow} transition ${chromeToggle}`}
          aria-label="Close editing panel"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div
          className={`flex h-full flex-col overflow-hidden border-l ${chromeBord} ${chromeBg} ${chromeShadow}`}
        >
          <div className={`shrink-0 border-b ${chromeBord} px-5 py-4`}>
            <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${dk ? "text-neutral-400" : "text-neutral-500"}`}>
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
              studioDarkMode={panels.studioDarkMode}
            />
          </div>
        </div>
      </div>

      {modals.isCommandPaletteOpen && (
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
            panels.setIsInspectorOpen(true);
            modals.setCardPairingPageId(id);
          }}
          onSetLayoutMode={setLayoutMode}
          onTogglePreview={() => setIsPreviewMode((prev) => !prev)}
          onClose={() => modals.setIsCommandPaletteOpen(false)}
        />
      )}

      <ConfirmDeleteModal
        isOpen={modals.showDeleteModal && !!selectedPage}
        pageTitle={selectedPage?.title || "this page"}
        onCancel={() => modals.setShowDeleteModal(false)}
        onConfirm={handleDeleteSelectedPage}
      />

      <A11yNotificationStack
        violations={violations}
        onDismiss={dismissViolation}
        onNavigate={handleA11yNavigate}
      />

      <OnboardingModal
        isOpen={modals.showOnboarding}
        onClose={() => { dismissOnboarding(); modals.setShowOnboarding(false); }}
      />

      <CardPairingModal
        isOpen={!!modals.cardPairingPageId}
        cardTitle={pages.find((p) => p.id === modals.cardPairingPageId)?.title || ""}
        onAddButton={() => {
          if (modals.cardPairingPageId) {
            const title = pages.find((p) => p.id === modals.cardPairingPageId)?.title || "Card";
            handleAddPageButton(modals.cardPairingPageId, title);
          }
          modals.setCardPairingPageId(null);
        }}
        onSkip={() => modals.setCardPairingPageId(null)}
      />

      <ChangelogModal isOpen={modals.isChangelogOpen} onClose={() => modals.setIsChangelogOpen(false)} />

      <CreateContainerModal
        isOpen={modals.isCreateContainerOpen}
        onClose={() => modals.setIsCreateContainerOpen(false)}
        onCreatePageWithConfig={(config) => {
          handleCreatePageWithConfig(config);
          panels.setIsInspectorOpen(true);
        }}
      />

      <AccountPanel
        isOpen={modals.isAccountOpen}
        onClose={() => modals.setIsAccountOpen(false)}
        userEmail={userEmail}
        userMetadata={userMetadata}
        onSignOut={() => supabase.auth.signOut()}
        onUserMetadataChange={setUserMetadata}
        onStudioNameChange={setCurrentStudioName}
        studioDarkMode={panels.studioDarkMode}
        onStudioDarkModeChange={panels.setStudioDarkMode}
        onOpenPricingModal={() => setShowPricingModal("pricing")}
      />

      <GameSwitcherModal
        isOpen={modals.isGameSwitcherOpen}
        currentGameId={currentGameId}
        userId={userId}
        onClose={() => modals.setIsGameSwitcherOpen(false)}
        onSelectGame={switchToGame}
        onDeleteCurrentGame={(nextGame: GameEntry | null) => {
          if (nextGame) {
            switchToGame(nextGame.id, nextGame.title);
            return;
          }
          openFreshWorkspace();
        }}
      />
      {showPricingModal && (
        <PricingModal
          mode={showPricingModal}
          onClose={() => setShowPricingModal(null)}
        />
      )}
    </main>
  );
}
