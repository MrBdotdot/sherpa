"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { InspectorTab, PageItem, SystemSettings } from "@/app/_lib/authoring-types";
import {
  createInitialPages,
  getHomePageId,
} from "@/app/_lib/authoring-utils";
import {
  ensureUniquePageIds,
  loadPersistedState,
  migrateLocaleFeature,
  migratePageButtons,
  migrateResponsiveBoardFeatures,
  sanitizePagesForPersistence,
  sanitizeSystemSettingsForPersistence,
} from "@/app/_lib/authoring-studio-utils";
import { loadGame, saveGame } from "@/app/_lib/supabase-game";
import { shouldShowOnboarding } from "@/app/_components/onboarding-modal";

const STORAGE_KEY = "sherpa-v2";

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  fontTheme: "modern",
  surfaceStyle: "glass",
  accentColor: "",
  defaultLanguageCode: "EN",
  gameIcon: "",
  hotspotSize: "medium",
  modelEnvironment: "studio",
};

type UseGameLoaderProps = {
  pages: PageItem[];
  setPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
  systemSettings: SystemSettings;
  setSystemSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  setSelectedPageId: (id: string) => void;
  setSelectedFeatureId: (id: string | null) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setIsContentModalOpen: (v: boolean) => void;
  setShowOnboarding: (v: boolean) => void;
  userId: string;
  gameIdFromUrl: string | null;
};

export function useGameLoader({
  pages,
  setPages,
  systemSettings,
  setSystemSettings,
  setSelectedPageId,
  setSelectedFeatureId,
  setInspectorTab,
  setIsContentModalOpen,
  setShowOnboarding,
  userId,
  gameIdFromUrl,
}: UseGameLoaderProps) {
  const router = useRouter();
  const [currentGameId, setCurrentGameId] = useState(gameIdFromUrl ?? userId);
  const [currentGameName, setCurrentGameName] = useState("Untitled Game");
  const [currentStudioName, setCurrentStudioName] = useState("Bee Studio");
  const [hydrated, setHydrated] = useState(false);
  const [hasLoadedInitialState, setHasLoadedInitialState] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep browser URL in sync with active game
  useEffect(() => {
    if (currentGameId) {
      router.replace(`/?game=${currentGameId}`, { scroll: false });
    }
  }, [currentGameId, router]);

  // Load: try Supabase first, fall back to localStorage
  useEffect(() => {
    if (hydrated) return;
    setHydrated(true);
    let cancelled = false;

    async function load() {
      const applyLoadedPages = (nextPages: PageItem[]) =>
        migrateResponsiveBoardFeatures(
          migrateLocaleFeature(migratePageButtons(ensureUniquePageIds(nextPages)))
        );

      try {
        const remote = await loadGame(currentGameId);
        if (cancelled) return;
        if (remote) {
          const loaded = applyLoadedPages(remote.pages);
          setPages(
            loaded.length > 0
              ? loaded
              : createInitialPages({
                  defaultLanguageCode: remote.systemSettings?.defaultLanguageCode ?? "EN",
                  gameName: remote.gameTitle || "Untitled Game",
                })
          );
          if (remote.systemSettings) {
            setSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, ...remote.systemSettings });
          }
          if (remote.gameTitle) setCurrentGameName(remote.gameTitle);
          return;
        } else {
          const persisted = loadPersistedState();
          if (persisted) {
            if (persisted.pages) setPages(applyLoadedPages(persisted.pages));
            if (persisted.systemSettings) {
              setSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, ...persisted.systemSettings });
            }
          }
          return;
        }
      } catch { /* network unavailable — fall through */ }

      const persisted = loadPersistedState();
      if (persisted) {
        if (persisted.pages) setPages(applyLoadedPages(persisted.pages));
        if (persisted.systemSettings) {
          setSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, ...persisted.systemSettings });
        }
      }
    }

    load().finally(() => {
      if (!cancelled) setHasLoadedInitialState(true);
    });

    if (shouldShowOnboarding()) setShowOnboarding(true);

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist: localStorage immediately + Supabase debounced
  useEffect(() => {
    if (!hasLoadedInitialState) return;

    const persistablePages = sanitizePagesForPersistence(pages);
    const persistableSystemSettings = sanitizeSystemSettingsForPersistence(systemSettings);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ pages: persistablePages, systemSettings: persistableSystemSettings })
      );
    } catch { /* quota exceeded — fail silently */ }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveState("saving");
      saveGame(currentGameId, userId, currentGameName, persistablePages, persistableSystemSettings)
        .then(() => {
          setSaveState("saved");
          if (savedResetRef.current) clearTimeout(savedResetRef.current);
          savedResetRef.current = setTimeout(() => setSaveState("idle"), 2000);
        })
        .catch((err) => { console.error("[saveGame]", err); setSaveState("error"); });
    }, 2000);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [pages, systemSettings, currentGameId, currentGameName, hasLoadedInitialState, userId]);

  const switchToGame = useCallback((id: string, name: string, studio?: string) => {
    if (studio) setCurrentStudioName(studio);

    loadGame(id).then((remote) => {
      if (remote) {
        const loaded = migrateResponsiveBoardFeatures(
          migrateLocaleFeature(migratePageButtons(ensureUniquePageIds(remote.pages)))
        );
        const nextPages = loaded.length > 0
          ? loaded
          : createInitialPages({
              defaultLanguageCode: remote.systemSettings?.defaultLanguageCode ?? "EN",
              gameName: remote.gameTitle || name,
            });
        setPages(nextPages);
        setSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, ...(remote.systemSettings ?? {}) });
        setSelectedPageId(getHomePageId(nextPages, id));
      } else {
        const nextPages = createInitialPages({ gameName: name });
        setPages(nextPages);
        setSystemSettings(DEFAULT_SYSTEM_SETTINGS);
        setSelectedPageId(getHomePageId(nextPages, id));
      }

      setSelectedFeatureId(null);
      setInspectorTab("overview");
      setIsContentModalOpen(false);
      setCurrentGameId(id);
      setCurrentGameName(name);
      setSaveState("idle");
    }).catch(() => { /* stay on current state */ });
  }, [setIsContentModalOpen, setInspectorTab, setPages, setSelectedFeatureId, setSelectedPageId, setSystemSettings]);

  const openFreshWorkspace = useCallback(() => {
    const nextGameId = crypto.randomUUID();
    const nextPages = createInitialPages();

    setPages(nextPages);
    setSystemSettings(DEFAULT_SYSTEM_SETTINGS);
    setSelectedPageId(getHomePageId(nextPages, nextGameId));
    setSelectedFeatureId(null);
    setInspectorTab("overview");
    setIsContentModalOpen(false);
    setCurrentGameId(nextGameId);
    setCurrentGameName("Untitled Game");
    setSaveState("idle");
  }, [setIsContentModalOpen, setInspectorTab, setPages, setSelectedFeatureId, setSelectedPageId, setSystemSettings]);

  const onRenameGame = useCallback((name: string) => {
    setCurrentGameName(name);
    setPages((prev) => prev.map((p) => p.kind === "home" ? { ...p, title: name } : p));
  }, [setPages]);

  return {
    currentGameId,
    currentGameName,
    setCurrentGameName,
    currentStudioName,
    setCurrentStudioName,
    hasLoadedInitialState,
    saveState,
    switchToGame,
    openFreshWorkspace,
    onRenameGame,
  };
}
