# Rulebook Importer — Design Spec

**Date:** 2026-04-10  
**Status:** Approved for implementation

---

## Overview

A self-serve importer that takes a board game rulebook (pasted text or uploaded PDF) and generates a set of draft Sherpa cards, organized by section and typed by content. Cards land directly on the canvas, ready to edit.

Framing: this is a **structural parser**, not an AI author. The publisher's own words are reorganized into Sherpa's card structure. No AI branding anywhere in the UI.

---

## Entry Point

A centered overlay card is shown on the canvas when a game has **zero cards**. It replaces the current "no cards" empty state in the sidebar.

Two actions:
- **Import rulebook** — opens the import modal
- **Start blank** — dismisses the overlay and adds one blank card (same as the existing "New card" flow)

The overlay is hidden as soon as any card exists. It does not reappear if all cards are later deleted — this is intentional. Re-importing into an existing game (v2) is out of scope for this release.

---

## Import Modal

A single modal with two tabs. The overall modal shape (height, width) is fixed — tabs swap only the inner content area so the modal never resizes.

**Shared header (both tabs):**
- Title: "Import your rulebook"
- Subtitle: "We'll create cards organized by section — ready for you to edit."
- Tab bar: "Paste text" | "Upload PDF"

**Tab: Paste text**
- Fixed-height textarea (non-resizable to maintain modal shape)
- Hint text below: "Tip: include headings for better card grouping."
- CTA: "Build cards →"

**Tab: Upload PDF**
- Same fixed-height area — replaced by a dashed drop zone
- Drop zone accepts drag-and-drop or click-to-browse
- Constraints: PDF only, max 20MB
- "Build cards →" is disabled until a file is selected

**Loading state**
- Modal stays open, content area replaced by a centered spinner + "Reading your rulebook…"
- Button disabled, shows "Building…"
- Typically 5–15s depending on rulebook length

**Error state**
- One-line error below the content area: "Something went wrong — please try again."
- Textarea/drop zone remains intact with user's input preserved
- Button changes to "Try again →"
- No additional UI

**Success**
- Modal closes
- Game reloads — imported cards appear on canvas
- No toast or confirmation needed; the cards appearing is the feedback

---

## API Route — `/api/import/rulebook`

**Method:** POST  
**Auth:** Requires valid session (same auth middleware as other API routes)

**Request body:**
```json
{ "text": "...", "gameId": "uuid" }
```

The client always sends plain text. If the user uploaded a PDF, it is extracted to text client-side or server-side before the Claude call (see PDF handling below).

**Claude prompt (server-side):**  
A system prompt instructs Claude to:
1. Read the rulebook text
2. Identify logical sections (Setup, Turns, Scoring, etc.)
3. For each section, produce one or more cards with:
   - `title` — short card name
   - `kind` — `"page"` for most content; `"hotspot"` only if the content is clearly tied to a specific board element
   - `interactionType` — `"modal"` default; `"full-page"` for dense reference content (full rules, glossary)
   - `blocks` — array of `{ type, value }` using existing `ContentBlockType` values (`"text"`, `"section"`, `"steps"`, `"callout"`)
4. Return **only** a JSON object: `{ "cards": [...] }`

Claude is not asked to invent content — only to restructure and classify what is already in the text.

**Server processing:**
1. Validate auth + body
2. Look up game to confirm ownership
3. Call Claude API (`claude-sonnet-4-6`, single non-streaming request)
4. Parse JSON response — if malformed, return `500`
5. Map returned cards to `PageItem` shape using `createBlock` + `createPage` helpers
6. Append to game's existing card list via `supabaseAdmin` (preserves existing cards)
7. Return `200 { ok: true }`

**PDF handling:**
- PDF is uploaded as `multipart/form-data` to a dedicated `/api/import/rulebook/pdf` route
- That route extracts text server-side, then calls the main `/api/import/rulebook` route internally
- Text extraction: `pdf-parse` npm package (lightweight, no native deps)
- Extracted text is truncated at ~80,000 characters before the Claude call to stay within context limits
- No PDF binary is ever sent to Claude

**Token limits:**
- Input: rulebook text truncated at ~80k chars (~20k tokens) — covers most rulebooks
- Output: capped at 4096 tokens; if truncated, the partial card list is still used

---

## Data Model

No schema changes required. Imported cards are standard `PageItem` rows — same structure as manually created cards. They are appended to the game's `card_order` array.

---

## Plan limits

Importer is available on **all plans** including free. It is a productivity tool, not a paid feature — gating it would hurt onboarding. If abuse becomes a concern, rate-limit at the API route level.

---

## Out of scope (v1)

- Review/preview step before cards land (decided against — direct to canvas)
- Streaming card-by-card appearance
- Image extraction from PDFs
- BGG metadata import (separate feature)
- Re-import / update existing cards from a new version of the rulebook
- Bespoke done-for-you service tier (tracked separately in backlog)
