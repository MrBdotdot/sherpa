"use client";

import { ChangeEvent, useState } from "react";
import { createPortal } from "react-dom";
import { CanvasFeatureField, CanvasFeatureType, PageItem } from "@/app/_lib/authoring-types";
import { CanvasFeatureEditor, CANVAS_ELEMENT_TYPES } from "@/app/_components/editor/canvas-feature-editor";

export function SurfaceTab({
  onAddCanvasFeature,
  onCanvasFeatureChange,
  onCanvasFeatureImageUpload,
  onCreatePageForButton,
  onOpenPage,
  onRemoveCanvasFeature,
  pages,
  selectedFeatureId,
  selectedPage,
  isPortraitMode,
}: {
  onAddCanvasFeature: (type: CanvasFeatureType) => void;
  onCanvasFeatureChange: (featureId: string, field: CanvasFeatureField, value: string) => void;
  onCanvasFeatureImageUpload: (featureId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onCreatePageForButton: () => string;
  onOpenPage: (id: string) => void;
  onRemoveCanvasFeature: (featureId: string) => void;
  pages: PageItem[];
  selectedFeatureId: string | null;
  selectedPage: PageItem;
  isPortraitMode?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const elements = selectedPage.canvasFeatures.filter((f) => f.type !== "page-button");
  const pageButtons = selectedPage.canvasFeatures.filter((f) => f.type === "page-button");

  const renderFeature = (feature: (typeof selectedPage.canvasFeatures)[number]) => (
    <CanvasFeatureEditor
      key={feature.id}
      feature={feature}
      isSelected={feature.id === selectedFeatureId}
      isPortraitMode={isPortraitMode}
      onCanvasFeatureChange={onCanvasFeatureChange}
      onCanvasFeatureImageUpload={onCanvasFeatureImageUpload}
      onCreatePageForButton={onCreatePageForButton}
      onOpenPage={onOpenPage}
      onRemoveCanvasFeature={onRemoveCanvasFeature}
      pages={pages}
    />
  );

  return (
    <div className="space-y-4 p-5">
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
      >
        + Add canvas element
      </button>

      {selectedPage.canvasFeatures.length > 0 ? (
        <div className="space-y-6">
          {elements.length > 0 ? (
            <div className="space-y-4">
              {pageButtons.length > 0 ? (
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Elements</div>
              ) : null}
              {elements.map(renderFeature)}
            </div>
          ) : null}
          {pageButtons.length > 0 ? (
            <div className="space-y-4">
              {elements.length > 0 ? (
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Card buttons</div>
              ) : null}
              {pageButtons.map(renderFeature)}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
          Nothing on the canvas yet — add an image, QR code, or button.
        </div>
      )}

      {pickerOpen ? createPortal(
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-semibold text-neutral-900">Add canvas element</div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
            </div>
            <div className="space-y-2">
              {CANVAS_ELEMENT_TYPES.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    onAddCanvasFeature(item.type);
                    setPickerOpen(false);
                  }}
                  className="flex w-full items-start gap-3 rounded-2xl border border-neutral-200 px-4 py-3 text-left hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <div>
                    <div className="text-sm font-medium text-neutral-900">{item.label}</div>
                    <div className="mt-0.5 text-xs leading-4 text-neutral-400">{item.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
