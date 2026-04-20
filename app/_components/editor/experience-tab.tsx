"use client";

import { ChangeEvent, useMemo } from "react";
import { getGameIconFallback, getGameIconUrl } from "@/app/_lib/game-icon";
import { CanvasFeature, PageItem, SystemSettings } from "@/app/_lib/authoring-types";
import { LocaleLanguage } from "@/app/_lib/localization";
import { EditorSection, EditorSubsection, SelectField, FieldLabel, InputField, MonoInput } from "@/app/_components/editor/editor-ui";
import { LocaleFeatureEditor } from "@/app/_components/editor/locale-feature-editor";
import { BrandColorsEditor } from "@/app/_components/editor/brand-colors-editor";

export function ExperienceTab({
  currentGameName,
  localeFeature,
  onGameIconUpload,
  onLocaleLanguagesChange,
  onLocalePromoteLanguageToDefault,
  onLocaleSourceTextChange,
  onLocaleTranslationChange,
  onOpenSpreadsheet,
  onSystemSettingChange,
  pages,
  systemSettings,
}: {
  currentGameName: string;
  localeFeature: CanvasFeature | null;
  onGameIconUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onLocaleLanguagesChange: (featureId: string, languages: LocaleLanguage[]) => void;
  onLocalePromoteLanguageToDefault: (
    featureId: string,
    languageCode: string,
    nextLanguages?: LocaleLanguage[]
  ) => void;
  onLocaleSourceTextChange: (key: string, value: string) => void;
  onLocaleTranslationChange: (key: string, languageCode: string, value: string) => void;
  onOpenSpreadsheet: () => void;
  onSystemSettingChange: <K extends keyof SystemSettings>(field: K, value: SystemSettings[K]) => void;
  pages: PageItem[];
  systemSettings: SystemSettings;
}) {
  const gameIconUrl = getGameIconUrl(systemSettings.gameIcon);
  const gameIconFallback = getGameIconFallback(currentGameName);
  const languageCount = useMemo(() => {
    if (!localeFeature) return 0;
    return localeFeature.optionsText.split("\n").filter(Boolean).length || 1;
  }, [localeFeature]);

  return (
    <div className="divide-y divide-neutral-200">

      {/* Appearance */}
      <EditorSection title="Appearance">
        <div className="space-y-3">

          <EditorSubsection title="Typography">
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
          </EditorSubsection>

          <EditorSubsection title="Style">
            <div className="space-y-4">
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
                label="Hotspot size"
                value={systemSettings.hotspotSize ?? "medium"}
                onChange={(value) => onSystemSettingChange("hotspotSize", value)}
                options={[
                  { label: "Small", value: "small" },
                  { label: "Medium", value: "medium" },
                  { label: "Large", value: "large" },
                ]}
              />
            </div>
          </EditorSubsection>

          <EditorSubsection title="Branding">
            <div className="space-y-4">
              <div>
                <FieldLabel>Brand color</FieldLabel>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={systemSettings.accentColor || "#0a0a0a"}
                    onChange={(event) => onSystemSettingChange("accentColor", event.target.value)}
                    aria-label="Brand color picker"
                    className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-neutral-200 p-0.5"
                  />
                  <MonoInput
                    value={systemSettings.accentColor}
                    onChange={(event) => onSystemSettingChange("accentColor", event.target.value)}
                    placeholder="#000000"
                    aria-label="Brand color hex value"
                  />
                  {systemSettings.accentColor ? (
                    <button
                      type="button"
                      onClick={() => onSystemSettingChange("accentColor", "")}
                      className="shrink-0 rounded-lg border border-neutral-200 px-3 py-2.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
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

              <div>
                <FieldLabel>Game icon</FieldLabel>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#1e3a8a] text-base font-semibold text-white">
                    {gameIconUrl ? (
                      <img
                        src={gameIconUrl}
                        alt="Game icon preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      gameIconFallback
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                    Upload image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onGameIconUpload}
                      aria-label="Upload game icon image"
                      className="hidden"
                    />
                  </label>
                  {gameIconUrl ? (
                    <button
                      type="button"
                      onClick={() => onSystemSettingChange("gameIcon", "")}
                      className="shrink-0 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </EditorSubsection>

          <EditorSubsection title="Theme">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-neutral-900">Dark mode</div>
                <div className="mt-0.5 text-xs text-neutral-500">
                  Apply a dark theme to the player experience.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={systemSettings.darkMode ?? false}
                onClick={() => onSystemSettingChange("darkMode", !(systemSettings.darkMode ?? false))}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  systemSettings.darkMode ? "bg-[#5B7AF5]" : "bg-neutral-200"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    systemSettings.darkMode ? "translate-x-4" : ""
                  }`}
                />
              </button>
            </div>
          </EditorSubsection>

        </div>
      </EditorSection>

      {/* Mobile */}
      <EditorSection title="Mobile">
        <EditorSubsection title="Portrait layout">
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
                    {mode === "split" ? "Split layout" : "Full portrait"}
                  </button>
                );
              })}
            </div>

            {(systemSettings.portraitLayout ?? "split") === "split" ? (
              <div className="space-y-3">
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
                    onChange={(event) => onSystemSettingChange("portraitSplitRatio", Number(event.target.value))}
                    className="w-full accent-[#5B7AF5]"
                    aria-label="Portrait image strip height"
                  />
                </div>
                <div>
                  <FieldLabel>Content zone background</FieldLabel>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={systemSettings.portraitBackground ?? "#1a1a2e"}
                      onChange={(event) => onSystemSettingChange("portraitBackground", event.target.value)}
                      aria-label="Portrait background color picker"
                      className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-neutral-200 p-0.5"
                    />
                    <MonoInput
                      value={systemSettings.portraitBackground ?? "#1a1a2e"}
                      onChange={(event) => onSystemSettingChange("portraitBackground", event.target.value)}
                      placeholder="#1a1a2e"
                      aria-label="Portrait background color hex value"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </EditorSubsection>
      </EditorSection>

      {/* Behavior */}
      <EditorSection title="Behavior">
        <div className="space-y-3">

          <EditorSubsection title="Auto-open" description="Open a specific card every time the experience loads. Useful for tutorial or guided experiences.">
            <select
              value={systemSettings.autoOpenPageId ?? ""}
              onChange={(e) => onSystemSettingChange("autoOpenPageId", e.target.value || undefined)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 font-sans text-sm outline-none transition hover:border-neutral-400 focus:border-[#5B7AF5] focus:ring-[3px] focus:ring-[#5B7AF5]/22"
              aria-label="Auto-open card"
            >
              <option value="">None — player starts on the board</option>
              {pages.filter((p) => p.kind !== "home").map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || "Untitled card"}
                </option>
              ))}
            </select>
          </EditorSubsection>

          <EditorSubsection title="Intro screen">
            <div className="space-y-3">
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={systemSettings.introScreen?.enabled ?? false}
                  onChange={(event) =>
                    onSystemSettingChange("introScreen", {
                      enabled: event.target.checked,
                      youtubeUrl: systemSettings.introScreen?.youtubeUrl ?? "",
                    })
                  }
                  className="rounded"
                />
                Show intro video before experience
              </label>
              {systemSettings.introScreen?.enabled ? (
                <InputField
                  size="lg"
                  value={systemSettings.introScreen.youtubeUrl}
                  onChange={(event) =>
                    onSystemSettingChange("introScreen", {
                      enabled: true,
                      youtubeUrl: event.target.value,
                    })
                  }
                  placeholder="Paste YouTube URL"
                  aria-label="Intro video YouTube URL"
                />
              ) : null}
            </div>
          </EditorSubsection>

        </div>
      </EditorSection>

      {/* Languages */}
      <EditorSection title="Languages">
        {localeFeature ? (
          <>
            <p className="mb-4 text-xs text-neutral-500">
              {languageCount} language{languageCount === 1 ? "" : "s"} configured.
            </p>
            <LocaleFeatureEditor
              feature={localeFeature}
              pages={pages}
              translations={systemSettings.translations}
              onLanguagesChange={onLocaleLanguagesChange}
              onOpenSpreadsheet={onOpenSpreadsheet}
              onPromoteLanguageToDefault={onLocalePromoteLanguageToDefault}
              onSourceTextChange={onLocaleSourceTextChange}
              onTranslationChange={onLocaleTranslationChange}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
            Add a language switcher in the Elements tab to enable multiple languages.
          </div>
        )}
      </EditorSection>

      {/* Advanced */}
      <EditorSection title="Advanced">
        <div className="space-y-6">
          <div className="space-y-2">
            <FieldLabel className="mb-0">Custom CSS</FieldLabel>
            <textarea
              value={systemSettings.customCss ?? ""}
              onChange={(e) => onSystemSettingChange("customCss", e.target.value || undefined)}
              placeholder={`.sherpa-modal {\n  border-radius: 0;\n}\n\n.sherpa-button {\n  background: #ff6b00;\n}`}
              rows={10}
              spellCheck={false}
              className="w-full resize-y rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 font-mono text-xs leading-relaxed text-neutral-800 placeholder:text-neutral-500 focus:border-[#5B7AF5] focus:outline-none focus:ring-2 focus:ring-[#5B7AF5]/25"
            />
            <p className="text-xs leading-relaxed text-neutral-500">
              Scoped to <code className="rounded bg-neutral-100 px-1 py-0.5 text-neutral-600">.sherpa-player</code>.
              Target <code className="rounded bg-neutral-100 px-1 py-0.5 text-neutral-600">.sherpa-modal</code>,{" "}
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-neutral-600">.sherpa-button</code>,{" "}
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-neutral-600">.sherpa-hotspot-pin</code> for component-level overrides.
            </p>
          </div>
        </div>
      </EditorSection>

    </div>
  );
}
