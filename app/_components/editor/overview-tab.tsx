"use client";

import { ChangeEvent } from "react";
import { DISPLAY_STYLE_OPTIONS, getDisplayStyleKey } from "@/app/_lib/display-style";
import {
  DisplayStyleKey,
  PageButtonPlacement,
  PageItem,
  SystemSettings,
} from "@/app/_lib/authoring-types";
import { getPlacementLabel } from "@/app/_lib/label-utils";
import { EditorSection, EditorSubsection, SelectField, FieldLabel, InputField, MonoInput } from "@/app/_components/editor/editor-ui";

export function OverviewTab({
  onContentTintChange,
  onDisplayStyleChange,
  onHeroUpload,
  onPageButtonPlacementChange,
  onPageHeroUrlChange,
  onResetPagePosition,
  onSystemSettingChange,
  selectedPage,
  systemSettings,
}: {
  onContentTintChange: (color: string, opacity: number) => void;
  onDisplayStyleChange: (style: DisplayStyleKey) => void;
  onHeroUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onPageButtonPlacementChange: (value: PageButtonPlacement) => void;
  onPageHeroUrlChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onResetPagePosition: () => void;
  onSystemSettingChange: <K extends keyof SystemSettings>(field: K, value: SystemSettings[K]) => void;
  selectedPage: PageItem;
  systemSettings: SystemSettings;
}) {
  const currentDisplayStyle = getDisplayStyleKey(selectedPage);
  const showTint = selectedPage.interactionType === "modal"
    || selectedPage.interactionType === "side-sheet"
    || selectedPage.interactionType === "full-page";
  const settingsSectionTitle =
    selectedPage.kind === "home" ? "Board" : selectedPage.kind === "hotspot" ? "Hotspot" : "Card";

  return (
    <div className="divide-y divide-neutral-200">
      <EditorSection title="Overview">
        <div className="space-y-4">
          {selectedPage.kind !== "home" ? (
            <EditorSubsection
              title="How it opens"
              description="Choose how this card opens when a player taps it."
            >
              <div className="space-y-4">
                <SelectField
                  label="Size & style"
                  value={currentDisplayStyle}
                  onChange={onDisplayStyleChange}
                  options={DISPLAY_STYLE_OPTIONS.map((option) => ({
                    label: option.label,
                    value: option.key,
                  }))}
                />

                {showTint ? (
                  <div className="space-y-3">
                    <FieldLabel className="mb-0">Background tint</FieldLabel>
                    <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        checked={!!selectedPage.contentTintColor}
                        onChange={(event) =>
                          onContentTintChange(
                            event.target.checked ? "#ffffff" : "",
                            selectedPage.contentTintOpacity ?? 85
                          )
                        }
                        className="rounded"
                      />
                      Custom color
                    </label>
                    {selectedPage.contentTintColor ? (
                      <>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={selectedPage.contentTintColor}
                            onChange={(event) =>
                              onContentTintChange(
                                event.target.value,
                                selectedPage.contentTintOpacity ?? 85
                              )
                            }
                            aria-label="Background tint color picker"
                            className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-neutral-200 p-0.5"
                          />
                          <MonoInput
                            size="lg"
                            value={selectedPage.contentTintColor}
                            onChange={(event) =>
                              onContentTintChange(
                                event.target.value,
                                selectedPage.contentTintOpacity ?? 85
                              )
                            }
                            placeholder="#ffffff"
                            aria-label="Background tint color hex value"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-neutral-500">
                            <span>Opacity</span>
                            <span className="font-medium text-neutral-700">
                              {selectedPage.contentTintOpacity ?? 85}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={100}
                            value={selectedPage.contentTintOpacity ?? 85}
                            onChange={(event) =>
                              onContentTintChange(
                                selectedPage.contentTintColor,
                                Number(event.target.value)
                              )
                            }
                            className="w-full accent-[#3B82F6]"
                            aria-label="Background tint opacity"
                          />
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </EditorSubsection>
          ) : null}

          <EditorSubsection
            title={settingsSectionTitle}
            description={
              selectedPage.kind === "home"
                ? "Set the board background."
                : "Set where this card's button sits on the board and what background it shows."
            }
          >
            <div className="space-y-4">
              {selectedPage.kind === "page" ? (
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
                        Manually positioned at {Math.round(selectedPage.x ?? 0)}%,{" "}
                        {Math.round(selectedPage.y ?? 0)}%
                      </div>
                      <button
                        type="button"
                        onClick={onResetPagePosition}
                        className="shrink-0 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                      >
                        Reset position
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-3">
                {(() => {
                  const isModel3d =
                    selectedPage.kind === "home" && systemSettings.backgroundType === "model-3d";
                  const isColor = !isModel3d && selectedPage.heroImage.startsWith("color:");
                  const isImage = !isModel3d && !isColor;

                  const modes = selectedPage.kind === "home"
                    ? (["image", "color", "model-3d"] as const)
                    : (["image", "color"] as const);

                  return (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {modes.map((mode) => {
                          const isActive = mode === "model-3d"
                            ? isModel3d
                            : mode === "color"
                            ? isColor
                            : isImage;

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
                                    onPageHeroUrlChange({
                                      target: { value: "color:#1a1a2e" },
                                    } as ChangeEvent<HTMLInputElement>);
                                  }
                                } else {
                                  onSystemSettingChange("backgroundType", "image");
                                  if (selectedPage.heroImage.startsWith("color:")) {
                                    onPageHeroUrlChange({
                                      target: { value: "" },
                                    } as ChangeEvent<HTMLInputElement>);
                                  }
                                }
                              }}
                              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                                isActive
                                  ? "border-[#3B82F6] bg-[#3B82F6] text-white"
                                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                              }`}
                            >
                              {mode === "model-3d" ? "3D model" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>
                          );
                        })}
                      </div>

                      {isModel3d ? (
                        <>
                          <InputField
                            size="lg"
                            value={systemSettings.modelUrl ?? ""}
                            onChange={(event) => onSystemSettingChange("modelUrl", event.target.value)}
                            placeholder="Paste .glb or .gltf URL"
                            aria-label="3D model URL"
                          />
                          <label className="inline-flex cursor-pointer items-center rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                            Upload .glb file
                            <input
                              type="file"
                              accept=".glb,.gltf"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                const MAX_MB = 50;
                                if (file.size > MAX_MB * 1024 * 1024) {
                                  alert(`This file is ${Math.round(file.size / 1024 / 1024)} MB. Please use a file under ${MAX_MB} MB.`);
                                  event.target.value = "";
                                  return;
                                }
                                const url = URL.createObjectURL(file);
                                onSystemSettingChange("modelUrl", url);
                              }}
                              className="hidden"
                            />
                          </label>
                          <p className="text-xs leading-4 text-neutral-500">
                            Drag to orbit, scroll to zoom, and right-drag or two-finger to pan.
                          </p>
                          <div className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2.5">
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-neutral-700">
                                Cache model for offline
                              </div>
                              <div className="mt-0.5 text-xs leading-4 text-neutral-500">
                                {systemSettings.modelUrl
                                  ? "Stores the 3D model on the player's device"
                                  : "Set a model URL above to enable"}
                              </div>
                            </div>
                            <button
                              role="switch"
                              aria-checked={systemSettings.cache3dModels ?? false}
                              disabled={!systemSettings.modelUrl}
                              onClick={() =>
                                onSystemSettingChange(
                                  "cache3dModels",
                                  !(systemSettings.cache3dModels ?? false)
                                )
                              }
                              className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3B82F6] ${
                                systemSettings.cache3dModels
                                  ? "bg-[#3B82F6]"
                                  : "bg-neutral-200"
                              } disabled:cursor-not-allowed disabled:opacity-40`}
                            >
                              <span
                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                  systemSettings.cache3dModels
                                    ? "translate-x-4"
                                    : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </div>
                        </>
                      ) : isColor ? (
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={selectedPage.heroImage.replace("color:", "") || "#1a1a2e"}
                            onChange={(event) =>
                              onPageHeroUrlChange({
                                target: { value: `color:${event.target.value}` },
                              } as ChangeEvent<HTMLInputElement>)
                            }
                            aria-label="Background color picker"
                            className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-neutral-200 p-0.5"
                          />
                          <MonoInput
                            size="lg"
                            value={selectedPage.heroImage.replace("color:", "")}
                            onChange={(event) =>
                              onPageHeroUrlChange({
                                target: { value: `color:${event.target.value}` },
                              } as ChangeEvent<HTMLInputElement>)
                            }
                            placeholder="#1a1a2e"
                            aria-label="Background color hex value"
                          />
                        </div>
                      ) : (
                        <>
                          <InputField
                            size="lg"
                            value={selectedPage.heroImage}
                            onChange={onPageHeroUrlChange}
                            placeholder="Paste image URL"
                            aria-label="Background image URL"
                          />
                          <label className="inline-flex cursor-pointer items-center rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
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
            </div>
          </EditorSubsection>
        </div>
      </EditorSection>
    </div>
  );
}
