"use client";

import { useMemo, useRef, useState } from "react";
import { PageItem, SystemSettings } from "@/app/_lib/authoring-types";
import { CanvasBackground } from "@/app/_components/canvas/canvas-background";
import { HotspotPin } from "@/app/_components/canvas/hotspot-pin";
import { ContentModule } from "@/app/_components/canvas/content-module";
import { IntroScreen } from "@/app/_components/canvas/intro-screen";
import { FeaturePlacer } from "@/app/_components/canvas/preview-canvas-helpers";

const NOOP = () => {};
const NOOP_PTR = () => {};

export function PlayerView({
  pages,
  systemSettings,
}: {
  pages: PageItem[];
  systemSettings: SystemSettings;
}) {
  const introEnabled = !!(
    systemSettings.introScreen?.enabled && systemSettings.introScreen?.youtubeUrl
  );
  const [introVisible, setIntroVisible] = useState(introEnabled);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [modulePage, setModulePage] = useState<PageItem | null>(null);
  const [isModuleExiting, setIsModuleExiting] = useState(false);
  const modulePageRef = useRef<PageItem | null>(null);
  const isModuleExitingRef = useRef(false);

  const homePage = useMemo(
    () =>
      pages.find((p) => p.kind === "home" && p.publishStatus === "published") ?? null,
    [pages]
  );

  const hotspotPages = useMemo(
    () => pages.filter((p) => p.kind !== "home" && p.publishStatus === "published"),
    [pages]
  );
  const features = useMemo(() => homePage?.canvasFeatures ?? [], [homePage]);
  const resolvedSelectedPageId =
    selectedPageId && pages.some((page) => page.id === selectedPageId)
      ? selectedPageId
      : (homePage?.id ?? "");

  if (!homePage) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="text-xl font-semibold text-white">Experience not found</div>
          <div className="mt-2 text-sm text-neutral-400">
            This link may be invalid or the experience is not published.
          </div>
        </div>
      </div>
    );
  }

  function handleSelectPage(id: string) {
    const page = pages.find((p) => p.id === id);
    if (!page || page.kind === "home") {
      handleDismissContent();
      return;
    }
    setSelectedPageId(id);
    modulePageRef.current = page;
    isModuleExitingRef.current = false;
    setModulePage(page);
    setIsModuleExiting(false);
  }

  function handleDismissContent() {
    if (!modulePageRef.current || isModuleExitingRef.current) return;
    isModuleExitingRef.current = true;
    setIsModuleExiting(true);
  }

  function handleModuleExitEnd() {
    modulePageRef.current = null;
    isModuleExitingRef.current = false;
    setModulePage(null);
    setIsModuleExiting(false);
    setSelectedPageId(homePage?.id ?? "");
  }

  const accentColor = systemSettings.accentColor || "";
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
        pages={pages}
        onStart={() => setIntroVisible(false)}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-black"
      onClick={handleDismissContent}
      onKeyDown={(event) => {
        if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleDismissContent();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={modulePage ? "Dismiss open rules content" : "Published rules experience"}
    >
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
          surfaceStyleClass={surfaceStyleClass}
          pages={pages}
          onCanvasFeaturePointerDown={NOOP_PTR}
          onSelectPage={handleSelectPage}
        />
      </div>

      {/* Hotspot pins */}
      {hotspotPages.map((page, i) => (
        <HotspotPin
          key={page.id}
          page={page}
          index={i}
          isSelected={page.id === resolvedSelectedPageId}
          isLayoutEditMode={false}
          isPreviewMode={true}
          accentColor={accentColor}
          hotspotContainerSize={hotspotContainerSize}
          hotspotDotSize={hotspotDotSize}
          hotspotLabelSize={hotspotLabelSize}
          accentActiveStyle={accentActiveStyle}
          accentRingStyle={accentRingStyle}
          onSelectPage={handleSelectPage}
          onHotspotPointerDown={NOOP_PTR}
          onDeleteHotspot={NOOP}
        />
      ))}

      {/* Content module */}
      {modulePage && (
        <ContentModule
          page={modulePage}
          pages={pages}
          isExiting={isModuleExiting}
          onExitEnd={handleModuleExitEnd}
          systemSettings={systemSettings}
          accentColor={accentColor}
          isLayoutEditMode={false}
          isPreviewMode={true}
          onDismissContent={handleDismissContent}
          onNavigate={handleSelectPage}
          onContentCardPointerDown={NOOP_PTR}
        />
      )}
    </div>
  );
}
