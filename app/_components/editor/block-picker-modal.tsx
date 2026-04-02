"use client";

import { createPortal } from "react-dom";
import { ContentBlockType } from "@/app/_lib/authoring-types";
import { CONTENT_ELEMENT_TYPES } from "@/app/_components/editor/block-editor";
import { useFocusTrap } from "@/app/_hooks/useFocusTrap";

const BLOCK_GROUPS: Array<{
  label: string;
  items: typeof CONTENT_ELEMENT_TYPES;
}> = [
  {
    label: "Text",
    items: CONTENT_ELEMENT_TYPES.filter((i) => ["text", "callout"].includes(i.type as string)),
  },
  {
    label: "Sections",
    items: CONTENT_ELEMENT_TYPES.filter((i) => ["tabs", "section", "step-rail", "carousel"].includes(i.type as string)),
  },
  {
    label: "Media",
    items: CONTENT_ELEMENT_TYPES.filter((i) => ["image", "video"].includes(i.type as string)),
  },
  {
    label: "Interactive",
    items: CONTENT_ELEMENT_TYPES.filter((i) => i.kind === "action-link" || i.type === "consent"),
  },
];

const BLOCK_ICONS: Record<string, string> = {
  text: "¶",
  steps: "①",
  callout: "◈",
  tabs: "⊟",
  section: "§",
  "step-rail": "◎",
  carousel: "⊞",
  image: "▨",
  video: "▶",
  consent: "✎",
  "action-link": "↗",
};

export function BlockPickerModal({
  onAddBlock,
  onAddSocialLink,
  onClose,
}: {
  onAddBlock: (type: ContentBlockType) => void;
  onAddSocialLink: () => void;
  onClose: () => void;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(true);
  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-picker-title"
        className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div id="block-picker-title" className="text-base font-semibold text-neutral-900">
            Add content block
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close picker"
            className="rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Cancel
          </button>
        </div>
        <div className="space-y-4">
          {BLOCK_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                {group.label}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map((item) => {
                  const icon = BLOCK_ICONS[item.type ?? "action-link"] ?? "·";
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        if (item.kind === "block") {
                          onAddBlock(item.type!);
                        } else {
                          onAddSocialLink();
                        }
                        onClose();
                      }}
                      className="flex flex-col gap-1.5 rounded-2xl border border-neutral-200 px-3 py-3 text-left hover:border-neutral-300 hover:bg-neutral-50"
                    >
                      <span className="text-base leading-none text-neutral-400" aria-hidden="true">{icon}</span>
                      <span className="text-sm font-medium text-neutral-900">{item.label}</span>
                      <span className="text-[11px] leading-4 text-neutral-400">{item.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
