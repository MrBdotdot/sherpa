"use client";

import { ChangeEvent, Dispatch, SetStateAction } from "react";
import {
  applyDisplayStyle,
  createCanvasFeature,
  createStandardPage,
  createTemplatePage,
  HOME_PAGE_ID,
} from "@/app/_lib/authoring-utils";
import {
  DisplayStyleKey,
  InteractionType,
  PageButtonPlacement,
  PageItem,
  PublishStatus,
  TemplateId,
} from "@/app/_lib/authoring-types";

interface UsePageHandlersProps {
  pages: PageItem[];
  setPages: Dispatch<SetStateAction<PageItem[]>>;
  selectedPageId: string;
  setSelectedPageId: (id: string) => void;
  pushPagesHistory: () => void;
  updateSelectedPage: (updater: (page: PageItem) => PageItem) => void;
  setIsContentModalOpen: (v: boolean) => void;
  setInspectorTab: (tab: "surface" | "content" | "setup") => void;
  setSelectedFeatureId: (id: string | null) => void;
  setShowDeleteModal: (v: boolean) => void;
}

export function usePageHandlers({
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
}: UsePageHandlersProps) {
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null;
  const standardPages = pages.filter((page) => page.kind === "page");

  const openPageEditor = (id: string) => {
    setSelectedPageId(id);
    setSelectedFeatureId(null);
    setIsContentModalOpen(true);
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    // Hotspots are content-only — always land on the content tab
    if (page.kind === "hotspot") {
      setInspectorTab("content");
    } else if (page.canvasFeatures.length === 0 && (page.blocks.length > 0 || page.socialLinks.length > 0)) {
      setInspectorTab("content");
    } else {
      setInspectorTab("surface");
    }
  };

  const handleSidebarFeatureClick = (pageId: string, featureId: string) => {
    setSelectedPageId(pageId);
    setSelectedFeatureId(featureId);
    setIsContentModalOpen(true);
    setInspectorTab("surface");
  };

  const handleCreatePage = () => {
    pushPagesHistory();
    const newPage = createStandardPage(standardPages.length + 1);
    setPages((prev) => [...prev, newPage]);
    setSelectedPageId(newPage.id);
    setIsContentModalOpen(true);
  };

  /** Creates a new standard page without opening it, and returns the new page ID. */
  const handleCreatePageForButton = (): string => {
    pushPagesHistory();
    const newPage = createStandardPage(standardPages.length + 1);
    setPages((prev) => [...prev, newPage]);
    return newPage.id;
  };

  const handleCreateTemplatePage = (templateId: TemplateId) => {
    pushPagesHistory();
    const newPage = createTemplatePage(templateId, standardPages.length + 1);
    setPages((prev) => [...prev, newPage]);
    setSelectedPageId(newPage.id);
    setIsContentModalOpen(true);
  };

  const handleDeleteSelectedPage = () => {
    pushPagesHistory();
    if (!selectedPage || selectedPage.kind === "home") {
      setShowDeleteModal(false);
      return;
    }

    const deletedId = selectedPage.id;
    setPages((prev) =>
      prev
        .filter((page) => page.id !== deletedId)
        .map((page) =>
          page.kind === "home"
            ? { ...page, canvasFeatures: page.canvasFeatures.filter((f) => f.linkUrl !== deletedId) }
            : page
        )
    );
    setSelectedPageId(HOME_PAGE_ID);
    setIsContentModalOpen(false);
    setShowDeleteModal(false);
  };

  const handleDeleteHotspot = (pageId: string) => {
    pushPagesHistory();
    setPages((prev) => prev.filter((p) => p.id !== pageId));
    if (selectedPageId === pageId) {
      setSelectedPageId(HOME_PAGE_ID);
      setIsContentModalOpen(false);
    }
  };

  const handleResetPagePosition = () => {
    updateSelectedPage((page) => ({ ...page, x: null, y: null }));
  };

  const handlePageHeroUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateSelectedPage((page) => ({ ...page, heroImage: event.target.value }));
  };

  const handlePageHeroUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    updateSelectedPage((page) => ({ ...page, heroImage: objectUrl }));
  };

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateSelectedPage((page) => ({ ...page, title: event.target.value }));
  };

  const handleInteractionTypeChange = (value: InteractionType) => {
    updateSelectedPage((page) => ({ ...page, interactionType: value }));
  };

  const handleDisplayStyleChange = (style: DisplayStyleKey) => {
    const { interactionType, cardSize } = applyDisplayStyle(style);
    updateSelectedPage((page) => ({ ...page, interactionType, cardSize }));
  };

  const handleCreatePageWithConfig = ({
    templateId,
    title,
    displayStyle,
    contentTintColor,
    contentTintOpacity,
  }: {
    templateId: TemplateId | null;
    title: string;
    displayStyle: DisplayStyleKey;
    contentTintColor: string;
    contentTintOpacity: number;
  }) => {
    pushPagesHistory();
    const { interactionType, cardSize } = applyDisplayStyle(displayStyle);
    const base =
      templateId && templateId !== "blank"
        ? createTemplatePage(templateId, standardPages.length + 1)
        : createStandardPage(standardPages.length + 1);
    const newPage = {
      ...base,
      title: title.trim() || base.title,
      interactionType,
      cardSize,
      contentTintColor,
      contentTintOpacity,
    };
    const placementPos: Record<string, [number, number]> = {
      top: [50, 8],
      bottom: [50, 88],
      left: [12, 50],
      right: [88, 50],
      stack: [50, 50],
    };
    const [bx, by] = placementPos[newPage.pageButtonPlacement] ?? [50, 85];
    const pageButton = {
      ...createCanvasFeature("page-button"),
      label: newPage.title.trim() || "Page",
      linkUrl: newPage.id,
      x: bx,
      y: by,
    };

    setPages((prev) => {
      const homeIdx = prev.findIndex((p) => p.kind === "home");
      if (homeIdx === -1) return [...prev, newPage];
      return prev.map((p, i) =>
        i === homeIdx
          ? { ...p, canvasFeatures: [...p.canvasFeatures, pageButton] }
          : p
      ).concat(newPage);
    });
    setSelectedPageId(newPage.id);
    setIsContentModalOpen(true);
    if (newPage.canvasFeatures.length === 0 && (newPage.blocks.length > 0 || newPage.socialLinks.length > 0)) {
      setInspectorTab("content");
    } else {
      setInspectorTab("surface");
    }
  };

  const handlePageButtonPlacementChange = (value: PageButtonPlacement) => {
    updateSelectedPage((page) => ({ ...page, pageButtonPlacement: value }));
  };

  const handlePublishStatusChange = (value: PublishStatus) => {
    updateSelectedPage((page) => ({ ...page, publishStatus: value }));
  };

  const handleSidebarPublishStatusChange = (pageId: string, status: PublishStatus) => {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, publishStatus: status } : p)));
  };

  const handlePublicUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateSelectedPage((page) => ({ ...page, publicUrl: event.target.value }));
  };

  const handleQrToggle = () => {
    updateSelectedPage((page) => ({ ...page, showQrCode: !page.showQrCode }));
  };

  return {
    openPageEditor,
    handleSidebarFeatureClick,
    handleCreatePage,
    handleCreateTemplatePage,
    handleCreatePageWithConfig,
    handleCreatePageForButton,
    handleDeleteSelectedPage,
    handleDeleteHotspot,
    handleResetPagePosition,
    handlePageHeroUrlChange,
    handlePageHeroUpload,
    handleTitleChange,
    handleInteractionTypeChange,
    handleDisplayStyleChange,
    handlePageButtonPlacementChange,
    handlePublishStatusChange,
    handleSidebarPublishStatusChange,
    handlePublicUrlChange,
    handleQrToggle,
  };
}
