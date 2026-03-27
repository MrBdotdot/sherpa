"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

// ── SectionBlock ───────────────────────────────────────────────

function SectionBlock({ block }: { block: ContentBlock }) {
  const label = block.value.trim();
  return (
    <div id={block.id} className="flex items-center gap-3 py-2">
      {label ? (
        <>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{label}</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </>
      ) : (
        <div className="h-px w-full bg-neutral-200" />
      )}
    </div>
  );
}

// ── StepRailBlock ──────────────────────────────────────────────

type SRIconShape = "circle" | "square" | "squircle" | "diamond" | "none";

type SRPreviewStep = {
  id: string;
  label: string;
  color: string;
  iconImageUrl: string;
  sectionBlockId: string;
};

type SRPreviewData = {
  orientation: "horizontal" | "vertical";
  iconShape: SRIconShape;
  showPing: boolean;
  steps: SRPreviewStep[];
};

function parseSRPreview(value: string): SRPreviewData {
  try {
    const d = JSON.parse(value);
    return {
      orientation: (d.orientation as "horizontal" | "vertical") ?? "vertical",
      iconShape: (d.iconShape as SRIconShape) ?? "circle",
      showPing: d.showPing !== false,
      steps: ((d.steps ?? []) as Record<string, unknown>[]).map((s) => ({
        id: (s.id as string) ?? "",
        label: (s.label as string) ?? "",
        color: (s.color as string) ?? "#3b82f6",
        iconImageUrl: (s.iconImageUrl as string) ?? "",
        sectionBlockId: (s.sectionBlockId as string) ?? "",
      })),
    };
  } catch {
    return { orientation: "vertical", iconShape: "circle", showPing: true, steps: [] };
  }
}

function srShapeClasses(shape: SRIconShape): string {
  switch (shape) {
    case "circle": return "rounded-full";
    case "squircle": return "rounded-xl";
    case "square": return "rounded-sm";
    case "diamond": return "rounded-sm rotate-45";
    default: return "rounded-full";
  }
}

function SRStepIcon({
  step,
  active,
  index,
  iconShape,
  showPing,
}: {
  step: SRPreviewStep;
  active: boolean;
  index: number;
  iconShape: SRIconShape;
  showPing: boolean;
}) {
  const size = active ? "w-8 h-8" : "w-6 h-6";
  const textSize = active ? "text-xs" : "text-[10px]";
  const isDiamond = iconShape === "diamond";

  if (iconShape === "none") {
    return (
      <div className="relative flex items-center justify-center">
        {active && showPing && (
          <div className="absolute inset-0 animate-ping rounded-full opacity-50" style={{ backgroundColor: step.color }} />
        )}
        <div
          className={`relative z-10 rounded-full transition-all ${active ? "w-3.5 h-3.5" : "w-2.5 h-2.5"}`}
          style={{ backgroundColor: step.color }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center">
      {active && showPing && (
        <div className={`absolute inset-0 animate-ping opacity-40 ${srShapeClasses(iconShape)}`} style={{ backgroundColor: step.color }} />
      )}
      <div
        className={`relative z-10 flex items-center justify-center transition-all ${size} ${srShapeClasses(iconShape)}`}
        style={{ backgroundColor: step.iconImageUrl ? "transparent" : step.color }}
      >
        {step.iconImageUrl ? (
          <img
            src={step.iconImageUrl}
            alt={step.label}
            className={`w-full h-full object-cover ${srShapeClasses(iconShape)}`}
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

function StepRailBlock({ block, beyondSectionIds = [] }: { block: ContentBlock; beyondSectionIds?: string[] }) {
  const data = parseSRPreview(block.value);
  const linkedSteps = data.steps.filter((s) => s.sectionBlockId);
  const [activeStepId, setActiveStepId] = useState<string>(linkedSteps[0]?.id ?? "");
  const [hidden, setHidden] = useState(false);
  const [animClass, setAnimClass] = useState("");
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (linkedSteps.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const step = linkedSteps.find((s) => s.sectionBlockId === entry.target.id);
            if (step) setActiveStepId(step.id);
          }
        }
      },
      { rootMargin: "0px 0px -60% 0px", threshold: 0 }
    );
    linkedSteps.forEach((s) => {
      const el = document.getElementById(s.sectionBlockId);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.value]);

  useEffect(() => {
    if (beyondSectionIds.length === 0) return;
    const lastStep = linkedSteps.at(-1);
    if (!lastStep) return;
    const sectionEl = document.getElementById(lastStep.sectionBlockId);
    if (!sectionEl) return;

    // Walk up to find the nearest overflow-y scroll container
    let scrollParent: Element | null = sectionEl.parentElement;
    while (scrollParent && scrollParent !== document.documentElement) {
      const { overflowY } = window.getComputedStyle(scrollParent);
      if (overflowY === "auto" || overflowY === "scroll") break;
      scrollParent = scrollParent.parentElement;
    }
    const scroller = scrollParent ?? document.documentElement;

    const check = () => {
      const rect = sectionEl.getBoundingClientRect();
      const containerTop = scrollParent ? scrollParent.getBoundingClientRect().top : 0;
      setHidden(rect.bottom < containerTop);
    };

    scroller.addEventListener("scroll", check, { passive: true });
    check();
    return () => scroller.removeEventListener("scroll", check);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beyondSectionIds.join(","), block.value]);

  useEffect(() => {
    if (!hasMountedRef.current) { hasMountedRef.current = true; return; }
    if (data.orientation === "vertical") {
      setAnimClass(hidden ? "step-rail-out" : "step-rail-in");
    } else {
      setAnimClass(hidden ? "step-rail-horiz-out" : "step-rail-horiz-in");
    }
  }, [hidden]); // eslint-disable-line react-hooks/exhaustive-deps

  function scrollToSection(sectionBlockId: string) {
    document.getElementById(sectionBlockId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const activeIdx = data.steps.findIndex((s) => s.id === activeStepId);

  if (data.steps.length === 0) return null;

  if (data.orientation === "vertical") {
    return (
      <div className={`flex flex-col items-center pt-1 w-10 flex-shrink-0 ${animClass} ${hidden ? "pointer-events-none" : ""}`}>
        {data.steps.map((step, i) => (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => step.sectionBlockId && scrollToSection(step.sectionBlockId)}
              disabled={!step.sectionBlockId}
              aria-label={step.label || `Step ${i + 1}`}
              title={step.label || `Step ${i + 1}`}
              className="flex flex-col items-center gap-1 transition-opacity disabled:cursor-default"
              style={activeStepId && activeStepId !== step.id ? { opacity: 0.4 } : undefined}
            >
              <SRStepIcon step={step} active={activeStepId === step.id} index={i} iconShape={data.iconShape} showPing={data.showPing} />
              {step.label && (
                <span className="max-w-[40px] text-center text-[9px] font-medium leading-tight text-neutral-600">
                  {step.label}
                </span>
              )}
            </button>
            {i < data.steps.length - 1 && (
              <div
                className="my-1 h-3 w-0.5 flex-none rounded-full"
                style={{ backgroundColor: activeIdx > i ? step.color : "#e5e7eb" }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Horizontal
  return (
    <div className={`flex items-start overflow-hidden border-b border-neutral-100 bg-white/95 px-2 py-2 ${animClass} ${hidden ? "pointer-events-none" : ""}`}>
      {data.steps.map((step, i) => (
        <React.Fragment key={step.id}>
          <button
            type="button"
            onClick={() => step.sectionBlockId && scrollToSection(step.sectionBlockId)}
            disabled={!step.sectionBlockId}
            className="flex shrink-0 flex-col items-center gap-1 transition-opacity disabled:cursor-default"
            style={activeStepId && activeStepId !== step.id ? { opacity: 0.4 } : undefined}
          >
            <SRStepIcon step={step} active={activeStepId === step.id} index={i} iconShape={data.iconShape} showPing={data.showPing} />
            {step.label && (
              <span className="max-w-[56px] text-center text-[9px] font-medium leading-tight text-neutral-700">
                {step.label}
              </span>
            )}
          </button>
          {i < data.steps.length - 1 && (
            <div
              className="mt-3 mx-1.5 h-0.5 flex-1 self-start rounded-full"
              style={{ backgroundColor: activeIdx > i ? step.color : "#e5e7eb" }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── CarouselBlock ──────────────────────────────────────────────

type CarouselPreviewSlide = { id: string; label: string; blocks: ContentBlock[] };

function parseCarouselPreview(value: string): CarouselPreviewSlide[] {
  try {
    const d = JSON.parse(value);
    return (d.slides ?? []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      label: (s.label as string) ?? "",
      blocks: Array.isArray(s.blocks) ? (s.blocks as ContentBlock[]) : [],
    }));
  } catch {
    return [];
  }
}

function CarouselBlock({
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
  const slides = parseCarouselPreview(block.value);
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const idx = Math.min(current, Math.max(0, slides.length - 1));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") setCurrent((c) => Math.max(0, c - 1));
      if (e.key === "ArrowRight") setCurrent((c) => Math.min(slides.length - 1, c + 1));
    }
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [slides.length]);

  if (slides.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500">
        Empty carousel block
      </div>
    );
  }

  const activeSlide = slides[idx];

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="rounded-xl border border-neutral-200 overflow-hidden outline-none"
      onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStart === null) return;
        const diff = touchStart - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) {
          if (diff > 0) setCurrent((c) => Math.min(slides.length - 1, c + 1));
          else setCurrent((c) => Math.max(0, c - 1));
        }
        setTouchStart(null);
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
        <span className="text-sm font-semibold text-neutral-800">{activeSlide.label || `Slide ${idx + 1}`}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={idx === 0}
            className="rounded-lg p-1 text-neutral-400 transition hover:bg-neutral-100 disabled:opacity-30"
            aria-label="Previous slide"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="min-w-[32px] text-center text-[10px] text-neutral-400">{idx + 1}/{slides.length}</span>
          <button
            type="button"
            onClick={() => setCurrent((c) => Math.min(slides.length - 1, c + 1))}
            disabled={idx === slides.length - 1}
            className="rounded-lg p-1 text-neutral-400 transition hover:bg-neutral-100 disabled:opacity-30"
            aria-label="Next slide"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Slide content */}
      <div className="p-3">
        {activeSlide.blocks.length > 0 ? (
          <PreviewBlocks
            accentColor={accentColor}
            onNavigate={onNavigate}
            onDismissContent={onDismissContent}
            page={{ ...page, blocks: activeSlide.blocks, summary: "" }}
            pages={pages}
          />
        ) : (
          <div className="text-sm text-neutral-400">Empty slide</div>
        )}
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-3">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="rounded-full transition-all"
              style={{
                width: i === idx ? 16 : 6,
                height: 6,
                backgroundColor: i === idx ? (accentColor || "#171717") : "#e5e7eb",
              }}
            />
          ))}
        </div>
      )}
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

// ── ImageBlock ─────────────────────────────────────────────────

function ImageBlock({ block, blockClass }: { block: ContentBlock; blockClass: string }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const fitClass = block.imageFit === "contain" ? "object-contain"
    : block.imageFit === "fill" ? "object-fill"
    : block.imageFit === "center" ? "object-none"
    : "object-cover";
  const pos = block.imagePosition;
  const posStyle = pos ? { objectPosition: `${pos.x}% ${pos.y}%` } : undefined;

  const sized = !!block.imageSize;
  const imgSizeClass = block.imageSize === "small" ? "max-h-32 max-w-[120px] w-full"
    : block.imageSize === "medium" ? "max-h-48 max-w-[240px] w-full"
    : block.imageSize === "large" ? "max-h-64 max-w-[360px] w-full"
    : "max-h-56 w-full";

  if (!block.value) {
    return (
      <div className={`rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500 ${blockClass}`}>
        Empty image block
      </div>
    );
  }

  return (
    <figure className={`m-0 ${sized ? "flex flex-col items-center" : ""} ${blockClass}`}>
      <img
        src={block.value}
        alt={block.imageCaption ?? ""}
        style={posStyle}
        className={`rounded-xl ${fitClass} ${imgSizeClass} ${block.imageLightbox ? "cursor-zoom-in" : ""}`}
        onClick={block.imageLightbox ? () => setLightboxOpen(true) : undefined}
      />
      {block.imageCaption ? (
        <figcaption className="mt-1.5 text-center text-xs text-neutral-500">
          {block.imageCaption}
        </figcaption>
      ) : null}
      {lightboxOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            aria-label="Close lightbox"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setLightboxOpen(false)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M2 2l14 14M16 2 2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <img
            src={block.value}
            alt={block.imageCaption ?? ""}
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {block.imageCaption ? (
            <p className="mt-3 text-sm text-white/75">{block.imageCaption}</p>
          ) : null}
        </div>,
        document.body
      )}
    </figure>
  );
}

// ── TabsBlock ───────────────────────────────────────────────────

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
  header,
}: {
  accentColor: string;
  onNavigate?: (pageId: string) => void;
  onDismissContent?: () => void;
  page: PageItem;
  pages?: PageItem[];
  header?: React.ReactNode;
}) {
  const hasAnyContent =
    page.summary.trim().length > 0 ||
    page.blocks.some(
      (block) =>
        block.type === "consent" ||
        block.type === "section" ||
        block.type === "step-rail" ||
        block.type === "carousel" ||
        block.value.trim().length > 0
    );

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

  const stepRailBlock = page.blocks.find((b) => b.type === "step-rail");
  const otherBlocks = stepRailBlock ? page.blocks.filter((b) => b.type !== "step-rail") : page.blocks;
  const srOrientation: "horizontal" | "vertical" = (() => {
    if (!stepRailBlock) return "vertical";
    try { return (JSON.parse(stepRailBlock.value).orientation as "horizontal" | "vertical") ?? "vertical"; }
    catch { return "vertical"; }
  })();
  const srBeyondSectionIds: string[] = (() => {
    if (!stepRailBlock) return [];
    const srSteps = parseSRPreview(stepRailBlock.value).steps.filter((s) => s.sectionBlockId);
    const lastLinkedId = srSteps.at(-1)?.sectionBlockId;
    if (!lastLinkedId) return [];
    const lastIdx = otherBlocks.findIndex((b) => b.id === lastLinkedId);
    if (lastIdx < 0) return [];
    return otherBlocks.slice(lastIdx + 1).filter((b) => b.type === "section").map((b) => b.id);
  })();

  const hasHalfBlock = otherBlocks.some((b) => b.blockWidth === "half");

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

  const blockList = (
    <div className={hasHalfBlock ? "grid grid-cols-2 gap-2 items-start" : "space-y-2"}>
      {otherBlocks.map((block) => {
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
          return (
            <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={blockClass}>
              <ImageBlock block={block} blockClass="" />
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

        if (block.type === "section") {
          return (
            <div key={block.id} className={hasHalfBlock ? "col-span-2" : ""}>
              <SectionBlock block={block} />
            </div>
          );
        }

        if (block.type === "carousel") {
          return (
            <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={hasHalfBlock ? "col-span-2" : ""}>
              <CarouselBlock
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
  );

  const summary = page.summary.trim() ? (
    <p className="text-sm leading-6 text-neutral-600">
      {canLink ? (
        <InlineWithLinks text={page.summary} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} />
      ) : (
        page.summary
      )}
    </p>
  ) : null;

  if (stepRailBlock && srOrientation === "vertical") {
    return (
      <div className="space-y-3">
        {summary}
        <div className="flex items-start gap-2">
          <div style={{ position: "sticky", top: 0, alignSelf: "flex-start", flexShrink: 0 }}>
            <StepRailBlock block={stepRailBlock} beyondSectionIds={srBeyondSectionIds} />
          </div>
          <div className="min-w-0 flex-1">
            {header ? <div className="mb-3">{header}</div> : null}
            {blockList}
          </div>
        </div>
      </div>
    );
  }

  if (stepRailBlock && srOrientation === "horizontal") {
    return (
      <div className="space-y-3">
        {header}
        {summary}
        <div style={{ position: "sticky", top: 0, zIndex: 10 }}>
          <StepRailBlock block={stepRailBlock} beyondSectionIds={srBeyondSectionIds} />
        </div>
        {blockList}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {header}
      {summary}
      {blockList}
    </div>
  );
}
