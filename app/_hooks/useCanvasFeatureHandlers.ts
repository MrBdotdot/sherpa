"use client";

import { ChangeEvent, Dispatch, SetStateAction } from "react";
import { createCanvasFeature } from "@/app/_lib/authoring-utils";
import {
  CanvasFeature,
  CanvasFeatureField,
  CanvasFeatureType,
  PageItem,
  SystemSettings,
} from "@/app/_lib/authoring-types";
import { uploadImage } from "@/app/_lib/supabase-storage";

interface UseCanvasFeatureHandlersProps {
  pages: PageItem[];
  setPages: Dispatch<SetStateAction<PageItem[]>>;
  pushPagesHistory: () => void;
  updateSelectedPage: (updater: (page: PageItem) => PageItem) => void;
  setSystemSettings: Dispatch<SetStateAction<SystemSettings>>;
  setShowLayoutHelp: (v: boolean) => void;
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
  userId,
  gameId,
}: UseCanvasFeatureHandlersProps) {
  const handleAddCanvasFeature = (type: CanvasFeatureType) => {
    pushPagesHistory();
    setShowLayoutHelp(false);
    updateSelectedPage((page) => ({
      ...page,
      canvasFeatures: [...page.canvasFeatures, createCanvasFeature(type)],
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

  const handleRemoveCanvasFeature = (featureId: string) => {
    pushPagesHistory();
    updateSelectedPage((page) => ({
      ...page,
      canvasFeatures: page.canvasFeatures.filter((feature) => feature.id !== featureId),
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
    handleRemoveCanvasFeature,
    handleAddPageButton,
    handleSystemSettingChange,
  };
}
