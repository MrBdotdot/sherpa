"use client";

import { ChangeEvent } from "react";
import { PageButtonPlacement, PageItem, SystemSettings } from "@/app/_lib/authoring-types";
import { getPlacementLabel } from "@/app/_lib/label-utils";
import { EditorSection, EditorSubsection, SelectField } from "@/app/_components/editor/editor-ui";
import { CreatePageConfig, NewContainerForm } from "@/app/_components/editor/new-container-form";

export type { CreatePageConfig };

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
  return (
    <div className="divide-y divide-neutral-200">
      {/* New container */}
      <NewContainerForm onCreatePageWithConfig={onCreatePageWithConfig} />

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
