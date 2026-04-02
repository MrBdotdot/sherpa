"use client";

import { Dispatch, SetStateAction } from "react";
import {
  createCanvasFeature,
  createStandardPage,
  createTemplatePage,
  HOME_PAGE_ID,
} from "@/app/_lib/authoring-utils";
import { applyDisplayStyle } from "@/app/_lib/display-style";
import {
  DisplayStyleKey,
  PageItem,
  TemplateId,
} from "@/app/_lib/authoring-types";

type UsePageCrudProps = {
  pages: PageItem[];
  setPages: Dispatch<SetStateAction<PageItem[]>>;
  selectedPageId: string;
  setSelectedPageId: (id: string) => void;
  pushPagesHistory: () => void;
  updateSelectedPage: (updater: (page: PageItem) => PageItem) => void;
  setIsContentModalOpen: (v: boolean) => void;
  setInspectorTab: (tab: "surface" | "content" | "setup") => void;
  setShowDeleteModal: (v: boolean) => void;
};

export function usePageCrud({
  pages,
  setPages,
  selectedPageId,
  setSelectedPageId,
  pushPagesHistory,
  updateSelectedPage,
  setIsContentModalOpen,
  setInspectorTab,
  setShowDeleteModal,
}: UsePageCrudProps) {
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null;
  const standardPages = pages.filter((page) => page.kind === "page");

  const handleCreatePage = () => {
    pushPagesHistory();
    const newPage = createStandardPage(standardPages.length + 1);
    setPages((prev) => [...prev, newPage]);
    setSelectedPageId(newPage.id);
    setInspectorTab("content");
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
    setInspectorTab("content");
    setIsContentModalOpen(true);
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

  return {
    handleCreatePage,
    handleCreatePageForButton,
    handleCreateTemplatePage,
    handleCreatePageWithConfig,
    handleDeleteSelectedPage,
    handleDeleteHotspot,
  };
}
