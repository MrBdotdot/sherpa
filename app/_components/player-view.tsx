"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { PageItem, SystemSettings } from "@/app/_lib/authoring-types";
import type { GuideStep } from "@/app/_lib/authoring-types";
import { getLocaleFeature, localizePages, parseLocaleLanguages } from "@/app/_lib/localization";
import { getFontThemeClass } from "@/app/_lib/font-theme";
import { CanvasBackground } from "@/app/_components/canvas/canvas-background";
import { HotspotPin } from "@/app/_components/canvas/hotspot-pin";
import { ContentModule } from "@/app/_components/canvas/content-module";
import { IntroScreen } from "@/app/_components/canvas/intro-screen";
import { FeaturePlacer } from "@/app/_components/canvas/preview-canvas-helpers";
import { GuidePanel } from "@/app/_components/canvas/guide-panel";

const NOOP = () => {};
const NOOP_PTR = () => {};

export function PlayerView({
  pages,
  systemSettings,
  hasBranding = false,
  gameId,
}: {
  pages: PageItem[];
  systemSettings: SystemSettings;
  hasBranding?: boolean;
  gameId: string;
}) {
  const introEnabled = !!(
    systemSettings.introScreen?.enabled && systemSettings.introScreen?.youtubeUrl
  );
  const [introVisible, setIntroVisible] = useState(introEnabled);

  const guides = systemSettings.guides ?? [];
  const navPosition = systemSettings.guideNavPosition ?? "left";

  const [isGuidedMode, setIsGuidedMode] = useState(guides.length > 0);
  const [activeGuideId, setActiveGuideId] = useState<string | null>(
    systemSettings.activeGuideId ?? guides[0]?.id ?? null
  );
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [highlightedHotspotId, setHighlightedHotspotId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState("");
  const localeFeature = useMemo(() => getLocaleFeature(pages), [pages]);
  const localeLanguages = useMemo(() => parseLocaleLanguages(localeFeature), [localeFeature]);
  const defaultLanguageCode = localeLanguages[0]?.code ?? "EN";
  const [activeLanguageCode, setActiveLanguageCode] = useState(defaultLanguageCode);
  const [modulePage, setModulePage] = useState<PageItem | null>(null);
  const [isModuleExiting, setIsModuleExiting] = useState(false);
  const modulePageRef = useRef<PageItem | null>(null);
  const isModuleExitingRef = useRef(false);
  const autoOpenFiredRef = useRef(false);
  const [navHistory, setNavHistory] = useState<Array<{ pageId: string; scrollTop: number }>>([]);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRestoreRef = useRef<number | null>(null);
  const previousDefaultLanguageRef = useRef(defaultLanguageCode);
  const posthog = usePostHog();
  const cardOpenTimeRef = useRef<number | null>(null);
  const localizedPages = useMemo(
    () => localizePages(pages, systemSettings.translations, activeLanguageCode, defaultLanguageCode),
    [activeLanguageCode, defaultLanguageCode, pages, systemSettings.translations]
  );

  const homePage = useMemo(
    () => localizedPages.find((p) => p.kind === "home") ?? null,
    [localizedPages]
  );

  const hotspotPages = useMemo(
    () => localizedPages.filter((p) => p.kind !== "home"),
    [localizedPages]
  );
  const features = useMemo(() => homePage?.canvasFeatures ?? [], [homePage]);
  const resolvedSelectedPageId =
    selectedPageId && localizedPages.some((page) => page.id === selectedPageId)
      ? selectedPageId
      : (homePage?.id ?? "");

  useEffect(() => {
    const availableCodes = new Set(localeLanguages.map((language) => language.code));
    const previousDefaultCode = previousDefaultLanguageRef.current;

    if (
      !activeLanguageCode ||
      !availableCodes.has(activeLanguageCode) ||
      activeLanguageCode === previousDefaultCode
    ) {
      setActiveLanguageCode(defaultLanguageCode);
    }

    previousDefaultLanguageRef.current = defaultLanguageCode;
  }, [activeLanguageCode, defaultLanguageCode, localeLanguages]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (!modulePageRef.current || isModuleExitingRef.current) return;
      event.preventDefault();
      isModuleExitingRef.current = true;
      setIsModuleExiting(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!modulePageRef.current || isModuleExitingRef.current) return;
    const nextModulePage = localizedPages.find((page) => page.id === modulePageRef.current?.id);
    if (!nextModulePage) return;
    modulePageRef.current = nextModulePage;
    setModulePage(nextModulePage);
  }, [localizedPages]);

  // Auto-open a card on every load when autoOpenPageId is set.
  useEffect(() => {
    if (autoOpenFiredRef.current) return;
    const targetId = systemSettings.autoOpenPageId;
    if (!targetId) return;
    const page = localizedPages.find((p) => p.id === targetId);
    if (!page) return;
    autoOpenFiredRef.current = true;
    modulePageRef.current = page;
    setModulePage(page);
    setSelectedPageId(targetId);
  // Only fires once on mount — intentionally excludes localizedPages from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localizedPages, systemSettings.autoOpenPageId]);

  useEffect(() => {
    if (pendingScrollRestoreRef.current === null) return;
    const target = pendingScrollRestoreRef.current;
    pendingScrollRestoreRef.current = null;
    requestAnimationFrame(() => {
      if (contentScrollRef.current) contentScrollRef.current.scrollTop = target;
    });
  }, [modulePage]);

  if (!homePage) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="text-xl font-semibold text-white">Experience not found</div>
          <div className="mt-2 text-sm text-neutral-500">
            This link may be invalid or the experience is not published.
          </div>
        </div>
      </div>
    );
  }

  function handleSelectPage(id: string) {
    const page = localizedPages.find((p) => p.id === id);
    if (!page || page.kind === "home") {
      handleDismissContent();
      return;
    }
    // Card-to-card: fire card_closed for the outgoing card before opening the new one
    if (cardOpenTimeRef.current !== null && modulePageRef.current && !isModuleExitingRef.current) {
      const durationSeconds = Math.round((Date.now() - cardOpenTimeRef.current) / 1000);
      posthog?.capture("card_closed", {
        gameId,
        cardId: modulePageRef.current.id,
        cardTitle: modulePageRef.current.title,
        durationSeconds,
      });
      cardOpenTimeRef.current = null;
    }
    if (modulePageRef.current && !isModuleExitingRef.current) {
      setNavHistory((prev) => [
        ...prev,
        { pageId: modulePageRef.current!.id, scrollTop: contentScrollRef.current?.scrollTop ?? 0 },
      ]);
    }
    posthog?.capture("card_viewed", { gameId, cardId: page.id, cardTitle: page.title });
    cardOpenTimeRef.current = Date.now();
    setSelectedPageId(id);
    modulePageRef.current = page;
    isModuleExitingRef.current = false;
    setModulePage(page);
    setIsModuleExiting(false);
  }

  function handleHotspotSelect(id: string) {
    const page = localizedPages.find((p) => p.id === id);
    if (page && page.kind !== "home") {
      posthog?.capture("hotspot_clicked", {
        gameId,
        hotspotId: id,
        hotspotTitle: page.title,
      });
    }
    handleSelectPage(id);
  }

  function handleNavigateBack() {
    const prev = navHistory[navHistory.length - 1];
    if (!prev) return;
    const page = localizedPages.find((p) => p.id === prev.pageId);
    if (!page) { setNavHistory((h) => h.slice(0, -1)); return; }
    // Fire card_closed for the card being left
    if (cardOpenTimeRef.current !== null && modulePageRef.current) {
      const durationSeconds = Math.round((Date.now() - cardOpenTimeRef.current) / 1000);
      posthog?.capture("card_closed", {
        gameId,
        cardId: modulePageRef.current.id,
        cardTitle: modulePageRef.current.title,
        durationSeconds,
      });
    }
    // Fire card_viewed for the card being navigated back to, stamp new open time
    posthog?.capture("card_viewed", { gameId, cardId: page.id, cardTitle: page.title });
    cardOpenTimeRef.current = Date.now();
    setNavHistory((h) => h.slice(0, -1));
    pendingScrollRestoreRef.current = prev.scrollTop;
    modulePageRef.current = page;
    isModuleExitingRef.current = false;
    setModulePage(page);
    setIsModuleExiting(false);
    setSelectedPageId(prev.pageId);
  }

  function handleDismissContent() {
    if (!modulePageRef.current || isModuleExitingRef.current) return;
    isModuleExitingRef.current = true;
    setIsModuleExiting(true);
    setHighlightedHotspotId(null);
    setNavHistory([]);
  }

  function handleModuleExitEnd() {
    if (cardOpenTimeRef.current !== null && modulePageRef.current) {
      const durationSeconds = Math.round((Date.now() - cardOpenTimeRef.current) / 1000);
      posthog?.capture("card_closed", {
        gameId,
        cardId: modulePageRef.current.id,
        cardTitle: modulePageRef.current.title,
        durationSeconds,
      });
      cardOpenTimeRef.current = null;
    }
    modulePageRef.current = null;
    isModuleExitingRef.current = false;
    setModulePage(null);
    setIsModuleExiting(false);
    setSelectedPageId(homePage?.id ?? "");
  }

  function handleLanguageChange(code: string) {
    if (code !== activeLanguageCode) {
      posthog?.capture("language_changed", {
        gameId,
        fromCode: activeLanguageCode,
        toCode: code,
      });
    }
    setActiveLanguageCode(code);
  }

  function handleStepActivate(step: GuideStep, index: number) {
    setActiveStepIndex(index);
    if (step.anchorHotspotId) setHighlightedHotspotId(step.anchorHotspotId);
    handleHotspotSelect(step.pageId);
  }

  const accentColor = systemSettings.accentColor || "";
  const fontThemeClass = getFontThemeClass(systemSettings.fontTheme);
  const surfaceStyleClass =
    systemSettings.surfaceStyle === "solid"
      ? "border-neutral-300 bg-white shadow-xl"
      : systemSettings.surfaceStyle === "contrast"
      ? "border-neutral-900/10 bg-neutral-950/95 text-white shadow-2xl"
      : "border-white/60 bg-white shadow-lg";

  const hotspotSize = systemSettings.hotspotSize ?? "medium";
  const hotspotContainerSize =
    hotspotSize === "small" ? "h-5 w-5" : hotspotSize === "large" ? "h-8 w-8" : "h-6 w-6";
  const hotspotDotSize =
    hotspotSize === "small" ? "h-2.5 w-2.5" : hotspotSize === "large" ? "h-5 w-5" : "h-3.5 w-3.5";
  const hotspotLabelSize =
    hotspotSize === "large" ? "text-xs px-2.5 py-1" : "text-[10px] px-2 py-0.5";
  const accentActiveStyle = accentColor
    ? { backgroundColor: accentColor, borderColor: accentColor }
    : {};
  const accentRingStyle = accentColor
    ? { boxShadow: `0 0 0 4px ${accentColor}25` }
    : {};

  if (introVisible && systemSettings.introScreen?.youtubeUrl) {
    return (
      <IntroScreen
        youtubeUrl={systemSettings.introScreen.youtubeUrl}
        pages={localizedPages}
        onStart={() => setIntroVisible(false)}
      />
    );
  }

  return (
    <div
      className="sherpa-player fixed inset-0 overflow-hidden bg-black"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        if (event.target !== event.currentTarget) return;
        handleDismissContent();
      }}
    >
      {systemSettings.customCss && (
        <style>{`.sherpa-player { ${systemSettings.customCss} }`}</style>
      )}
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <CanvasBackground heroImage={homePage.heroImage ?? ""} isPreviewMode={true} />
      </div>

      {/* Board features */}
      <div className="absolute inset-0">
        <FeaturePlacer
          features={features}
          isLayoutEditMode={false}
          accentColor={accentColor}
          fontThemeClass={fontThemeClass}
          surfaceStyleClass={surfaceStyleClass}
          pages={localizedPages}
          activeLanguageCode={activeLanguageCode}
          availableLanguages={localeLanguages}
          isPreviewMode
          onCanvasFeaturePointerDown={NOOP_PTR}
          onSelectCanvasFeature={NOOP}
          onLanguageChange={handleLanguageChange}
          onSelectPage={handleSelectPage}
          onSearch={(q) => posthog?.capture("search_performed", { gameId, query: q })}
        />
      </div>

      {/* Guide panel */}
      {guides.length > 0 && (
        <GuidePanel
          guide={guides.find(g => g.id === activeGuideId) ?? guides[0]}
          pages={localizedPages}
          navPosition={navPosition}
          activeStepIndex={activeStepIndex}
          isGuidedMode={isGuidedMode}
          onStepActivate={handleStepActivate}
          onCollapse={() => setIsGuidedMode(false)}
          onExpand={() => setIsGuidedMode(true)}
          guides={guides}
          activeGuideId={activeGuideId ?? guides[0]?.id ?? ""}
          onGuideChange={setActiveGuideId}
        />
      )}

      {/* Hotspot pins */}
      {hotspotPages.map((page, i) => (
        <HotspotPin
          key={page.id}
          page={page}
          index={i}
          isSelected={page.id === resolvedSelectedPageId}
          isHighlighted={page.id === highlightedHotspotId}
          isLayoutEditMode={false}
          isPreviewMode={true}
          accentColor={accentColor}
          fontThemeClass={fontThemeClass}
          hotspotContainerSize={hotspotContainerSize}
          hotspotDotSize={hotspotDotSize}
          hotspotLabelSize={hotspotLabelSize}
          accentActiveStyle={accentActiveStyle}
          accentRingStyle={accentRingStyle}
          onSelectPage={handleHotspotSelect}
          onHotspotPointerDown={NOOP_PTR}
          onDeleteHotspot={NOOP}
        />
      ))}

      {/* Content module */}
      {modulePage && (
        <ContentModule
          page={modulePage}
          pages={localizedPages}
          isExiting={isModuleExiting}
          onExitEnd={handleModuleExitEnd}
          systemSettings={systemSettings}
          accentColor={accentColor}
          isLayoutEditMode={false}
          isPreviewMode={true}
          onDismissContent={handleDismissContent}
          onNavigate={handleSelectPage}
          onNavigateBack={handleNavigateBack}
          canNavigateBack={navHistory.length > 0}
          scrollContainerRef={contentScrollRef}
          onContentCardPointerDown={NOOP_PTR}
        />
      )}

      {hasBranding && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2">
          <a
            href="https://sherpa.app"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm transition hover:bg-black/75"
            aria-label="Built with Sherpa"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
              <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Built with Sherpa
          </a>
        </div>
      )}
    </div>
  );
}
