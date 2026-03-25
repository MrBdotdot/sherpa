"use client";

import { ChangeEvent, useEffect, useRef } from "react";
import { CanvasFeature, CanvasFeatureType, PageItem } from "@/app/_lib/authoring-types";

export const CANVAS_ELEMENT_TYPES: Array<{ type: CanvasFeatureType; label: string; description: string }> = [
  { type: "logo", label: "Logo", description: "Brand mark with link or link list" },
  { type: "heading", label: "Heading", description: "Large heading text on the canvas" },
  { type: "qr", label: "QR code", description: "Scannable code image" },
  { type: "button", label: "Button", description: "Link button on the canvas surface" },
  { type: "dropdown", label: "Dropdown", description: "Multi-destination selector" },
  { type: "locale", label: "Language switcher", description: "Lets players switch between available languages" },
  { type: "disclaimer", label: "Disclaimer", description: "Legal or event-specific footnote" },
];

export function CanvasFeatureEditor({
  feature,
  isSelected,
  isPortraitMode,
  onCanvasFeatureChange,
  onCanvasFeatureImageUpload,
  onOpenPage,
  onRemoveCanvasFeature,
  pages,
}: {
  feature: CanvasFeature;
  isSelected: boolean;
  isPortraitMode?: boolean;
  onCanvasFeatureChange: (
    featureId: string,
    field: "label" | "description" | "linkUrl" | "imageUrl" | "optionsText" | "logoSize" | "qrSize" | "qrBgColor" | "qrBgOpacity" | "portraitZone",
    value: string
  ) => void;
  onCanvasFeatureImageUpload: (featureId: string, event: ChangeEvent<HTMLInputElement>) => void;
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
        <input
          type="text"
          value={feature.label}
          onChange={(event) => onCanvasFeatureChange(feature.id, "label", event.target.value)}
          placeholder={feature.type === "heading" ? "Heading text" : "Element label"}
          aria-label={feature.type === "heading" ? "Heading text" : "Element label"}
          className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-black"
        />

        {/* Logo */}
        {feature.type === "logo" ? (
          <>
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Behavior</div>
              <div className="flex gap-2">
                {(["link", "links"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onCanvasFeatureChange(feature.id, "description", mode)}
                    aria-pressed={feature.description === mode}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      feature.description === mode
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {mode === "link" ? "Goes to a link" : "Shows link list"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Logo image</div>
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                Upload image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => onCanvasFeatureImageUpload(feature.id, event)}
                  className="hidden"
                />
              </label>
              {feature.imageUrl ? (
                <div className="flex items-center gap-2">
                  <img src={feature.imageUrl} alt="Logo" className="h-10 w-auto max-w-[120px] rounded-lg border border-neutral-200 object-contain p-1" />
                  <button
                    type="button"
                    onClick={() => onCanvasFeatureChange(feature.id, "imageUrl", "")}
                    className="text-xs text-neutral-400 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Size</div>
                <div className="text-xs text-neutral-500">{feature.logoSize ?? 48}px</div>
              </div>
              <input
                type="range"
                min={24}
                max={160}
                step={4}
                value={feature.logoSize ?? 48}
                onChange={(e) => onCanvasFeatureChange(feature.id, "logoSize", e.target.value)}
                aria-label="Logo size"
                aria-valuetext={`${feature.logoSize ?? 48}px`}
                className="w-full accent-neutral-900"
              />
            </div>
            {feature.description === "link" ? (
              <input
                type="text"
                value={feature.linkUrl}
                onChange={(event) => onCanvasFeatureChange(feature.id, "linkUrl", event.target.value)}
                placeholder="Destination URL"
                aria-label="Destination URL"
                className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-black"
              />
            ) : (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Links — one per line</div>
                <textarea
                  value={feature.optionsText}
                  onChange={(event) => onCanvasFeatureChange(feature.id, "optionsText", event.target.value)}
                  placeholder={"Landing Page|https://...\nInstagram|https://...\n---\nPortfolio|https://...\n~Designed by Name. Open to work."}
                  aria-label="Links, one per line"
                  rows={6}
                  className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-3 font-mono text-xs outline-none focus:border-black"
                />
                <div className="text-xs leading-5 text-neutral-400">
                  Label or Label|URL · Use <code className="rounded bg-neutral-100 px-1">---</code> for a divider · Start a line with <code className="rounded bg-neutral-100 px-1">~</code> for attribution text
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* QR code */}
        {feature.type === "qr" ? (
          <>
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">QR image</div>
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                Upload QR image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => onCanvasFeatureImageUpload(feature.id, event)}
                  className="hidden"
                />
              </label>
              {feature.imageUrl ? (
                <div className="flex items-center gap-2">
                  <img src={feature.imageUrl} alt="QR" className="h-12 w-12 rounded-lg border border-neutral-200 object-contain p-0.5" />
                  <button
                    type="button"
                    onClick={() => onCanvasFeatureChange(feature.id, "imageUrl", "")}
                    className="text-xs text-neutral-400 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Size</div>
                <div className="text-xs text-neutral-500">{feature.qrSize ?? 120}px</div>
              </div>
              <input
                type="range"
                min={60}
                max={240}
                step={4}
                value={feature.qrSize ?? 120}
                onChange={(e) => onCanvasFeatureChange(feature.id, "qrSize", e.target.value)}
                aria-label="QR code size"
                aria-valuetext={`${feature.qrSize ?? 120}px`}
                className="w-full accent-neutral-900"
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Background color</div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={feature.qrBgColor || "#ffffff"}
                  onChange={(e) => onCanvasFeatureChange(feature.id, "qrBgColor", e.target.value)}
                  aria-label="QR background color"
                  className="h-8 w-10 cursor-pointer rounded border border-neutral-300 bg-white p-0.5"
                />
                <input
                  type="text"
                  value={feature.qrBgColor || ""}
                  onChange={(e) => onCanvasFeatureChange(feature.id, "qrBgColor", e.target.value)}
                  placeholder="None"
                  aria-label="QR background color hex"
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 font-mono text-xs outline-none focus:border-black"
                />
                {feature.qrBgColor ? (
                  <button
                    type="button"
                    onClick={() => onCanvasFeatureChange(feature.id, "qrBgColor", "")}
                    className="shrink-0 text-xs text-neutral-400 hover:text-red-500"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              {feature.qrBgColor ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-neutral-400">Opacity</div>
                    <div className="text-xs text-neutral-500">{Math.round((feature.qrBgOpacity ?? 1) * 100)}%</div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={feature.qrBgOpacity ?? 1}
                    onChange={(e) => onCanvasFeatureChange(feature.id, "qrBgOpacity", e.target.value)}
                    aria-label="QR background opacity"
                    className="w-full accent-neutral-900"
                  />
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {/* Heading */}
        {feature.type === "heading" ? (
          <>
            <textarea
              value={feature.description}
              onChange={(event) => onCanvasFeatureChange(feature.id, "description", event.target.value)}
              placeholder="Optional subtitle"
              aria-label="Subtitle"
              rows={2}
              className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-black"
            />
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                Links below heading — one per line
              </div>
              <textarea
                value={feature.optionsText}
                onChange={(event) => onCanvasFeatureChange(feature.id, "optionsText", event.target.value)}
                placeholder={"How to Play|/how-to-play\nFull Rules|/rules"}
                aria-label="Links below heading, one per line"
                rows={3}
                className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-3 font-mono text-xs outline-none focus:border-black"
              />
              <div className="text-xs leading-5 text-neutral-400">Format: Label or Label|URL. Leave empty for heading only.</div>
            </div>
          </>
        ) : null}

        {/* Button */}
        {feature.type === "button" ? (
          <input
            type="text"
            value={feature.linkUrl}
            onChange={(event) => onCanvasFeatureChange(feature.id, "linkUrl", event.target.value)}
            placeholder="https://..."
            aria-label="Button URL"
            className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-black"
          />
        ) : null}

        {/* Page button */}
        {feature.type === "page-button" ? (
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Links to container
            </div>
            <select
              value={feature.linkUrl}
              onChange={(e) => onCanvasFeatureChange(feature.id, "linkUrl", e.target.value)}
              aria-label="Linked container"
              className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-black"
            >
              {pages.filter((p) => p.kind !== "home").map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || "Untitled page"}
                </option>
              ))}
            </select>
            {feature.linkUrl ? (
              <button
                type="button"
                onClick={() => onOpenPage(feature.linkUrl)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-white hover:text-neutral-900"
              >
                Edit content →
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Dropdown */}
        {feature.type === "dropdown" ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Options — one per line</div>
            <textarea
              value={feature.optionsText}
              onChange={(event) => onCanvasFeatureChange(feature.id, "optionsText", event.target.value)}
              placeholder="How to Play&#10;FAQ&#10;Store Locator"
              aria-label="Dropdown options, one per line"
              rows={4}
              className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-black"
            />
          </div>
        ) : null}

        {/* Disclaimer */}
        {feature.type === "disclaimer" ? (
          <textarea
            value={feature.description}
            onChange={(event) => onCanvasFeatureChange(feature.id, "description", event.target.value)}
            placeholder="Legal or event-specific copy"
            aria-label="Disclaimer text"
            rows={3}
            className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-black"
          />
        ) : null}

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
