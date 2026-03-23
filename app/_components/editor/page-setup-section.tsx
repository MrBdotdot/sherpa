"use client";

import { ChangeEvent } from "react";
import { InteractionType, PageButtonPlacement, PageItem } from "@/app/_lib/authoring-types";
import { getInteractionTypeLabel, getPlacementLabel } from "@/app/_lib/authoring-utils";
import { EditorSection, EditorSubsection, SelectField } from "@/app/_components/editor/editor-ui";

export function PageSetupSection({
  onHeroUpload,
  onInteractionTypeChange,
  onPageButtonPlacementChange,
  onPageHeroUrlChange,
  onResetPagePosition,
  onSummaryChange,
  selectedPage,
}: {
  onHeroUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onInteractionTypeChange: (value: InteractionType) => void;
  onPageButtonPlacementChange: (value: PageButtonPlacement) => void;
  onPageHeroUrlChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onResetPagePosition: () => void;
  onSummaryChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  selectedPage: PageItem;
}) {
  return (
    <EditorSection title="Page setup">
      <div className="space-y-4">
        <EditorSubsection
          title="Experience model"
          description="Core behavior and visibility controls for this page."
        >
          <SelectField
            label="Display behavior"
            value={selectedPage.interactionType}
            onChange={onInteractionTypeChange}
            options={[
              { label: getInteractionTypeLabel("modal"), value: "modal" },
              { label: getInteractionTypeLabel("side-sheet"), value: "side-sheet" },
              { label: getInteractionTypeLabel("tooltip"), value: "tooltip" },
              { label: getInteractionTypeLabel("full-page"), value: "full-page" },
              { label: getInteractionTypeLabel("external-link"), value: "external-link" },
            ]}
          />
        </EditorSubsection>

        {selectedPage.kind === "page" ? (
          <EditorSubsection
            title="Page button"
            description="Controls how this page's button appears on the home surface."
          >
            <div className="space-y-4">
              <SelectField
                label="Button placement"
                value={selectedPage.pageButtonPlacement}
                onChange={onPageButtonPlacementChange}
                options={[
                  { label: getPlacementLabel("top"), value: "top" },
                  { label: getPlacementLabel("bottom"), value: "bottom" },
                  { label: getPlacementLabel("left"), value: "left" },
                  { label: getPlacementLabel("right"), value: "right" },
                  { label: getPlacementLabel("stack"), value: "stack" },
                ]}
              />
              {selectedPage.x !== null ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-neutral-500">
                    Manually positioned at {Math.round(selectedPage.x ?? 0)}%, {Math.round(selectedPage.y ?? 0)}%
                  </div>
                  <button
                    type="button"
                    onClick={onResetPagePosition}
                    className="shrink-0 rounded-xl border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                  >
                    Reset position
                  </button>
                </div>
              ) : null}
            </div>
          </EditorSubsection>
        ) : null}

        <EditorSubsection
          title="Page framing"
          description="Set the background and a short intro for this page."
        >
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                Background
              </div>

              <div className="flex gap-2">
                {(["image", "color"] as const).map((mode) => {
                  const isColor = selectedPage.heroImage.startsWith("color:");
                  const isActive = mode === "color" ? isColor : !isColor;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        if (mode === "color" && !isColor) {
                          onPageHeroUrlChange({ target: { value: "color:#1a1a2e" } } as React.ChangeEvent<HTMLInputElement>);
                        } else if (mode === "image" && isColor) {
                          onPageHeroUrlChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>);
                        }
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition capitalize ${
                        isActive
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>

              {selectedPage.heroImage.startsWith("color:") ? (
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={selectedPage.heroImage.replace("color:", "") || "#1a1a2e"}
                    onChange={(e) =>
                      onPageHeroUrlChange({ target: { value: `color:${e.target.value}` } } as React.ChangeEvent<HTMLInputElement>)
                    }
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-xl border border-neutral-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={selectedPage.heroImage.replace("color:", "")}
                    onChange={(e) =>
                      onPageHeroUrlChange({ target: { value: `color:${e.target.value}` } } as React.ChangeEvent<HTMLInputElement>)
                    }
                    placeholder="#1a1a2e"
                    className="w-full rounded-2xl border border-neutral-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-black"
                  />
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={selectedPage.heroImage}
                    onChange={onPageHeroUrlChange}
                    placeholder="Paste image URL"
                    className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-black"
                  />
                  <label className="inline-flex cursor-pointer items-center rounded-xl border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                    Upload from computer
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onHeroUpload}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                Intro text
              </div>
              <textarea
                value={selectedPage.summary}
                onChange={onSummaryChange}
                placeholder="Opening text players see when this page loads — keep it short and orienting"
                rows={4}
                className="w-full resize-none rounded-2xl border border-neutral-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-black"
              />
            </div>
          </div>
        </EditorSubsection>
      </div>
    </EditorSection>
  );
}
