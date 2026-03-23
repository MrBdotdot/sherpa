"use client";

import { ChangeEvent } from "react";
import { DisplayStyleKey, PageButtonPlacement, PageItem, SystemSettings } from "@/app/_lib/authoring-types";
import { applyDisplayStyle, DISPLAY_STYLE_OPTIONS, getDisplayStyleKey, getPlacementLabel } from "@/app/_lib/authoring-utils";
import { EditorSection, EditorSubsection, SelectField } from "@/app/_components/editor/editor-ui";

export function SetupTab({
  onHeroUpload,
  onDisplayStyleChange,
  onPageButtonPlacementChange,
  onPageHeroUrlChange,
  onResetPagePosition,
  onSystemSettingChange,
  selectedPage,
  systemSettings,
}: {
  onHeroUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onDisplayStyleChange: (style: DisplayStyleKey) => void;
  onPageButtonPlacementChange: (value: PageButtonPlacement) => void;
  onPageHeroUrlChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onResetPagePosition: () => void;
  onSystemSettingChange: <K extends keyof SystemSettings>(field: K, value: SystemSettings[K]) => void;
  selectedPage: PageItem;
  systemSettings: SystemSettings;
}) {
  const currentDisplayStyle = getDisplayStyleKey(selectedPage);
  const currentStyleOption = DISPLAY_STYLE_OPTIONS.find((o) => o.key === currentDisplayStyle);

  return (
    <div className="divide-y divide-neutral-200">
      {/* This page */}
      <EditorSection title="This page">
        <div className="space-y-4">
          <EditorSubsection
            title="Display style"
            description="How this container appears when triggered."
          >
            <div className="space-y-1.5">
              <SelectField
                label="Style"
                value={currentDisplayStyle}
                onChange={onDisplayStyleChange}
                options={DISPLAY_STYLE_OPTIONS.map((o) => ({ label: o.label, value: o.key }))}
              />
              {currentStyleOption ? (
                <div className="px-0.5 text-xs text-neutral-400">{currentStyleOption.description}</div>
              ) : null}
            </div>
          </EditorSubsection>

          {selectedPage.kind === "page" ? (
            <EditorSubsection
              title="Button placement"
              description="Where this container's button sits on the home surface."
            >
              <div className="space-y-4">
                <SelectField
                  label="Placement"
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
                      Manually positioned at {Math.round(selectedPage.x ?? 0)}%,{" "}
                      {Math.round(selectedPage.y ?? 0)}%
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
            title="Background"
            description="Hero image or color shown behind this page's content."
          >
            <div className="space-y-3">
              <div className="flex gap-2">
                {(["image", "color"] as const).map((mode) => {
                  const isColor = selectedPage.heroImage.startsWith("color:");
                  const isActive = mode === "color" ? isColor : !isColor;
                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={isActive}
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
                    aria-label="Background color picker"
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-xl border border-neutral-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={selectedPage.heroImage.replace("color:", "")}
                    onChange={(e) =>
                      onPageHeroUrlChange({ target: { value: `color:${e.target.value}` } } as React.ChangeEvent<HTMLInputElement>)
                    }
                    placeholder="#1a1a2e"
                    aria-label="Background color hex value"
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
                    aria-label="Hero image URL"
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
          </EditorSubsection>
        </div>
      </EditorSection>

      {/* Global */}
      <EditorSection title="Global">
        <div className="space-y-4">
          <SelectField
            label="Font mood"
            value={systemSettings.fontTheme}
            onChange={(value) => onSystemSettingChange("fontTheme", value)}
            options={[
              { label: "Modern sans", value: "modern" },
              { label: "Editorial serif", value: "editorial" },
              { label: "Friendly rounded", value: "friendly" },
            ]}
          />
          <SelectField
            label="Modal treatment"
            value={systemSettings.surfaceStyle}
            onChange={(value) => onSystemSettingChange("surfaceStyle", value)}
            options={[
              { label: "Soft glass", value: "glass" },
              { label: "Solid panel", value: "solid" },
              { label: "High contrast", value: "contrast" },
            ]}
          />
          <SelectField
            label="Hotspot marker size"
            value={systemSettings.hotspotSize ?? "medium"}
            onChange={(value) => onSystemSettingChange("hotspotSize", value)}
            options={[
              { label: "Small", value: "small" },
              { label: "Medium", value: "medium" },
              { label: "Large", value: "large" },
            ]}
          />
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Brand color
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={systemSettings.accentColor || "#0a0a0a"}
                onChange={(event) => onSystemSettingChange("accentColor", event.target.value)}
                aria-label="Brand color picker"
                className="h-9 w-9 shrink-0 cursor-pointer rounded-xl border border-neutral-300 p-0.5"
              />
              <input
                type="text"
                value={systemSettings.accentColor}
                onChange={(event) => onSystemSettingChange("accentColor", event.target.value)}
                placeholder="#000000"
                aria-label="Brand color hex value"
                className="w-full rounded-2xl border border-neutral-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-black"
              />
              {systemSettings.accentColor ? (
                <button
                  type="button"
                  onClick={() => onSystemSettingChange("accentColor", "")}
                  className="shrink-0 rounded-xl border border-neutral-300 px-3 py-3 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                >
                  Reset
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </EditorSection>
    </div>
  );
}
