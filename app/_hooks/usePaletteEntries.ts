import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ExtEntry } from "@/app/_components/command-palette";
import type { PageItem } from "@/app/_lib/authoring-types";

interface UsePaletteEntriesOptions {
  selectedFeatureId: string | null;
  selectedPage: PageItem | null;
  handleSystemSettingChange: (key: string, value: unknown) => void;
  handlePublishStatusChange: (status: "published" | "draft") => void;
  pushPagesHistory: () => void;
  setPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
  setSelectedFeatureId: (id: string | null) => void;
  setInspectorTab: (tab: "surface" | "content" | "setup") => void;
  setShowDeleteModal: (open: boolean) => void;
  setIsGameSwitcherOpen: (open: boolean) => void;
  setIsChangelogOpen: (open: boolean) => void;
  setIsAccountOpen: (open: boolean) => void;
  handleDismissContent: () => void;
}

export function usePaletteEntries({
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
}: UsePaletteEntriesOptions): ExtEntry[] {
  const router = useRouter();

  return useMemo<ExtEntry[]>(() => {
    const entries: ExtEntry[] = [
      // Navigate
      { id: "nav-analytics", label: "Open analytics dashboard", group: "Navigate", alwaysShow: true, onRun: () => router.push("/analytics") },
      { id: "nav-switch-game", label: "Switch game", group: "Navigate", alwaysShow: true, onRun: () => setIsGameSwitcherOpen(true) },
      { id: "nav-account", label: "Account settings", group: "Navigate", alwaysShow: true, onRun: () => setIsAccountOpen(true) },
      { id: "nav-changelog", label: "View changelog", group: "Navigate", alwaysShow: true, onRun: () => setIsChangelogOpen(true) },
      // View
      { id: "view-surface", label: "Board tab", group: "View", alwaysShow: true, onRun: () => { handleDismissContent(); setInspectorTab("surface"); } },
      { id: "view-content", label: "Card tab", group: "View", alwaysShow: true, onRun: () => setInspectorTab("content") },
      { id: "view-setup", label: "Settings tab", group: "View", alwaysShow: true, onRun: () => setInspectorTab("setup") },
      // Design (only visible when queried)
      { id: "design-font-modern", label: "Font: Modern", group: "Design", onRun: () => handleSystemSettingChange("fontTheme", "modern") },
      { id: "design-font-editorial", label: "Font: Editorial", group: "Design", onRun: () => handleSystemSettingChange("fontTheme", "editorial") },
      { id: "design-font-friendly", label: "Font: Friendly", group: "Design", onRun: () => handleSystemSettingChange("fontTheme", "friendly") },
      { id: "design-font-mono", label: "Font: Monospace", group: "Design", onRun: () => handleSystemSettingChange("fontTheme", "mono") },
      { id: "design-font-geometric", label: "Font: Geometric", group: "Design", onRun: () => handleSystemSettingChange("fontTheme", "geometric") },
      { id: "design-font-display", label: "Font: Display", group: "Design", onRun: () => handleSystemSettingChange("fontTheme", "display") },
      { id: "design-surface-glass", label: "Surface: Glass", group: "Design", onRun: () => handleSystemSettingChange("surfaceStyle", "glass") },
      { id: "design-surface-solid", label: "Surface: Solid", group: "Design", onRun: () => handleSystemSettingChange("surfaceStyle", "solid") },
      { id: "design-surface-contrast", label: "Surface: Contrast", group: "Design", onRun: () => handleSystemSettingChange("surfaceStyle", "contrast") },
      { id: "design-hotspot-small", label: "Hotspot size: Small", group: "Design", onRun: () => handleSystemSettingChange("hotspotSize", "small") },
      { id: "design-hotspot-medium", label: "Hotspot size: Medium", group: "Design", onRun: () => handleSystemSettingChange("hotspotSize", "medium") },
      { id: "design-hotspot-large", label: "Hotspot size: Large", group: "Design", onRun: () => handleSystemSettingChange("hotspotSize", "large") },
      { id: "design-portrait-split", label: "Portrait layout: Split", group: "Design", onRun: () => handleSystemSettingChange("portraitLayout", "split") },
      { id: "design-portrait-full", label: "Portrait layout: Full", group: "Design", onRun: () => handleSystemSettingChange("portraitLayout", "full") },
    ];

    if (selectedFeatureId) {
      entries.push({
        id: "canvas-delete-feature",
        label: "Delete selected element",
        group: "Board",
        alwaysShow: true,
        onRun: () => {
          pushPagesHistory();
          setPages((prev) =>
            prev.map((p) => ({ ...p, canvasFeatures: p.canvasFeatures.filter((f) => f.id !== selectedFeatureId) }))
          );
          setSelectedFeatureId(null);
        },
      });
    }

    if (selectedPage && selectedPage.kind !== "home") {
      const isPublished = selectedPage.publishStatus === "published";
      entries.push({
        id: "page-publish-toggle",
        label: isPublished ? "Unpublish current page" : "Publish current page",
        group: "Current page",
        alwaysShow: true,
        onRun: () => handlePublishStatusChange(isPublished ? "draft" : "published"),
      });
      entries.push({
        id: "page-delete",
        label: "Delete current page",
        group: "Current page",
        alwaysShow: false,
        onRun: () => setShowDeleteModal(true),
      });
    }

    return entries;
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    selectedFeatureId, selectedPage, router,
    handleSystemSettingChange, handlePublishStatusChange, pushPagesHistory,
    setPages, setSelectedFeatureId, handleDismissContent,
  ]);
}
