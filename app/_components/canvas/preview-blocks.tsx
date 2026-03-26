"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ContentBlock, PageItem } from "@/app/_lib/authoring-types";

// ── Consent queue helpers ──────────────────────────────────────
const CONSENT_QUEUE_KEY = "sherpa_consent_queue";

type QueuedConsent = {
  id: string;
  payload: Record<string, string>;
  queuedAt: string;
};

async function submitToWeb3Forms(payload: Record<string, string>): Promise<boolean> {
  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function queueConsent(payload: Record<string, string>): void {
  try {
    const existing: QueuedConsent[] = JSON.parse(
      localStorage.getItem(CONSENT_QUEUE_KEY) ?? "[]"
    );
    existing.push({ id: crypto.randomUUID(), payload, queuedAt: new Date().toISOString() });
    localStorage.setItem(CONSENT_QUEUE_KEY, JSON.stringify(existing));
  } catch { /* ignore */ }
}

async function flushConsentQueue(): Promise<void> {
  try {
    const raw = localStorage.getItem(CONSENT_QUEUE_KEY);
    if (!raw) return;
    const queue: QueuedConsent[] = JSON.parse(raw);
    if (queue.length === 0) return;
    const remaining: QueuedConsent[] = [];
    for (const item of queue) {
      const ok = await submitToWeb3Forms(item.payload);
      if (!ok) remaining.push(item);
    }
    if (remaining.length === 0) {
      localStorage.removeItem(CONSENT_QUEUE_KEY);
    } else {
      localStorage.setItem(CONSENT_QUEUE_KEY, JSON.stringify(remaining));
    }
  } catch { /* ignore */ }
}

// ── ConsentFormBlock ───────────────────────────────────────────
function parseConsentConfig(value: string) {
  try {
    const p = JSON.parse(value);
    return {
      statement: (p.statement as string) ?? "",
      endpoint: (p.endpoint as string) ?? "",
      requireEmail: (p.requireEmail as boolean) ?? false,
    };
  } catch {
    return { statement: "", endpoint: "", requireEmail: false };
  }
}

function ConsentFormBlock({
  block,
  accentColor,
  gameName,
  onDismissContent,
}: {
  block: ContentBlock;
  accentColor: string;
  gameName: string;
  onDismissContent?: () => void;
}) {
  const config = parseConsentConfig(block.value);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  useEffect(() => { flushConsentQueue(); }, []);

  useEffect(() => {
    if (status !== "done") return;
    const t = setTimeout(() => onDismissContent?.(), 2000);
    return () => clearTimeout(t);
  }, [status, onDismissContent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");

    const payload: Record<string, string> = {
      access_key: config.endpoint,
      subject: `Consent Submission — ${gameName} — ${name}`,
      from_name: "Sherpa",
      playtester_name: name,
      consent_date: new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      }),
      consent_time: new Date().toLocaleTimeString("en-US"),
      consent_statement: config.statement,
      game: gameName,
    };
    if (config.requireEmail && email) payload.playtester_email = email;

    const ok = await submitToWeb3Forms(payload);
    if (!ok) queueConsent(payload);
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div className="text-xl text-emerald-600">✓</div>
        <div className="mt-1 text-sm font-semibold text-emerald-800">Signed — thank you</div>
        <div className="mt-0.5 text-xs text-emerald-600">Returning to the experience…</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {config.statement ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm leading-6 text-neutral-700">
          {config.statement}
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Full name <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type your full name"
          className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-black"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Date
        </label>
        <div className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500">
          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {config.requireEmail ? (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Email <span className="font-normal normal-case text-neutral-400">(optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-black"
          />
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting" || !name.trim()}
        style={accentColor ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
        className="w-full rounded-xl border border-neutral-900 bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {status === "submitting" ? "Signing…" : "I agree and sign"}
      </button>
    </form>
  );
}

// Pre-process ((label|pageId)) and {text|color} for ReactMarkdown
function processInlineMarkup(text: string): string {
  let result = text.replace(/\(\(([^|)]+)\|([^)]+)\)\)/g, "[$1](sherpa-link:$2)");
  result = result.replace(/\{([^|}]+)\|([^}]+)\}/g, "[$1](color:$2)");
  return result;
}

function resolveColor(raw: string, accentColor: string): string {
  if (raw === "accent") return accentColor || "#2563eb";
  return raw;
}

// Render plain text with ((label|pageId)) and {text|color} inline markup
function InlineWithLinks({
  text,
  pages,
  onNavigate,
  accentColor,
}: {
  text: string;
  pages: PageItem[];
  onNavigate: (pageId: string) => void;
  accentColor: string;
}) {
  // matches ((label|pageId)) or {text|color}
  const regex = /\(\(([^|)]+)\|([^)]+)\)\)|\{([^|}]+)\|([^}]+)\}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      // ((label|pageId)) link
      const label = match[1];
      const pageId = match[2];
      const exists = pages.some((p) => p.id === pageId);
      if (exists) {
        const color = accentColor || "#2563eb";
        parts.push(
          <button
            key={key++}
            type="button"
            onClick={(e) => { e.stopPropagation(); onNavigate(pageId); }}
            className="inline cursor-pointer font-bold underline underline-offset-2"
            style={{ color }}
          >
            {label}
          </button>
        );
      } else {
        parts.push(<span key={key++}>{label}</span>);
      }
    } else {
      // {text|color} span
      const label = match[3];
      const color = resolveColor(match[4], accentColor);
      parts.push(<span key={key++} style={{ color }}>{label}</span>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <>{parts}</>;
}

// ── ProgressBarBlock ───────────────────────────────────────────

type PBPreviewStep = {
  id: string;
  label: string;
  color: string;
  iconShape: "circle" | "square" | "squircle" | "diamond" | "none";
  iconImageUrl: string;
  blocks: ContentBlock[];
};

function parsePBPreview(value: string): { orientation: "horizontal" | "vertical"; steps: PBPreviewStep[] } {
  try {
    const d = JSON.parse(value);
    return {
      orientation: (d.orientation as "horizontal" | "vertical") ?? "horizontal",
      steps: ((d.steps ?? []) as Record<string, unknown>[]).map((s) => ({
        id: (s.id as string) ?? "",
        label: (s.label as string) ?? "",
        color: (s.color as string) ?? "#3b82f6",
        iconShape: (s.iconShape as PBPreviewStep["iconShape"]) ?? "circle",
        iconImageUrl: (s.iconImageUrl as string) ?? "",
        blocks: Array.isArray(s.blocks) ? (s.blocks as ContentBlock[]) : [],
      })),
    };
  } catch {
    return { orientation: "horizontal", steps: [] };
  }
}

function shapeClasses(shape: PBPreviewStep["iconShape"]): string {
  switch (shape) {
    case "circle": return "rounded-full";
    case "squircle": return "rounded-xl";
    case "square": return "rounded-sm";
    case "diamond": return "rounded-sm rotate-45";
    default: return "rounded-full";
  }
}

function StepIcon({ step, active, index }: { step: PBPreviewStep; active: boolean; index: number }) {
  const size = active ? "w-8 h-8" : "w-6 h-6";
  const textSize = active ? "text-xs" : "text-[10px]";

  if (step.iconShape === "none") {
    return (
      <div className="relative flex items-center justify-center">
        {active ? (
          <div
            className="absolute inset-0 animate-ping rounded-full opacity-50"
            style={{ backgroundColor: step.color }}
          />
        ) : null}
        <div
          className={`relative z-10 rounded-full transition-all ${active ? "w-3.5 h-3.5" : "w-2.5 h-2.5"}`}
          style={{ backgroundColor: step.color }}
        />
      </div>
    );
  }

  const isDiamond = step.iconShape === "diamond";

  return (
    <div className="relative flex items-center justify-center">
      {active ? (
        <div
          className={`absolute inset-0 animate-ping opacity-40 ${shapeClasses(step.iconShape)}`}
          style={{ backgroundColor: step.color }}
        />
      ) : null}
      <div
        className={`relative z-10 flex items-center justify-center transition-all ${size} ${shapeClasses(step.iconShape)}`}
        style={{ backgroundColor: step.iconImageUrl ? "transparent" : step.color }}
      >
        {step.iconImageUrl ? (
          <img
            src={step.iconImageUrl}
            alt={step.label}
            className={`w-full h-full object-cover ${shapeClasses(step.iconShape)}`}
            style={isDiamond ? { transform: "rotate(-45deg)" } : undefined}
          />
        ) : (
          <span
            className={`font-bold text-white leading-none ${textSize}`}
            style={isDiamond ? { transform: "rotate(-45deg)" } : undefined}
          >
            {index + 1}
          </span>
        )}
      </div>
    </div>
  );
}

function ProgressBarBlock({
  block,
  accentColor,
  page,
  pages,
  onNavigate,
  onDismissContent,
}: {
  block: ContentBlock;
  accentColor: string;
  page: PageItem;
  pages?: PageItem[];
  onNavigate?: (pageId: string) => void;
  onDismissContent?: () => void;
}) {
  const { orientation, steps } = parsePBPreview(block.value);
  const [activeIndex, setActiveIndex] = useState(0);
  const idx = Math.min(activeIndex, Math.max(0, steps.length - 1));
  const activeStep = steps[idx];

  if (steps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500">
        Empty progress bar block
      </div>
    );
  }

  if (orientation === "vertical") {
    return (
      <div className="flex gap-3">
        {/* Left step rail */}
        <div className="flex shrink-0 flex-col items-center gap-3 pt-1">
          {steps.map((step, i) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-pressed={i === idx}
              aria-label={step.label || `Step ${i + 1}`}
              title={step.label || `Step ${i + 1}`}
              className="flex flex-col items-center gap-1 transition-opacity"
              style={i !== idx ? { opacity: 0.45 } : undefined}
            >
              <StepIcon step={step} active={i === idx} index={i} />
              {step.label ? (
                <span className="max-w-[48px] text-center text-[9px] font-medium leading-tight text-neutral-600">
                  {step.label}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          {activeStep ? (
            activeStep.blocks.length > 0 ? (
              <PreviewBlocks
                accentColor={accentColor}
                onNavigate={onNavigate}
                onDismissContent={onDismissContent}
                page={{ ...page, blocks: activeStep.blocks, summary: "" }}
                pages={pages}
              />
            ) : (
              <div className="text-sm text-neutral-400">Empty step</div>
            )
          ) : null}
        </div>
      </div>
    );
  }

  // Horizontal layout
  return (
    <div>
      {/* Sticky step indicator rail */}
      <div className="sticky top-0 z-10 -mx-px mb-3 flex items-center gap-3 overflow-x-auto rounded-t-xl border-b border-neutral-100 bg-white/95 px-3 py-2.5 backdrop-blur-sm">
        {steps.map((step, i) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setActiveIndex(i)}
            aria-pressed={i === idx}
            className="flex shrink-0 flex-col items-center gap-1 transition-opacity"
            style={i !== idx ? { opacity: 0.45 } : undefined}
          >
            <StepIcon step={step} active={i === idx} index={i} />
            {step.label ? (
              <span className="max-w-[56px] text-center text-[9px] font-medium leading-tight text-neutral-700">
                {step.label}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Active step content */}
      {activeStep ? (
        activeStep.blocks.length > 0 ? (
          <PreviewBlocks
            accentColor={accentColor}
            onNavigate={onNavigate}
            onDismissContent={onDismissContent}
            page={{ ...page, blocks: activeStep.blocks, summary: "" }}
            pages={pages}
          />
        ) : (
          <div className="text-sm text-neutral-400">Empty step</div>
        )
      ) : null}
    </div>
  );
}

// ── TabsBlock ──────────────────────────────────────────────────
type TabPreviewSection = { id: string; label: string; blocks: ContentBlock[] };

function parseTabPreviewSections(value: string): TabPreviewSection[] {
  try {
    const data = JSON.parse(value);
    return (data.sections ?? []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      label: (s.label as string) ?? "",
      // backward-compat: old format used content: string
      blocks: Array.isArray(s.blocks)
        ? (s.blocks as ContentBlock[])
        : (s.content ? [{ id: `${s.id as string}-b0`, type: "text" as ContentBlock["type"], value: s.content as string }] : []),
    }));
  } catch {
    return [];
  }
}

function TabsBlock({
  block,
  accentColor,
  page,
  pages,
  onNavigate,
  onDismissContent,
}: {
  block: ContentBlock;
  accentColor: string;
  page: PageItem;
  pages?: PageItem[];
  onNavigate?: (pageId: string) => void;
  onDismissContent?: () => void;
}) {
  const sections = parseTabPreviewSections(block.value);
  const [activeIndex, setActiveIndex] = useState(0);
  const idx = Math.min(activeIndex, Math.max(0, sections.length - 1));
  const activeSection = sections[idx];

  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500">
        Empty tabs block
      </div>
    );
  }

  return (
    <div>
      {/* Tab bar — centered */}
      <div className="mb-3 flex justify-center border-b border-neutral-200">
        {sections.map((section, i) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`-mb-px px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
              i === idx ? "" : "border-transparent text-neutral-400 hover:text-neutral-600"
            }`}
            style={i === idx ? { borderColor: accentColor || "#171717", color: accentColor || "#171717" } : {}}
          >
            {section.label || `Tab ${i + 1}`}
          </button>
        ))}
      </div>
      {/* Active section blocks */}
      {activeSection ? (
        activeSection.blocks.length > 0 ? (
          <PreviewBlocks
            accentColor={accentColor}
            onNavigate={onNavigate}
            onDismissContent={onDismissContent}
            page={{ ...page, blocks: activeSection.blocks, summary: "" }}
            pages={pages}
          />
        ) : (
          <div className="text-sm text-neutral-400">Empty tab</div>
        )
      ) : null}
    </div>
  );
}

export function PreviewBlocks({
  accentColor,
  onNavigate,
  onDismissContent,
  page,
  pages,
}: {
  accentColor: string;
  onNavigate?: (pageId: string) => void;
  onDismissContent?: () => void;
  page: PageItem;
  pages?: PageItem[];
}) {
  const hasAnyContent =
    page.summary.trim().length > 0 ||
    page.blocks.some((block) => block.type === "consent" || block.value.trim().length > 0);

  if (!hasAnyContent) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-sm leading-6 text-neutral-500">
        No content yet. Add a summary or content blocks to make this page feel
        complete.
      </div>
    );
  }

  const dotColor = accentColor || "#171717";
  const canLink = !!(onNavigate && pages);
  const hasHalfBlock = page.blocks.some((b) => b.blockWidth === "half");

  function alignClass(block: { textAlign?: string }) {
    if (block.textAlign === "center") return "text-center";
    if (block.textAlign === "right") return "text-right";
    return "text-left";
  }

  function selfAlignClass(block: { verticalAlign?: string }) {
    if (block.verticalAlign === "middle") return "self-center";
    if (block.verticalAlign === "bottom") return "self-end";
    return "self-start";
  }

  function getEffectiveFormat(block: { type: string; blockFormat?: string }) {
    if (block.blockFormat) return block.blockFormat;
    if (block.type === "steps") return "steps";
    return "prose";
  }

  return (
    <div className="space-y-3">
      {page.summary.trim() ? (
        <p className="text-sm leading-6 text-neutral-600">
          {canLink ? (
            <InlineWithLinks
              text={page.summary}
              pages={pages!}
              onNavigate={onNavigate!}
              accentColor={accentColor}
            />
          ) : (
            page.summary
          )}
        </p>
      ) : null}

      <div className={hasHalfBlock ? "grid grid-cols-2 gap-2 items-start" : "space-y-2"}>
      {page.blocks.map((block) => {
        const spanClass = hasHalfBlock && block.blockWidth !== "half" ? "col-span-2" : "";
        const selfAlign = hasHalfBlock ? selfAlignClass(block) : "";
        const blockClass = `${spanClass} ${selfAlign}`.trim();

        if (block.type === "text" || block.type === "steps") {
          const format = getEffectiveFormat(block);

          // Heading formats
          if (format === "h2") {
            return (
              <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`${alignClass(block)} ${blockClass}`}>
                <h2 className="text-base font-bold text-neutral-900 leading-tight">
                  {block.value || <span className="text-neutral-400 font-normal">Empty heading</span>}
                </h2>
              </div>
            );
          }
          if (format === "h3") {
            return (
              <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`${alignClass(block)} ${blockClass}`}>
                <h3 className="text-sm font-semibold text-neutral-800 leading-snug">
                  {block.value || <span className="text-neutral-400 font-normal">Empty heading</span>}
                </h3>
              </div>
            );
          }

          // Bullet list
          if (format === "bullets") {
            const items = block.value.split("\n").map((s) => s.trim()).filter(Boolean);
            return items.length > 0 ? (
              <ul key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`list-none space-y-1 ${alignClass(block)} ${blockClass}`}>
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                    <span className="text-sm leading-6 text-neutral-700">
                      {canLink ? (
                        <InlineWithLinks text={item} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} />
                      ) : item}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500 ${blockClass}`}>
                Empty list block
              </div>
            );
          }

          // Numbered / steps
          if (format === "steps") {
            const items = block.value.split("\n").map((s) => s.trim()).filter(Boolean);
            return items.length > 0 ? (
              <ol key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`list-none space-y-2 ${alignClass(block)} ${blockClass}`}>
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: dotColor }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm leading-6 text-neutral-700">
                      {canLink ? (
                        <InlineWithLinks text={item} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} />
                      ) : item}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500 ${blockClass}`}>
                Empty steps block
              </div>
            );
          }

          // Prose (default markdown)
          return (
            <div
              key={block.id}
              data-a11y-id={block.id}
              data-a11y-type="block"
              className={`text-sm leading-6 text-neutral-700 prose prose-sm max-w-none prose-p:my-0 prose-headings:mb-1 ${alignClass(block)} ${blockClass}`}
            >
              {block.value ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  urlTransform={(url) => url}
                  components={{
                    a: ({ href, children }) => {
                      if (href?.startsWith("color:")) {
                        const color = resolveColor(href.slice(6), accentColor);
                        return <span style={{ color }}>{children}</span>;
                      }
                      if (href?.startsWith("sherpa-link:")) {
                        const pageId = href.slice("sherpa-link:".length);
                        const exists = pages?.some((p) => p.id === pageId);
                        if (exists && onNavigate) {
                          const color = accentColor || "#2563eb";
                          return (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onNavigate(pageId); }}
                              className="cursor-pointer font-bold underline underline-offset-2"
                              style={{ color }}
                            >
                              {children}
                            </button>
                          );
                        }
                        return <span>{children}</span>;
                      }
                      return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
                    },
                  }}
                >
                  {processInlineMarkup(block.value)}
                </ReactMarkdown>
              ) : (
                "Empty text block"
              )}
            </div>
          );
        }

        if (block.type === "callout") {
          const variant = block.variant ?? "info";
          const variantStyles = {
            info: "bg-sky-50 border-sky-200 text-sky-900",
            warning: "bg-amber-50 border-amber-200 text-amber-900",
            tip: "bg-emerald-50 border-emerald-200 text-emerald-900",
          };
          const variantIcon = {
            info: "ℹ",
            warning: "⚠",
            tip: "✦",
          };
          return (
            <div
              key={block.id}
              data-a11y-id={block.id}
              data-a11y-type="block"
              className={`flex gap-2.5 rounded-xl border px-3 py-3 text-sm leading-6 ${variantStyles[variant]} ${alignClass(block)} ${blockClass}`}
            >
              <span className="mt-0.5 shrink-0 text-[13px]">
                {variantIcon[variant]}
              </span>
              <span>
                {canLink ? (
                  <InlineWithLinks
                    text={block.value || "Empty callout block"}
                    pages={pages!}
                    onNavigate={onNavigate!}
                    accentColor={accentColor}
                  />
                ) : (block.value || "Empty callout block")}
              </span>
            </div>
          );
        }

        if (block.type === "image") {
          const fitClass = block.imageFit === "contain" ? "object-contain"
            : block.imageFit === "fill" ? "object-fill"
            : block.imageFit === "center" ? "object-none"
            : "object-cover";
          const pos = block.imagePosition;
          const posStyle = pos ? { objectPosition: `${pos.x}% ${pos.y}%` } : undefined;
          return block.value ? (
            <img
              key={block.id}
              data-a11y-id={block.id}
              data-a11y-type="block"
              src={block.value}
              alt=""
              style={posStyle}
              className={`max-h-56 w-full rounded-xl ${fitClass} ${blockClass}`}
            />
          ) : (
            <div
              key={block.id}
              data-a11y-id={block.id}
              data-a11y-type="block"
              className={`rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500 ${blockClass}`}
            >
              Empty image block
            </div>
          );
        }

        if (block.type === "consent") {
          return (
            <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={hasHalfBlock ? "col-span-2" : ""}>
              <ConsentFormBlock
                block={block}
                accentColor={accentColor}
                gameName={page.title || "Untitled"}
                onDismissContent={onDismissContent}
              />
            </div>
          );
        }

        if (block.type === "tabs") {
          return (
            <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={hasHalfBlock ? "col-span-2" : ""}>
              <TabsBlock
                block={block}
                accentColor={accentColor}
                page={page}
                pages={pages}
                onNavigate={onNavigate}
                onDismissContent={onDismissContent}
              />
            </div>
          );
        }

        if (block.type === "progress-bar") {
          return (
            <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={hasHalfBlock ? "col-span-2" : ""}>
              <ProgressBarBlock
                block={block}
                accentColor={accentColor}
                page={page}
                pages={pages}
                onNavigate={onNavigate}
                onDismissContent={onDismissContent}
              />
            </div>
          );
        }

        // video — always full width
        const videoSpan = hasHalfBlock ? "col-span-2" : "";
        return block.value ? (
          <div
            key={block.id}
            data-a11y-id={block.id}
            data-a11y-type="block"
            className={`overflow-hidden rounded-xl border border-neutral-200 ${videoSpan}`}
          >
            <video src={block.value} controls className="max-h-64 w-full bg-black" />
          </div>
        ) : (
          <div
            key={block.id}
            data-a11y-id={block.id}
            data-a11y-type="block"
            className={`rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500 ${videoSpan}`}
          >
            Empty video block
          </div>
        );
      })}
      </div>
    </div>
  );
}
