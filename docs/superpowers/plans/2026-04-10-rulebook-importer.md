# Rulebook Importer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a rulebook importer to the empty canvas state — paste text or upload a PDF, Claude structures it into draft Sherpa cards that land directly on the canvas.

**Architecture:** Empty canvas shows an overlay with "Import rulebook" / "Start blank" buttons. Import opens a modal (paste text tab + upload PDF tab). Client POSTs to `/api/import/rulebook` (text) or `/api/import/rulebook/pdf` (multipart); the PDF route extracts text with `pdf-parse` then calls the text route internally. The text route calls Claude via the Anthropic SDK, maps the JSON response to `PageItem[]`, and persists via `supabaseAdmin`.

**Tech Stack:** Next.js App Router API routes, `@anthropic-ai/sdk`, `pdf-parse`, Supabase, existing `createBlock` / `createBasePage` helpers from `authoring-utils.ts`.

---

## File map

| File | Action | Purpose |
|---|---|---|
| `app/_components/rulebook-importer-modal.tsx` | Create | Two-tab modal (paste/PDF), loading + error states |
| `app/_components/canvas-empty-overlay.tsx` | Create | Empty-canvas overlay with Import + Start blank CTAs |
| `app/api/import/rulebook/route.ts` | Create | Accepts `{ text, gameId }`, calls Claude, persists cards |
| `app/api/import/rulebook/pdf/route.ts` | Create | Accepts `multipart/form-data` PDF, extracts text, calls rulebook route |
| `app/_hooks/useStudioModals.ts` | Modify | Add `isRulebookImportOpen` state |
| `app/_components/authoring-studio.tsx` | Modify | Wire overlay + modal, pass `onImportComplete` reload |
| `app/_lib/authoring-utils.ts` | Modify | Export `createBasePage` (currently private) OR add `createImportedPage` helper |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Anthropic SDK and pdf-parse**

```bash
npm install @anthropic-ai/sdk pdf-parse
npm install --save-dev @types/pdf-parse
```

- [ ] **Step 2: Add ANTHROPIC_API_KEY to env**

Open `.env.local` and add:
```
ANTHROPIC_API_KEY=your_key_here
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @anthropic-ai/sdk and pdf-parse dependencies"
```

---

## Task 2: Add `createImportedPage` helper

**Files:**
- Modify: `app/_lib/authoring-utils.ts`

The existing `createBasePage` is a private function. Rather than exporting it (which would widen its API surface), we add a focused helper for the importer's needs.

- [ ] **Step 1: Add the helper after `createHotspotPage` (~line 363)**

```typescript
/**
 * Creates a PageItem from structured importer data.
 * `kind` defaults to "page"; `interactionType` defaults to "modal".
 */
export function createImportedPage(
  title: string,
  kind: PageItem["kind"] = "page",
  interactionType: InteractionType = "modal",
  blocks: ContentBlock[],
  count: number,
): PageItem {
  return {
    id: createId(kind),
    kind,
    title: title || `Page ${count}`,
    summary: "",
    heroImage: DEFAULT_HERO,
    x: null,
    y: null,
    contentX: 50,
    contentY: 50,
    blocks,
    socialLinks: [],
    publicUrl: "",
    showQrCode: false,
    interactionType,
    pageButtonPlacement: "bottom",
    templateId: "blank",
    canvasFeatures: [],
    cardSize: "medium",
    contentTintColor: "",
    contentTintOpacity: 85,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_lib/authoring-utils.ts
git commit -m "feat: add createImportedPage helper to authoring-utils"
```

---

## Task 3: API route — `/api/import/rulebook`

**Files:**
- Create: `app/api/import/rulebook/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { createImportedPage, createBlock } from "@/app/_lib/authoring-utils";
import { ContentBlockType, InteractionType, PageItem } from "@/app/_lib/authoring-types";

const SYSTEM_PROMPT = `You are a structural parser for board game rulebooks. Your job is to reorganize the publisher's own words into a set of Sherpa cards.

Rules:
- Do NOT invent, summarize, or paraphrase — use the original text.
- Identify logical sections (e.g. Setup, Taking a Turn, Scoring, Winning, FAQ).
- For each section, produce one card. Dense reference sections (full rules, glossary) use interactionType "full-page"; everything else uses "modal".
- kind is always "page" unless the content clearly describes a specific physical board element (then "hotspot").
- blocks: use "section" for subheadings, "steps" for numbered/bulleted lists (newline-separated steps), "callout" for tips/warnings/notes, "text" for everything else.
- Return ONLY valid JSON, no markdown, no explanation.

Response format:
{
  "cards": [
    {
      "title": "string",
      "kind": "page" | "hotspot",
      "interactionType": "modal" | "full-page",
      "blocks": [
        { "type": "text" | "section" | "steps" | "callout", "value": "string" }
      ]
    }
  ]
}`;

const MAX_TEXT_CHARS = 80000;

function cookiesFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return cookieHeader.split(";").map((c) => {
    const [name, ...rest] = c.trim().split("=");
    return { name: name.trim(), value: rest.join("=") };
  });
}

type ImportedBlock = { type: string; value: string };
type ImportedCard = {
  title: string;
  kind: string;
  interactionType: string;
  blocks: ImportedBlock[];
};

export async function POST(request: Request) {
  // 1. Auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll: () => cookiesFromRequest(request),
        setAll: () => {},
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: { text?: unknown; gameId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, gameId } = body;
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Missing or empty text" }, { status: 400 });
  }
  if (typeof gameId !== "string") {
    return NextResponse.json({ error: "Missing gameId" }, { status: 400 });
  }

  // 3. Verify game ownership
  const { data: game, error: gameError } = await supabaseAdmin
    .from("games")
    .select("id, card_order")
    .eq("id", gameId)
    .eq("user_id", user.id)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // 4. Truncate text
  const truncated = text.slice(0, MAX_TEXT_CHARS);

  // 5. Call Claude
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let rawJson: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Rulebook text:\n\n${truncated}` }],
    });
    const firstBlock = message.content[0];
    if (firstBlock.type !== "text") throw new Error("Unexpected response type");
    rawJson = firstBlock.text;
  } catch (err) {
    console.error("[import/rulebook] Claude error:", err);
    return NextResponse.json({ error: "Failed to parse rulebook" }, { status: 500 });
  }

  // 6. Parse JSON response
  let parsed: { cards: ImportedCard[] };
  try {
    // Strip markdown code fences if Claude added them
    const cleaned = rawJson.replace(/^```(?:json)?\n?/m, "").replace(/```$/m, "").trim();
    parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed.cards)) throw new Error("cards is not an array");
  } catch (err) {
    console.error("[import/rulebook] JSON parse error:", err, rawJson.slice(0, 500));
    return NextResponse.json({ error: "Failed to parse rulebook" }, { status: 500 });
  }

  // 7. Map to PageItems
  const VALID_BLOCK_TYPES = new Set<ContentBlockType>(["text", "section", "steps", "callout"]);
  const VALID_KINDS: PageItem["kind"][] = ["page", "hotspot"];
  const VALID_INTERACTION_TYPES: InteractionType[] = ["modal", "full-page"];

  const newPages: PageItem[] = parsed.cards.map((card, i) => {
    const kind: PageItem["kind"] = VALID_KINDS.includes(card.kind as PageItem["kind"])
      ? (card.kind as PageItem["kind"])
      : "page";
    const interactionType: InteractionType = VALID_INTERACTION_TYPES.includes(card.interactionType as InteractionType)
      ? (card.interactionType as InteractionType)
      : "modal";
    const blocks = (card.blocks ?? [])
      .filter((b) => VALID_BLOCK_TYPES.has(b.type as ContentBlockType))
      .map((b) => createBlock(b.type as ContentBlockType, b.value ?? ""));

    return createImportedPage(card.title, kind, interactionType, blocks, i + 1);
  });

  if (newPages.length === 0) {
    return NextResponse.json({ error: "No cards could be extracted" }, { status: 422 });
  }

  // 8. Persist: upsert new cards + append to card_order
  const cardRows = newPages.map((page) => ({
    id: page.id,
    game_id: gameId,
    kind: page.kind,
    title: page.title,
    summary: page.summary,
    hero_image: page.heroImage,
    x: page.x,
    y: page.y,
    mobile_x: null,
    mobile_y: null,
    content_x: page.contentX,
    content_y: page.contentY,
    mobile_content_x: null,
    mobile_content_y: null,
    blocks: page.blocks,
    social_links: page.socialLinks,
    canvas_features: page.canvasFeatures,
    public_url: page.publicUrl,
    show_qr_code: page.showQrCode,
    interaction_type: page.interactionType,
    page_button_placement: page.pageButtonPlacement,
    template_id: page.templateId,
    card_size: page.cardSize,
    content_tint_color: page.contentTintColor,
    content_tint_opacity: page.contentTintOpacity,
    world_position: null,
    world_normal: null,
  }));

  const { error: upsertError } = await supabaseAdmin.from("cards").upsert(cardRows);
  if (upsertError) {
    console.error("[import/rulebook] card upsert error:", upsertError);
    return NextResponse.json({ error: "Failed to save cards" }, { status: 500 });
  }

  const existingOrder: string[] = game.card_order ?? [];
  const newOrder = [...existingOrder, ...newPages.map((p) => p.id)];
  const { error: orderError } = await supabaseAdmin
    .from("games")
    .update({ card_order: newOrder })
    .eq("id", gameId);

  if (orderError) {
    console.error("[import/rulebook] card_order update error:", orderError);
    return NextResponse.json({ error: "Failed to update card order" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: newPages.length });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/import/rulebook/route.ts
git commit -m "feat: add /api/import/rulebook route — Claude-powered card generation"
```

---

## Task 4: API route — `/api/import/rulebook/pdf`

**Files:**
- Create: `app/api/import/rulebook/pdf/route.ts`

- [ ] **Step 1: Create the PDF extraction route**

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import pdfParse from "pdf-parse";

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20MB

function cookiesFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return cookieHeader.split(";").map((c) => {
    const [name, ...rest] = c.trim().split("=");
    return { name: name.trim(), value: rest.join("=") };
  });
}

export async function POST(request: Request) {
  // 1. Auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll: () => cookiesFromRequest(request),
        setAll: () => {},
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const gameId = formData.get("gameId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (typeof gameId !== "string") {
    return NextResponse.json({ error: "Missing gameId" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF exceeds 20MB limit" }, { status: 413 });
  }

  // 3. Extract text
  let text: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await pdfParse(buffer);
    text = result.text;
  } catch (err) {
    console.error("[import/rulebook/pdf] pdf-parse error:", err);
    return NextResponse.json({ error: "Could not read PDF" }, { status: 422 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "PDF contains no extractable text" }, { status: 422 });
  }

  // 4. Forward to text route
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const forwardRes = await fetch(`${baseUrl}/api/import/rulebook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Forward the session cookie so auth works
      cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ text, gameId }),
  });

  const data = await forwardRes.json();
  return NextResponse.json(data, { status: forwardRes.status });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/import/rulebook/pdf/route.ts
git commit -m "feat: add /api/import/rulebook/pdf route — PDF text extraction"
```

---

## Task 5: `RulebookImporterModal` component

**Files:**
- Create: `app/_components/rulebook-importer-modal.tsx`

- [ ] **Step 1: Create the modal component**

```typescript
"use client";

import React, { useRef, useState } from "react";
import { useFocusTrap } from "@/app/_hooks/useFocusTrap";

type Tab = "text" | "pdf";
type State = "idle" | "loading" | "error";

interface RulebookImporterModalProps {
  isOpen: boolean;
  gameId: string;
  onClose: () => void;
  onImportComplete: () => void;
}

export function RulebookImporterModal({
  isOpen,
  gameId,
  onClose,
  onImportComplete,
}: RulebookImporterModalProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);
  const [tab, setTab] = useState<Tab>("text");
  const [text, setText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [state, setState] = useState<State>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const canSubmit = tab === "text" ? text.trim().length > 0 : pdfFile !== null;

  async function handleSubmit() {
    if (!canSubmit || state === "loading") return;
    setState("loading");

    try {
      let res: Response;

      if (tab === "text") {
        res = await fetch("/api/import/rulebook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, gameId }),
        });
      } else {
        const form = new FormData();
        form.append("file", pdfFile!);
        form.append("gameId", gameId);
        res = await fetch("/api/import/rulebook/pdf", {
          method: "POST",
          body: form,
        });
      }

      if (!res.ok) {
        setState("error");
        return;
      }

      onImportComplete();
      onClose();
    } catch {
      setState("error");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") setPdfFile(file);
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rulebook-importer-title"
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <div id="rulebook-importer-title" className="text-base font-semibold text-neutral-900">
              Import your rulebook
            </div>
            <div className="mt-0.5 text-xs text-neutral-500">
              We'll create cards organized by section — ready for you to edit.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pt-4 pb-5">
          {/* Tab bar */}
          <div className="flex border-b border-neutral-200 mb-4">
            {(["text", "pdf"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setState("idle"); }}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  tab === t
                    ? "border-[#1e3a8a] text-[#1e3a8a]"
                    : "border-transparent text-neutral-400 hover:text-neutral-600"
                }`}
              >
                {t === "text" ? "Paste text" : "Upload PDF"}
              </button>
            ))}
          </div>

          {/* Fixed-height content area */}
          <div className="h-36 flex flex-col">
            {state === "loading" ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl bg-neutral-50">
                <svg className="animate-spin h-5 w-5 text-[#1e3a8a]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                </svg>
                <span className="text-xs text-neutral-500">Reading your rulebook…</span>
              </div>
            ) : tab === "text" ? (
              <textarea
                className="flex-1 w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-xs leading-relaxed text-neutral-800 placeholder:text-neutral-400 focus:border-[#1e3a8a] focus:outline-none"
                placeholder="Paste your rulebook text here…"
                value={text}
                onChange={(e) => { setText(e.target.value); setState("idle"); }}
                disabled={state === "loading"}
              />
            ) : (
              <div
                className={`flex-1 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                  pdfFile ? "border-[#1e3a8a] bg-blue-50" : "border-neutral-200 bg-neutral-50 hover:border-neutral-300"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <span className="text-lg">📎</span>
                <span className="text-xs font-medium text-neutral-700">
                  {pdfFile ? pdfFile.name : "Drop your PDF here"}
                </span>
                {!pdfFile && (
                  <span className="text-[11px] text-neutral-400">or click to browse · PDF only · max 20MB</span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setPdfFile(f); setState("idle"); }
                  }}
                />
              </div>
            )}
          </div>

          {/* Hint / error */}
          <div className="mt-1.5 h-4">
            {state === "error" ? (
              <p className="text-[11px] text-red-500">Something went wrong — please try again.</p>
            ) : tab === "text" && state !== "loading" ? (
              <p className="text-[11px] text-neutral-400">Tip: include headings for better card grouping.</p>
            ) : null}
          </div>

          {/* Actions */}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || state === "loading"}
              className="rounded-full bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e3a8a]/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {state === "loading" ? "Building…" : state === "error" ? "Try again →" : "Build cards →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_components/rulebook-importer-modal.tsx
git commit -m "feat: add RulebookImporterModal component"
```

---

## Task 6: `CanvasEmptyOverlay` component

**Files:**
- Create: `app/_components/canvas-empty-overlay.tsx`

- [ ] **Step 1: Create the overlay component**

```typescript
"use client";

import React from "react";

interface CanvasEmptyOverlayProps {
  onImport: () => void;
  onStartBlank: () => void;
}

export function CanvasEmptyOverlay({ onImport, onStartBlank }: CanvasEmptyOverlayProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto border-2 border-dashed border-neutral-300 rounded-2xl bg-white/95 backdrop-blur-sm px-8 py-7 text-center max-w-xs shadow-lg">
        <div className="text-2xl mb-2">📄</div>
        <div className="text-sm font-semibold text-neutral-900 mb-1">Import your rulebook</div>
        <p className="text-xs text-neutral-500 leading-relaxed mb-4">
          Paste your rules text or upload a PDF — we'll build your cards for you to edit.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={onImport}
            className="rounded-full bg-[#1e3a8a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1e3a8a]/90 transition"
          >
            Import rulebook
          </button>
          <button
            type="button"
            onClick={onStartBlank}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition"
          >
            Start blank
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/_components/canvas-empty-overlay.tsx
git commit -m "feat: add CanvasEmptyOverlay component"
```

---

## Task 7: Wire up in `useStudioModals` and `authoring-studio.tsx`

**Files:**
- Modify: `app/_hooks/useStudioModals.ts`
- Modify: `app/_components/authoring-studio.tsx`

- [ ] **Step 1: Add `isRulebookImportOpen` to `useStudioModals`**

In [app/_hooks/useStudioModals.ts](app/_hooks/useStudioModals.ts), add the new state alongside the existing modal states:

```typescript
// Add this line after line 8 (isCreateContainerOpen):
const [isRulebookImportOpen, setIsRulebookImportOpen] = useState(false);
```

And add it to the return object:
```typescript
// Add to the return object:
isRulebookImportOpen, setIsRulebookImportOpen,
```

- [ ] **Step 2: Import new components in `authoring-studio.tsx`**

Add these imports at the top of [app/_components/authoring-studio.tsx](app/_components/authoring-studio.tsx):

```typescript
import { RulebookImporterModal } from "@/app/_components/rulebook-importer-modal";
import { CanvasEmptyOverlay } from "@/app/_components/canvas-empty-overlay";
```

- [ ] **Step 3: Add `handleCreateBlankCard` and `handleImportComplete`**

In `authoring-studio.tsx`, add these two handlers after the existing `handleStartConventionMode`.

`switchToGame` is already destructured from `useGameLoader` in the studio — use it to reload the current game after import:

```typescript
const handleCreateBlankCard = useCallback(() => {
  pageHandlers.handleCreatePage();
}, [pageHandlers]);

const handleImportComplete = useCallback(() => {
  if (!currentGameId || !currentGameName) return;
  // switchToGame reloads pages from DB — picks up newly inserted cards
  switchToGame(currentGameId, currentGameName);
}, [currentGameId, currentGameName, switchToGame]);
```

Verify `switchToGame` is destructured from `useGameLoader` — grep for it:
```bash
grep -n "switchToGame" app/_components/authoring-studio.tsx | head -5
```

- [ ] **Step 4: Determine standard-page count for the overlay**

Find where pages are derived in authoring-studio. The overlay shows when `standardPages.length === 0`:

```typescript
const standardPages = useMemo(
  () => pages.filter((p) => p.kind === "page"),
  [pages]
);
const showEmptyOverlay = !isPreviewMode && standardPages.length === 0;
```

Add this after the existing `localizedHomePage` derivation (around line 305).

- [ ] **Step 5: Render `CanvasEmptyOverlay` inside the canvas div**

In the JSX `return`, find the `<div className="absolute inset-0">` block that contains `<PreviewCanvas .../>`, and add the overlay immediately after `<PreviewCanvas>`:

```tsx
{showEmptyOverlay && (
  <CanvasEmptyOverlay
    onImport={() => modals.setIsRulebookImportOpen(true)}
    onStartBlank={handleCreateBlankCard}
  />
)}
```

- [ ] **Step 6: Render `RulebookImporterModal`**

Add the modal alongside the other modals in the return JSX (e.g. after `<CreateContainerModal>`):

```tsx
<RulebookImporterModal
  isOpen={modals.isRulebookImportOpen}
  gameId={currentGameId ?? ""}
  onClose={() => modals.setIsRulebookImportOpen(false)}
  onImportComplete={handleImportComplete}
/>
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add app/_hooks/useStudioModals.ts app/_components/authoring-studio.tsx
git commit -m "feat: wire CanvasEmptyOverlay and RulebookImporterModal into authoring studio"
```

---

## Task 8: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open a game with no cards**

Navigate to the studio with a fresh game. Confirm the `CanvasEmptyOverlay` appears centered on the canvas.

- [ ] **Step 3: Test "Start blank"**

Click "Start blank". Confirm a blank card is created and the overlay disappears.

- [ ] **Step 4: Test paste text import**

Re-open a game with no cards. Click "Import rulebook". Paste 3–4 paragraphs of sample text with headings. Click "Build cards →". Confirm:
- Spinner appears
- Modal closes on success
- Cards appear in the sidebar

- [ ] **Step 5: Test PDF import**

Upload a small PDF rulebook. Confirm cards are generated.

- [ ] **Step 6: Test error state**

Temporarily set `ANTHROPIC_API_KEY` to an invalid value. Attempt import. Confirm "Something went wrong — please try again." appears inline and the form is preserved.

- [ ] **Step 7: Test fixed-height modal**

Open the modal. Switch between tabs. Confirm modal height does not change.

- [ ] **Step 8: Commit if all tests pass**

```bash
git add -A
git commit -m "feat: rulebook importer — empty canvas overlay, modal, and API routes"
```

---

## Task 9: Version bump and patch note

**Files:**
- Modify: `app/_lib/authoring-utils.ts` (APP_VERSION + PATCH_NOTES)

- [ ] **Step 1: Find current version**

```bash
grep -n "APP_VERSION\|PATCH_NOTES" app/_lib/authoring-utils.ts | head -5
```

- [ ] **Step 2: Bump version and add patch note**

Increment the patch version (e.g. `v0.19.1` → `v0.19.2`) and add to PATCH_NOTES:

```typescript
// Increment APP_VERSION by one patch
export const APP_VERSION = "v0.19.2"; // update to next patch

// Add to top of PATCH_NOTES array:
{
  version: "v0.19.2",
  date: "2026-04-10",
  notes: [
    "Rulebook importer: paste your rules text or upload a PDF on an empty canvas — cards are generated and organized by section, ready to edit",
  ],
},
```

- [ ] **Step 3: Commit**

```bash
git add app/_lib/authoring-utils.ts
git commit -m "chore: bump to v0.19.2 — rulebook importer"
```
