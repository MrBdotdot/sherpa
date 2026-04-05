"use client";

import { ChangeEvent, useEffect, useRef } from "react";
import { CanvasFeature, CanvasFeatureField, CanvasFeatureType, PageItem } from "@/app/_lib/authoring-types";
import { CanvasFeatureTypeBody } from "@/app/_components/editor/canvas-feature-type-body";

export const CANVAS_ELEMENT_TYPES: Array<{ type: CanvasFeatureType; label: string; description: string }> = [
  { type: "image", label: "Image", description: "Image with optional link or link list" },
  { type: "heading", label: "Heading", description: "Large heading text on the board" },
  { type: "qr", label: "QR code", description: "Scannable code image" },
  { type: "button", label: "Button", description: "Link button on the board" },
  { type: "dropdown", label: "Dropdown", description: "Multi-destination selector" },
  { type: "search", label: "Search", description: "Full-text search with breadcrumb navigation" },
  { type: "locale", label: "Language switcher", description: "Lets players switch between available languages" },
  { type: "disclaimer", label: "Disclaimer", description: "Legal or event-specific footnote" },
];

export function CanvasFeatureEditor({
  feature,
  isSelected,
  isPortraitMode,
  brandColors,
  onCanvasFeatureChange,
  onCanvasFeatureImageUpload,
  onCreatePageForButton,
  onOpenPage,
  onRemoveCanvasFeature,
  pages,
}: {
  feature: CanvasFeature;
  isSelected: boolean;
  isPortraitMode?: boolean;
  brandColors?: string[];
  onCanvasFeatureChange: (
    featureId: string,
    field: CanvasFeatureField,
    value: string
  ) => void;
  onCanvasFeatureImageUpload: (featureId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onCreatePageForButton: () => string;
  onOpenPage: (id: string) => void;
  onRemoveCanvasFeature: (featureId: string) => void;
  pages: PageItem[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isSelected]);

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border bg-white p-4 transition ${
        isSelected ? "border-black ring-2 ring-black/10" : "border-neutral-200"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-neutral-900">{feature.label}</div>
          <div className="text-xs text-neutral-500 capitalize">{feature.type}</div>
        </div>
        <button
          type="button"
          onClick={() => onRemoveCanvasFeature(feature.id)}
          className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
        >
          Remove
        </button>
      </div>

      <div className="space-y-3">
        <CanvasFeatureTypeBody
          feature={feature}
          brandColors={brandColors}
          onCanvasFeatureChange={onCanvasFeatureChange}
          onCanvasFeatureImageUpload={onCanvasFeatureImageUpload}
          onCreatePageForButton={onCreatePageForButton}
          onOpenPage={onOpenPage}
          pages={pages}
        />

        {/* Portrait zone toggle — only shown in portrait layout mode */}
        {isPortraitMode ? (
          <div className="space-y-1.5 border-t border-neutral-100 pt-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Portrait zone
            </div>
            <div className="flex items-center rounded-xl border border-neutral-200 bg-neutral-100 p-0.5">
              {(["strip", "content"] as const).map((zone) => {
                const isActive = zone === "content"
                  ? feature.portraitZone === "content"
                  : !feature.portraitZone;
                return (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => onCanvasFeatureChange(feature.id, "portraitZone", zone === "content" ? "content" : "")}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700"
                    }`}
                  >
                    {zone === "strip" ? "Image strip" : "Content zone"}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Locale */}
        {feature.type === "locale" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Default language code</div>
              <input
                type="text"
                value={feature.label}
                onChange={(e) => onCanvasFeatureChange(feature.id, "label", e.target.value)}
                placeholder="EN"
                aria-label="Default language code"
                className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-black"
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Languages — one per line</div>
              <textarea
                value={feature.optionsText}
                onChange={(e) => onCanvasFeatureChange(feature.id, "optionsText", e.target.value)}
                placeholder={"English|EN\nEspañol|ES\nFrançais|FR"}
                aria-label="Languages, one per line"
                rows={5}
                className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-3 font-mono text-xs outline-none focus:border-black"
              />
              <div className="text-xs leading-5 text-neutral-400">
                Format: <code className="rounded bg-neutral-100 px-1">Display Name|CODE</code> — the code appears on the button
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
