"use client";

import { useState } from "react";
import { DisplayStyleKey, TemplateId } from "@/app/_lib/authoring-types";
import { PAGE_TEMPLATES } from "@/app/_lib/authoring-utils";
import { applyDisplayStyle, DISPLAY_STYLE_OPTIONS, getDisplayStyleKey } from "@/app/_lib/display-style";

export type CreatePageConfig = {
  templateId: TemplateId | null;
  title: string;
  displayStyle: DisplayStyleKey;
  contentTintColor: string;
  contentTintOpacity: number;
};

export function NewContainerForm({
  onCreatePageWithConfig,
}: {
  onCreatePageWithConfig: (config: CreatePageConfig) => void;
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
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => pickTemplate(null)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-left hover:bg-neutral-50"
            >
              <div className="text-sm font-medium text-neutral-900">Blank</div>
              <div className="mt-0.5 text-xs leading-4 text-neutral-400">Start with an empty container and build from scratch.</div>
            </button>
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
  );
}
