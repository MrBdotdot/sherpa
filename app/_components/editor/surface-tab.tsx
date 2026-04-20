"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CanvasFeatureField,
  CanvasFeatureType,
  LayoutMode,
  MobileLayoutMode,
  PageItem,
} from "@/app/_lib/authoring-types";
import {
  getFeatureOriginLayout,
  getResolvedCanvasFeatures,
  getResponsiveBoardGuidance,
} from "@/app/_lib/responsive-board";
import { CanvasFeatureEditor, CANVAS_ELEMENT_TYPES } from "@/app/_components/editor/canvas-feature-editor";
import { FieldLabel } from "@/app/_components/editor/editor-ui";

function CanvasElementIcon({ type }: { type: string }) {
  switch (type) {
    case "image":
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <rect x="1.5" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="5" cy="5.5" r="1.2" stroke="currentColor" strokeWidth="1.2" />
          <path d="M1.5 10l3-2.5 2.5 2 2-1.5 4 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "heading":
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path d="M2 3v9M8 3v9M2 7.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M10.5 7h3.5M12.5 5.5v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "qr":
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <rect x="1.5" y="1.5" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.3" />
          <rect x="8.5" y="1.5" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.3" />
          <rect x="1.5" y="8.5" width="5" height="5" rx="0.75" stroke="currentColor" strokeWidth="1.3" />
          <rect x="3" y="3" width="2" height="2" rx="0.25" fill="currentColor" />
          <rect x="10" y="3" width="2" height="2" rx="0.25" fill="currentColor" />
          <rect x="3" y="10" width="2" height="2" rx="0.25" fill="currentColor" />
          <path d="M9.5 9.5h2M11.5 9.5v2M9.5 11.5h2M11.5 11.5v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "button":
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <rect x="1.5" y="4.5" width="12" height="6" rx="3" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 7.5h5M10 7.5l-1.5-1.5M10 7.5L8.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "dropdown":
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <rect x="1.5" y="3" width="12" height="4.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <rect x="1.5" y="9.5" width="12" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 1.5" />
          <path d="M10.5 5.25L12 5.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case "search":
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.3" />
          <path d="M9.5 9.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "locale":
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M7.5 2C7.5 2 5.5 4.5 5.5 7.5S7.5 13 7.5 13M7.5 2c0 0 2 2.5 2 5.5S7.5 13 7.5 13" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2 7.5h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "disclaimer":
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path d="M7.5 1.5L13.5 12.5H1.5L7.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M7.5 6v3M7.5 10.5v.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "anchor-pin":
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <circle cx="7.5" cy="4" r="1.75" stroke="currentColor" strokeWidth="1.3" />
          <path d="M7.5 5.75v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M3.5 12.5c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M5 5.75h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case "hotspot":
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path d="M7.5 13.5C7.5 13.5 2.5 8.8 2.5 6a5 5 0 0110 0c0 2.8-5 7.5-5 7.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <circle cx="7.5" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    default:
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <rect x="1.5" y="1.5" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      );
  }
}

function getLayoutLabel(layoutMode: LayoutMode) {
  switch (layoutMode) {
    case "mobile-landscape": return "Landscape";
    case "mobile-portrait": return "Portrait";
    default: return "Desktop";
  }
}

export function SurfaceTab({
  layoutMode,
  onAddHotspot,
  onAddCanvasFeature,
  onCanvasFeatureChange,
  onCanvasFeatureImageUpload,
  onCanvasFeatureVisibilityChange,
  onCreatePageForButton,
  onOpenPage,
  onOpenSpreadsheet,
  onRemoveCanvasFeature,
  pages,
  selectedFeatureId,
  selectedPage,
  isPortraitMode,
  brandColors,
}: {
  layoutMode: LayoutMode;
  onAddHotspot: () => void;
  onAddCanvasFeature: (type: CanvasFeatureType) => void;
  onCanvasFeatureChange: (featureId: string, field: CanvasFeatureField, value: string) => void;
  onCanvasFeatureImageUpload: (featureId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onCanvasFeatureVisibilityChange: (featureId: string, layoutMode: "mobile-landscape" | "mobile-portrait", visible: boolean) => void;
  onCreatePageForButton: () => string;
  onOpenPage: (id: string) => void;
  onOpenSpreadsheet?: () => void;
  onRemoveCanvasFeature: (featureId: string) => void;
  pages: PageItem[];
  selectedFeatureId: string | null;
  selectedPage: PageItem;
  isPortraitMode?: boolean;
  brandColors?: string[];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const resolvedFeatures = useMemo(
    () => getResolvedCanvasFeatures(selectedPage.canvasFeatures, layoutMode),
    [layoutMode, selectedPage.canvasFeatures]
  );
  const guidance = useMemo(
    () => getResponsiveBoardGuidance(selectedPage.canvasFeatures, layoutMode),
    [layoutMode, selectedPage.canvasFeatures]
  );
  const elements = resolvedFeatures.filter((item) => item.feature.type !== "page-button");
  const pageButtons = resolvedFeatures.filter((item) => item.feature.type === "page-button");
  const currentLayoutLabel = getLayoutLabel(layoutMode);
  const isMobileView = layoutMode !== "desktop";

  const renderFeature = (item: (typeof resolvedFeatures)[number]) => {
    const originLayout = getFeatureOriginLayout(item.sourceFeature);
    const isDesktopSource = originLayout === "desktop";
    const isVisibleInCurrentLayout = !item.override?.hidden;

    return (
      <div key={`${item.sourceFeature.id}-${layoutMode}`} className="space-y-1.5">
        {/* Visibility toggle — only shown in mobile view for desktop-source items */}
        {isMobileView && isDesktopSource ? (
          <div className="flex items-center justify-end px-0.5">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-500">
              {isVisibleInCurrentLayout ? "Visible" : "Hidden"}
              <button
                type="button"
                role="switch"
                aria-checked={isVisibleInCurrentLayout}
                onClick={() =>
                  onCanvasFeatureVisibilityChange(
                    item.sourceFeature.id,
                    layoutMode,
                    !isVisibleInCurrentLayout
                  )
                }
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  isVisibleInCurrentLayout ? "bg-[#5B7AF5]" : "bg-neutral-200"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    isVisibleInCurrentLayout ? "translate-x-4" : ""
                  }`}
                />
              </button>
            </label>
          </div>
        ) : null}

        <CanvasFeatureEditor
          feature={item.feature}
          isSelected={item.sourceFeature.id === selectedFeatureId}
          isPortraitMode={isPortraitMode}
          brandColors={brandColors}
          onCanvasFeatureChange={onCanvasFeatureChange}
          onCanvasFeatureImageUpload={onCanvasFeatureImageUpload}
          onCreatePageForButton={onCreatePageForButton}
          onOpenPage={onOpenPage}
          onOpenSpreadsheet={onOpenSpreadsheet}
          onRemoveCanvasFeature={
            isMobileView && isDesktopSource
              ? (featureId) => onCanvasFeatureVisibilityChange(featureId, layoutMode as MobileLayoutMode, false)
              : onRemoveCanvasFeature
          }
          pages={pages}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6 p-5">
      {/* Header: label + add button */}
      <div className="sticky top-0 z-10 -mx-5 bg-neutral-50 px-5 py-2">
        <div className="flex items-center justify-between gap-3">
          <FieldLabel className="mb-0">{currentLayoutLabel} board</FieldLabel>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={guidance.isAtHardCap}
            className="rounded-full bg-[#5B7AF5] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4059EB] disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Add element
          </button>
        </div>
      </div>

      {/* Elements list */}
      {resolvedFeatures.length > 0 ? (
        <div className="space-y-6">
          {elements.length > 0 ? (
            <div className="space-y-4">
              {pageButtons.length > 0 ? (
                <FieldLabel className="mb-0">Elements</FieldLabel>
              ) : null}
              {elements.map(renderFeature)}
            </div>
          ) : null}
          {pageButtons.length > 0 ? (
            <div className="space-y-4">
              {elements.length > 0 ? (
                <FieldLabel className="mb-0">Board buttons</FieldLabel>
              ) : null}
              {pageButtons.map(renderFeature)}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
          Nothing on the {currentLayoutLabel.toLowerCase()} board yet.
        </div>
      )}

      {/* Add element picker */}
      {pickerOpen ? createPortal(
        <div
          className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPickerOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3.5">
              <div className="text-sm font-semibold text-neutral-900">Add board element</div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label="Close picker"
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {/* Items */}
            <div className="py-2">
              {/* Hotspot — always first */}
              <button
                type="button"
                onClick={() => {
                  onAddHotspot();
                  setPickerOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-neutral-50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500">
                  <CanvasElementIcon type="hotspot" />
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-900">Hotspot</div>
                  <div className="text-xs text-neutral-500">Pulsing pin that opens a content card</div>
                </div>
              </button>
              {CANVAS_ELEMENT_TYPES.map((item, i) => {
                const isSingleton = item.type === "search" || item.type === "locale";
                const alreadyExists = isSingleton && selectedPage.canvasFeatures.some((f) => f.type === item.type);
                const isDisabled = alreadyExists || guidance.isAtHardCap;

                return (
                  <button
                    key={item.type}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
                      onAddCanvasFeature(item.type);
                      setPickerOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                      isDisabled
                        ? "cursor-not-allowed opacity-35"
                        : "hover:bg-neutral-50"
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-neutral-500 ${
                      isDisabled ? "border-neutral-100 bg-neutral-50" : "border-neutral-200 bg-white"
                    }`}>
                      <CanvasElementIcon type={item.type} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-neutral-900">{item.label}</div>
                      <div className="text-xs text-neutral-500">
                        {alreadyExists ? "Already on this board" : item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
