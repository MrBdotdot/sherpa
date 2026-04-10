"use client";

import { ChangeEvent, Dispatch, SetStateAction } from "react";
import { applyDisplayStyle } from "@/app/_lib/display-style";
import {
  DisplayStyleKey,
  InspectorTab,
  InteractionType,
  PageButtonPlacement,
  PageItem,
} from "@/app/_lib/authoring-types";
import { usePageCrud } from "@/app/_hooks/usePageCrud";
import { uploadImage } from "@/app/_lib/supabase-storage";

interface UsePageHandlersProps {
  pages: PageItem[];
  setPages: Dispatch<SetStateAction<PageItem[]>>;
  selectedPageId: string;
  setSelectedPageId: (id: string) => void;
  pushPagesHistory: () => void;
  updateSelectedPage: (updater: (page: PageItem) => PageItem) => void;
  setIsContentModalOpen: (v: boolean) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setSelectedFeatureId: (id: string | null) => void;
  setShowDeleteModal: (v: boolean) => void;
  userId: string;
  gameId: string;
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
  userId,
  gameId,
}: UsePageHandlersProps) {
  const crud = usePageCrud({
    pages,
    setPages,
    selectedPageId,
    setSelectedPageId,
    pushPagesHistory,
    updateSelectedPage,
    setIsContentModalOpen,
    setInspectorTab,
    setShowDeleteModal,
  });

  // ── Navigation ────────────────────────────────────────────────

  const openPageEditor = (id: string) => {
    setSelectedPageId(id);
    setSelectedFeatureId(null);
    setIsContentModalOpen(true);
    const page = pages.find((p) => p.id === id);
    if (!page || page.kind === "home") return;
    setInspectorTab("content");
  };

  const handleSidebarFeatureClick = (pageId: string, featureId: string) => {
    setSelectedPageId(pageId);
    setSelectedFeatureId(featureId);
    setIsContentModalOpen(true);
    setInspectorTab("board");
  };

  // ── Page styling ──────────────────────────────────────────────

  const handleResetPagePosition = () => {
    updateSelectedPage((page) => ({ ...page, x: null, y: null }));
  };

  const handlePageHeroUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateSelectedPage((page) => ({ ...page, heroImage: event.target.value }));
  };

  const handlePageHeroUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    updateSelectedPage((page) => ({ ...page, heroImage: localUrl }));
    try {
      const remoteUrl = await uploadImage(file, userId, gameId);
      updateSelectedPage((page) => ({ ...page, heroImage: remoteUrl }));
    } catch {
      // local blob URL stays in place until next save — acceptable fallback
    }
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

  const handlePageButtonPlacementChange = (value: PageButtonPlacement) => {
    updateSelectedPage((page) => ({ ...page, pageButtonPlacement: value }));
  };

  // ── Publishing ────────────────────────────────────────────────

  const handlePublicUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateSelectedPage((page) => ({ ...page, publicUrl: event.target.value }));
  };

  const handleQrToggle = () => {
    updateSelectedPage((page) => ({ ...page, showQrCode: !page.showQrCode }));
  };

  return {
    openPageEditor,
    handleSidebarFeatureClick,
    handleResetPagePosition,
    handlePageHeroUrlChange,
    handlePageHeroUpload,
    handleTitleChange,
    handleInteractionTypeChange,
    handleDisplayStyleChange,
    handlePageButtonPlacementChange,
    handlePublicUrlChange,
    handleQrToggle,
    ...crud,
  };
}
