"use client";

import { ChangeEvent, useState } from "react";
import { PageButtonPlacement, PageItem, SystemSettings } from "@/app/_lib/authoring-types";
import { getPlacementLabel } from "@/app/_lib/label-utils";
import { EditorSection, EditorSubsection, SelectField } from "@/app/_components/editor/editor-ui";
import { CreatePageConfig, NewContainerForm } from "@/app/_components/editor/new-container-form";

export type { CreatePageConfig };

function BrandColorsEditor({
  colors,
  onChange,
}: {
  colors: string[];
  onChange: (colors: string[]) => void;
}) {
  const MAX = 8;

  function update(index: number, value: string) {
    const next = colors.map((c, i) => (i === index ? value : c));
    onChange(next);
  }

  function add() {
    if (colors.length >= MAX) return;
    onChange([...colors, "#000000"]);
  }

  function remove(index: number) {
    onChange(colors.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
        Brand palette
      </div>
      <p className="mb-3 text-xs leading-5 text-neutral-400">
        Colors saved here appear as quick-picks in all color pickers and are used to auto-style buttons and assets.
      </p>
      <div className="flex flex-wrap gap-2">
        {colors.map((color, i) => (
          <div key={i} className="group relative">
            <label className="block cursor-pointer" title={color}>
              <div
                className="h-9 w-9 rounded-xl border-2 border-white shadow ring-1 ring-neutral-200 transition group-hover:ring-neutral-400"
                style={{ backgroundColor: color }}
              />
              <input
                type="color"
                value={color}
                onChange={(e) => update(i, e.target.value)}
                aria-label={`Brand color ${i + 1}`}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove brand color ${i + 1}`}
              className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-neutral-800 text-[9px] text-white group-hover:flex"
            >
              ✕
            </button>
          </div>
        ))}
        {colors.length < MAX ? (
          <button
            type="button"
            onClick={add}
            aria-label="Add brand color"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-600"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SetupTab({
  onCreatePageWithConfig,
  onHeroUpload,
  onPageButtonPlacementChange,
  onPageHeroUrlChange,
  onResetPagePosition,
  onSystemSettingChange,
  onBggImport,
  selectedPage,
  systemSettings,
}: {
  onCreatePageWithConfig: (config: CreatePageConfig) => void;
  onHeroUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onPageButtonPlacementChange: (value: PageButtonPlacement) => void;
  onPageHeroUrlChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onResetPagePosition: () => void;
  onSystemSettingChange: <K extends keyof SystemSettings>(field: K, value: SystemSettings[K]) => void;
  onBggImport: (data: { name: string; complexity: number; bggId: string }) => void;
  selectedPage: PageItem;
  systemSettings: SystemSettings;
}) {
  const [bggInput, setBggInput] = useState(systemSettings.bggId ?? "");
  const [bggLoading, setBggLoading] = useState(false);
  const [bggError, setBggError] = useState("");
  return (
    <div className="divide-y divide-neutral-200">
      {/* New container */}
      <NewContainerForm onCreatePageWithConfig={onCreatePageWithConfig} />

      {/* This page */}
      <EditorSection title="This card">
        <div className="space-y-4">
          {selectedPage.kind === "page" ? (
            <EditorSubsection
              title="Button placement"
              description="Where this card's button sits on the main page."
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
              {(() => {
                const isModel3d = selectedPage.kind === "home" && systemSettings.backgroundType === "model-3d";
                const isColor = !isModel3d && selectedPage.heroImage.startsWith("color:");
                const isImage = !isModel3d && !isColor;

                const modes = selectedPage.kind === "home"
                  ? (["image", "color", "model-3d"] as const)
                  : (["image", "color"] as const);

                return (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {modes.map((mode) => {
                        const isActive = mode === "model-3d" ? isModel3d : mode === "color" ? isColor : isImage;
                        return (
                          <button
                            key={mode}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => {
                              if (mode === "model-3d") {
                                onSystemSettingChange("backgroundType", "model-3d");
                              } else if (mode === "color") {
                                onSystemSettingChange("backgroundType", "image");
                                if (!selectedPage.heroImage.startsWith("color:")) {
                                  onPageHeroUrlChange({ target: { value: "color:#1a1a2e" } } as React.ChangeEvent<HTMLInputElement>);
                                }
                              } else {
                                onSystemSettingChange("backgroundType", "image");
                                if (selectedPage.heroImage.startsWith("color:")) {
                                  onPageHeroUrlChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>);
                                }
                              }
                            }}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                              isActive
                                ? "border-neutral-900 bg-neutral-900 text-white"
                                : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                            }`}
                          >
                            {mode === "model-3d" ? "3D model" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                          </button>
                        );
                      })}
                    </div>

                    {isModel3d ? (
                      <>
                        <input
                          type="text"
                          value={systemSettings.modelUrl ?? ""}
                          onChange={(e) => onSystemSettingChange("modelUrl", e.target.value)}
                          placeholder="Paste .glb or .gltf URL"
                          aria-label="3D model URL"
                          className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-black"
                        />
                        <label className="inline-flex cursor-pointer items-center rounded-xl border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                          Upload .glb file
                          <input
                            type="file"
                            accept=".glb,.gltf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const url = URL.createObjectURL(file);
                              onSystemSettingChange("modelUrl", url);
                            }}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[11px] leading-4 text-neutral-400">
                          Drag to orbit · Scroll to zoom · Right-drag or two-finger to pan.
                          Uploaded files are session-only; use a URL for persistence.
                        </p>
                      </>
                    ) : isColor ? (
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
                  </>
                );
              })()}
            </div>
          </EditorSubsection>
        </div>
      </EditorSection>

      {/* 3D model settings — only visible when backgroundType is "model-3d" on the home page */}
      {systemSettings.backgroundType === "model-3d" && selectedPage.kind === "home" ? (
        <EditorSection title="3D model">
          <div className="space-y-4">
            {/* Scale */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-[0.16em] text-neutral-400">Scale</span>
                <span className="font-medium text-neutral-500">{(systemSettings.modelScale ?? 1).toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={4}
                step={0.05}
                value={systemSettings.modelScale ?? 1}
                onChange={(e) => onSystemSettingChange("modelScale", Number(e.target.value))}
                className="w-full accent-neutral-900"
                aria-label="Model scale"
              />
              <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
                <span>0.1×</span>
                <span>4×</span>
              </div>
            </div>

            {/* Initial rotation Y */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-[0.16em] text-neutral-400">Initial spin (Y)</span>
                <span className="font-medium text-neutral-500">{systemSettings.modelRotationY ?? 0}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={5}
                value={systemSettings.modelRotationY ?? 0}
                onChange={(e) => onSystemSettingChange("modelRotationY", Number(e.target.value))}
                className="w-full accent-neutral-900"
                aria-label="Initial Y rotation"
              />
              <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
                <span>−180°</span>
                <span>+180°</span>
              </div>
            </div>

            {/* Initial rotation X */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-[0.16em] text-neutral-400">Initial tilt (X)</span>
                <span className="font-medium text-neutral-500">{systemSettings.modelRotationX ?? 0}°</span>
              </div>
              <input
                type="range"
                min={-90}
                max={90}
                step={5}
                value={systemSettings.modelRotationX ?? 0}
                onChange={(e) => onSystemSettingChange("modelRotationX", Number(e.target.value))}
                className="w-full accent-neutral-900"
                aria-label="Initial X rotation"
              />
              <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
                <span>−90°</span>
                <span>+90°</span>
              </div>
            </div>

            {/* Environment / lighting */}
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                Lighting environment
              </div>
              <select
                value={systemSettings.modelEnvironment ?? "none"}
                onChange={(e) => onSystemSettingChange(
                  "modelEnvironment",
                  e.target.value as SystemSettings["modelEnvironment"]
                )}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
                aria-label="Lighting environment"
              >
                <option value="none">Plain directional lights</option>
                <option value="apartment">Apartment</option>
                <option value="city">City</option>
                <option value="dawn">Dawn</option>
                <option value="forest">Forest</option>
                <option value="lobby">Lobby</option>
                <option value="night">Night</option>
                <option value="park">Park</option>
                <option value="studio">Studio</option>
                <option value="sunset">Sunset</option>
                <option value="warehouse">Warehouse</option>
              </select>
              <p className="mt-1.5 text-[11px] leading-4 text-neutral-400">
                Image-based lighting gives reflective / PBR materials a realistic sheen.
              </p>
            </div>
          </div>
        </EditorSection>
      ) : null}

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
          <BrandColorsEditor
            colors={systemSettings.brandColors ?? []}
            onChange={(colors) => onSystemSettingChange("brandColors", colors)}
          />
          <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-neutral-900">Dark mode</div>
              <div className="mt-0.5 text-xs text-neutral-500">Apply a dark theme to the player experience.</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={systemSettings.darkMode ?? false}
              onClick={() => onSystemSettingChange("darkMode", !(systemSettings.darkMode ?? false))}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${(systemSettings.darkMode ?? false) ? "bg-neutral-900" : "bg-neutral-200"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${(systemSettings.darkMode ?? false) ? "translate-x-4" : ""}`}
              />
            </button>
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
      <EditorSection title="Intro screen" id="intro-screen-section">
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

      {/* BGG — only shown on the home page */}
      {selectedPage.kind === "home" ? (
        <EditorSection title="BoardGameGeek">
          <div className="space-y-3">
            <p className="text-xs leading-5 text-neutral-400">
              Import your game{"'"}s title and complexity rating from BoardGameGeek. Find your game{"'"}s ID in its BGG URL (e.g. boardgamegeek.com/boardgame/<strong>266192</strong>).
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={bggInput}
                onChange={(e) => { setBggInput(e.target.value); setBggError(""); }}
                placeholder="BGG game ID (e.g. 266192)"
                aria-label="BGG game ID"
                className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
              <button
                type="button"
                disabled={!bggInput.trim() || bggLoading}
                onClick={async () => {
                  const id = bggInput.trim();
                  if (!id) return;
                  setBggLoading(true);
                  setBggError("");
                  try {
                    const res = await fetch(`/api/bgg?id=${encodeURIComponent(id)}`);
                    const data = await res.json();
                    if (!res.ok) { setBggError(data.error ?? "Import failed"); return; }
                    onBggImport({ name: data.name, complexity: data.complexity, bggId: id });
                    onSystemSettingChange("bggId", id);
                    onSystemSettingChange("bggComplexity", data.complexity);
                  } catch {
                    setBggError("Network error — try again");
                  } finally {
                    setBggLoading(false);
                  }
                }}
                className="shrink-0 rounded-xl border border-neutral-300 px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40"
              >
                {bggLoading ? "Importing…" : "Import"}
              </button>
            </div>
            {bggError ? (
              <p className="text-xs text-red-500">{bggError}</p>
            ) : null}
            {systemSettings.bggId ? (
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                <div className="text-sm text-neutral-700">
                  Complexity: <span className="font-semibold">{(systemSettings.bggComplexity ?? 0).toFixed(1)}/5</span>
                </div>
                <a
                  href={`https://boardgamegeek.com/boardgame/${systemSettings.bggId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
                >
                  View on BGG ↗
                </a>
              </div>
            ) : null}
          </div>
        </EditorSection>
      ) : null}
    </div>
  );
}
