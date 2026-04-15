"use client";

import { ChangeEvent, useRef } from "react";
import {
  CanvasFeature,
  CanvasFeatureField,
  PageItem,
} from "@/app/_lib/authoring-types";
import { DropdownFeatureEditor } from "@/app/_components/editor/dropdown-feature-editor";
import { PageLinkPicker } from "@/app/_components/editor/page-link-picker";
import { SectionPicker } from "@/app/_components/editor/section-picker";

const LOGO_SIZE_MIN = 24;

function ImageResizePreview({
  imageUrl,
  logoSize,
  onResize,
  onRemove,
}: {
  imageUrl: string;
  logoSize: number;
  onResize: (newSize: number) => void;
  onRemove: () => void;
}) {
  const startRef = useRef<{ y: number; size: number } | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    startRef.current = { y: e.clientY, size: logoSize };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!startRef.current) return;
    const delta = e.clientY - startRef.current.y;
    const newSize = Math.max(LOGO_SIZE_MIN, startRef.current.size + delta);
    onResize(Math.round(newSize));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    startRef.current = null;
  }

  return (
    <div className="relative inline-block" style={{ maxWidth: "100%" }}>
      <img
        src={imageUrl}
        alt="Image preview"
        className="block rounded-lg border border-neutral-200 object-contain"
        style={{ height: logoSize, maxWidth: "100%" }}
      />
      {/* Corner resize handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        title="Drag to resize"
        className="absolute bottom-0 right-0 flex h-3.5 w-3.5 translate-x-1/2 translate-y-1/2 cursor-se-resize items-center justify-center rounded-sm border border-neutral-300 bg-white shadow-sm"
        aria-label="Resize image"
      >
        <svg width="7" height="7" viewBox="0 0 7 7" fill="none" aria-hidden="true">
          <path d="M1 6L6 1M3.5 6L6 3.5" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </div>
      {/* Pixel readout */}
      <div className="mt-1.5 text-center text-xs text-neutral-400">{logoSize}px</div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-1 block text-xs text-neutral-400 hover:text-red-500"
      >
        Remove
      </button>
    </div>
  );
}

type Props = {
  feature: CanvasFeature;
  brandColors?: string[];
  pages: PageItem[];
  onCanvasFeatureChange: (featureId: string, field: CanvasFeatureField, value: string) => void;
  onCanvasFeatureImageUpload: (featureId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onCreatePageForButton: () => string;
  onOpenPage: (id: string) => void;
  onOpenSpreadsheet?: () => void;
};

export function CanvasFeatureTypeBody({
  feature,
  brandColors,
  pages,
  onCanvasFeatureChange,
  onCanvasFeatureImageUpload,
  onCreatePageForButton,
  onOpenPage,
  onOpenSpreadsheet,
}: Props) {
  return (
    <>
      {feature.type !== "disclaimer" && feature.type !== "locale" ? (
        <input
          type="text"
          value={feature.label}
          onChange={(event) => onCanvasFeatureChange(feature.id, "label", event.target.value)}
          placeholder={
            feature.type === "heading" ? "Heading text"
            : feature.type === "search" ? "Placeholder text"
            : feature.type === "anchor-pin" ? "Tooltip text (shown on hover)"
            : "Element label"
          }
          aria-label={
            feature.type === "heading" ? "Heading text"
            : feature.type === "search" ? "Placeholder text"
            : feature.type === "anchor-pin" ? "Tooltip text"
            : "Element label"
          }
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
        />
      ) : null}

      {/* Image */}
      {feature.type === "image" ? (
        <>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Image</div>
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
              Upload image
              <input
                type="file"
                accept="image/*"
                onChange={(event) => onCanvasFeatureImageUpload(feature.id, event)}
                className="hidden"
              />
            </label>
            {feature.imageUrl ? (
              <div className="space-y-2">
                <ImageResizePreview
                  imageUrl={feature.imageUrl}
                  logoSize={feature.logoSize ?? 80}
                  onResize={(newSize) => onCanvasFeatureChange(feature.id, "logoSize", String(newSize))}
                  onRemove={() => onCanvasFeatureChange(feature.id, "imageUrl", "")}
                />
              </div>
            ) : null}
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
                        ? "border-[#3B82F6] bg-[#3B82F6] text-white"
                        : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
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
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
            />
          ) : feature.description === "links" ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Links, one per line</div>
              <textarea
                value={feature.optionsText}
                onChange={(event) => onCanvasFeatureChange(feature.id, "optionsText", event.target.value)}
                placeholder={"Landing Page|https://...\nInstagram|https://...\n---\nPortfolio|https://...\n~Designed by Name. Open to work."}
                aria-label="Links, one per line"
                rows={6}
                className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-3 font-mono text-xs outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
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
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
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
              className="w-full accent-[#3B82F6]"
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
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-xs outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
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
                  className="w-full accent-[#3B82F6]"
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
            className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
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
            {brandColors && brandColors.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {brandColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onCanvasFeatureChange(feature.id, "headingColor", c)}
                    aria-label={`Set heading color to ${c}`}
                    title={c}
                    className="h-6 w-6 rounded-lg border-2 transition"
                    style={{ backgroundColor: c, borderColor: feature.headingColor === c ? "#000" : "transparent" }}
                  />
                ))}
              </div>
            ) : null}
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
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-xs outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
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
              Links below heading, one per line
            </div>
            <textarea
              value={feature.optionsText}
              onChange={(event) => onCanvasFeatureChange(feature.id, "optionsText", event.target.value)}
              placeholder={"How to Play|/how-to-play\nFull Rules|/rules"}
              aria-label="Links below heading, one per line"
              rows={3}
              className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-3 font-mono text-xs outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
            />
            <div className="text-xs leading-5 text-neutral-400">Format: Label or Label|URL. Leave empty for heading only.</div>
          </div>
        </>
      ) : null}

      {/* Button */}
      {feature.type === "button" ? (
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Style</div>
            <div className="flex items-center rounded-xl border border-neutral-200 bg-neutral-100 p-0.5">
              {(["primary", "secondary", "tertiary"] as const).map((v) => {
                const isActive = (feature.buttonVariant ?? "secondary") === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onCanvasFeatureChange(feature.id, "buttonVariant", v)}
                    aria-pressed={isActive}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-all ${
                      isActive ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Button color</div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={feature.buttonBgColor || (
                  (feature.buttonVariant ?? "secondary") === "secondary" ? "#ffffff"
                  : brandColors?.[0] || "#111827"
                )}
                onChange={(e) => onCanvasFeatureChange(feature.id, "buttonBgColor", e.target.value)}
                aria-label="Button color"
                className="h-8 w-10 cursor-pointer rounded-lg border border-neutral-300 p-0.5"
              />
              {feature.buttonBgColor ? (
                <button
                  type="button"
                  onClick={() => onCanvasFeatureChange(feature.id, "buttonBgColor", "")}
                  className="text-xs text-neutral-400 hover:text-neutral-700"
                >
                  Use accent
                </button>
              ) : null}
            </div>
          </div>
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
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
            />
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Links to container</div>
              <div className="overflow-hidden rounded-xl border border-neutral-200">
                {feature.linkUrl ? (
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm font-medium text-neutral-800">
                      {pages.find((p) => p.id === feature.linkUrl)?.title || "Untitled"}
                    </span>
                    <button
                      type="button"
                      onClick={() => onCanvasFeatureChange(feature.id, "linkUrl", "")}
                      className="text-xs text-neutral-400 hover:text-neutral-700"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <PageLinkPicker
                    pages={pages.filter((p) => p.kind !== "home")}
                    onSelect={(pageId) => onCanvasFeatureChange(feature.id, "linkUrl", pageId)}
                  />
                )}
              </div>
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
          <div className="overflow-hidden rounded-xl border border-neutral-200">
            {feature.linkUrl ? (
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm font-medium text-neutral-800">
                  {pages.find((p) => p.id === feature.linkUrl)?.title || "Untitled"}
                </span>
                <button
                  type="button"
                  onClick={() => onCanvasFeatureChange(feature.id, "linkUrl", "")}
                  className="text-xs text-neutral-400 hover:text-neutral-700"
                >
                  Change
                </button>
              </div>
            ) : (
              <PageLinkPicker
                pages={pages.filter((p) => p.kind !== "home")}
                onSelect={(pageId) => onCanvasFeatureChange(feature.id, "linkUrl", pageId)}
              />
            )}
          </div>
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
        <DropdownFeatureEditor
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

      {/* Anchor pin */}
      {feature.type === "anchor-pin" ? (
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Destination</div>
            <div className="flex items-center rounded-xl border border-neutral-200 bg-neutral-100 p-0.5">
              {(["card", "section"] as const).map((mode) => {
                const isActive = (!feature.description || feature.description === "card" ? "card" : "section") === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onCanvasFeatureChange(feature.id, "description", mode)}
                    aria-pressed={isActive}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                      isActive ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    {mode === "card" ? "Link to card" : "Link to section"}
                  </button>
                );
              })}
            </div>
          </div>
          {(!feature.description || feature.description === "card") ? (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Card</div>
              <div className="overflow-hidden rounded-xl border border-neutral-200">
                {feature.linkUrl ? (
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm font-medium text-neutral-800">
                      {pages.find((p) => p.id === feature.linkUrl)?.title || "Untitled"}
                    </span>
                    <button
                      type="button"
                      onClick={() => onCanvasFeatureChange(feature.id, "linkUrl", "")}
                      className="text-xs text-neutral-400 hover:text-neutral-700"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <PageLinkPicker
                    pages={pages.filter((p) => p.kind !== "home")}
                    onSelect={(pageId) => onCanvasFeatureChange(feature.id, "linkUrl", pageId)}
                  />
                )}
              </div>
            </div>
          ) : (
            <SectionPicker
              pages={pages}
              targetPageId={feature.linkUrl}
              targetSectionId={feature.optionsText}
              onSelect={(pageId, sectionId) => {
                onCanvasFeatureChange(feature.id, "linkUrl", pageId);
                onCanvasFeatureChange(feature.id, "optionsText", sectionId);
              }}
            />
          )}
        </div>
      ) : null}

      {/* Disclaimer */}
      {feature.type === "disclaimer" ? (
        <textarea
          value={feature.label}
          onChange={(event) => onCanvasFeatureChange(feature.id, "label", event.target.value)}
          placeholder="Legal or event-specific copy"
          aria-label="Disclaimer text"
          rows={3}
          className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
        />
      ) : null}

      {/* Locale */}
      {feature.type === "locale" ? (
        <button
          type="button"
          onClick={() => onOpenSpreadsheet?.()}
          disabled={!onOpenSpreadsheet}
          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40"
        >
          Open spreadsheet
        </button>
      ) : null}
    </>
  );
}
