"use client";

import { ChangeEvent, Dispatch, SetStateAction } from "react";
import { createCanvasFeature } from "@/app/_lib/authoring-utils";
import {
  CanvasFeature,
  CanvasFeatureType,
  PageItem,
  SystemSettings,
} from "@/app/_lib/authoring-types";

interface UseCanvasFeatureHandlersProps {
  pages: PageItem[];
  setPages: Dispatch<SetStateAction<PageItem[]>>;
  pushPagesHistory: () => void;
  updateSelectedPage: (updater: (page: PageItem) => PageItem) => void;
  setSystemSettings: Dispatch<SetStateAction<SystemSettings>>;
  setShowLayoutHelp: (v: boolean) => void;
}

export function useCanvasFeatureHandlers({
  pages: _pages,
  setPages,
  pushPagesHistory,
  updateSelectedPage,
  setSystemSettings,
  setShowLayoutHelp,
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
    field: "label" | "description" | "linkUrl" | "imageUrl" | "optionsText" | "logoSize" | "qrSize" | "qrBgColor" | "qrBgOpacity" | "portraitZone",
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

  const handleCanvasFeatureImageUpload = (
    featureId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleCanvasFeatureChange(featureId, "imageUrl", URL.createObjectURL(file));
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

  const handleSystemSettingChange = <K extends keyof SystemSettings>(
    field: K,
    value: SystemSettings[K]
  ) => {
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
