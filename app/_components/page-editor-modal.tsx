"use client";

import { ChangeEvent } from "react";

import { PreviewCanvas } from "@/app/_components/preview-canvas";
import { SurfaceTab } from "@/app/_components/editor/surface-tab";
import { ContentTab } from "@/app/_components/editor/content-tab";
import { SetupTab } from "@/app/_components/editor/setup-tab";
import {
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
import { getPageRoleDescription } from "@/app/_lib/authoring-utils";
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
  onCanvasFeatureChange: (
    featureId: string,
    field: "label" | "description" | "linkUrl" | "imageUrl" | "optionsText" | "logoSize",
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
  onPageButtonPlacementChange: (value: PageButtonPlacement) => void;
  onPageHeroUrlChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPublicUrlChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPublishStatusChange: (value: PublishStatus) => void;
  onContentTintChange: (color: string, opacity: number) => void;
  onQrToggle: () => void;
  onRemoveCanvasFeature: (featureId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onRemoveSocialLink: (socialId: string) => void;
  onResetPagePosition: () => void;
  onSelectPage: (id: string) => void;
  onSocialLinkChange: (
    socialId: string,
    field: "label" | "url",
    value: string
  ) => void;
  onSystemSettingChange: <K extends keyof SystemSettings>(
    field: K,
    value: SystemSettings[K]
  ) => void;
  onTitleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenPage: (id: string) => void;
  selectedFeatureId: string | null;
  selectedPage: PageItem | null;
  selectedPageId: string;
  showCloseButton?: boolean;
  showPreview?: boolean;
  surfacePreviewPage: PageItem;
  systemSettings: SystemSettings;
  pages: PageItem[];
};

const TAB_LABELS: Record<InspectorTab, string> = {
  surface: "Surface",
  content: "Content",
  setup: "Setup",
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
  onDeleteRequest,
  onHeroUpload,
  onHotspotPointerDown,
  onDisplayStyleChange,
  onInspectorTabChange,
  onMoveBlockDown,
  onMoveBlockUp,
  onPageButtonPlacementChange,
  onPageHeroUrlChange,
  onPublicUrlChange: _onPublicUrlChange,
  onPublishStatusChange: _onPublishStatusChange,
  onContentTintChange,
  onQrToggle: _onQrToggle,
  onRemoveCanvasFeature,
  onRemoveBlock,
  onRemoveSocialLink,
  onResetPagePosition,
  onSelectPage,
  onSocialLinkChange,
  onSystemSettingChange,
  onTitleChange,
  onOpenPage,
  selectedFeatureId,
  selectedPage,
  selectedPageId,
  showCloseButton = true,
  showPreview = true,
  surfacePreviewPage,
  systemSettings,
  pages,
}: PageEditorModalProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen && isOverlay);

  if (!isOpen || !selectedPage) {
    return null;
  }

  const titleId = `editor-title-${selectedPage.id}`;
  const surfaceBadge = selectedPage.canvasFeatures.length;
  const contentBadge = selectedPage.blocks.length + selectedPage.socialLinks.length;

  const panelContent = (
    <div
      ref={dialogRef}
      role={isOverlay ? "dialog" : undefined}
      aria-modal={isOverlay ? "true" : undefined}
      aria-labelledby={isOverlay ? titleId : undefined}
      className={`flex min-h-0 w-full flex-col overflow-hidden bg-neutral-50 ${
        isOverlay
          ? "h-[90vh] max-w-6xl rounded-3xl shadow-2xl"
          : "h-full border-l border-neutral-200 bg-[#f7f7f8]"
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 ${
          isOverlay ? "bg-white" : "bg-[#f7f7f8]"
        }`}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor={titleId} className="sr-only">Page name</label>
          <input
            id={titleId}
            type="text"
            value={selectedPage.title}
            onChange={onTitleChange}
            placeholder="Page name"
            className="w-full min-w-0 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 outline-none focus:border-black"
          />
          <div className="mt-1 text-xs text-neutral-400">
            {getPageRoleDescription(selectedPage.kind)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedPage.kind !== "home" ? (
            <button
              type="button"
              onClick={onDeleteRequest}
              className="rounded-xl border border-red-300 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          ) : null}
          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close editor"
              className="rounded-xl border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Close
            </button>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className={`border-b border-neutral-200 px-5 py-3 ${isOverlay ? "bg-white" : "bg-[#f7f7f8]"}`}>
        <div role="tablist" aria-label="Inspector tabs" className="inline-flex rounded-2xl border border-neutral-200 bg-white p-1">
          {(["surface", "content", "setup"] as const).map((tab) => {
            const badge = tab === "surface" ? surfaceBadge : tab === "content" ? contentBadge : 0;
            const panelId = `inspector-panel-${tab}`;
            return (
              <button
                key={tab}
                role="tab"
                id={`inspector-tab-${tab}`}
                aria-selected={inspectorTab === tab}
                aria-controls={panelId}
                type="button"
                onClick={() => onInspectorTabChange(tab)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                  inspectorTab === tab
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
        </div>
      </div>

      {/* Body */}
      <div className={`grid min-h-0 flex-1 gap-0 ${showPreview ? "lg:grid-cols-[1.15fr_0.85fr]" : ""}`}>
        <div
          key={selectedPage.id}
          role="tabpanel"
          id={`inspector-panel-${inspectorTab}`}
          aria-labelledby={`inspector-tab-${inspectorTab}`}
          className={`min-h-0 overflow-y-auto inspector-content-in ${
            isOverlay ? "bg-neutral-50" : "bg-[#f7f7f8]"
          } ${showPreview ? "border-r border-neutral-200" : ""}`}
        >
          {inspectorTab === "surface" ? (
            <SurfaceTab
              onAddCanvasFeature={onAddCanvasFeature}
              onCanvasFeatureChange={onCanvasFeatureChange}
              onCanvasFeatureImageUpload={onCanvasFeatureImageUpload}
              onOpenPage={onOpenPage}
              onRemoveCanvasFeature={onRemoveCanvasFeature}
              pages={pages}
              selectedFeatureId={selectedFeatureId}
              selectedPage={selectedPage}
            />
          ) : inspectorTab === "content" ? (
            <ContentTab
              onContentTintChange={onContentTintChange}
              onAddBlock={onAddBlock}
              onAddSocialLink={onAddSocialLink}
              onBlockChange={onBlockChange}
              onBlockFitChange={onBlockFitChange}
              onBlockImageUpload={onBlockImageUpload}
              onBlockVariantChange={onBlockVariantChange}
              onDisplayStyleChange={onDisplayStyleChange}
              onMoveBlockDown={onMoveBlockDown}
              onMoveBlockUp={onMoveBlockUp}
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
                isLayoutEditMode={false}
                isMobileView={false}
                systemSettings={systemSettings}
                showLayoutHelp={false}
                isPreviewMode={false}
                onCanvasClick={() => {}}
                onCanvasFeaturePointerDown={() => {}}
                onContentCardPointerDown={() => {}}
                onDeleteHotspot={() => {}}
                onDismissContent={() => {}}
                onDismissLayoutHelp={() => {}}
                onHotspotPointerDown={onHotspotPointerDown}
                onSelectPage={onSelectPage}
                onToggleLayoutEditMode={() => {}}
                onToggleMobileView={() => {}}
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
