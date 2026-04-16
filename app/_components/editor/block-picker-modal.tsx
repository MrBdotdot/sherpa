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

function BlockIcon({ type }: { type: string | null }) {
  switch (type) {
    case "text":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 4h12M2 7.5h8M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "callout":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1.5" y="2" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 5.5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "tabs":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1.5" y="5.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <rect x="1.5" y="2" width="4" height="4" rx="1" fill="currentColor" />
          <rect x="6.5" y="2" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      );
    case "section":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 5h12M2 8.5h7M2 12h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="13" cy="5" r="1.5" fill="currentColor" />
        </svg>
      );
    case "step-rail":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="3" cy="4" r="1.5" fill="currentColor" />
          <circle cx="3" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="3" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M3 5.5v1M3 9.5v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M6 4h7M6 8h5M6 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "carousel":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="3.5" y="3" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <rect x="1" y="4.5" width="2" height="6" rx="0.75" stroke="currentColor" strokeWidth="1.2" />
          <rect x="13" y="4.5" width="2" height="6" rx="0.75" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case "image":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="5.5" cy="6" r="1.25" stroke="currentColor" strokeWidth="1.3" />
          <path d="M1.5 10.5l3.5-3 3 2.5 2.5-2 3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "video":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="1.5" y="3" width="9.5" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M11 6.5l3.5-2v7L11 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "consent":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="1.5" width="12" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 6h6M5 8.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M5 12h1.5l4-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default: // action-link
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6.5 3.5H3a1.5 1.5 0 00-1.5 1.5v8A1.5 1.5 0 003 14.5h8a1.5 1.5 0 001.5-1.5V9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M9.5 2h4.5v4.5M13.5 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

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
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3.5">
          <div id="block-picker-title" className="text-sm font-semibold text-neutral-900">
            Add content block
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close picker"
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Groups */}
        <div className="max-h-[70vh] overflow-y-auto py-2">
          {BLOCK_GROUPS.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <div className="mx-4 my-1 border-t border-neutral-100" />}
              <div className="px-2 pb-1 pt-2">
                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  {group.label}
                </div>
                {group.items.map((item) => (
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
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-neutral-50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500">
                      <BlockIcon type={item.type} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-neutral-900">{item.label}</div>
                      <div className="text-xs text-neutral-500">{item.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
