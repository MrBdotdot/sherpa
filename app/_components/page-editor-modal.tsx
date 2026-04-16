"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { PreviewCanvas } from "@/app/_components/preview-canvas";
import { OverviewTab } from "@/app/_components/editor/overview-tab";
import { SurfaceTab } from "@/app/_components/editor/surface-tab";
import { ContentTab } from "@/app/_components/editor/content-tab";
import { ExperienceTab } from "@/app/_components/editor/experience-tab";
import { GuideTab } from "@/app/_components/editor/guide-tab";
import {
  CanvasFeature,
  CanvasFeatureField,
  CanvasFeatureType,
  ContentBlock,
  ContentBlockType,
  DisplayStyleKey,
  Guide,
  InspectorTab,
  ImageFit,
  LayoutMode,
  PageButtonPlacement,
  PageItem,
  SystemSettings,
  TemplateId,
} from "@/app/_lib/authoring-types";
import { LocaleLanguage, collectTranslationRows, parseLocaleLanguages } from "@/app/_lib/localization";
import { getPageRoleDescription } from "@/app/_lib/label-utils";
import { useFocusTrap } from "@/app/_hooks/useFocusTrap";
import { SpreadsheetModal } from "@/app/_components/editor/locale-feature-editor";
import { SectionPicker } from "@/app/_components/editor/section-picker";

type PageEditorModalProps = {
  activePreviewPage: PageItem;
  hotspotPages: PageItem[];
  inspectorTab: InspectorTab;
  isOpen: boolean;
  isOverlay?: boolean;
  onAddCanvasFeature: (type: CanvasFeatureType) => void;
  onAddHotspot?: () => void;
  onAddBlock: (type: ContentBlockType) => void;
  onInsertBlock: (type: ContentBlockType, atIndex: number) => void;
  onAddSocialLink: () => void;
  isPortraitMode?: boolean;
  onCanvasFeatureChange: (
    featureId: string,
    field: CanvasFeatureField,
    value: string
  ) => void;
  onCanvasFeatureImageUpload: (
    featureId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  onCanvasFeatureVisibilityChange: (
    featureId: string,
    layoutMode: "mobile-landscape" | "mobile-portrait",
    visible: boolean
  ) => void;
  onLocaleLanguagesChange: (featureId: string, languages: LocaleLanguage[]) => void;
  onLocalePromoteLanguageToDefault: (
    featureId: string,
    languageCode: string,
    nextLanguages?: LocaleLanguage[]
  ) => void;
  onLocaleSourceTextChange: (key: string, value: string) => void;
  onLocaleTranslationChange: (key: string, languageCode: string, value: string) => void;
  onBlockChange: (blockId: string, value: string) => void;
  onReplaceBlocks: (newBlocks: ContentBlock[]) => void;
  onHotspotModeChange: (mode: "card" | "section") => void;
  onHotspotTargetChange: (targetPageId: string, targetSectionId: string) => void;
  onHotspotScrollSectionChange: (sectionId: string | undefined) => void;
  onBlockFitChange: (blockId: string, fit: ImageFit) => void;
  onBlockImageUpload: (blockId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onBlockVariantChange: (blockId: string, variant: ContentBlock["variant"]) => void;
  onClose: () => void;
  onCreatePageWithConfig: (config: { templateId: TemplateId | null; title: string; displayStyle: DisplayStyleKey; contentTintColor: string; contentTintOpacity: number }) => void;
  onCreatePageForButton: () => string;
  onDeleteRequest: () => void;
  onHeroUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onGameIconUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onModelUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onHotspotPointerDown: (
    event: React.PointerEvent<HTMLButtonElement>,
    page: PageItem
  ) => void;
  onDisplayStyleChange: (style: DisplayStyleKey) => void;
  onInspectorTabChange: (value: InspectorTab) => void;
  onMoveBlockDown: (blockId: string) => void;
  onMoveBlockUp: (blockId: string) => void;
  onReorderBlocks: (fromIndex: number, toIndex: number) => void;
  onPageButtonPlacementChange: (value: PageButtonPlacement) => void;
  onPageHeroUrlChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPublicUrlChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onContentTintChange: (color: string, opacity: number) => void;
  onBlockWidthChange: (blockId: string, width: "full" | "half") => void;
  onBlockTextAlignChange: (blockId: string, align: "left" | "center" | "right") => void;
  onBlockVerticalAlignChange: (blockId: string, align: "top" | "middle" | "bottom" | undefined) => void;
  onBlockFormatChange: (blockId: string, format: "prose" | "h2" | "h3" | "bullets" | "steps" | undefined) => void;
  onBlockImagePositionChange: (blockId: string, x: number, y: number) => void;
  onBlockPropsChange: (blockId: string, patch: Partial<ContentBlock>) => void;
  onQrToggle: () => void;
  onRemoveCanvasFeature: (featureId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onRemoveSocialLink: (socialId: string) => void;
  onResetPagePosition: () => void;
  onSelectPage: (id: string) => void;
  onSocialLinkChange: (
    socialId: string,
    field: "label" | "url" | "linkMode" | "linkPageId",
    value: string
  ) => void;
  onSystemSettingChange: <K extends keyof SystemSettings>(
    field: K,
    value: SystemSettings[K]
  ) => void;
  onTitleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenPage: (id: string) => void;
  onLanguageChange?: (languageCode: string) => void;
  selectedFeatureId: string | null;
  selectedPage: PageItem | null;
  selectedPageId: string;
  scrollToBlockId?: string | null;
  showCloseButton?: boolean;
  showPreview?: boolean;
  previewPages?: PageItem[];
  activeLanguageCode?: string;
  availableLanguages?: LocaleLanguage[];
  currentGameName: string;
  layoutMode: LayoutMode;
  localeFeature: CanvasFeature | null;
  surfacePreviewPage: PageItem;
  systemSettings: SystemSettings;
  pages: PageItem[];
  guides: Guide[];
  guideNavPosition: "left" | "top";
  onGuidesChange: (g: Guide[]) => void;
  onNavPositionChange: (pos: "left" | "top") => void;
  studioDarkMode?: boolean;
};

function getTabLabel(tab: InspectorTab, pageKind: PageItem["kind"]): string {
  void pageKind;
  if (tab === "overview") return "Content";
  if (tab === "board") return "Elements";
  if (tab === "settings") return "Settings";
  if (tab === "guide") return "Guide";
  return tab;
}

export function PageEditorModal({
  activePreviewPage,
  hotspotPages,
  inspectorTab,
  isOpen,
  isOverlay = true,
  onAddCanvasFeature,
  onAddHotspot,
  onAddBlock,
  onInsertBlock,
  onAddSocialLink,
  onCanvasFeatureChange,
  onCanvasFeatureImageUpload,
  onCanvasFeatureVisibilityChange,
  onLocaleLanguagesChange,
  onLocalePromoteLanguageToDefault,
  onLocaleSourceTextChange,
  onLocaleTranslationChange,
  onBlockChange,
  onReplaceBlocks,
  onHotspotModeChange,
  onHotspotTargetChange,
  onHotspotScrollSectionChange,
  onBlockFitChange,
  onBlockImageUpload,
  onBlockVariantChange,
  onClose,
  onCreatePageWithConfig,
  onCreatePageForButton,
  onDeleteRequest,
  onHeroUpload,
  onGameIconUpload,
  onModelUpload,
  onHotspotPointerDown,
  onDisplayStyleChange,
  onInspectorTabChange,
  onMoveBlockDown,
  onMoveBlockUp,
  onReorderBlocks,
  onPageButtonPlacementChange,
  onPageHeroUrlChange,
  onPublicUrlChange: _onPublicUrlChange,
  onContentTintChange,
  onBlockWidthChange,
  onBlockTextAlignChange,
  onBlockVerticalAlignChange,
  onBlockFormatChange,
  onBlockImagePositionChange,
  onBlockPropsChange,
  onQrToggle: _onQrToggle,
  onRemoveCanvasFeature,
  onRemoveBlock,
  onRemoveSocialLink,
  onResetPagePosition,
  onSelectPage,
  onSocialLinkChange,
  onSystemSettingChange,
  onTitleChange,
  isPortraitMode,
  onOpenPage,
  onLanguageChange,
  selectedFeatureId,
  selectedPage,
  selectedPageId,
  scrollToBlockId,
  showCloseButton = true,
  showPreview = true,
  previewPages,
  activeLanguageCode,
  availableLanguages,
  currentGameName,
  layoutMode,
  localeFeature,
  surfacePreviewPage,
  systemSettings,
  pages,
  guides,
  guideNavPosition,
  onGuidesChange,
  onNavPositionChange,
  studioDarkMode = false,
}: PageEditorModalProps) {
  const dk = studioDarkMode;

  const scrollRef = useRef<HTMLDivElement>(null);
  const panelBg   = dk ? "bg-neutral-900"    : "bg-[#fcfaf7]";
  const panelBord = dk ? "border-neutral-700" : "border-[#e7dfd2]";
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen && isOverlay);
  void _onPublicUrlChange;
  void _onQrToggle;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingSectionSwitch, setPendingSectionSwitch] = useState(false);
  const sheetRows = useMemo(() => collectTranslationRows(pages), [pages]);
  const sheetLanguages = useMemo(
    () => (localeFeature ? parseLocaleLanguages(localeFeature) : []),
    [localeFeature]
  );

  if (!isOpen || !selectedPage) {
    return null;
  }

  const titleId = `editor-title-${selectedPage.id}`;
  const boardBadge = selectedPage.canvasFeatures.length;
  const settingsBadge = 0;
  const visibleTabs: InspectorTab[] =
    selectedPage.kind === "home"
      ? ["overview", "board", "settings", "guide"]
      : ["overview", "board", "settings"];
  const activeTab: InspectorTab =
    inspectorTab === "settings" ? "settings"
    : inspectorTab === "board" ? "board"
    : inspectorTab === "guide" && selectedPage.kind === "home" ? "guide"
    : "overview";

  const panelContent = (
    <div
      ref={dialogRef}
      role={isOverlay ? "dialog" : undefined}
      aria-modal={isOverlay ? "true" : undefined}
      aria-labelledby={isOverlay ? titleId : undefined}
      className={`flex min-h-0 w-full flex-col overflow-hidden ${
        isOverlay
          ? "h-[90vh] max-w-6xl rounded-3xl bg-neutral-50 shadow-2xl"
          : `h-full ${panelBg}`
      }`}
    >
      {/* Tabs */}
      <div className={`border-b ${isOverlay ? `border-neutral-200 bg-white` : `${panelBord} ${panelBg}`}`}>
        <div role="tablist" aria-label="Inspector tabs" className="flex px-1">
          {visibleTabs.map((tab) => {
            const badge =
              tab === "board" ? boardBadge
              : tab === "settings" ? settingsBadge
              : 0;
            const panelId = `inspector-panel-${tab}`;
            return (
              <button
                key={tab}
                role="tab"
                id={`inspector-tab-${tab}`}
                aria-selected={activeTab === tab}
                aria-controls={panelId}
                type="button"
                onClick={() => onInspectorTabChange(tab)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-medium transition ${
                  activeTab === tab
                    ? "border-[#3B82F6] text-[var(--color-primary-text)]"
                    : dk
                    ? "border-transparent text-neutral-500 hover:text-neutral-200"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {getTabLabel(tab, selectedPage.kind)}
                {badge > 0 ? (
                  <span
                    aria-label={`${badge} item${badge !== 1 ? "s" : ""}`}
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                      activeTab === tab
                        ? "bg-[#3B82F6]/10 text-[var(--color-primary-text)]"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Header */}
      <div
        className={`flex items-center justify-between gap-4 border-b px-5 py-4 ${
          isOverlay ? `border-neutral-200 bg-white` : `${panelBord} ${panelBg}`
        }`}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor={titleId} className="sr-only">Card name</label>
          <div className="flex items-center gap-2">
            <input
              id={titleId}
              type="text"
              value={selectedPage.title}
              onChange={onTitleChange}
              placeholder="Card name"
              className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25"
            />
            {selectedPage.kind !== "home" ? (
              <button
                type="button"
                onClick={onDeleteRequest}
                aria-label="Delete card"
                className="shrink-0 flex items-center justify-center rounded-xl border border-red-200 p-2 text-red-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M4 3.5l.7 7.5a1 1 0 001 .9h2.6a1 1 0 001-.9L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {getPageRoleDescription(selectedPage.kind)}
          </div>
        </div>

        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className="shrink-0 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Close
          </button>
        ) : null}
      </div>

      {/* Body */}
      <div className={`grid min-h-0 flex-1 gap-0 ${showPreview ? "lg:grid-cols-[1.15fr_0.85fr]" : ""}`}>
        <div
          ref={scrollRef}
          key={selectedPage.id}
          role="tabpanel"
          id={`inspector-panel-${activeTab}`}
          aria-labelledby={`inspector-tab-${activeTab}`}
          className={`min-h-0 overflow-y-auto inspector-content-in ${
            isOverlay ? "bg-neutral-50" : panelBg
          } ${showPreview ? `border-r ${panelBord}` : ""}`}
        >
          {activeTab === "overview" ? (
            <>
              <OverviewTab
                onContentTintChange={onContentTintChange}
                onDisplayStyleChange={onDisplayStyleChange}
                onHeroUpload={onHeroUpload}
                onModelUpload={onModelUpload}
                onPageButtonPlacementChange={onPageButtonPlacementChange}
                onPageHeroUrlChange={onPageHeroUrlChange}
                onResetPagePosition={onResetPagePosition}
                onSystemSettingChange={onSystemSettingChange}
                selectedPage={selectedPage}
                systemSettings={systemSettings}
              />
              {selectedPage.kind === "hotspot" ? (
                <div className="border-t border-neutral-200 px-5 py-4 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Hotspot behavior</div>
                  <div className="flex items-center rounded-xl border border-neutral-200 bg-neutral-100 p-0.5">
                    {(["card", "section"] as const).map((mode) => {
                      const isActive = (!selectedPage.hotspotMode || selectedPage.hotspotMode === "card" ? "card" : "section") === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => {
                            if (mode === "section") {
                              const hasContent = selectedPage.blocks.length > 0 || selectedPage.summary.trim().length > 0;
                              if (hasContent) {
                                setPendingSectionSwitch(true);
                              } else {
                                onHotspotModeChange("section");
                              }
                            } else {
                              onHotspotModeChange("card");
                            }
                          }}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                            isActive ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-600"
                          }`}
                        >
                          {mode === "card" ? "Opens card" : "Goes to section"}
                        </button>
                      );
                    })}
                  </div>
                  {pendingSectionSwitch ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                      <p className="text-xs leading-5 text-amber-800">
                        This will convert the hotspot into an anchor pin and remove its card content. Continue?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { onHotspotModeChange("section"); setPendingSectionSwitch(false); }}
                          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                        >
                          Yes, convert
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingSectionSwitch(false)}
                          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {(!selectedPage.hotspotMode || selectedPage.hotspotMode === "card") ? (() => {
                    const cardSections = selectedPage.blocks.filter(
                      (b) => b.type === "section" || b.blockFormat === "h2" || b.blockFormat === "h3"
                    );
                    if (cardSections.length === 0) return null;
                    const current = cardSections.find((s) => s.id === selectedPage.hotspotScrollSectionId);
                    return (
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Jump to section</div>
                        <div className="overflow-hidden rounded-xl border border-neutral-200">
                          {current ? (
                            <div className="flex items-center justify-between px-3 py-2.5">
                              <span className="text-sm font-medium text-neutral-800">{current.value}</span>
                              <button
                                type="button"
                                onClick={() => onHotspotScrollSectionChange(undefined)}
                                className="text-xs text-neutral-500 hover:text-neutral-700"
                              >
                                Clear
                              </button>
                            </div>
                          ) : (
                            <ul className="max-h-48 overflow-y-auto p-1">
                              {cardSections.map((s) => (
                                <li key={s.id}>
                                  <button
                                    type="button"
                                    onClick={() => onHotspotScrollSectionChange(s.id)}
                                    className="w-full rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-neutral-50"
                                  >
                                    <div className="truncate font-medium text-neutral-800">{s.value}</div>
                                    <div className="text-xs capitalize text-neutral-500">
                                      {s.type === "section" ? "Section" : s.blockFormat === "h2" ? "H2" : "H3"}
                                    </div>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })() : null}
                  {selectedPage.hotspotMode === "section" ? (
                    <SectionPicker
                      pages={pages}
                      targetPageId={selectedPage.hotspotTargetPageId ?? ""}
                      targetSectionId={selectedPage.hotspotTargetSectionId ?? ""}
                      onSelect={(pageId, sectionId) => onHotspotTargetChange(pageId, sectionId)}
                    />
                  ) : null}
                </div>
              ) : null}
              {selectedPage.kind !== "home" && selectedPage.hotspotMode !== "section" ? (
                <ContentTab
                  scrollToBlockId={scrollToBlockId}
                  onContentTintChange={onContentTintChange}
                  onBlockWidthChange={onBlockWidthChange}
                  onBlockTextAlignChange={onBlockTextAlignChange}
                  onBlockVerticalAlignChange={onBlockVerticalAlignChange}
                  onBlockFormatChange={onBlockFormatChange}
                  onAddBlock={onAddBlock}
                  onInsertBlock={onInsertBlock}
                  onAddSocialLink={onAddSocialLink}
                  onBlockChange={onBlockChange}
                  onReplaceBlocks={onReplaceBlocks}
                  onBlockFitChange={onBlockFitChange}
                  onBlockImagePositionChange={onBlockImagePositionChange}
                  onBlockPropsChange={onBlockPropsChange}
                  onBlockImageUpload={onBlockImageUpload}
                  onBlockVariantChange={onBlockVariantChange}
                  onDisplayStyleChange={onDisplayStyleChange}
                  onMoveBlockDown={onMoveBlockDown}
                  onMoveBlockUp={onMoveBlockUp}
                  onReorderBlocks={onReorderBlocks}
                  onRemoveBlock={onRemoveBlock}
                  onRemoveSocialLink={onRemoveSocialLink}
                  onSocialLinkChange={onSocialLinkChange}
                  pages={pages}
                  selectedPage={selectedPage}
                />
              ) : null}
            </>
          ) : activeTab === "board" ? (
            <SurfaceTab
              layoutMode={layoutMode}
              onAddHotspot={onAddHotspot ?? (() => {})}
              onAddCanvasFeature={onAddCanvasFeature}
              onCanvasFeatureChange={onCanvasFeatureChange}
              onCanvasFeatureImageUpload={onCanvasFeatureImageUpload}
              onCanvasFeatureVisibilityChange={onCanvasFeatureVisibilityChange}
              onCreatePageForButton={onCreatePageForButton}
              onOpenPage={onOpenPage}
              onOpenSpreadsheet={() => setSheetOpen(true)}
              onRemoveCanvasFeature={onRemoveCanvasFeature}
              pages={pages}
              selectedFeatureId={selectedFeatureId}
              selectedPage={selectedPage}
              isPortraitMode={isPortraitMode}
              brandColors={systemSettings.brandColors ?? []}
            />
          ) : activeTab === "guide" ? (
            <GuideTab
              guides={guides}
              pages={pages}
              navPosition={guideNavPosition}
              onGuidesChange={onGuidesChange}
              onNavPositionChange={onNavPositionChange}
            />
          ) : (
            <ExperienceTab
              currentGameName={currentGameName}
              localeFeature={localeFeature}
              onGameIconUpload={onGameIconUpload}
              onLocaleLanguagesChange={onLocaleLanguagesChange}
              onLocalePromoteLanguageToDefault={onLocalePromoteLanguageToDefault}
              onLocaleSourceTextChange={onLocaleSourceTextChange}
              onLocaleTranslationChange={onLocaleTranslationChange}
              onOpenSpreadsheet={() => setSheetOpen(true)}
              onSystemSettingChange={onSystemSettingChange}
              pages={pages}
              systemSettings={systemSettings}
            />
          )}
        </div>

        {showPreview ? (
          <div className="min-h-0 overflow-y-auto bg-white p-6">
            <div className="mb-4 text-sm font-medium text-neutral-800">Preview</div>
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
              <PreviewCanvas
                activePage={activePreviewPage}
                surfacePage={surfacePreviewPage}
                pages={previewPages}
                contentDragState={null}
                featureDragState={null}
                snapActive={false}
                hotspotPages={hotspotPages}
                layoutMode={layoutMode}
                systemSettings={systemSettings}
                activeLanguageCode={activeLanguageCode}
                availableLanguages={availableLanguages}
                showLayoutHelp={false}
                isPreviewMode={false}
                experienceStatus="draft"
                onExperienceStatusChange={() => {}}
                onCanvasClick={() => {}}
                onCanvasFeaturePointerDown={() => {}}
                onSelectCanvasFeature={() => {}}
                onContentCardPointerDown={() => {}}
                onDeleteHotspot={() => {}}
                onDismissContent={() => {}}
                onDismissLayoutHelp={() => {}}
                onHotspotPointerDown={onHotspotPointerDown}
                onLanguageChange={onLanguageChange}
                onSelectPage={onSelectPage}
                onSetLayoutMode={() => {}}
                onTogglePreviewMode={() => {}}
                selectedPageId={selectedPageId}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const spreadsheet = sheetOpen && localeFeature ? (
    <SpreadsheetModal
      rows={sheetRows}
      languages={sheetLanguages}
      translations={systemSettings.translations}
      onClose={() => setSheetOpen(false)}
      onLanguagesChange={(nextLanguages) => onLocaleLanguagesChange(localeFeature.id, nextLanguages)}
      onPromoteLanguageToDefault={(languageCode) => {
        const promoted = sheetLanguages.find((l) => l.code === languageCode);
        if (!promoted) return;
        const next = [promoted, ...sheetLanguages.filter((l) => l.code !== languageCode)];
        onLocalePromoteLanguageToDefault(localeFeature.id, languageCode, next);
      }}
      onRemoveLanguage={(languageCode) =>
        onLocaleLanguagesChange(localeFeature.id, sheetLanguages.filter((l) => l.code !== languageCode))
      }
      onSourceTextChange={onLocaleSourceTextChange}
      onTranslationChange={onLocaleTranslationChange}
    />
  ) : null;

  if (!isOverlay) {
    return <>{panelContent}{spreadsheet}</>;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      >
        {panelContent}
      </div>
      {spreadsheet}
    </>
  );
}
