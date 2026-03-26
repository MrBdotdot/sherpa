"use client";

import { ChangeEvent, useState } from "react";
import { DisplayStyleKey, PageButtonPlacement, PageItem, SystemSettings, TemplateId } from "@/app/_lib/authoring-types";
import { applyDisplayStyle, DISPLAY_STYLE_OPTIONS, getDisplayStyleKey, getPlacementLabel, PAGE_TEMPLATES } from "@/app/_lib/authoring-utils";
import { EditorSection, EditorSubsection, SelectField } from "@/app/_components/editor/editor-ui";

type CreatePageConfig = {
  templateId: TemplateId | null;
  title: string;
  displayStyle: DisplayStyleKey;
  contentTintColor: string;
  contentTintOpacity: number;
};

export function SetupTab({
  onCreatePageWithConfig,
  onHeroUpload,
  onPageButtonPlacementChange,
  onPageHeroUrlChange,
  onResetPagePosition,
  onSystemSettingChange,
  selectedPage,
  systemSettings,
}: {
  onCreatePageWithConfig: (config: CreatePageConfig) => void;
  onHeroUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onPageButtonPlacementChange: (value: PageButtonPlacement) => void;
  onPageHeroUrlChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onResetPagePosition: () => void;
  onSystemSettingChange: <K extends keyof SystemSettings>(field: K, value: SystemSettings[K]) => void;
  selectedPage: PageItem;
  systemSettings: SystemSettings;
}) {
  const [createStep, setCreateStep] = useState<"template" | "config" | null>(null);
  const [configTemplateId, setConfigTemplateId] = useState<TemplateId | null>(null);
  const [configTitle, setConfigTitle] = useState("");
  const [configDisplayStyle, setConfigDisplayStyle] = useState<DisplayStyleKey>("card");
  const [configTintColor, setConfigTintColor] = useState("");
  const [configTintOpacity, setConfigTintOpacity] = useState(85);

  const openTemplatePicker = () => setCreateStep("template");
  const closeCreate = () => setCreateStep(null);

  const pickTemplate = (templateId: TemplateId | null) => {
    const template = PAGE_TEMPLATES.find((t) => t.id === templateId);
    setConfigTemplateId(templateId);
    setConfigTitle(template?.title ?? "");
    const fakeInteraction = template?.interactionType ?? "modal";
    const fakePage = { interactionType: fakeInteraction, cardSize: "medium" as const };
    setConfigDisplayStyle(getDisplayStyleKey(fakePage as Parameters<typeof getDisplayStyleKey>[0]));
    setConfigTintColor("");
    setConfigTintOpacity(85);
    setCreateStep("config");
  };

  const confirmCreate = () => {
    onCreatePageWithConfig({
      templateId: configTemplateId,
      title: configTitle,
      displayStyle: configDisplayStyle,
      contentTintColor: configTintColor,
      contentTintOpacity: configTintOpacity,
    });
    setCreateStep(null);
  };

  return (
    <div className="divide-y divide-neutral-200">
      {/* New container */}
      <div className="p-4 space-y-2">
        <button
          type="button"
          onClick={createStep === null ? openTemplatePicker : closeCreate}
          className={`w-full rounded-2xl border px-3 py-2.5 text-sm font-medium transition ${
            createStep !== null
              ? "border-black bg-black text-white"
              : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          {createStep !== null ? "✕ Cancel" : "+ Template"}
        </button>

        {createStep === "template" ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Choose a template
            </div>
            <button
              type="button"
              onClick={() => pickTemplate(null)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-left text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              Blank
            </button>
            <div className="mt-1.5 space-y-1.5">
              {PAGE_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => pickTemplate(template.id)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-left hover:bg-neutral-50"
                >
                  <div className="text-sm font-medium text-neutral-900">{template.title}</div>
                  <div className="mt-0.5 text-xs leading-4 text-neutral-400">{template.description}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {createStep === "config" ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm space-y-3">
            <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Configure
            </div>
            <input
              type="text"
              value={configTitle}
              onChange={(e) => setConfigTitle(e.target.value)}
              placeholder="Container name"
              autoFocus
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Display style
              </div>
              <select
                value={configDisplayStyle}
                onChange={(e) => setConfigDisplayStyle(e.target.value as DisplayStyleKey)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
              >
                {DISPLAY_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
              <div className="px-0.5 text-[10px] leading-4 text-neutral-400">
                {DISPLAY_STYLE_OPTIONS.find((o) => o.key === configDisplayStyle)?.description}
              </div>
            </div>
            {(() => {
              const { interactionType } = applyDisplayStyle(configDisplayStyle);
              const showTint = interactionType === "modal" || interactionType === "side-sheet" || interactionType === "full-page";
              if (!showTint) return null;
              return (
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                    Background tint
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={!!configTintColor}
                      onChange={(e) => setConfigTintColor(e.target.checked ? "#ffffff" : "")}
                      className="rounded"
                    />
                    Custom color
                  </label>
                  {configTintColor ? (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={configTintColor}
                          onChange={(e) => setConfigTintColor(e.target.value)}
                          className="h-8 w-10 cursor-pointer rounded-lg border border-neutral-300 p-0.5"
                        />
                        <span className="text-xs text-neutral-500 font-mono">{configTintColor}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span>Opacity</span>
                          <span>{configTintOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          value={configTintOpacity}
                          onChange={(e) => setConfigTintOpacity(Number(e.target.value))}
                          className="w-full accent-neutral-900"
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })()}
            <button
              type="button"
              onClick={confirmCreate}
              className="w-full rounded-xl bg-neutral-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Create container
            </button>
          </div>
        ) : null}
      </div>

      {/* This page */}
      <EditorSection title="This page">
        <div className="space-y-4">
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
            label="Font"
            value={systemSettings.fontTheme}
            onChange={(value) => onSystemSettingChange("fontTheme", value)}
            options={[
              { label: "Modern sans", value: "modern" },
              { label: "Geometric sans", value: "geometric" },
              { label: "Friendly rounded", value: "friendly" },
              { label: "Technical mono", value: "mono" },
              { label: "Editorial serif", value: "editorial" },
              { label: "Display serif", value: "display" },
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

      {/* Portrait layout */}
      <EditorSection title="Portrait layout">
        <div className="space-y-4">
          <div className="flex items-center rounded-xl border border-neutral-200 bg-neutral-100 p-0.5">
            {(["split", "full"] as const).map((mode) => {
              const isActive = (systemSettings.portraitLayout ?? "split") === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onSystemSettingChange("portraitLayout", mode)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                    isActive ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  {mode === "split" ? "Split (strip + content zone)" : "Full portrait image"}
                </button>
              );
            })}
          </div>

          {(systemSettings.portraitLayout ?? "split") === "split" ? (
            <>
              <p className="text-xs leading-5 text-neutral-400">
                The canvas splits into a content zone (top) and an image strip (bottom). Canvas features can be assigned to either zone.
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Image strip height</span>
                  <span className="font-medium text-neutral-700">{systemSettings.portraitSplitRatio ?? 55}%</span>
                </div>
                <input
                  type="range"
                  min={35}
                  max={75}
                  step={1}
                  value={systemSettings.portraitSplitRatio ?? 55}
                  onChange={(e) => onSystemSettingChange("portraitSplitRatio", Number(e.target.value))}
                  className="w-full accent-neutral-900"
                />
                <div className="flex justify-between text-[10px] text-neutral-400">
                  <span>35% (more content)</span>
                  <span>75% (more board)</span>
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  Content zone background
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={systemSettings.portraitBackground ?? "#1a1a2e"}
                    onChange={(e) => onSystemSettingChange("portraitBackground", e.target.value)}
                    aria-label="Portrait background color picker"
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-xl border border-neutral-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={systemSettings.portraitBackground ?? "#1a1a2e"}
                    onChange={(e) => onSystemSettingChange("portraitBackground", e.target.value)}
                    placeholder="#1a1a2e"
                    aria-label="Portrait background color hex value"
                    className="w-full rounded-2xl border border-neutral-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-black"
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs leading-5 text-neutral-400">
              A single portrait-oriented image fills the entire canvas. Upload a portrait image via the hero image upload on the canvas. Canvas features and hotspots float freely on top.
            </p>
          )}
        </div>
      </EditorSection>

      {/* Intro screen */}
      <EditorSection title="Intro screen">
        <div className="space-y-3">
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={systemSettings.introScreen?.enabled ?? false}
              onChange={(e) =>
                onSystemSettingChange("introScreen", {
                  enabled: e.target.checked,
                  youtubeUrl: systemSettings.introScreen?.youtubeUrl ?? "",
                })
              }
              className="rounded"
            />
            Show intro video before experience
          </label>
          {systemSettings.introScreen?.enabled ? (
            <>
              <input
                type="text"
                value={systemSettings.introScreen.youtubeUrl}
                onChange={(e) =>
                  onSystemSettingChange("introScreen", {
                    enabled: true,
                    youtubeUrl: e.target.value,
                  })
                }
                placeholder="Paste YouTube URL"
                className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-black"
              />
              <p className="text-xs leading-5 text-neutral-400">
                Plays muted, full-screen when the experience opens. Tap anywhere dismisses it. Experience assets preload in the background.
              </p>
            </>
          ) : null}
        </div>
      </EditorSection>
    </div>
  );
}
