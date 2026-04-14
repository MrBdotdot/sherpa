"use client";

import { ChangeEvent, useEffect, useRef } from "react";

import { PreviewCanvas } from "@/app/_components/preview-canvas";
import { OverviewTab } from "@/app/_components/editor/overview-tab";
import { SurfaceTab } from "@/app/_components/editor/surface-tab";
import { ContentTab } from "@/app/_components/editor/content-tab";
import { ExperienceTab } from "@/app/_components/editor/experience-tab";
import {
  CanvasFeature,
  CanvasFeatureField,
  CanvasFeatureType,
  ContentBlock,
  ContentBlockType,
  DisplayStyleKey,
  InspectorTab,
  ImageFit,
  LayoutMode,
  PageButtonPlacement,
  PageItem,
  SystemSettings,
  TemplateId,
} from "@/app/_lib/authoring-types";
import { LocaleLanguage } from "@/app/_lib/localization";
import { getPageRoleDescription } from "@/app/_lib/label-utils";
import { useFocusTrap } from "@/app/_hooks/useFocusTrap";

type PageEditorModalProps = {
  activePreviewPage: PageItem;
  hotspotPages: PageItem[];
  inspectorTab: InspectorTab;
  isOpen: boolean;
  isOverlay?: boolean;
  onAddCanvasFeature: (type: CanvasFeatureType) => void;
  onAddBlock: (type: ContentBlockType) => void;
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
  onBlockFitChange: (blockId: string, fit: ImageFit) => void;
  onBlockImageUpload: (blockId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onBlockVariantChange: (blockId: string, variant: ContentBlock["variant"]) => void;
  onClose: () => void;
  onCreatePageWithConfig: (config: { templateId: TemplateId | null; title: string; displayStyle: DisplayStyleKey; contentTintColor: string; contentTintOpacity: number }) => void;
  onCreatePageForButton: () => string;
  onDeleteRequest: () => void;
  onHeroUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onGameIconUpload: (event: ChangeEvent<HTMLInputElement>) => void;
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
  onBggImport: (data: { name: string; complexity: number; bggId: string }) => void;
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
  studioDarkMode?: boolean;
};

function getTabLabel(tab: InspectorTab, pageKind: PageItem["kind"]): string {
  if (tab === "overview") return pageKind === "home" ? "Board" : "Card";
  if (tab === "board") return "Hotspots";
  if (tab === "experience") return "Game";
  return "Content";
}

export function PageEditorModal({
  activePreviewPage,
  hotspotPages,
  inspectorTab,
  isOpen,
  isOverlay = true,
  onAddCanvasFeature,
  onAddBlock,
  onAddSocialLink,
  onCanvasFeatureChange,
  onCanvasFeatureImageUpload,
  onCanvasFeatureVisibilityChange,
  onLocaleLanguagesChange,
  onLocalePromoteLanguageToDefault,
  onLocaleSourceTextChange,
  onLocaleTranslationChange,
  onBlockChange,
  onBlockFitChange,
  onBlockImageUpload,
  onBlockVariantChange,
  onClose,
  onCreatePageWithConfig,
  onCreatePageForButton,
  onDeleteRequest,
  onHeroUpload,
  onGameIconUpload,
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
  onBggImport,
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
  studioDarkMode = false,
}: PageEditorModalProps) {
  const dk = studioDarkMode;

  const scrollRef = useRef<HTMLDivElement>(null);
  const panelBg   = dk ? "bg-neutral-900"    : "bg-[#fcfaf7]";
  const panelBord = dk ? "border-neutral-700" : "border-[#e7dfd2]";
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen && isOverlay);
  void _onPublicUrlChange;
  void _onQrToggle;

  if (!isOpen || !selectedPage) {
    return null;
  }

  const titleId = `editor-title-${selectedPage.id}`;
  const boardBadge = selectedPage.canvasFeatures.length;
  const contentBadge = selectedPage.blocks.length + selectedPage.socialLinks.length;
  const experienceBadge = availableLanguages?.length ?? 0;
  const visibleTabs: InspectorTab[] = ["overview", "content", "board", "experience"];
  const activeTab: InspectorTab =
    selectedPage.kind === "home" && inspectorTab === "content" ? "overview" : inspectorTab;

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
            const isDisabled = selectedPage.kind === "home" && tab === "content";
            const badge =
              tab === "board" ? boardBadge
              : tab === "content" ? contentBadge
              : tab === "experience" ? experienceBadge
              : 0;
            const panelId = `inspector-panel-${tab}`;
            if (isDisabled) {
              return (
                <button
                  key={tab}
                  type="button"
                  disabled
                  title="The board does not use content blocks. Add hotspots or card buttons to link players to cards."
                  className="-mb-px flex items-center gap-1.5 border-b-2 border-transparent px-4 py-3 text-xs font-medium text-neutral-300 cursor-not-allowed select-none"
                >
                  {getTabLabel(tab, selectedPage.kind)}
                </button>
              );
            }
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
                    ? "border-[#3B82F6] text-[#3B82F6]"
                    : dk
                    ? "border-transparent text-neutral-400 hover:text-neutral-200"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {getTabLabel(tab, selectedPage.kind)}
                {badge > 0 ? (
                  <span
                    aria-label={`${badge} item${badge !== 1 ? "s" : ""}`}
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                      activeTab === tab
                        ? "bg-[#3B82F6]/10 text-[#3B82F6]"
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
              className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10"
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
          <div className="mt-1 text-xs text-neutral-400">
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
            <OverviewTab
              onContentTintChange={onContentTintChange}
              onDisplayStyleChange={onDisplayStyleChange}
              onHeroUpload={onHeroUpload}
              onPageButtonPlacementChange={onPageButtonPlacementChange}
              onPageHeroUrlChange={onPageHeroUrlChange}
              onResetPagePosition={onResetPagePosition}
              onSystemSettingChange={onSystemSettingChange}
              selectedPage={selectedPage}
              systemSettings={systemSettings}
            />
          ) : activeTab === "board" ? (
            <SurfaceTab
              layoutMode={layoutMode}
              onAddCanvasFeature={onAddCanvasFeature}
              onCanvasFeatureChange={onCanvasFeatureChange}
              onCanvasFeatureImageUpload={onCanvasFeatureImageUpload}
              onCanvasFeatureVisibilityChange={onCanvasFeatureVisibilityChange}
              onCreatePageForButton={onCreatePageForButton}
              onOpenPage={onOpenPage}
              onRemoveCanvasFeature={onRemoveCanvasFeature}
              pages={pages}
              selectedFeatureId={selectedFeatureId}
              selectedPage={selectedPage}
              isPortraitMode={isPortraitMode}
              brandColors={systemSettings.brandColors ?? []}
            />
          ) : activeTab === "content" ? (
            <ContentTab
              scrollToBlockId={scrollToBlockId}
              onContentTintChange={onContentTintChange}
              onBlockWidthChange={onBlockWidthChange}
              onBlockTextAlignChange={onBlockTextAlignChange}
              onBlockVerticalAlignChange={onBlockVerticalAlignChange}
              onBlockFormatChange={onBlockFormatChange}
              onAddBlock={onAddBlock}
              onAddSocialLink={onAddSocialLink}
              onBlockChange={onBlockChange}
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
          ) : (
            <ExperienceTab
              currentGameName={currentGameName}
              localeFeature={localeFeature}
              onGameIconUpload={onGameIconUpload}
              onLocaleLanguagesChange={onLocaleLanguagesChange}
              onLocalePromoteLanguageToDefault={onLocalePromoteLanguageToDefault}
              onLocaleSourceTextChange={onLocaleSourceTextChange}
              onLocaleTranslationChange={onLocaleTranslationChange}
              onSystemSettingChange={onSystemSettingChange}
              onBggImport={onBggImport}
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

  if (!isOverlay) {
    return panelContent;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      {panelContent}
    </div>
  );
}
