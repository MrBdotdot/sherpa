"use client";

import { ChangeEvent, Dispatch, SetStateAction } from "react";
import { createCanvasFeature } from "@/app/_lib/authoring-utils";
import {
  CanvasFeature,
  CanvasFeatureField,
  CanvasFeatureType,
  LayoutMode,
  PageItem,
  SystemSettings,
} from "@/app/_lib/authoring-types";
import { createResponsiveCanvasFeature, setFeatureVisibilityForLayout } from "@/app/_lib/responsive-board";
import { uploadImage } from "@/app/_lib/supabase-storage";

interface UseCanvasFeatureHandlersProps {
  pages: PageItem[];
  setPages: Dispatch<SetStateAction<PageItem[]>>;
  pushPagesHistory: () => void;
  updateSelectedPage: (updater: (page: PageItem) => PageItem) => void;
  setSystemSettings: Dispatch<SetStateAction<SystemSettings>>;
  setShowLayoutHelp: (v: boolean) => void;
  layoutMode: LayoutMode;
  userId: string;
  gameId: string;
}

export function useCanvasFeatureHandlers({
  pages: _pages,
  setPages,
  pushPagesHistory,
  updateSelectedPage,
  setSystemSettings,
  setShowLayoutHelp,
  layoutMode,
  userId,
  gameId,
}: UseCanvasFeatureHandlersProps) {
  const handleAddCanvasFeature = (type: CanvasFeatureType) => {
    pushPagesHistory();
    setShowLayoutHelp(false);
    updateSelectedPage((page) => ({
      ...page,
      canvasFeatures: [
        ...page.canvasFeatures,
        createResponsiveCanvasFeature(createCanvasFeature(type), layoutMode),
      ],
    }));
  };

  const handleCanvasFeatureChange = (
    featureId: string,
    field: CanvasFeatureField,
    value: string
  ) => {
    updateSelectedPage((page) => ({
      ...page,
      canvasFeatures: page.canvasFeatures.map((feature) =>
        feature.id === featureId
          ? {
              ...feature,
              [field]:
                field === "logoSize" || field === "qrSize"
                  ? parseInt(value, 10)
                  : field === "qrBgOpacity"
                  ? parseFloat(value)
                  : field === "qrBgColor"
                  ? (value || undefined)
                  : field === "portraitZone"
                  ? (value === "content" ? "content" : undefined)
                  : value,
            }
          : feature
      ),
    }));
  };

  const handleCanvasFeatureImageUpload = async (
    featureId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    handleCanvasFeatureChange(featureId, "imageUrl", localUrl);
    try {
      const remoteUrl = await uploadImage(file, userId, gameId);
      handleCanvasFeatureChange(featureId, "imageUrl", remoteUrl);
    } catch {
      // local blob URL stays in place — acceptable fallback
    }
  };

  const handleGameIconUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setSystemSettings((prev) => ({ ...prev, gameIcon: localUrl }));

    try {
      const remoteUrl = await uploadImage(file, userId, gameId);
      setSystemSettings((prev) => ({ ...prev, gameIcon: remoteUrl }));
    } catch {
      // Local blob URL stays in place until refresh if upload fails.
    }
  };

  const handleRemoveCanvasFeature = (featureId: string) => {
    pushPagesHistory();
    updateSelectedPage((page) => ({
      ...page,
      canvasFeatures: page.canvasFeatures.filter((feature) => feature.id !== featureId),
    }));
  };

  const handleCanvasFeatureVisibilityChange = (
    featureId: string,
    targetLayout: "mobile-landscape" | "mobile-portrait",
    visible: boolean
  ) => {
    pushPagesHistory();
    updateSelectedPage((page) => ({
      ...page,
      canvasFeatures: page.canvasFeatures.map((feature) =>
        feature.id === featureId
          ? setFeatureVisibilityForLayout(feature, targetLayout, visible)
          : feature
      ),
    }));
  };

  const handleAddPageButton = (targetPageId: string, label: string) => {
    pushPagesHistory();
    const feature: CanvasFeature = {
      ...createCanvasFeature("page-button"),
      label,
      linkUrl: targetPageId,
    };
    setPages((prev) =>
      prev.map((page) =>
        page.kind === "home"
          ? { ...page, canvasFeatures: [...page.canvasFeatures, feature] }
          : page
      )
    );
  };

  const handleSystemSettingChange = (field: string, value: unknown) => {
    setSystemSettings((prev) => ({ ...prev, [field]: value }));
  };

  return {
    handleAddCanvasFeature,
    handleCanvasFeatureChange,
    handleCanvasFeatureImageUpload,
    handleGameIconUpload,
    handleRemoveCanvasFeature,
    handleCanvasFeatureVisibilityChange,
    handleAddPageButton,
    handleSystemSettingChange,
  };
}
