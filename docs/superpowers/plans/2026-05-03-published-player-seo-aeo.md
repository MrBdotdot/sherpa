# Published Player SEO/AEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `gallery-data.ts`-backed gallery with a live Supabase-driven directory and per-game server-rendered reading pages at `/gallery/[id]`, including filter chips, paginated index, JSON-LD, and OG/title metadata so published Sherpa games are discoverable by search engines and AI answer engines.

**Architecture:** All gallery reads go through new server-only helpers in `app/_lib/gallery-queries.ts`, using the existing `supabaseAdmin` client (service role, bypasses RLS — safe because both queries hard-filter `publish_status = 'published'`). The existing `/gallery/page.tsx` switches from `GALLERY_ENTRIES` to `fetchPublishedGames(searchParams)` and adds a small `"use client"` filter-chip component that pushes URL params. The existing `/gallery/[id]/page.tsx` is rewritten as a Server Component that fetches the game + cards, passes them to a new `<ReadingPage>` UI, and emits a JSON-LD `<script>` block; a sibling `layout.tsx` adds `generateMetadata` for OG/title. Per-game gallery metadata (tagline, designer, player count, etc.) is stored inside the existing `system_settings` JSONB column under a new `gameMeta` field, edited from a new "Gallery listing" subsection in the Experience tab.

**Tech Stack:** Next.js 16.2.1 (App Router, Server Components), React 19, `@supabase/supabase-js` via `supabaseAdmin`, Tailwind v4, Vitest 4 (existing test runner), TypeScript strict.

---

## Pre-flight

This is a Sherpa-flavoured Next.js 16 — `AGENTS.md` warns that APIs/conventions may differ from upstream. Before writing route code (Tasks 4 and 7), open `node_modules/next/dist/docs/` and skim:
- App Router page / layout conventions (`generateMetadata`, dynamic params, `searchParams`)
- Server Component vs `"use client"` boundaries
- `notFound()` behavior

If anything below contradicts what's in those docs, trust the docs and adjust. Note that in Next 15+ both `params` and `searchParams` arrive as Promises in async page components — the existing `app/gallery/[id]/page.tsx` already uses `params: Promise<{ id: string }>` so match that convention.

---

## File map

| File | Action | What changes |
|------|--------|-------------|
| `supabase/add-gallery.sql` | **Create** | One-line migration: `ALTER TABLE games ADD COLUMN featured boolean NOT NULL DEFAULT false` |
| `app/_lib/authoring-types.ts` | Modify | Add `GameMeta` type + optional `gameMeta` to `SystemSettings` |
| `app/_lib/gallery-queries.ts` | **Create** | `fetchPublishedGames`, `fetchPublishedGame`, `parsePlayerCountRange` + types |
| `app/_lib/gallery-queries.test.ts` | **Create** | Unit tests for `parsePlayerCountRange` and the query result mappers |
| `app/_components/gallery/block-renderer.tsx` | **Create** | Pure function that maps `ContentBlock[]` to semantic HTML (no client interactivity) |
| `app/_components/gallery/block-renderer.test.tsx` | **Create** | Unit tests for the block-to-HTML mapping |
| `app/_components/gallery/json-ld.ts` | **Create** | `buildGameJsonLd(game, cards)` returns the schema.org Game + HowTo object |
| `app/_components/gallery/json-ld.test.ts` | **Create** | Unit tests for the JSON-LD builder |
| `app/_components/gallery/reading-page.tsx` | **Create** | Reading page UI: hero, sticky TOC sidebar, card sections, footer CTA |
| `app/_components/gallery/gallery-filters.tsx` | **Create** | `"use client"` filter chip strip that pushes `?tag=`/`?complexity=` to the URL |
| `app/gallery/page.tsx` | Modify | Replace `GALLERY_ENTRIES` with `fetchPublishedGames(searchParams)`; render `<GalleryFilters />` |
| `app/gallery/[id]/page.tsx` | Modify | Replace `gallery-data` lookup with `fetchPublishedGame(id)`; render `<ReadingPage>` + JSON-LD; `notFound()` if missing |
| `app/gallery/[id]/layout.tsx` | **Create** | `generateMetadata` returning title / description / OG |
| `app/_components/editor/experience-tab.tsx` | Modify | Insert "Gallery listing" `EditorSubsection` between Behavior and Languages sections |
| `supabase/seed-gallery.sql` | **Create** | Seeds the 6 curated entries as real `games` rows owned by a `sherpa-curated@sherpa.so` service account, with `featured = true` for Ironveil |
| `app/_lib/gallery-data.ts` | **Delete** | Done after seed is verified live (final task) |

---

## Task 1: Add `featured` column to `games`

**Goal:** Unblock all queries that order by `featured`. This is a one-line migration applied manually in the Supabase SQL editor — Sherpa migrations are committed as `.sql` files, not auto-applied.

**Files:**
- Create: `supabase/add-gallery.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/add-gallery.sql`:

```sql
-- Run this in the Supabase Dashboard → SQL Editor.
-- Adds the `featured` flag used by the public gallery to pin one game to
-- the top of the directory. Default false; flip per-game in the DB.

ALTER TABLE games ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Apply manually**

Open Supabase Dashboard → SQL Editor → paste contents of `supabase/add-gallery.sql` → Run. Then `SELECT featured FROM games LIMIT 1;` to confirm the column exists.

- [ ] **Step 3: Commit**

```bash
git add supabase/add-gallery.sql
git commit -m "feat(db): add games.featured column for gallery pinning"
```

---

## Task 2: Add `GameMeta` and `gameMeta?` to `SystemSettings`

**Goal:** Give every other task a typed surface for the per-game gallery metadata.

**Files:**
- Modify: `app/_lib/authoring-types.ts:197-239` (the `SystemSettings` block)

- [ ] **Step 1: Add the `GameMeta` type just before `SystemSettings`**

Insert directly above `export type SystemSettings = {` (currently line 197):

```ts
export type GameComplexity = "Light" | "Medium" | "Heavy";

export type GameMeta = {
  /** One-liner shown on gallery card and reading page. */
  tagline?: string;
  /** Designer name; if blank, the gallery omits the line entirely. */
  designer?: string;
  /** Free-form, e.g. "2–4". */
  playerCount?: string;
  /** Free-form, e.g. "60–90 min". */
  playTime?: string;
  complexity?: GameComplexity;
  /** Free-form, e.g. "13+". */
  ageRange?: string;
  /** Lower-cased tag slugs, e.g. ["strategy", "cooperative"]. */
  tags?: string[];
  /** Gallery thumbnail. Falls back to the home card's heroImage if blank. */
  cardImage?: string;
};
```

- [ ] **Step 2: Add `gameMeta?: GameMeta;` to `SystemSettings`**

Inside the `SystemSettings` type body, add as the last field before the closing `};` (right after `guideNavPosition?: "left" | "top";`):

```ts
  /** Gallery listing metadata — what the public gallery card and reading page show. */
  gameMeta?: GameMeta;
```

- [ ] **Step 3: Verify TypeScript still passes**

Run: `npx tsc --noEmit`
Expected: PASS — no new errors. (`gameMeta` is optional everywhere and not yet read.)

- [ ] **Step 4: Commit**

```bash
git add app/_lib/authoring-types.ts
git commit -m "feat(types): add GameMeta + SystemSettings.gameMeta for gallery listings"
```

---

## Task 3: Build `gallery-queries.ts` with tests

**Goal:** A single typed module that owns every public-gallery read. Every consumer (gallery index, reading page, JSON-LD builder) imports from here.

**Files:**
- Create: `app/_lib/gallery-queries.ts`
- Create: `app/_lib/gallery-queries.test.ts`

The TDDable parts are pure: `parsePlayerCountRange` (string → `{ min, max } | null`) and the row-to-`GalleryGame` mapper. The Supabase calls themselves we won't mock — that matches the codebase pattern where only pure helpers have tests (see `warm-game-cache.test.ts`).

- [ ] **Step 1: Write failing tests**

Create `app/_lib/gallery-queries.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parsePlayerCountRange, mapGameRowToGalleryGame } from "./gallery-queries";
import type { GameMeta } from "@/app/_lib/authoring-types";

describe("parsePlayerCountRange", () => {
  it("parses an en-dash range", () => {
    expect(parsePlayerCountRange("2–4")).toEqual({ min: 2, max: 4 });
  });
  it("parses an ASCII hyphen range", () => {
    expect(parsePlayerCountRange("2-4")).toEqual({ min: 2, max: 4 });
  });
  it("parses a single number as min == max", () => {
    expect(parsePlayerCountRange("5")).toEqual({ min: 5, max: 5 });
  });
  it("trims whitespace and surrounding text", () => {
    expect(parsePlayerCountRange("  3 – 6 players ")).toEqual({ min: 3, max: 6 });
  });
  it("returns null for blank input", () => {
    expect(parsePlayerCountRange("")).toBeNull();
    expect(parsePlayerCountRange("   ")).toBeNull();
  });
  it("returns null when no digits are present", () => {
    expect(parsePlayerCountRange("any")).toBeNull();
  });
});

describe("mapGameRowToGalleryGame", () => {
  const meta: GameMeta = {
    tagline: "Hidden movement thriller",
    designer: "Marcus Drenn",
    playerCount: "3–6",
    playTime: "90–120 min",
    complexity: "Heavy",
    ageRange: "17+",
    tags: ["thematic", "hidden-movement"],
    cardImage: "https://example.com/iron.jpg",
  };

  it("flattens system_settings.gameMeta into top-level fields", () => {
    const row = {
      id: "ironveil",
      title: "Ironveil",
      system_settings: { gameMeta: meta },
      featured: true,
      created_at: "2026-01-20T00:00:00Z",
    };
    const out = mapGameRowToGalleryGame(row);
    expect(out.id).toBe("ironveil");
    expect(out.title).toBe("Ironveil");
    expect(out.featured).toBe(true);
    expect(out.tagline).toBe("Hidden movement thriller");
    expect(out.designer).toBe("Marcus Drenn");
    expect(out.tags).toEqual(["thematic", "hidden-movement"]);
    expect(out.cardImage).toBe("https://example.com/iron.jpg");
  });

  it("returns undefined gameMeta fields when system_settings is empty", () => {
    const row = {
      id: "blank",
      title: "Untitled",
      system_settings: {},
      featured: false,
      created_at: "2026-04-01T00:00:00Z",
    };
    const out = mapGameRowToGalleryGame(row);
    expect(out.tagline).toBeUndefined();
    expect(out.designer).toBeUndefined();
    expect(out.tags).toBeUndefined();
    expect(out.complexity).toBeUndefined();
  });

  it("tolerates a null system_settings", () => {
    const row = {
      id: "weird",
      title: "Weird",
      system_settings: null,
      featured: false,
      created_at: "2026-04-01T00:00:00Z",
    };
    const out = mapGameRowToGalleryGame(row);
    expect(out.tagline).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test -- gallery-queries`
Expected: FAIL — `gallery-queries` module does not exist.

- [ ] **Step 3: Create `gallery-queries.ts`**

Create `app/_lib/gallery-queries.ts`:

```ts
import "server-only";
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import type { GameMeta, GameComplexity, SystemSettings, ContentBlock } from "@/app/_lib/authoring-types";

const PAGE_SIZE = 60;

export type GalleryGame = {
  id: string;
  title: string;
  featured: boolean;
  createdAt: string;
  // Flattened gameMeta fields:
  tagline?: string;
  designer?: string;
  playerCount?: string;
  playTime?: string;
  complexity?: GameComplexity;
  ageRange?: string;
  tags?: string[];
  cardImage?: string;
  /** Home card heroImage; populated by reading-page query for image fallback. */
  homeHeroImage?: string;
  /** user_id from games table; populated by reading-page query. */
  userId?: string;
};

export type GalleryCard = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  heroImage: string;
  blocks: ContentBlock[];
  cardSize: string;
};

type GameRow = {
  id: string;
  title: string;
  system_settings: SystemSettings | Record<string, never> | null;
  featured: boolean;
  created_at: string;
  user_id?: string | null;
};

type CardRow = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  hero_image: string;
  blocks: ContentBlock[] | null;
  card_size: string;
};

export function parsePlayerCountRange(raw: string | undefined | null): { min: number; max: number } | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Match digits separated by an en-dash, em-dash, or hyphen, OR a single number.
  const range = trimmed.match(/(\d+)\s*[–—-]\s*(\d+)/);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const single = trimmed.match(/(\d+)/);
  if (single) return { min: Number(single[1]), max: Number(single[1]) };
  return null;
}

export function mapGameRowToGalleryGame(row: GameRow): GalleryGame {
  const settings = (row.system_settings ?? {}) as Partial<SystemSettings>;
  const meta: GameMeta = settings.gameMeta ?? {};
  return {
    id: row.id,
    title: row.title,
    featured: row.featured,
    createdAt: row.created_at,
    userId: row.user_id ?? undefined,
    tagline: meta.tagline,
    designer: meta.designer,
    playerCount: meta.playerCount,
    playTime: meta.playTime,
    complexity: meta.complexity,
    ageRange: meta.ageRange,
    tags: meta.tags,
    cardImage: meta.cardImage,
  };
}

export type FetchPublishedGamesOpts = {
  tag?: string;
  complexity?: GameComplexity;
  page?: number;
};

export async function fetchPublishedGames(opts: FetchPublishedGamesOpts = {}): Promise<GalleryGame[]> {
  const page = Math.max(0, opts.page ?? 0);
  let query = supabaseAdmin
    .from("games")
    .select("id, title, system_settings, featured, created_at")
    .eq("publish_status", "published")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (opts.complexity) {
    query = query.eq("system_settings->gameMeta->>complexity", opts.complexity);
  }
  if (opts.tag) {
    query = query.contains("system_settings->gameMeta->tags", [opts.tag]);
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchPublishedGames failed", error);
    return [];
  }
  return (data ?? []).map((row) => mapGameRowToGalleryGame(row as GameRow));
}

export async function fetchPublishedGame(id: string): Promise<{ game: GalleryGame; cards: GalleryCard[] } | null> {
  const { data: gameData, error: gameErr } = await supabaseAdmin
    .from("games")
    .select("id, title, system_settings, featured, created_at, user_id")
    .eq("id", id)
    .eq("publish_status", "published")
    .maybeSingle();

  if (gameErr) {
    console.error("fetchPublishedGame (game) failed", gameErr);
    return null;
  }
  if (!gameData) return null;

  const game = mapGameRowToGalleryGame(gameData as GameRow);

  // Pull home heroImage to use as the gallery image fallback.
  const { data: homeData } = await supabaseAdmin
    .from("cards")
    .select("hero_image")
    .eq("game_id", id)
    .eq("kind", "home")
    .maybeSingle();
  if (homeData?.hero_image) game.homeHeroImage = homeData.hero_image as string;

  const { data: cardData, error: cardsErr } = await supabaseAdmin
    .from("cards")
    .select("id, kind, title, summary, hero_image, blocks, card_size")
    .eq("game_id", id)
    .neq("kind", "home")
    .order("created_at", { ascending: true });

  if (cardsErr) {
    console.error("fetchPublishedGame (cards) failed", cardsErr);
    return { game, cards: [] };
  }

  const cards: GalleryCard[] = (cardData ?? []).map((row: CardRow) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    heroImage: row.hero_image,
    blocks: Array.isArray(row.blocks) ? row.blocks : [],
    cardSize: row.card_size,
  }));

  return { game, cards };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test -- gallery-queries`
Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add app/_lib/gallery-queries.ts app/_lib/gallery-queries.test.ts
git commit -m "feat(gallery): add server-side queries for published games + reading pages"
```

---

## Task 4: Build the block renderer with tests

**Goal:** A pure server-side renderer that converts a card's `ContentBlock[]` to semantic HTML for the reading page. No interactivity, no `"use client"`, no JS required for content to be visible.

`ContentBlockType` (from `authoring-types.ts:5`) is `"text" | "image" | "video" | "steps" | "callout" | "consent" | "tabs" | "section" | "step-rail" | "carousel"`. The reading page renders the SEO-relevant subset only and silently skips the rest. `blockFormat` on a `text` block is `"prose" | "h2" | "h3" | "bullets" | "steps"` and decides what tag to emit.

**Files:**
- Create: `app/_components/gallery/block-renderer.tsx`
- Create: `app/_components/gallery/block-renderer.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `app/_components/gallery/block-renderer.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderBlockToString } from "./block-renderer";
import type { ContentBlock } from "@/app/_lib/authoring-types";

function block(partial: Partial<ContentBlock> & { type: ContentBlock["type"] }): ContentBlock {
  return { id: "b", value: "", ...partial };
}

describe("renderBlockToString", () => {
  it("renders a prose text block as <p>", () => {
    const html = renderBlockToString(block({ type: "text", value: "Hello world", blockFormat: "prose" }));
    expect(html).toBe('<p>Hello world</p>');
  });
  it("renders an h2 block as <h2>", () => {
    const html = renderBlockToString(block({ type: "text", value: "Setup", blockFormat: "h2" }));
    expect(html).toBe('<h2>Setup</h2>');
  });
  it("renders an h3 block as <h3>", () => {
    const html = renderBlockToString(block({ type: "text", value: "Detail", blockFormat: "h3" }));
    expect(html).toBe('<h3>Detail</h3>');
  });
  it("renders a bullets block as <ul><li>...", () => {
    const html = renderBlockToString(block({ type: "text", value: "alpha\nbeta\ngamma", blockFormat: "bullets" }));
    expect(html).toBe('<ul><li>alpha</li><li>beta</li><li>gamma</li></ul>');
  });
  it("renders a steps block as <ol><li>...", () => {
    const html = renderBlockToString(block({ type: "text", value: "first\nsecond", blockFormat: "steps" }));
    expect(html).toBe('<ol><li>first</li><li>second</li></ol>');
  });
  it("renders an image block with caption as <figure>", () => {
    const html = renderBlockToString(block({
      type: "image",
      value: "https://example.com/x.jpg",
      imageCaption: "A castle at dusk",
    }));
    expect(html).toContain('<figure>');
    expect(html).toContain('<img src="https://example.com/x.jpg" alt="A castle at dusk"');
    expect(html).toContain('<figcaption>A castle at dusk</figcaption>');
  });
  it("uses empty alt when no caption", () => {
    const html = renderBlockToString(block({ type: "image", value: "https://example.com/x.jpg" }));
    expect(html).toContain('alt=""');
    expect(html).not.toContain('<figcaption>');
  });
  it("escapes HTML in user-supplied text", () => {
    const html = renderBlockToString(block({ type: "text", value: "<script>x</script>", blockFormat: "prose" }));
    expect(html).toBe('<p>&lt;script&gt;x&lt;/script&gt;</p>');
  });
  it("returns empty string for unsupported block types", () => {
    expect(renderBlockToString(block({ type: "carousel", value: "" }))).toBe("");
    expect(renderBlockToString(block({ type: "video", value: "https://yt/x" }))).toBe("");
    expect(renderBlockToString(block({ type: "tabs", value: "" }))).toBe("");
  });
  it("skips blank list items", () => {
    const html = renderBlockToString(block({ type: "text", value: "alpha\n\nbeta\n", blockFormat: "bullets" }));
    expect(html).toBe('<ul><li>alpha</li><li>beta</li></ul>');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test -- block-renderer`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the renderer**

Create `app/_components/gallery/block-renderer.tsx`:

```tsx
import type { ContentBlock } from "@/app/_lib/authoring-types";

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function renderListItems(value: string): string {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
}

export function renderBlockToString(block: ContentBlock): string {
  if (block.type === "text") {
    const value = block.value ?? "";
    switch (block.blockFormat) {
      case "h2":
        return `<h2>${escapeHtml(value)}</h2>`;
      case "h3":
        return `<h3>${escapeHtml(value)}</h3>`;
      case "bullets":
        return `<ul>${renderListItems(value)}</ul>`;
      case "steps":
        return `<ol>${renderListItems(value)}</ol>`;
      case "prose":
      default:
        return `<p>${escapeHtml(value)}</p>`;
    }
  }
  if (block.type === "image") {
    const src = block.value ?? "";
    if (!src) return "";
    const caption = block.imageCaption?.trim();
    const alt = caption ?? "";
    const figcap = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : "";
    return `<figure><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" />${figcap}</figure>`;
  }
  // section, callout, consent, tabs, steps (composite), step-rail, carousel, video — skipped.
  return "";
}

export function BlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  const html = blocks.map(renderBlockToString).join("");
  return <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test -- block-renderer`
Expected: PASS — all 10 tests green.

- [ ] **Step 5: Commit**

```bash
git add app/_components/gallery/block-renderer.tsx app/_components/gallery/block-renderer.test.tsx
git commit -m "feat(gallery): add semantic block renderer for reading pages"
```

---

## Task 5: Build the JSON-LD generator with tests

**Goal:** Pure function that returns the schema.org `Game` + nested `HowTo` object as a plain JS object. The reading page serialises it with `JSON.stringify` into a `<script type="application/ld+json">` block.

**Files:**
- Create: `app/_components/gallery/json-ld.ts`
- Create: `app/_components/gallery/json-ld.test.ts`

- [ ] **Step 1: Write failing tests**

Create `app/_components/gallery/json-ld.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildGameJsonLd } from "./json-ld";
import type { GalleryGame, GalleryCard } from "@/app/_lib/gallery-queries";

const baseGame: GalleryGame = {
  id: "ironveil",
  title: "Ironveil",
  featured: true,
  createdAt: "2026-01-20T00:00:00Z",
  tagline: "Hidden movement thriller",
  designer: "Marcus Drenn",
  playerCount: "3–6",
  playTime: "90–120 min",
  complexity: "Heavy",
  ageRange: "17+",
  tags: ["thematic", "hidden-movement"],
};

const cards: GalleryCard[] = [
  { id: "c1", kind: "page", title: "Setup", summary: "Lay out tiles.", heroImage: "", blocks: [], cardSize: "medium" },
  { id: "c2", kind: "page", title: "Turn order", summary: "Resistance acts first.", heroImage: "", blocks: [], cardSize: "medium" },
];

describe("buildGameJsonLd", () => {
  it("emits a Game @type with title and description", () => {
    const ld = buildGameJsonLd(baseGame, cards);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Game");
    expect(ld.name).toBe("Ironveil");
    expect(ld.description).toBe("Hidden movement thriller");
  });
  it("emits a QuantitativeValue for player count when parseable", () => {
    const ld = buildGameJsonLd(baseGame, cards);
    expect(ld.numberOfPlayers).toEqual({ "@type": "QuantitativeValue", minValue: 3, maxValue: 6 });
  });
  it("omits numberOfPlayers when player count is blank", () => {
    const ld = buildGameJsonLd({ ...baseGame, playerCount: undefined }, cards);
    expect(ld.numberOfPlayers).toBeUndefined();
  });
  it("emits typicalAgeRange and Person author when present", () => {
    const ld = buildGameJsonLd(baseGame, cards);
    expect(ld.typicalAgeRange).toBe("17+");
    expect(ld.author).toEqual({ "@type": "Person", name: "Marcus Drenn" });
  });
  it("omits author when designer is blank", () => {
    const ld = buildGameJsonLd({ ...baseGame, designer: undefined }, cards);
    expect(ld.author).toBeUndefined();
  });
  it("emits a HowTo mainEntity with one step per card", () => {
    const ld = buildGameJsonLd(baseGame, cards);
    expect(ld.mainEntity).toEqual({
      "@type": "HowTo",
      name: "How to play Ironveil",
      step: [
        { "@type": "HowToStep", name: "Setup", text: "Lay out tiles." },
        { "@type": "HowToStep", name: "Turn order", text: "Resistance acts first." },
      ],
    });
  });
  it("falls back to a generic description when tagline is blank", () => {
    const ld = buildGameJsonLd({ ...baseGame, tagline: undefined }, cards);
    expect(ld.description).toBe("Interactive rulebook for Ironveil.");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test -- json-ld`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the builder**

Create `app/_components/gallery/json-ld.ts`:

```ts
import { parsePlayerCountRange } from "@/app/_lib/gallery-queries";
import type { GalleryGame, GalleryCard } from "@/app/_lib/gallery-queries";

type QuantitativeValue = { "@type": "QuantitativeValue"; minValue: number; maxValue: number };
type HowToStep = { "@type": "HowToStep"; name: string; text: string };
type HowTo = { "@type": "HowTo"; name: string; step: HowToStep[] };
type Person = { "@type": "Person"; name: string };

export type GameJsonLd = {
  "@context": "https://schema.org";
  "@type": "Game";
  name: string;
  description: string;
  numberOfPlayers?: QuantitativeValue;
  typicalAgeRange?: string;
  author?: Person;
  mainEntity: HowTo;
};

export function buildGameJsonLd(game: GalleryGame, cards: GalleryCard[]): GameJsonLd {
  const description = game.tagline?.trim() || `Interactive rulebook for ${game.title}.`;
  const range = parsePlayerCountRange(game.playerCount);

  const ld: GameJsonLd = {
    "@context": "https://schema.org",
    "@type": "Game",
    name: game.title,
    description,
    mainEntity: {
      "@type": "HowTo",
      name: `How to play ${game.title}`,
      step: cards.map((c) => ({ "@type": "HowToStep", name: c.title, text: c.summary })),
    },
  };

  if (range) ld.numberOfPlayers = { "@type": "QuantitativeValue", minValue: range.min, maxValue: range.max };
  if (game.ageRange) ld.typicalAgeRange = game.ageRange;
  if (game.designer) ld.author = { "@type": "Person", name: game.designer };

  return ld;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test -- json-ld`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add app/_components/gallery/json-ld.ts app/_components/gallery/json-ld.test.ts
git commit -m "feat(gallery): add schema.org Game + HowTo JSON-LD builder"
```

---

## Task 6: Build the reading-page UI component

**Goal:** A Server Component that renders a published game as a readable document. Sticky TOC sidebar, hero, one `<article>` per card, footer CTA. No client interactivity in v1 — IntersectionObserver-based active-TOC highlighting is deferred (post-V1 polish, see end of plan).

**Files:**
- Create: `app/_components/gallery/reading-page.tsx`

- [ ] **Step 1: Write the component**

Create `app/_components/gallery/reading-page.tsx`:

```tsx
import Link from "next/link";
import { BlockRenderer } from "./block-renderer";
import type { GalleryGame, GalleryCard } from "@/app/_lib/gallery-queries";

const COMPLEXITY_DOT: Record<string, string> = {
  Light: "#22c55e",
  Medium: "#f59e0b",
  Heavy: "#ef4444",
};

function tocAnchor(cardId: string) {
  return `card-${cardId}`;
}

export function ReadingPage({ game, cards }: { game: GalleryGame; cards: GalleryCard[] }) {
  const heroSrc = game.cardImage || game.homeHeroImage || "";
  const designerLine = game.designer ? `Rulebook by ${game.designer}` : "Rulebook";

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-neutral-950/80 px-6 py-4 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sherpa-icon.svg" alt="" width={20} height={20} />
          Sherpa
        </Link>
        <Link
          href="/login"
          className="rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-neutral-950 hover:opacity-90"
        >
          Create your rulebook →
        </Link>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="relative h-72 w-full overflow-hidden bg-neutral-900 sm:h-96">
          {heroSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroSrc} alt="" className="h-full w-full object-cover opacity-70" />
          ) : (
            <div className="h-full w-full" style={{ background: "#293B9C" }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
        </div>
        <div className="mx-auto max-w-5xl px-6 -mt-20 relative z-10">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{game.title}</h1>
          {game.tagline ? (
            <p className="mt-2 text-lg text-white/70">{game.tagline}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
            {game.playerCount ? <Chip>{game.playerCount} players</Chip> : null}
            {game.playTime ? <Chip>{game.playTime}</Chip> : null}
            {game.complexity ? (
              <Chip>
                <span
                  className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                  style={{ background: COMPLEXITY_DOT[game.complexity] }}
                />
                {game.complexity}
              </Chip>
            ) : null}
            {game.ageRange ? <Chip>Age {game.ageRange}</Chip> : null}
          </div>
        </div>
      </section>

      {/* Open interactive board CTA */}
      <div className="mx-auto mt-8 max-w-5xl px-6">
        <Link
          href={`/play/${game.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10"
        >
          Open interactive board →
        </Link>
      </div>

      {/* Two-column body */}
      <main className="mx-auto mt-12 grid max-w-5xl grid-cols-[200px_1fr] gap-12 px-6 pb-20">
        <aside className="sticky top-16 self-start">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Contents</p>
          <nav>
            <ul className="space-y-1.5">
              {cards.map((c) => (
                <li key={c.id}>
                  <a
                    href={`#${tocAnchor(c.id)}`}
                    className="block text-sm text-white/60 hover:text-white"
                  >
                    {c.title || "Untitled"}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0">
          {cards.map((c, i) => (
            <article key={c.id} id={tocAnchor(c.id)} className="mb-12 scroll-mt-20">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Chapter {String(i + 1).padStart(2, "0")}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">{c.title || "Untitled"}</h2>
              {c.summary ? <p className="mt-2 text-base text-white/60">{c.summary}</p> : null}
              <div className="mt-5">
                <BlockRenderer blocks={c.blocks} />
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-10 text-center">
        <p className="text-sm text-white/50">
          {game.title} · {designerLine} · Published with Sherpa
        </p>
        <Link
          href="/login"
          className="mt-3 inline-block text-sm font-medium text-white hover:opacity-80"
        >
          Create your own interactive rulebook →
        </Link>
      </footer>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/80">
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS — no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_components/gallery/reading-page.tsx
git commit -m "feat(gallery): add reading-page UI for published games"
```

---

## Task 7: Wire the reading route to live data + JSON-LD + metadata

**Goal:** Replace the placeholder `gallery-data` lookup in `app/gallery/[id]/page.tsx` with `fetchPublishedGame`, render `<ReadingPage>`, inject the JSON-LD block, and add `generateMetadata` in a sibling `layout.tsx`.

Per Sherpa's `AGENTS.md`, double-check `node_modules/next/dist/docs/` for the layout/metadata API in this Next.js version before hand-coding anything below — confirm `generateMetadata` lives where you expect it (page or layout) and that `params` is awaitable.

**Files:**
- Modify: `app/gallery/[id]/page.tsx` (replace entire contents)
- Create: `app/gallery/[id]/layout.tsx`

- [ ] **Step 1: Rewrite `app/gallery/[id]/page.tsx`**

Replace the entire file with:

```tsx
import { notFound } from "next/navigation";
import { fetchPublishedGame } from "@/app/_lib/gallery-queries";
import { ReadingPage } from "@/app/_components/gallery/reading-page";
import { buildGameJsonLd } from "@/app/_components/gallery/json-ld";

export const dynamic = "force-dynamic";

export default async function GalleryEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchPublishedGame(id);
  if (!result) notFound();

  const { game, cards } = result;
  const ld = buildGameJsonLd(game, cards);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <ReadingPage game={game} cards={cards} />
    </>
  );
}
```

- [ ] **Step 2: Create `app/gallery/[id]/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { fetchPublishedGame } from "@/app/_lib/gallery-queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await fetchPublishedGame(id);
  if (!result) return { title: "Not found · Sherpa" };

  const { game } = result;
  const description = game.tagline?.trim() || `Interactive rulebook for ${game.title}.`;
  const image = game.cardImage || game.homeHeroImage;

  return {
    title: `${game.title} — Interactive Rulebook · Sherpa`,
    description,
    openGraph: {
      title: game.title,
      description,
      images: image ? [{ url: image }] : [],
      type: "article",
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: game.title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default function GalleryEntryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 3: Verify TypeScript and build**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run build`
Expected: build succeeds. Note: existing `generateStaticParams` is removed — the route is `force-dynamic` because the published set changes on author publish.

- [ ] **Step 4: Manually verify the route**

Pick a `games.id` with `publish_status='published'` (publish a test game from the studio if needed, or temporarily flip a row in Supabase). Then:

```bash
npm run dev
# in another shell:
curl -s http://localhost:3000/gallery/<id> | grep -E '<title>|application/ld\+json|"@type":"Game"'
```

Expected: HTML contains `<title>... — Interactive Rulebook · Sherpa</title>`, a `<script type="application/ld+json">` block, and that block's content includes `"@type":"Game"`.

- [ ] **Step 5: Commit**

```bash
git add app/gallery/[id]/page.tsx app/gallery/[id]/layout.tsx
git commit -m "feat(gallery): server-render reading page with JSON-LD + OG metadata"
```

---

## Task 8: Build the gallery filter chips (`"use client"`)

**Goal:** A small client component that pushes `?tag=` and `?complexity=` into the URL. Server re-renders the index with the new filter applied.

**Files:**
- Create: `app/_components/gallery/gallery-filters.tsx`

- [ ] **Step 1: Write the component**

Create `app/_components/gallery/gallery-filters.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const TAGS = ["strategy", "cooperative", "thematic", "party"] as const;
const COMPLEXITIES = ["Light", "Medium", "Heavy"] as const;

const COMPLEXITY_DOT: Record<string, string> = {
  Light: "#2d6a4f",
  Medium: "#b07316",
  Heavy: "#9a3412",
};

export function GalleryFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const activeTag = params.get("tag") ?? "";
  const activeComplexity = params.get("complexity") ?? "";

  function setParam(key: "tag" | "complexity", value: string) {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    if (next.get(key) === value) {
      next.delete(key);
    } else if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function isAll() {
    return !activeTag && !activeComplexity;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => router.push(pathname)}
        className="rounded-full border px-3.5 py-1.5 font-sans text-[12.5px] transition hover:opacity-80"
        style={isAll()
          ? { background: "#1a1815", color: "#fff", borderColor: "transparent" }
          : { background: "#fff", color: "#4a443b", borderColor: "#d7d0c5" }}
      >
        All
      </button>
      {TAGS.map((tag) => {
        const active = activeTag === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => setParam("tag", tag)}
            className="rounded-full border px-3.5 py-1.5 font-sans text-[12.5px] capitalize transition hover:opacity-80"
            style={active
              ? { background: "#1a1815", color: "#fff", borderColor: "transparent" }
              : { background: "#fff", color: "#4a443b", borderColor: "#d7d0c5" }}
          >
            {tag}
          </button>
        );
      })}
      <div className="mx-1 h-5 w-px" style={{ background: "#e8e4de" }} />
      {COMPLEXITIES.map((c) => {
        const active = activeComplexity === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => setParam("complexity", c)}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-sans text-[12.5px] transition hover:opacity-80"
            style={active
              ? { background: "#1a1815", color: "#fff", borderColor: "transparent" }
              : { background: "#fff", color: "#4a443b", borderColor: "#d7d0c5" }}
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: COMPLEXITY_DOT[c] }} />
            {c}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/_components/gallery/gallery-filters.tsx
git commit -m "feat(gallery): add filter-chip component for tag + complexity"
```

---

## Task 9: Switch `/gallery` to live data + filters + pagination

**Goal:** `app/gallery/page.tsx` becomes an async Server Component fed by `fetchPublishedGames(searchParams)`. Filter chips replace the static buttons. Falls back gracefully when there are zero published games.

**Files:**
- Modify: `app/gallery/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite `app/gallery/page.tsx`**

Replace the entire file with:

```tsx
import Link from "next/link";
import { fetchPublishedGames, type GalleryGame } from "@/app/_lib/gallery-queries";
import { GalleryFilters } from "@/app/_components/gallery/gallery-filters";

export const metadata = {
  title: "Gallery — Sherpa",
  description: "Interactive rules experiences built with Sherpa.",
};

export const dynamic = "force-dynamic";

const COMPLEXITY_STYLES = {
  Light:  { dot: "#2d6a4f", label: "#2d6a4f" },
  Medium: { dot: "#b07316", label: "#b07316" },
  Heavy:  { dot: "#9a3412", label: "#9a3412" },
} as const;

function Dot() {
  return <span className="inline-block h-[2.5px] w-[2.5px] rounded-full" style={{ background: "#c4bdb0" }} />;
}

function isComplexity(v: string | undefined): v is keyof typeof COMPLEXITY_STYLES {
  return v === "Light" || v === "Medium" || v === "Heavy";
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; complexity?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const complexity = isComplexity(sp.complexity) ? sp.complexity : undefined;
  const page = sp.page ? Math.max(0, Number(sp.page) || 0) : 0;
  const games = await fetchPublishedGames({ tag: sp.tag, complexity, page });

  const featured = games.find((g) => g.featured);
  const rest = featured ? games.filter((g) => g.id !== featured.id) : games;

  return (
    <div className="min-h-screen font-sans" style={{ background: "#fbf9f7", color: "#1a1815" }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-10 py-5"
        style={{ background: "#fbf9f7", borderBottom: "1px solid #e8e4de" }}
      >
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sherpa-icon.svg" alt="" width={22} height={22} />
          <span className="text-[15px] font-semibold" style={{ letterSpacing: "-0.005em" }}>Sherpa</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm" style={{ color: "#4a443b" }}>
          <Link href="/" style={{ color: "#4a443b", textDecoration: "none" }} className="hover:opacity-70 transition-opacity">Docs</Link>
          <Link href="/gallery" style={{ color: "#1a1815", fontWeight: 500, textDecoration: "none" }}>Gallery</Link>
          <Link href="/login" style={{ color: "#4a443b", textDecoration: "none" }} className="hover:opacity-70 transition-opacity">Sign in</Link>
        </nav>
        <Link
          href="/login"
          className="rounded-full px-4 py-2 text-[12.5px] font-semibold text-white transition hover:opacity-90"
          style={{ background: "#1a1815" }}
        >
          Start authoring
        </Link>
      </header>

      {/* Hero strip */}
      <section className="px-10 pb-7 pt-12" style={{ borderBottom: "1px solid #e8e4de" }}>
        <p className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#78746c" }}>
          Published rulebooks
        </p>
        <h1 className="mb-3.5 font-display font-normal leading-[1.05] tracking-[-0.025em] max-w-[820px]" style={{ fontSize: "52px", color: "#1a1815" }}>
          Rules you can{" "}
          <em className="not-italic font-light" style={{ color: "#293B9C" }}>tap into.</em>
        </h1>
        <p className="mb-5 max-w-[560px] text-[15px] leading-relaxed" style={{ color: "#4a443b" }}>
          Interactive rulebooks from the designer community — click any board to explore the hotspots, guides, and onboarding flows their authors shipped.
        </p>
        <GalleryFilters />
      </section>

      {/* Empty state */}
      {games.length === 0 ? (
        <section className="px-10 pb-20 pt-16 text-center">
          <p className="text-base" style={{ color: "#4a443b" }}>No published rulebooks match these filters yet.</p>
          <Link href="/gallery" className="mt-3 inline-block text-sm font-medium" style={{ color: "#293B9C" }}>
            Reset filters →
          </Link>
        </section>
      ) : (
        <>
          {/* Card grid */}
          <section className="grid gap-7 px-10 pb-12 pt-8" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {featured ? <FeaturedCard game={featured} /> : null}
            {rest.map((g) => <GameCard key={g.id} game={g} />)}
          </section>

          {/* Pagination */}
          {games.length === 60 ? (
            <div className="px-10 pb-20 text-center">
              <Link
                href={{ pathname: "/gallery", query: { ...sp, page: page + 1 } }}
                className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[13px] font-medium hover:opacity-80"
                style={{ borderColor: "#d7d0c5", color: "#1a1815", background: "#fff" }}
              >
                Load more →
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function FeaturedCard({ game }: { game: GalleryGame }) {
  const cs = game.complexity && isComplexity(game.complexity) ? COMPLEXITY_STYLES[game.complexity] : null;
  const img = game.cardImage || game.homeHeroImage || "";
  return (
    <Link
      href={`/gallery/${game.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_18px_40px_-24px_rgba(26,24,21,0.25)]"
      style={{ gridRow: "span 2", background: "#fff", border: "1px solid #e8e4de" }}
    >
      <div className="relative flex-1 overflow-hidden" style={{ minHeight: 0, aspectRatio: "3/5" }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: "#293B9C" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,0.6))" }} />
        {cs && game.complexity && game.tags?.[0] ? (
          <span
            className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] backdrop-blur-sm"
            style={{ background: "rgba(255,255,255,0.92)", color: "#1a1815" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: cs.dot }} />
            {game.complexity} · {game.tags[0]}
          </span>
        ) : null}
        <div className="absolute bottom-3 left-3 right-12 z-10">
          <div className="font-display font-normal leading-[1.05] tracking-[-0.01em] text-white" style={{ fontSize: "32px" }}>
            {game.title}
          </div>
          <div className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.82)" }}>
            Featured
          </div>
        </div>
        {game.designer ? (
          <span className="absolute bottom-3.5 right-3 z-10 font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.85)" }}>
            {game.designer}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        {game.tagline ? <p className="text-[13.5px] leading-snug" style={{ color: "#4a443b" }}>{game.tagline}</p> : null}
        <div className="flex flex-wrap items-center gap-2.5 pt-2.5 font-mono text-[10.5px] tracking-[0.06em]" style={{ color: "#78746c", borderTop: "1px solid #f0ece6" }}>
          {game.playerCount ? <><span>{game.playerCount} players</span><Dot /></> : null}
          {game.playTime ? <><span>{game.playTime}</span>{cs ? <Dot /> : null}</> : null}
          {cs && game.complexity ? <span className="font-semibold" style={{ color: cs.label }}>{game.complexity}</span> : null}
        </div>
      </div>
    </Link>
  );
}

function GameCard({ game }: { game: GalleryGame }) {
  const cs = game.complexity && isComplexity(game.complexity) ? COMPLEXITY_STYLES[game.complexity] : null;
  const img = game.cardImage || game.homeHeroImage || "";
  return (
    <Link
      href={`/gallery/${game.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_18px_40px_-24px_rgba(26,24,21,0.25)]"
      style={{ background: "#fff", border: "1px solid #e8e4de" }}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: "#293B9C" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,0.55))" }} />
        {cs && game.complexity && game.tags?.[0] ? (
          <span
            className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] backdrop-blur-sm"
            style={{ background: "rgba(255,255,255,0.92)", color: "#1a1815" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: cs.dot }} />
            {game.complexity} · {game.tags[0]}
          </span>
        ) : null}
        <h2 className="absolute bottom-3 left-3 z-10 font-display font-normal leading-[1.05] tracking-[-0.01em] text-white" style={{ fontSize: "22px" }}>
          {game.title}
        </h2>
        {game.designer ? (
          <span className="absolute bottom-3.5 right-3 z-10 font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.85)" }}>
            {game.designer}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        {game.tagline ? <p className="text-[13.5px] leading-snug" style={{ color: "#4a443b" }}>{game.tagline}</p> : null}
        <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-2.5 font-mono text-[10.5px] tracking-[0.06em]" style={{ color: "#78746c", borderTop: "1px solid #f0ece6" }}>
          {game.playerCount ? <span>{game.playerCount}</span> : null}
          {game.playerCount && game.playTime ? <Dot /> : null}
          {game.playTime ? <span>{game.playTime}</span> : null}
          {(game.playerCount || game.playTime) && game.ageRange ? <Dot /> : null}
          {game.ageRange ? <span>{game.ageRange}</span> : null}
          {(game.playerCount || game.playTime || game.ageRange) && cs && game.complexity ? <Dot /> : null}
          {cs && game.complexity ? <span className="font-semibold" style={{ color: cs.label }}>{game.complexity}</span> : null}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS — no errors.

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`. Visit `/gallery` — should render the live published set (or the empty-state if none). Click filter chips — URL updates and the card list re-renders. `/gallery?complexity=Heavy` should filter to Heavy games only.

- [ ] **Step 4: Commit**

```bash
git add app/gallery/page.tsx
git commit -m "feat(gallery): switch index to live Supabase data with filters + pagination"
```

---

## Task 10: Add the "Gallery listing" subsection to the Experience tab

**Goal:** Authors can fill in `gameMeta.tagline`, `designer`, `playerCount`, `playTime`, `complexity`, `ageRange`, `tags`, and `cardImage` from the studio.

**Files:**
- Modify: `app/_components/editor/experience-tab.tsx` — insert a new subsection between the Behavior section (ends ~line 315) and the Languages section (starts ~line 318)

- [ ] **Step 1: Add the subsection**

Locate the `</EditorSection>` that closes the Behavior section (immediately followed by the `{/* Languages */}` comment around line 317). Insert a new `<EditorSection title="Gallery listing">` block between them:

```tsx
      {/* Gallery listing */}
      <EditorSection title="Gallery listing">
        <EditorSubsection
          title="What public viewers see"
          description="Filled-in fields show on your gallery card and reading page. Empty fields are hidden."
        >
          <div className="space-y-4">
            <InputField
              label="Tagline"
              value={systemSettings.gameMeta?.tagline ?? ""}
              onChange={(e) => onSystemSettingChange("gameMeta", { ...systemSettings.gameMeta, tagline: e.target.value || undefined })}
              placeholder="One sentence about your game"
            />
            <InputField
              label="Designer"
              value={systemSettings.gameMeta?.designer ?? ""}
              onChange={(e) => onSystemSettingChange("gameMeta", { ...systemSettings.gameMeta, designer: e.target.value || undefined })}
              placeholder="Your name or studio"
            />
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Players"
                value={systemSettings.gameMeta?.playerCount ?? ""}
                onChange={(e) => onSystemSettingChange("gameMeta", { ...systemSettings.gameMeta, playerCount: e.target.value || undefined })}
                placeholder="2–4"
              />
              <InputField
                label="Play time"
                value={systemSettings.gameMeta?.playTime ?? ""}
                onChange={(e) => onSystemSettingChange("gameMeta", { ...systemSettings.gameMeta, playTime: e.target.value || undefined })}
                placeholder="60–90 min"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Complexity"
                value={systemSettings.gameMeta?.complexity ?? ""}
                onChange={(value) => onSystemSettingChange("gameMeta", {
                  ...systemSettings.gameMeta,
                  complexity: (value || undefined) as "Light" | "Medium" | "Heavy" | undefined,
                })}
                options={[
                  { label: "Not set", value: "" },
                  { label: "Light", value: "Light" },
                  { label: "Medium", value: "Medium" },
                  { label: "Heavy", value: "Heavy" },
                ]}
              />
              <InputField
                label="Age range"
                value={systemSettings.gameMeta?.ageRange ?? ""}
                onChange={(e) => onSystemSettingChange("gameMeta", { ...systemSettings.gameMeta, ageRange: e.target.value || undefined })}
                placeholder="13+"
              />
            </div>
            <InputField
              label="Tags"
              value={(systemSettings.gameMeta?.tags ?? []).join(", ")}
              onChange={(e) => {
                const tags = e.target.value
                  .split(",")
                  .map((t) => t.trim().toLowerCase())
                  .filter(Boolean);
                onSystemSettingChange("gameMeta", { ...systemSettings.gameMeta, tags: tags.length ? tags : undefined });
              }}
              placeholder="strategy, cooperative"
            />
            <div>
              <FieldLabel>Gallery image URL</FieldLabel>
              <InputField
                value={systemSettings.gameMeta?.cardImage ?? ""}
                onChange={(e) => onSystemSettingChange("gameMeta", { ...systemSettings.gameMeta, cardImage: e.target.value || undefined })}
                placeholder="Defaults to your home card image"
              />
            </div>
          </div>
        </EditorSubsection>
      </EditorSection>
```

Note: `SelectField` is generic on `<T extends string>` and types its value as `T`. Passing `""` for "Not set" works because we cast at the call site (`(value || undefined) as "Light" | ...`). The `value` prop accepts the empty string fine.

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS — no errors.

- [ ] **Step 3: Manually verify**

Run: `npm run dev`. Open the studio for any game → Experience tab → confirm "Gallery listing" subsection appears between Behavior and Languages. Type into Tagline → save → reload — value persists.

Publish the game → visit `/gallery/<game-id>` → confirm the tagline appears in the hero subtitle and OG description.

- [ ] **Step 4: Commit**

```bash
git add app/_components/editor/experience-tab.tsx
git commit -m "feat(studio): add Gallery listing fields to Experience tab"
```

---

## Task 11: Seed the curated entries and retire `gallery-data.ts`

**Goal:** The 6 hand-written entries in `gallery-data.ts` (Cascade, Ironveil, Solaseed, Switchback, Foundry 9, Papercut) become real `games` rows owned by a `sherpa-curated@sherpa.so` service account, with `featured = true` for Ironveil. Once they appear in the live `/gallery`, delete `gallery-data.ts` and remove its remaining import.

This is the only task that touches production data. The seed is idempotent (`ON CONFLICT DO NOTHING`) and writes only to Sherpa-owned IDs, so re-running is safe.

**Files:**
- Create: `supabase/seed-gallery.sql`
- Delete: `app/_lib/gallery-data.ts`

- [ ] **Step 1: Create the seed file**

Create `supabase/seed-gallery.sql`:

```sql
-- Run this in the Supabase Dashboard → SQL Editor.
-- Seeds the 6 hand-written gallery entries from app/_lib/gallery-data.ts as real
-- games rows. Idempotent: ON CONFLICT DO NOTHING.
--
-- Pre-req: a service auth user "sherpa-curated@sherpa.so" must exist with a
-- known UUID. Create it once via Supabase Auth (Dashboard → Authentication →
-- Add user → Email "sherpa-curated@sherpa.so") and paste the resulting UUID
-- into the @curator_id placeholder below before running.

DO $$
DECLARE
  curator_id uuid := '<PASTE_CURATOR_UUID_HERE>';
BEGIN
  IF curator_id IS NULL THEN
    RAISE EXCEPTION 'Set curator_id to the UUID of sherpa-curated@sherpa.so before running';
  END IF;

  INSERT INTO games (id, title, user_id, publish_status, featured, system_settings)
  VALUES
    (
      'ironveil', 'Ironveil', curator_id, 'published', true,
      jsonb_build_object('gameMeta', jsonb_build_object(
        'tagline',     'A hidden-movement thriller set in a city under occupation.',
        'designer',    'Marcus Drenn',
        'playerCount', '3–6',
        'playTime',    '90–120 min',
        'complexity',  'Heavy',
        'ageRange',    '17+',
        'tags',        jsonb_build_array('thematic', 'hidden-movement', 'asymmetric'),
        'cardImage',   'https://images.unsplash.com/photo-1514565131-fce0801e6785?q=80&w=800&auto=format&fit=crop'
      ))
    ),
    (
      'cascade', 'Cascade', curator_id, 'published', false,
      jsonb_build_object('gameMeta', jsonb_build_object(
        'tagline',     'A river-routing game where every dam changes everything downstream.',
        'designer',    'Elara Voss',
        'playerCount', '2–4',
        'playTime',    '60–90 min',
        'complexity',  'Medium',
        'ageRange',    '13+',
        'tags',        jsonb_build_array('strategy', 'tile-placement'),
        'cardImage',   'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop'
      ))
    ),
    (
      'solaseed', 'Solaseed', curator_id, 'published', false,
      jsonb_build_object('gameMeta', jsonb_build_object(
        'tagline',     'Grow a garden on a dying moon. Cooperate or perish.',
        'designer',    'Priya Nath',
        'playerCount', '1–4',
        'playTime',    '45–60 min',
        'complexity',  'Light',
        'ageRange',    '8+',
        'tags',        jsonb_build_array('cooperative', 'engine-building'),
        'cardImage',   'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=800&auto=format&fit=crop'
      ))
    ),
    (
      'switchback', 'Switchback', curator_id, 'published', false,
      jsonb_build_object('gameMeta', jsonb_build_object(
        'tagline',     'A mountain rally pressed into 40-second turns.',
        'designer',    'Hana Okabe',
        'playerCount', '2–5',
        'playTime',    '30–45 min',
        'complexity',  'Medium',
        'ageRange',    '8+',
        'tags',        jsonb_build_array('racing', 'strategy'),
        'cardImage',   'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop'
      ))
    ),
    (
      'foundry-9', 'Foundry 9', curator_id, 'published', false,
      jsonb_build_object('gameMeta', jsonb_build_object(
        'tagline',     'A company town, a brittle supply chain, three generations.',
        'designer',    'Yusuf Adeyemi',
        'playerCount', '3–5',
        'playTime',    '120–180 min',
        'complexity',  'Heavy',
        'ageRange',    '17+',
        'tags',        jsonb_build_array('economic', 'strategy'),
        'cardImage',   'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?q=80&w=800&auto=format&fit=crop'
      ))
    ),
    (
      'papercut', 'Papercut', curator_id, 'published', false,
      jsonb_build_object('gameMeta', jsonb_build_object(
        'tagline',     'Write letters, deliver them in character, betray gently.',
        'designer',    'Mira Delacroix',
        'playerCount', '4–8',
        'playTime',    '25 min',
        'complexity',  'Light',
        'ageRange',    '13+',
        'tags',        jsonb_build_array('party', 'storytelling'),
        'cardImage',   'https://images.unsplash.com/photo-1524293568345-75d62c3664f7?q=80&w=800&auto=format&fit=crop'
      ))
    )
  ON CONFLICT (id) DO NOTHING;
END $$;
```

- [ ] **Step 2: Apply manually**

In Supabase: Authentication → Add user → email `sherpa-curated@sherpa.so` (any password). Copy the resulting UUID. Paste it into `seed-gallery.sql` for `curator_id`. Then SQL Editor → run.

Verify: `SELECT id, title, featured FROM games WHERE user_id = '<curator_id>';` — should return 6 rows, with Ironveil as `featured = true`.

- [ ] **Step 3: Verify in browser**

Run: `npm run dev` → visit `/gallery`. The 6 curated games should now load from the database. Ironveil should be the featured (large) card.

- [ ] **Step 4: Delete `gallery-data.ts` and confirm no remaining imports**

```bash
rm app/_lib/gallery-data.ts
```

Run: `npx tsc --noEmit`
Expected: PASS — no broken imports. (`app/gallery/page.tsx` and `app/gallery/[id]/page.tsx` no longer reference it after Tasks 7 and 9.)

If TypeScript reports a missing import somewhere unexpected, search for `gallery-data` and remove the remaining reference.

- [ ] **Step 5: Commit**

```bash
git add supabase/seed-gallery.sql
git rm app/_lib/gallery-data.ts
git commit -m "feat(gallery): seed curated entries to db; retire static gallery-data"
```

---

## Self-review

**Spec coverage:**
- Publishing model (`publish_status='published'`-driven listing) — Task 3 (queries hard-filter), Task 9 (index), Task 7 (reading page).
- `featured` column — Task 1.
- `gameMeta` shape — Task 2.
- `gallery-queries.ts` with two functions — Task 3.
- Gallery index live data + filters + pagination — Task 9 (index + Load more), Task 8 (filter chips).
- Reading page (`/gallery/[id]`) Server Component, 404, JSON-LD — Task 7.
- `layout.tsx` `generateMetadata` — Task 7.
- JSON-LD `Game` + `HowTo` shape — Task 5.
- Reading-page UI (sticky top bar, hero, "Open interactive board" strip, two-column body, footer) — Task 6.
- BlockRenderer for the `text`/`heading` (via `blockFormat`)/`bullet_list`/`ordered_list`/`image`/`divider`/unknown table — Task 4 covers `text` (with `prose|h2|h3|bullets|steps`) + `image`. Sherpa's `ContentBlock` does not have separate `divider` or `heading` types — headings are `text` blocks with `blockFormat: "h2"|"h3"`, lists are `text` blocks with `blockFormat: "bullets"|"steps"`. The plan reflects what the codebase actually models. **Gap accepted.** A literal `divider` block does not exist; if added later, extend the renderer.
- Experience tab "Gallery listing" subsection — Task 10.
- Curated entries seed → `gallery-data.ts` retirement — Task 11.
- Verification steps from the spec — covered: gallery index publish/unpublish (Task 9 Step 3), filtering (Task 9 Step 3), reading page render (Task 7 Step 4), SEO via curl (Task 7 Step 4), 404 (Task 7 — `notFound()` in code), interactive CTA (`/play/${game.id}` link in `reading-page.tsx`), gameMeta fields end-to-end (Task 10 Step 3), TypeScript clean (every task ends with `npx tsc --noEmit`).

**Placeholder scan:** No "TODO", "fill in", or "similar to Task N" references. Each step has full code or a concrete command.

**Type consistency:**
- `GalleryGame` and `GalleryCard` types are defined in Task 3 (`gallery-queries.ts`) and consumed unchanged in Tasks 5, 6, 7, 9 — same field names throughout (`tagline`, `designer`, `cardImage`, `homeHeroImage`, `userId`, `complexity` typed as `GameComplexity`).
- `parsePlayerCountRange` is exported from `gallery-queries.ts` (Task 3) and imported by `json-ld.ts` (Task 5) — name matches.
- `buildGameJsonLd(game, cards)` defined in Task 5, called identically in Task 7.
- `BlockRenderer` (named export) defined in Task 4, imported in Task 6.
- `SystemSettings.gameMeta` shape (Task 2) matches exactly what `mapGameRowToGalleryGame` flattens (Task 3) and what the Experience tab writes (Task 10).
- `EditorSection`, `EditorSubsection`, `InputField`, `SelectField`, `FieldLabel` all already exported from `app/_components/editor/editor-ui.tsx` — Task 10 only consumes existing primitives.

**Order matters:**
1 (DB column) → 2 (type) → 3 (queries) → 4 (block-renderer) → 5 (json-ld) → 6 (reading UI) → 7 (route wiring) → 8 (filters) → 9 (gallery index) → 10 (studio fields) → 11 (seed + delete static data). Every task imports only from earlier tasks.

---

## Out-of-scope / post-V1 polish

The spec touches a few things this plan deliberately defers:

- **IntersectionObserver active-TOC highlight.** Task 6 ships a static TOC. Adding scroll-spy would require splitting `reading-page.tsx` into a server shell + a small `"use client"` TOC. Not blocking SEO.
- **Designer fallback to user display name.** Spec says "defaults to user display name if blank." V1 hides the line when `designer` is blank. Server-side auth user lookup can be a follow-up — `game.userId` is already populated by `fetchPublishedGame`.
- **`generateStaticParams` / ISR.** Reading page is `force-dynamic` in v1 for simplicity. Once publish volume is known, switch to ISR with on-publish revalidation.
- **Sitemap.** SEO benefits compound with a `/sitemap.xml` listing every published game. Out of scope for this plan; trivial follow-up against `fetchPublishedGames`.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-03-published-player-seo-aeo.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
