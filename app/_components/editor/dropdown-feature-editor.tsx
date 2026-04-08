"use client";

import { CanvasFeature, CanvasFeatureField, PageItem } from "@/app/_lib/authoring-types";
import { PageLinkPicker } from "@/app/_components/editor/page-link-picker";

type DropdownItem = { label: string; linkType: "none" | "external" | "page"; url: string };

function parseDropdownItems(text: string): DropdownItem[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const pipeIdx = l.indexOf("|");
    if (pipeIdx === -1) return { label: l, linkType: "none" as const, url: "" };
    const label = l.slice(0, pipeIdx).trim();
    const rest = l.slice(pipeIdx + 1).trim();
    if (rest.startsWith("page:")) return { label, linkType: "page" as const, url: rest.slice(5) };
    // A bare pipe (label|) or a URL means external
    return { label, linkType: "external" as const, url: rest };
  });
}

function serializeDropdownItems(items: DropdownItem[]): string {
  return items.map((item) => {
    if (item.linkType === "external") return `${item.label}|${item.url}`;
    if (item.linkType === "page") return `${item.label}|page:${item.url}`;
    return item.label;
  }).join("\n");
}

type Props = {
  feature: CanvasFeature;
  pages: PageItem[];
  onCanvasFeatureChange: (featureId: string, field: CanvasFeatureField, value: string) => void;
};

export function DropdownFeatureEditor({ feature, pages, onCanvasFeatureChange }: Props) {
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
              className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
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
              className="w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 font-mono text-xs outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
            />
          ) : item.linkType === "page" ? (
            <div className="overflow-hidden rounded-xl border border-neutral-200">
              {item.url ? (
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-sm font-medium text-neutral-800">
                    {pages.find((p) => p.id === item.url)?.title || "Untitled"}
                  </span>
                  <button
                    type="button"
                    onClick={() => update(i, { url: "" })}
                    className="text-xs text-neutral-400 hover:text-neutral-700"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <PageLinkPicker
                  pages={pages.filter((p) => p.kind !== "home")}
                  onSelect={(pageId) => update(i, { url: pageId })}
                />
              )}
            </div>
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
