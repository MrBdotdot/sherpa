"use client";

import React, { useEffect, useRef } from "react";
import { LayoutMode, PageItem } from "@/app/_lib/authoring-types";
import { createId, getHomePageId } from "@/app/_lib/authoring-utils";
import { resolveCanvasFeatureForLayout, updateFeaturePositionForLayout } from "@/app/_lib/responsive-board";

type UseKeyboardShortcutsProps = {
  // History
  pagesHistoryRef: React.MutableRefObject<PageItem[][]>;
  pagesRedoRef: React.MutableRefObject<PageItem[][]>;
  HISTORY_LIMIT: number;
  // State refs (stale-closure avoidance)
  pagesRef: React.MutableRefObject<PageItem[]>;
  selectedFeatureIdRef: React.MutableRefObject<string | null>;
  selectedPageIdRef: React.MutableRefObject<string>;
  layoutModeRef: React.MutableRefObject<LayoutMode>;
  isPreviewModeRef: React.MutableRefObject<boolean>;
  // Panel refs (from useStudioPanels)
  isSidebarOpenRef: React.MutableRefObject<boolean>;
  isInspectorOpenRef: React.MutableRefObject<boolean>;
  isTopNavOpenRef: React.MutableRefObject<boolean>;
  isBottomNavOpenRef: React.MutableRefObject<boolean>;
  // Setters
  setPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
  setIsPreviewMode: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSidebarOpen: (v: boolean) => void;
  setIsInspectorOpen: (v: boolean) => void;
  setIsTopNavOpen: (v: boolean) => void;
  setIsBottomNavOpen: (v: boolean) => void;
  setSelectedFeatureId: (id: string | null) => void;
  setSelectedPageId: (id: string) => void;
  setLayoutMode: React.Dispatch<React.SetStateAction<LayoutMode>>;
  setIsCommandPaletteOpen: (v: boolean) => void;
};

export function useKeyboardShortcuts({
  pagesHistoryRef,
  pagesRedoRef,
  HISTORY_LIMIT,
  pagesRef,
  selectedFeatureIdRef,
  selectedPageIdRef,
  layoutModeRef,
  isPreviewModeRef,
  isSidebarOpenRef,
  isInspectorOpenRef,
  isTopNavOpenRef,
  isBottomNavOpenRef,
  setPages,
  setIsPreviewMode,
  setIsSidebarOpen,
  setIsInspectorOpen,
  setIsTopNavOpen,
  setIsBottomNavOpen,
  setSelectedFeatureId,
  setSelectedPageId,
  setLayoutMode,
  setIsCommandPaletteOpen,
}: UseKeyboardShortcutsProps) {
  const lastNudgeTimeRef = useRef(0);

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

      // A — open command palette
      if (!mod && !event.altKey && !event.shiftKey && event.code === "KeyA") {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // Space — toggle all four panes together
      if (!mod && !event.altKey && event.code === "Space") {
        if (isPreviewModeRef.current) return;
        event.preventDefault();
        const shouldOpen = !(
          isSidebarOpenRef.current &&
          isInspectorOpenRef.current &&
          isTopNavOpenRef.current &&
          isBottomNavOpenRef.current
        );
        setIsSidebarOpen(shouldOpen);
        setIsInspectorOpen(shouldOpen);
        setIsTopNavOpen(shouldOpen);
        setIsBottomNavOpen(shouldOpen);
        return;
      }

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
          setSelectedPageId(getHomePageId(pagesRef.current, pageId));
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
        const activeLayout = layoutModeRef.current;
        setPages((prev) =>
          prev.map((p) => ({
            ...p,
            canvasFeatures: p.canvasFeatures.map((f) => {
              if (f.id !== featureId) return f;
              const resolvedFeature = resolveCanvasFeatureForLayout(f, activeLayout)?.feature ?? f;
              const nextX = event.key === "ArrowLeft"
                ? Math.max(0, resolvedFeature.x - step)
                : event.key === "ArrowRight"
                ? Math.min(100, resolvedFeature.x + step)
                : resolvedFeature.x;
              const nextY = event.key === "ArrowUp"
                ? Math.max(0, resolvedFeature.y - step)
                : event.key === "ArrowDown"
                ? Math.min(100, resolvedFeature.y + step)
                : resolvedFeature.y;
              return updateFeaturePositionForLayout(f, activeLayout, nextX, nextY, f.portraitZone);
            }),
          }))
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
