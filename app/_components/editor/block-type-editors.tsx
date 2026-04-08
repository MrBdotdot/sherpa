"use client";

import { ChangeEvent } from "react";
import { ContentBlock, ImageFit } from "@/app/_lib/authoring-types";
import { FocalPointPicker } from "@/app/_components/editor/focal-point-picker";
import { ImageHotspotEditor } from "@/app/_components/editor/image-hotspot-editor";

export function CalloutBlockEditor({
  block,
  label,
  onBlockVariantChange,
  onBlockChange,
}: {
  block: ContentBlock;
  label: string;
  onBlockVariantChange: (blockId: string, variant: ContentBlock["variant"]) => void;
  onBlockChange: (blockId: string, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Variant</div>
        <div className="flex gap-2">
          {(["info", "warning", "tip"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onBlockVariantChange(block.id, v)}
              aria-pressed={block.variant === v}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                block.variant === v
                  ? "border-[#3B82F6] bg-[#3B82F6] text-white"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <textarea
        value={block.value}
        onChange={(event) => onBlockChange(block.id, event.target.value)}
        placeholder="Add a rule clarification, exception, or helpful tip"
        aria-label={label}
        rows={3}
        className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-3 text-sm leading-6 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
      />
    </div>
  );
}

export function ImageBlockEditor({
  block,
  onBlockChange,
  onBlockFitChange,
  onBlockImagePositionChange,
  onBlockPropsChange,
  onBlockImageUpload,
}: {
  block: ContentBlock;
  onBlockChange: (blockId: string, value: string) => void;
  onBlockFitChange: (blockId: string, fit: ImageFit) => void;
  onBlockImagePositionChange: (blockId: string, x: number, y: number) => void;
  onBlockPropsChange: (blockId: string, patch: Partial<ContentBlock>) => void;
  onBlockImageUpload: (blockId: string, event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-3">
      <input
        type="text"
        value={block.value}
        onChange={(event) => onBlockChange(block.id, event.target.value)}
        placeholder="Paste image URL"
        aria-label="Image URL"
        className="w-full rounded-lg border border-neutral-200 px-3 py-3 text-sm outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
      />
      <label className="inline-flex cursor-pointer items-center rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
        Upload from computer
        <input type="file" accept="image/*" onChange={(event) => onBlockImageUpload(block.id, event)} className="hidden" />
      </label>
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Image fit</div>
        <div role="group" aria-label="Image fit" className="flex gap-1.5">
          {([
            { value: "cover", label: "Fill" },
            { value: "contain", label: "Fit" },
            { value: "fill", label: "Stretch" },
            { value: "center", label: "Crop" },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onBlockFitChange(block.id, opt.value)}
              aria-pressed={(block.imageFit ?? "cover") === opt.value}
              className={`flex-1 rounded-lg border py-1.5 text-[11px] font-medium transition ${
                (block.imageFit ?? "cover") === opt.value
                  ? "border-[#3B82F6] bg-[#3B82F6] text-white"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {block.value && (block.imageFit === "cover" || block.imageFit === "center" || !block.imageFit) ? (
        <FocalPointPicker
          imageUrl={block.value}
          x={block.imagePosition?.x ?? 50}
          y={block.imagePosition?.y ?? 50}
          onChange={(x, y) => onBlockImagePositionChange(block.id, x, y)}
        />
      ) : null}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-[0.16em] text-neutral-400">Width</span>
          <span className="font-medium text-neutral-500">
            {typeof block.imageSize === "number" ? `${block.imageSize}px` : "Full"}
          </span>
        </div>
        <input
          type="range"
          min={80}
          max={800}
          step={10}
          value={block.imageSize ?? 800}
          onChange={(e) => {
            const v = Number(e.target.value);
            onBlockPropsChange(block.id, { imageSize: v >= 800 ? undefined : v });
          }}
          aria-label="Image width"
          className="w-full accent-[#3B82F6]"
        />
        <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
          <span>80px</span>
          <span>Full</span>
        </div>
      </div>
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Caption</div>
        <input
          type="text"
          value={block.imageCaption ?? ""}
          onChange={(e) => onBlockPropsChange(block.id, { imageCaption: e.target.value || undefined })}
          placeholder="Optional caption below image"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
        />
      </div>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={block.imageLightbox ?? false}
          onChange={(e) => onBlockPropsChange(block.id, { imageLightbox: e.target.checked || undefined })}
          className="h-4 w-4 rounded border-neutral-300"
        />
        <span className="text-sm text-neutral-700">Open full-screen on tap</span>
      </label>
      <ImageHotspotEditor block={block} onBlockPropsChange={onBlockPropsChange} />
    </div>
  );
}

export function ConsentBlockEditor({
  block,
  onBlockChange,
}: {
  block: ContentBlock;
  onBlockChange: (blockId: string, value: string) => void;
}) {
  const consentConfig: Record<string, string | boolean> = (() => {
    try { return JSON.parse(block.value); } catch { return {}; }
  })();

  function updateConsentField(field: string, value: string | boolean) {
    onBlockChange(block.id, JSON.stringify({ ...consentConfig, [field]: value }));
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Consent statement</div>
        <textarea
          value={(consentConfig.statement as string) ?? ""}
          onChange={(e) => updateConsentField("statement", e.target.value)}
          placeholder="I agree that [Your Company] may use photos, video, and audio recordings of my likeness for marketing and promotional purposes."
          rows={4}
          className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-3 text-sm leading-6 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
        />
      </div>
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Web3Forms access key</div>
        <input
          type="text"
          value={(consentConfig.endpoint as string) ?? ""}
          onChange={(e) => updateConsentField("endpoint", e.target.value)}
          placeholder="Paste your Web3Forms access key"
          className="w-full rounded-lg border border-neutral-200 px-3 py-3 text-sm outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
        />
        <div className="mt-1.5 text-xs text-neutral-400">
          Get a free access key at web3forms.com. Submissions go to your registered email.
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={(consentConfig.requireEmail as boolean) ?? false}
          onChange={(e) => updateConsentField("requireEmail", e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300"
        />
        <span className="text-sm text-neutral-700">Ask for playtester&apos;s email address</span>
      </label>
    </div>
  );
}
