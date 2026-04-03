"use client";

import { ChangeEvent } from "react";
import { CanvasFeature, CanvasFeatureField, PageItem } from "@/app/_lib/authoring-types";

type DropdownItem = { label: string; linkType: "none" | "external" | "page"; url: string };

function parseDropdownItems(text: string): DropdownItem[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const pipeIdx = l.indexOf("|");
    if (pipeIdx === -1) return { label: l, linkType: "none" as const, url: "" };
    const label = l.slice(0, pipeIdx).trim();
    const url = l.slice(pipeIdx + 1).trim();
    if (url.startsWith("page:")) return { label, linkType: "page" as const, url: url.slice(5) };
    return { label, linkType: "external" as const, url };
  });
}

function serializeDropdownItems(items: DropdownItem[]): string {
  return items.map((item) => {
    if (item.linkType === "external" && item.url) return `${item.label}|${item.url}`;
    if (item.linkType === "page" && item.url) return `${item.label}|page:${item.url}`;
    return item.label;
  }).join("\n");
}

function DropdownItemsEditor({
  feature,
  pages,
  onCanvasFeatureChange,
}: {
  feature: CanvasFeature;
  pages: PageItem[];
  onCanvasFeatureChange: (featureId: string, field: CanvasFeatureField, value: string) => void;
}) {
  const items = parseDropdownItems(feature.optionsText);

  const update = (index: number, patch: Partial<DropdownItem>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onCanvasFeatureChange(feature.id, "optionsText", serializeDropdownItems(next));
  };

  const add = () => {
    const next = [...items, { label: "New item", linkType: "none" as const, url: "" }];
    onCanvasFeatureChange(feature.id, "optionsText", serializeDropdownItems(next));
  };

  const remove = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onCanvasFeatureChange(feature.id, "optionsText", serializeDropdownItems(next));
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Items</div>
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-neutral-200 p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={item.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Item label"
              aria-label={`Item ${i + 1} label`}
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs outline-none focus:border-black"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove item ${i + 1}`}
              className="shrink-0 text-xs text-neutral-400 hover:text-red-500"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-100 p-0.5">
            {(["none", "external", "page"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => update(i, { linkType: mode, url: "" })}
                aria-pressed={item.linkType === mode}
                className={`flex-1 rounded-md py-1 text-[11px] font-medium transition-all ${
                  item.linkType === mode
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-400 hover:text-neutral-600"
                }`}
              >
                {mode === "none" ? "No link" : mode === "external" ? "External" : "Page"}
              </button>
            ))}
          </div>
          {item.linkType === "external" ? (
            <input
              type="text"
              value={item.url}
              onChange={(e) => update(i, { url: e.target.value })}
              placeholder="https://..."
              aria-label={`Item ${i + 1} URL`}
              className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 font-mono text-xs outline-none focus:border-black"
            />
          ) : item.linkType === "page" ? (
            <select
              value={item.url}
              onChange={(e) => update(i, { url: e.target.value })}
              aria-label={`Item ${i + 1} page`}
              className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs outline-none focus:border-black"
            >
              <option value="">— Select a page —</option>
              {pages.filter((p) => p.kind !== "home").map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || "Untitled page"}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full rounded-xl border border-dashed border-neutral-300 py-2.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700"
      >
        + Add item
      </button>
    </div>
  );
}

type Props = {
  feature: CanvasFeature;
  onCanvasFeatureChange: (featureId: string, field: CanvasFeatureField, value: string) => void;
  onCanvasFeatureImageUpload: (featureId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onCreatePageForButton: () => string;
  onOpenPage: (id: string) => void;
  pages: PageItem[];
};

export function CanvasFeatureTypeBody({
  feature,
  onCanvasFeatureChange,
  onCanvasFeatureImageUpload,
  onCreatePageForButton,
  onOpenPage,
  pages,
}: Props) {
  return (
    <>
      {feature.type !== "disclaimer" ? (
        <input
          type="text"
          value={feature.label}
          onChange={(event) => onCanvasFeatureChange(feature.id, "label", event.target.value)}
          placeholder={
            feature.type === "heading" ? "Heading text"
            : feature.type === "search" ? "Placeholder text"
            : "Element label"
          }
          aria-label={
            feature.type === "heading" ? "Heading text"
            : feature.type === "search" ? "Placeholder text"
            : "Element label"
          }
          className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-black"
        />
      ) : null}

      {/* Image */}
      {feature.type === "image" ? (
        <>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Image</div>
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
                <img src={feature.imageUrl} alt="Image" className="h-10 w-auto max-w-[120px] rounded-lg border border-neutral-200 object-contain p-1" />
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
              aria-label="Image size"
              aria-valuetext={`${feature.logoSize ?? 48}px`}
              className="w-full accent-neutral-900"
            />
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Behavior</div>
            <div className="flex gap-2">
              {(["none", "link", "links"] as const).map((mode) => {
                const isActive = mode === "none"
                  ? !feature.description || feature.description === "none"
                  : feature.description === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onCanvasFeatureChange(feature.id, "description", mode === "none" ? "" : mode)}
                    aria-pressed={isActive}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      isActive
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {mode === "none" ? "None" : mode === "link" ? "Goes to a link" : "Shows link list"}
                  </button>
                );
              })}
            </div>
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
          ) : feature.description === "links" ? (
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
          ) : null}
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
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Size</div>
            <div className="flex items-center rounded-xl border border-neutral-200 bg-neutral-100 p-0.5">
              {(["small", "medium", "large"] as const).map((size) => {
                const isActive = (feature.headingSize ?? "large") === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => onCanvasFeatureChange(feature.id, "headingSize", size)}
                    aria-pressed={isActive}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-all ${
                      isActive ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Color</div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={feature.headingColor || "#0a0a0a"}
                onChange={(e) => onCanvasFeatureChange(feature.id, "headingColor", e.target.value)}
                aria-label="Heading color"
                className="h-8 w-10 cursor-pointer rounded border border-neutral-300 bg-white p-0.5"
              />
              <input
                type="text"
                value={feature.headingColor || ""}
                onChange={(e) => onCanvasFeatureChange(feature.id, "headingColor", e.target.value)}
                placeholder="Auto"
                aria-label="Heading color hex"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 font-mono text-xs outline-none focus:border-black"
              />
              {feature.headingColor ? (
                <button
                  type="button"
                  onClick={() => onCanvasFeatureChange(feature.id, "headingColor", "")}
                  className="shrink-0 text-xs text-neutral-400 hover:text-red-500"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
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
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Destination</div>
            <div className="flex items-center rounded-xl border border-neutral-200 bg-neutral-100 p-0.5">
              {(["external", "page"] as const).map((mode) => {
                const isActive = (feature.buttonLinkMode ?? "external") === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onCanvasFeatureChange(feature.id, "buttonLinkMode", mode)}
                    aria-pressed={isActive}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                      isActive ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    {mode === "external" ? "External link" : "Content block"}
                  </button>
                );
              })}
            </div>
          </div>
          {(feature.buttonLinkMode ?? "external") === "external" ? (
            <input
              type="text"
              value={feature.linkUrl}
              onChange={(event) => onCanvasFeatureChange(feature.id, "linkUrl", event.target.value)}
              placeholder="https://..."
              aria-label="Button URL"
              className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-black"
            />
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Links to container</div>
              {pages.filter((p) => p.kind !== "home").length > 0 ? (
                <select
                  value={feature.linkUrl}
                  onChange={(e) => onCanvasFeatureChange(feature.id, "linkUrl", e.target.value)}
                  aria-label="Linked container"
                  className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="">— Select a container —</option>
                  {pages.filter((p) => p.kind !== "home").map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title || "Untitled page"}
                    </option>
                  ))}
                </select>
              ) : null}
              {feature.linkUrl ? (
                <button
                  type="button"
                  onClick={() => onOpenPage(feature.linkUrl)}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-white hover:text-neutral-900"
                >
                  Edit content →
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  const newId = onCreatePageForButton();
                  onCanvasFeatureChange(feature.id, "linkUrl", newId);
                }}
                className="w-full rounded-xl border border-dashed border-neutral-300 py-2.5 text-xs font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition"
              >
                + Create content block
              </button>
            </div>
          )}
        </div>
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
        <DropdownItemsEditor
          feature={feature}
          pages={pages}
          onCanvasFeatureChange={onCanvasFeatureChange}
        />
      ) : null}

      {/* Search */}
      {feature.type === "search" ? (
        <p className="text-xs leading-5 text-neutral-400">
          Searches all page titles, summaries, and block content. Results show breadcrumb paths and click directly to the matching page. The label above becomes the search bar placeholder text.
        </p>
      ) : null}

      {/* Disclaimer */}
      {feature.type === "disclaimer" ? (
        <textarea
          value={feature.label}
          onChange={(event) => onCanvasFeatureChange(feature.id, "label", event.target.value)}
          placeholder="Legal or event-specific copy"
          aria-label="Disclaimer text"
          rows={3}
          className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-black"
        />
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
    </>
  );
}
