"use client";

import { ChangeEvent } from "react";

import { PreviewCanvas } from "@/app/_components/preview-canvas";
import { SurfaceTab } from "@/app/_components/editor/surface-tab";
import { ContentTab } from "@/app/_components/editor/content-tab";
import { SetupTab } from "@/app/_components/editor/setup-tab";
import {
  CanvasFeatureField,
  CanvasFeatureType,
  ContentBlock,
  ContentBlockType,
  DisplayStyleKey,
  ImageFit,
  PageButtonPlacement,
  PageItem,
  PublishStatus,
  SystemSettings,
  TemplateId,
} from "@/app/_lib/authoring-types";
import { getPageRoleDescription } from "@/app/_lib/label-utils";
import { useFocusTrap } from "@/app/_hooks/useFocusTrap";

type InspectorTab = "surface" | "content" | "setup";

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
  onBlockChange: (blockId: string, value: string) => void;
  onBlockFitChange: (blockId: string, fit: ImageFit) => void;
  onBlockImageUpload: (blockId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onBlockVariantChange: (blockId: string, variant: ContentBlock["variant"]) => void;
  onClose: () => void;
  onCreatePageWithConfig: (config: { templateId: TemplateId | null; title: string; displayStyle: DisplayStyleKey; contentTintColor: string; contentTintOpacity: number }) => void;
  onCreatePageForButton: () => string;
  onDeleteRequest: () => void;
  onHeroUpload: (event: ChangeEvent<HTMLInputElement>) => void;
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
  onPublishStatusChange: (value: PublishStatus) => void;
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
  selectedFeatureId: string | null;
  selectedPage: PageItem | null;
  selectedPageId: string;
  scrollToBlockId?: string | null;
  showCloseButton?: boolean;
  showPreview?: boolean;
  surfacePreviewPage: PageItem;
  systemSettings: SystemSettings;
  pages: PageItem[];
  studioDarkMode?: boolean;
};

const TAB_LABELS: Record<InspectorTab, string> = {
  surface: "Board",
  content: "Card",
  setup: "Settings",
};

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
  onBlockChange,
  onBlockFitChange,
  onBlockImageUpload,
  onBlockVariantChange,
  onClose,
  onCreatePageWithConfig,
  onCreatePageForButton,
  onDeleteRequest,
  onHeroUpload,
  onHotspotPointerDown,
  onDisplayStyleChange,
  onInspectorTabChange,
  onMoveBlockDown,
  onMoveBlockUp,
  onReorderBlocks,
  onPageButtonPlacementChange,
  onPageHeroUrlChange,
  onPublicUrlChange: _onPublicUrlChange,
  onPublishStatusChange: _onPublishStatusChange,
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
  selectedFeatureId,
  selectedPage,
  selectedPageId,
  scrollToBlockId,
  showCloseButton = true,
  showPreview = true,
  surfacePreviewPage,
  systemSettings,
  pages,
  studioDarkMode = false,
}: PageEditorModalProps) {
  const dk = studioDarkMode;
  const panelBg   = dk ? "bg-neutral-900"    : "bg-[#fcfaf7]";
  const panelBord = dk ? "border-neutral-700" : "border-[#e7dfd2]";
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen && isOverlay);
  void _onPublicUrlChange;
  void _onPublishStatusChange;
  void _onQrToggle;

  if (!isOpen || !selectedPage) {
    return null;
  }

  const titleId = `editor-title-${selectedPage.id}`;
  const surfaceBadge = selectedPage.canvasFeatures.length;
  const contentBadge = selectedPage.blocks.length + selectedPage.socialLinks.length;
  // Content → Canvas → Settings for all pages; home page disables Content (no content blocks on landing)
  const visibleTabs: InspectorTab[] = ["content", "surface", "setup"];
  // If the home page is selected and the content tab is somehow active, fall back to surface
  const activeTab: InspectorTab =
    selectedPage.kind === "home" && inspectorTab === "content" ? "surface" : inspectorTab;

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
      <div className={`border-b px-5 py-3 ${isOverlay ? `border-neutral-200 bg-white` : `${panelBord} ${panelBg}`}`}>
        <div role="tablist" aria-label="Inspector tabs" className="flex justify-center"><div className="inline-flex rounded-2xl border border-neutral-200 bg-white p-1">
          {visibleTabs.map((tab) => {
            const isDisabled = selectedPage.kind === "home" && tab === "content";
            const badge = tab === "surface" ? surfaceBadge : tab === "content" ? contentBadge : 0;
            const panelId = `inspector-panel-${tab}`;
            if (isDisabled) {
              return (
                <button
                  key={tab}
                  type="button"
                  disabled
                  title="The main page doesn't use content blocks — use hotspots or card buttons to link players to other cards instead."
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-neutral-300 cursor-not-allowed select-none"
                >
                  {TAB_LABELS[tab]}
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
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                  activeTab === tab
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {TAB_LABELS[tab]}
                {badge > 0 ? (
                  <span
                    aria-label={`${badge} item${badge !== 1 ? "s" : ""}`}
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                      inspectorTab === tab
                        ? "bg-white/20 text-white"
                        : "bg-neutral-200 text-neutral-500"
                    }`}
                  >
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div></div>
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
              className="min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 outline-none focus:border-black"
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
            className="shrink-0 rounded-xl border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Close
          </button>
        ) : null}
      </div>

      {/* Body */}
      <div className={`grid min-h-0 flex-1 gap-0 ${showPreview ? "lg:grid-cols-[1.15fr_0.85fr]" : ""}`}>
        <div
          key={selectedPage.id}
          role="tabpanel"
          id={`inspector-panel-${activeTab}`}
          aria-labelledby={`inspector-tab-${activeTab}`}
          className={`min-h-0 overflow-y-auto inspector-content-in ${
            isOverlay ? "bg-neutral-50" : panelBg
          } ${showPreview ? `border-r ${panelBord}` : ""}`}
        >
          {activeTab === "surface" ? (
            <SurfaceTab
              onAddCanvasFeature={onAddCanvasFeature}
              onCanvasFeatureChange={onCanvasFeatureChange}
              onCanvasFeatureImageUpload={onCanvasFeatureImageUpload}
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
            <SetupTab
              onCreatePageWithConfig={onCreatePageWithConfig}
              onHeroUpload={onHeroUpload}
              onPageButtonPlacementChange={onPageButtonPlacementChange}
              onPageHeroUrlChange={onPageHeroUrlChange}
              onResetPagePosition={onResetPagePosition}
              onSystemSettingChange={onSystemSettingChange}
              onBggImport={onBggImport}
              selectedPage={selectedPage}
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
                contentDragState={null}
                featureDragState={null}
                hotspotPages={hotspotPages}
                layoutMode="desktop"
                systemSettings={systemSettings}
                showLayoutHelp={false}
                isPreviewMode={false}
                experienceStatus="draft"
                onExperienceStatusChange={() => {}}
                onCanvasClick={() => {}}
                onCanvasFeaturePointerDown={() => {}}
                onContentCardPointerDown={() => {}}
                onDeleteHotspot={() => {}}
                onDismissContent={() => {}}
                onDismissLayoutHelp={() => {}}
                onHotspotPointerDown={onHotspotPointerDown}
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
      role="button"
      tabIndex={0}
      aria-label="Close editor overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      {panelContent}
    </div>
  );
}
