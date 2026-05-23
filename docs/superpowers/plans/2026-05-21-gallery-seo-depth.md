# Gallery Polish + Per-Game SEO/AEO Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deepen Plan A's SEO/AEO surface on the gallery routes — richer `HowToStep` content (extracted from card blocks, not just summary), schema.org `CollectionPage`+`ItemList` on `/gallery`, `BreadcrumbList` on `/gallery/[id]`, dynamic 1200×630 OG images per game, canonical URLs.

**Architecture:** Five non-overlapping pieces. (1) Pure `extractBlockText` mirrors the existing `renderBlockToString` (plain text instead of HTML). (2) Private `composeStepText` helper in `json-ld.ts` joins `card.summary` + extracted block text, capped at 1500 chars with sentence-boundary truncation. (3) New `buildBreadcrumbListLd` exported from `json-ld.ts`. (4) New `collection-jsonld.ts` file owns `buildCollectionPageLd`. (5) New `app/gallery/[id]/opengraph-image.tsx` route uses Next's `ImageResponse` for split-layout (image left, brand-blue right) or all-blue branded fallback. Canonical URLs land as `alternates.canonical` on the two existing gallery routes' metadata.

**Tech Stack:** Next.js 16 `ImageResponse` from `next/og`. Schema.org JSON-LD via the existing `safeJsonLdScript` helper. TypeScript strict, vitest 4. No new runtime dependencies.

---

## Pre-flight

Per Sherpa's `AGENTS.md`, this is a custom Next.js 16 fork. Plan A's spec/plan ran without fork-specific surprises against the metadata API surface; this plan uses one additional API (`next/og` → `ImageResponse`). If `ImageResponse` import fails or the fork's signature differs, open `node_modules/next/dist/docs/01-app/02-api-reference/03-file-conventions/metadata/opengraph-image.md` (or similar) and adjust. The route file convention `app/<route>/opengraph-image.tsx` is stable across Next 13–16.

---

## File map

| File | Role |
|------|------|
| `app/_components/gallery/block-renderer.tsx` | Modify. Add exported `extractBlockText(block)` next to `renderBlockToString`. |
| `app/_components/gallery/block-renderer.test.tsx` | Modify. Add 5 tests for `extractBlockText`. |
| `app/_components/gallery/json-ld.ts` | Modify. Add private `composeStepText`. Update `buildGameJsonLd` step mapping. Add exported `buildBreadcrumbListLd`. |
| `app/_components/gallery/json-ld.test.ts` | Modify. Add 5 tests (3 for richer HowToStep + 2 for breadcrumb). |
| `app/_components/gallery/collection-jsonld.ts` | **New.** `buildCollectionPageLd(games, siteUrl)`. |
| `app/_components/gallery/collection-jsonld.test.ts` | **New.** 3 tests. |
| `app/gallery/page.tsx` | Modify. Add canonical to metadata, mount CollectionPage `<script>`. |
| `app/gallery/[id]/page.tsx` | Modify. Mount second `<script>` with BreadcrumbList. |
| `app/gallery/[id]/layout.tsx` | Modify. Add `alternates.canonical` to `generateMetadata` return. |
| `app/gallery/[id]/opengraph-image.tsx` | **New.** Next `ImageResponse` route. |

---

## Task 1: Add `extractBlockText` to block-renderer with tests

Strict TDD: tests first, see fail, implement, see pass, commit.

**Files:**
- Modify: `app/_components/gallery/block-renderer.test.tsx`
- Modify: `app/_components/gallery/block-renderer.tsx`

- [ ] **Step 1: Add failing tests to the existing test file**

Open `app/_components/gallery/block-renderer.test.tsx`. The file currently imports only `renderBlockToString`. Update the import line to also import `extractBlockText`:

Find:

```ts
import { renderBlockToString } from "./block-renderer";
```

Replace with:

```ts
import { renderBlockToString, extractBlockText } from "./block-renderer";
```

Then ADD this `describe` block at the end of the file (after the existing `describe("renderBlockToString", ...)` block, before the final closing brace if any):

```ts
describe("extractBlockText", () => {
  it("returns the value of a prose text block as-is", () => {
    expect(
      extractBlockText({ id: "b", type: "text", value: "Hello world", blockFormat: "prose" })
    ).toBe("Hello world");
  });

  it("includes h2 and h3 headings as raw text", () => {
    expect(
      extractBlockText({ id: "b", type: "text", value: "Setup", blockFormat: "h2" })
    ).toBe("Setup");
    expect(
      extractBlockText({ id: "b", type: "text", value: "Detail", blockFormat: "h3" })
    ).toBe("Detail");
  });

  it("prefixes bullet and step lines with '• ' and joins by newline", () => {
    expect(
      extractBlockText({ id: "b", type: "text", value: "alpha\nbeta\ngamma", blockFormat: "bullets" })
    ).toBe("• alpha\n• beta\n• gamma");
    expect(
      extractBlockText({ id: "b", type: "text", value: "one\ntwo", blockFormat: "steps" })
    ).toBe("• one\n• two");
  });

  it("returns empty string for non-text block types", () => {
    expect(extractBlockText({ id: "b", type: "image", value: "https://x/y.jpg" })).toBe("");
    expect(extractBlockText({ id: "b", type: "video", value: "https://yt/x" })).toBe("");
    expect(extractBlockText({ id: "b", type: "carousel", value: "" })).toBe("");
  });

  it("trims whitespace and returns empty for blank values", () => {
    expect(
      extractBlockText({ id: "b", type: "text", value: "   ", blockFormat: "prose" })
    ).toBe("");
    expect(
      extractBlockText({ id: "b", type: "text", value: "  Hello  ", blockFormat: "prose" })
    ).toBe("Hello");
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm test -- block-renderer`
Expected: FAIL — `extractBlockText` does not exist (imported but not exported). The pre-existing `renderBlockToString` tests stay green.

- [ ] **Step 3: Add `extractBlockText` to the implementation file**

Open `app/_components/gallery/block-renderer.tsx`. Add this function AFTER the existing `renderBlockToString` function and BEFORE the `BlockRenderer` React component:

```ts
/**
 * Plain-text counterpart to renderBlockToString. Used by the HowToStep JSON-LD
 * builder to feed AI engines actual rule prose. Returns "" for non-text blocks
 * and empty values.
 */
export function extractBlockText(block: ContentBlock): string {
  if (block.type !== "text") return "";
  const value = (block.value ?? "").trim();
  if (!value) return "";

  switch (block.blockFormat) {
    case "bullets":
    case "steps":
      return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `• ${line}`)
        .join("\n");
    case "h2":
    case "h3":
    case "prose":
    default:
      return value;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- block-renderer`
Expected: PASS — all tests green (10 pre-existing + 5 new = 15 total in this file).

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: 75/75 (was 70; +5 new).

- [ ] **Step 6: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS — zero errors.

- [ ] **Step 7: Commit**

```bash
git add app/_components/gallery/block-renderer.tsx app/_components/gallery/block-renderer.test.tsx
git commit -m "feat(seo): add extractBlockText for plain-text block content"
```

---

## Task 2: Richer `HowToStep.text` via `composeStepText`

**Files:**
- Modify: `app/_components/gallery/json-ld.ts`
- Modify: `app/_components/gallery/json-ld.test.ts`

- [ ] **Step 1: Add failing tests to the json-ld test file**

Open `app/_components/gallery/json-ld.test.ts`. The file currently has a `baseGame` fixture and a `cards` fixture at the top. Add this new `describe` block AFTER the existing `describe("buildGameJsonLd", ...)` block (or at the end of the file if you prefer — the order doesn't matter for vitest):

```ts
describe("buildGameJsonLd with richer HowToStep", () => {
  it("uses card.summary when the card has no text blocks", () => {
    const cards: GalleryCard[] = [
      { id: "c1", kind: "page", title: "Setup", summary: "Lay out tiles.", heroImage: "", blocks: [], cardSize: "medium" },
    ];
    const ld = buildGameJsonLd(baseGame, cards);
    const step = (ld.mainEntity.step as Array<{ text: string }>)[0];
    expect(step.text).toBe("Lay out tiles.");
  });

  it("joins summary + extracted block text with blank lines", () => {
    const cards: GalleryCard[] = [
      {
        id: "c1", kind: "page", title: "Setup", summary: "Lay out tiles.", heroImage: "", cardSize: "medium",
        blocks: [
          { id: "b1", type: "text", value: "Place the board in the center.", blockFormat: "prose" },
          { id: "b2", type: "text", value: "Each player picks a color.", blockFormat: "prose" },
        ],
      },
    ];
    const ld = buildGameJsonLd(baseGame, cards);
    const step = (ld.mainEntity.step as Array<{ text: string }>)[0];
    expect(step.text).toBe(
      "Lay out tiles.\n\nPlace the board in the center.\n\nEach player picks a color."
    );
  });

  it("truncates composed text exceeding 1500 chars at a sentence boundary with …", () => {
    const long = "A".repeat(800) + ". " + "B".repeat(800);
    const cards: GalleryCard[] = [
      {
        id: "c1", kind: "page", title: "Setup", summary: "Short.", heroImage: "", cardSize: "medium",
        blocks: [{ id: "b1", type: "text", value: long, blockFormat: "prose" }],
      },
    ];
    const ld = buildGameJsonLd(baseGame, cards);
    const step = (ld.mainEntity.step as Array<{ text: string }>)[0];
    expect(step.text.length).toBeLessThanOrEqual(1501);
    expect(step.text.endsWith("…")).toBe(true);
  });
});
```

Make sure `GalleryCard` is imported at the top of the file (it should already be alongside `GalleryGame`). If only `GalleryGame` is imported, add `GalleryCard` to the same import:

```ts
import type { GalleryGame, GalleryCard } from "@/app/_lib/gallery-queries";
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm test -- json-ld`
Expected: FAIL on the new `describe` block — `step.text` will return the old summary-only string for the "joins summary + extracted block text" and "truncates composed text" tests. The "uses card.summary" test will accidentally PASS (current behavior already returns summary), but that's fine — it's a regression-guard.

- [ ] **Step 3: Add `composeStepText` and update `buildGameJsonLd`**

Open `app/_components/gallery/json-ld.ts`. Near the top of the file (after imports, before the type definitions or first `export`), add:

```ts
import { extractBlockText } from "./block-renderer";

const MAX_STEP_LENGTH = 1500;

function composeStepText(card: GalleryCard): string {
  const blockTexts = (card.blocks ?? [])
    .map(extractBlockText)
    .filter(Boolean);

  if (blockTexts.length === 0) {
    return card.summary;
  }

  const composed = [card.summary, ...blockTexts]
    .filter(Boolean)
    .join("\n\n");

  if (composed.length <= MAX_STEP_LENGTH) {
    return composed;
  }

  const truncated = composed.slice(0, MAX_STEP_LENGTH);
  const lastSentence = truncated.lastIndexOf(". ");
  if (lastSentence > MAX_STEP_LENGTH * 0.5) {
    return truncated.slice(0, lastSentence + 1) + "…";
  }
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "…";
}
```

Then find the existing `buildGameJsonLd` function's `mainEntity.step` mapping. It currently looks like:

```ts
    mainEntity: {
      "@type": "HowTo",
      name: `How to play ${game.title}`,
      step: cards.map((c) => ({ "@type": "HowToStep", name: c.title, text: c.summary })),
    },
```

Replace the `step:` line with:

```ts
      step: cards.map((c) => ({ "@type": "HowToStep", name: c.title, text: composeStepText(c) })),
```

(Only that single line changes inside `buildGameJsonLd`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- json-ld`
Expected: PASS — all green (existing tests + 3 new).

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: 78/78 (was 75; +3 new).

- [ ] **Step 6: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/_components/gallery/json-ld.ts app/_components/gallery/json-ld.test.ts
git commit -m "feat(seo): richer HowToStep.text from card blocks (1500-char cap)"
```

---

## Task 3: Add `buildBreadcrumbListLd` with tests

**Files:**
- Modify: `app/_components/gallery/json-ld.ts`
- Modify: `app/_components/gallery/json-ld.test.ts`

- [ ] **Step 1: Add failing tests**

Open `app/_components/gallery/json-ld.test.ts`. Update the imports to add `buildBreadcrumbListLd`:

Find:

```ts
import { buildGameJsonLd } from "./json-ld";
```

Replace with:

```ts
import { buildGameJsonLd, buildBreadcrumbListLd } from "./json-ld";
```

Then ADD this `describe` block at the end of the file:

```ts
describe("buildBreadcrumbListLd", () => {
  it("emits Home → Gallery → Game with positions 1/2/3 and full URLs", () => {
    const ld = buildBreadcrumbListLd(baseGame, "https://sherpa.games");
    expect(ld["@type"]).toBe("BreadcrumbList");
    const items = ld.itemListElement as Array<{ position: number; name: string; item: string }>;
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ position: 1, name: "Home", item: "https://sherpa.games/" });
    expect(items[1]).toMatchObject({ position: 2, name: "Gallery", item: "https://sherpa.games/gallery" });
    expect(items[2]).toMatchObject({ position: 3, name: "Ironveil", item: "https://sherpa.games/gallery/ironveil" });
  });

  it("uses the game title verbatim (no truncation)", () => {
    const longTitle = { ...baseGame, title: "A Very Long Game Title That Should Survive Verbatim" };
    const ld = buildBreadcrumbListLd(longTitle, "https://sherpa.games");
    const items = ld.itemListElement as Array<{ name: string }>;
    expect(items[2].name).toBe("A Very Long Game Title That Should Survive Verbatim");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- json-ld`
Expected: FAIL — `buildBreadcrumbListLd` is not exported from `./json-ld`.

- [ ] **Step 3: Add the function**

Open `app/_components/gallery/json-ld.ts`. Add this function at the bottom of the file (after `buildGameJsonLd`):

```ts
export function buildBreadcrumbListLd(game: GalleryGame, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Gallery", item: `${siteUrl}/gallery` },
      { "@type": "ListItem", position: 3, name: game.title, item: `${siteUrl}/gallery/${game.id}` },
    ],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- json-ld`
Expected: PASS.

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: 80/80 (was 78; +2 new).

- [ ] **Step 6: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/_components/gallery/json-ld.ts app/_components/gallery/json-ld.test.ts
git commit -m "feat(seo): add BreadcrumbList JSON-LD builder"
```

---

## Task 4: Add `buildCollectionPageLd` with tests

**Files:**
- Create: `app/_components/gallery/collection-jsonld.test.ts`
- Create: `app/_components/gallery/collection-jsonld.ts`

- [ ] **Step 1: Write failing tests**

Create `app/_components/gallery/collection-jsonld.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildCollectionPageLd } from "./collection-jsonld";
import type { GalleryGame } from "@/app/_lib/gallery-queries";

function game(id: string, title: string): GalleryGame {
  return { id, title, featured: false, createdAt: "2026-01-01T00:00:00Z" };
}

describe("buildCollectionPageLd", () => {
  it("emits a CollectionPage with the correct @context, @type, name, description, url", () => {
    const ld = buildCollectionPageLd([], "https://sherpa.games");
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("CollectionPage");
    expect(ld.name).toBeTruthy();
    expect(ld.description).toBeTruthy();
    expect(ld.url).toBe("https://sherpa.games/gallery");
  });

  it("includes a nested ItemList with numberOfItems matching the games length", () => {
    const games = [game("a", "Alpha"), game("b", "Beta"), game("c", "Cascade")];
    const ld = buildCollectionPageLd(games, "https://sherpa.games");
    const main = ld.mainEntity as { "@type": string; numberOfItems: number; itemListElement: unknown[] };
    expect(main["@type"]).toBe("ItemList");
    expect(main.numberOfItems).toBe(3);
    expect(main.itemListElement).toHaveLength(3);
  });

  it("emits one ListItem per game with sequential 1-based position, url, name", () => {
    const games = [game("ironveil", "Ironveil"), game("cascade", "Cascade")];
    const ld = buildCollectionPageLd(games, "https://sherpa.games");
    const items = (ld.mainEntity as { itemListElement: Array<{ position: number; url: string; name: string }> }).itemListElement;
    expect(items[0]).toMatchObject({ position: 1, url: "https://sherpa.games/gallery/ironveil", name: "Ironveil" });
    expect(items[1]).toMatchObject({ position: 2, url: "https://sherpa.games/gallery/cascade", name: "Cascade" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- collection-jsonld`
Expected: FAIL — module `./collection-jsonld` does not exist.

- [ ] **Step 3: Create the implementation file**

Create `app/_components/gallery/collection-jsonld.ts`:

```ts
import type { GalleryGame } from "@/app/_lib/gallery-queries";

export function buildCollectionPageLd(games: GalleryGame[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Sherpa Gallery — Interactive Rulebooks",
    description: "Interactive rulebooks for board games published with Sherpa.",
    url: `${siteUrl}/gallery`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: games.length,
      itemListElement: games.map((g, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteUrl}/gallery/${g.id}`,
        name: g.title,
      })),
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- collection-jsonld`
Expected: PASS — 3/3.

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: 83/83 (was 80; +3 new).

- [ ] **Step 6: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/_components/gallery/collection-jsonld.ts app/_components/gallery/collection-jsonld.test.ts
git commit -m "feat(seo): add CollectionPage + ItemList JSON-LD builder"
```

---

## Task 5: Mount CollectionPage on `/gallery` + add canonical

**Files:**
- Modify: `app/gallery/page.tsx`

- [ ] **Step 1: Update imports and metadata**

Open `app/gallery/page.tsx`. Add these imports near the existing imports at the top (after the existing `Link from "next/link"` and `fetchPublishedGames` imports):

```ts
import { buildCollectionPageLd } from "@/app/_components/gallery/collection-jsonld";
import { safeJsonLdScript } from "@/app/_lib/safe-jsonld";
import { SITE_URL } from "@/app/_lib/site-config";
```

Find the existing `export const metadata` block:

```ts
export const metadata = {
  title: "Gallery — Sherpa",
  description: "Interactive rules experiences built with Sherpa.",
};
```

Replace with:

```ts
export const metadata = {
  title: "Gallery — Sherpa",
  description: "Interactive rules experiences built with Sherpa.",
  alternates: { canonical: `${SITE_URL}/gallery` },
};
```

- [ ] **Step 2: Mount the CollectionPage JSON-LD inside the page component**

Inside `export default async function GalleryPage(...)`, after the line `const games = await fetchPublishedGames(...)` (and after the `featured`/`rest` destructuring), but BEFORE the `return` statement, add:

```tsx
  const collectionLd = buildCollectionPageLd(games, SITE_URL);
```

Then find the line `return (` followed by `<div className="min-h-screen ...">`. Wrap the existing `<div>` in a Fragment and inject the JSON-LD script as a sibling. The new return shape:

```tsx
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdScript(collectionLd) }}
      />
      <div className="min-h-screen font-sans" style={{ background: "#fbf9f7", color: "#1a1815" }}>
        {/* ... existing markup unchanged ... */}
      </div>
    </>
  );
```

Only the opening of the return and the closing of the return change — the `<div>` and everything inside it stay exactly as they were.

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Verify tests still pass**

Run: `npm test`
Expected: 83/83.

- [ ] **Step 5: Commit**

```bash
git add app/gallery/page.tsx
git commit -m "feat(seo): mount CollectionPage JSON-LD + canonical on /gallery"
```

---

## Task 6: Mount BreadcrumbList on `/gallery/[id]` + canonical on layout

**Files:**
- Modify: `app/gallery/[id]/page.tsx`
- Modify: `app/gallery/[id]/layout.tsx`

- [ ] **Step 1: Update `app/gallery/[id]/page.tsx`**

Find the existing import line:

```ts
import { buildGameJsonLd } from "@/app/_components/gallery/json-ld";
```

Replace with:

```ts
import { buildGameJsonLd, buildBreadcrumbListLd } from "@/app/_components/gallery/json-ld";
```

Add a new import below the existing imports:

```ts
import { SITE_URL } from "@/app/_lib/site-config";
```

Find the body of `GalleryEntryPage` where `ld` is computed:

```ts
  const { game, cards } = result;
  const ld = buildGameJsonLd(game, cards);
```

Add the breadcrumbs build immediately after `const ld = ...`:

```ts
  const { game, cards } = result;
  const ld = buildGameJsonLd(game, cards);
  const breadcrumbs = buildBreadcrumbListLd(game, SITE_URL);
```

Find the existing JSX return that injects the single Game `<script>`:

```tsx
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdScript(ld) }}
      />
      <ReadingPage game={game} cards={cards} />
    </>
  );
```

Replace with:

```tsx
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdScript(ld) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdScript(breadcrumbs) }}
      />
      <ReadingPage game={game} cards={cards} />
    </>
  );
```

(One new `<script>` element added as a sibling of the existing one.)

- [ ] **Step 2: Update `app/gallery/[id]/layout.tsx` to add canonical**

Find the existing import block at the top of `app/gallery/[id]/layout.tsx`. It includes `Metadata` from `"next"` and `fetchPublishedGame`. Add this line:

```ts
import { SITE_URL } from "@/app/_lib/site-config";
```

Find the existing `return { ... }` inside `generateMetadata` (specifically the one after `const image = ...`):

```ts
  return {
    title: `${game.title} — Interactive Rulebook · Sherpa`,
    description,
    openGraph: { ... },
    twitter: { ... },
  };
```

Add `alternates: { canonical: ... }` between `description` and `openGraph`:

```ts
  return {
    title: `${game.title} — Interactive Rulebook · Sherpa`,
    description,
    alternates: { canonical: `${SITE_URL}/gallery/${id}` },
    openGraph: { ... },
    twitter: { ... },
  };
```

(Only the `alternates:` line is added; everything else stays identical.)

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Verify tests still pass**

Run: `npm test`
Expected: 83/83.

- [ ] **Step 5: Commit**

```bash
git add app/gallery/[id]/page.tsx app/gallery/[id]/layout.tsx
git commit -m "feat(seo): mount BreadcrumbList + canonical on /gallery/[id]"
```

---

## Task 7: Dynamic OG image route

This is the heaviest task in the plan. No automated tests (Next's `ImageResponse` JSX-to-PNG pipeline is not unit-testable in the codebase's setup); verify with `tsc --noEmit` + the controller's dev-server visual check.

**Files:**
- Create: `app/gallery/[id]/opengraph-image.tsx`

- [ ] **Step 1: Create the route file**

Create `app/gallery/[id]/opengraph-image.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { fetchPublishedGame } from "@/app/_lib/gallery-queries";

export const alt = "Sherpa game cover";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const BRAND_BLUE = "#293B9C";
const TEXT_PRIMARY = "#ffffff";
const TEXT_DIM = "rgba(255,255,255,0.85)";
const TEXT_MUTED = "rgba(255,255,255,0.65)";

const COMPLEXITY_DOT: Record<string, string> = {
  Light: "#22c55e",
  Medium: "#f59e0b",
  Heavy: "#ef4444",
};

type MetaGame = {
  complexity?: string;
  playerCount?: string;
  playTime?: string;
};

function MetaRow({
  game,
  compact = false,
}: {
  game: MetaGame;
  compact?: boolean;
}) {
  const fontSize = compact ? 22 : 26;
  const gap = compact ? 20 : 32;

  return (
    <div style={{ display: "flex", gap, fontSize, color: TEXT_DIM }}>
      {game.complexity ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: COMPLEXITY_DOT[game.complexity] ?? "#9ca3af",
              display: "inline-block",
            }}
          />
          <span>{game.complexity}</span>
        </div>
      ) : null}
      {game.playerCount ? (
        <div style={{ display: "flex", alignItems: "center" }}>
          {game.playerCount} players
        </div>
      ) : null}
      {game.playTime ? (
        <div style={{ display: "flex", alignItems: "center" }}>
          {game.playTime}
        </div>
      ) : null}
    </div>
  );
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchPublishedGame(id);

  if (!result) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: BRAND_BLUE,
            color: TEXT_PRIMARY,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 56,
            fontWeight: 600,
          }}
        >
          Sherpa
        </div>
      ),
      size
    );
  }

  const { game } = result;
  const heroImage = game.cardImage || game.homeHeroImage;

  if (!heroImage) {
    // Branded-only layout (no photo).
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: BRAND_BLUE,
            color: TEXT_PRIMARY,
            padding: "80px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div style={{ fontSize: 28, color: TEXT_MUTED, letterSpacing: "0.1em" }}>
            SHERPA
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>
              {game.title}
            </div>
            {game.tagline ? (
              <div
                style={{
                  fontSize: 32,
                  marginTop: 32,
                  color: TEXT_DIM,
                  lineHeight: 1.3,
                  maxWidth: 980,
                }}
              >
                {game.tagline}
              </div>
            ) : null}
          </div>
          <MetaRow game={game} />
        </div>
      ),
      size
    );
  }

  // Split layout (photo left, branded right).
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <div
          style={{
            width: "50%",
            height: "100%",
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div
          style={{
            width: "50%",
            height: "100%",
            background: BRAND_BLUE,
            color: TEXT_PRIMARY,
            padding: "60px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div style={{ fontSize: 24, color: TEXT_MUTED, letterSpacing: "0.1em" }}>
            SHERPA
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05 }}>
              {game.title}
            </div>
            {game.tagline ? (
              <div
                style={{
                  fontSize: 26,
                  marginTop: 24,
                  color: TEXT_DIM,
                  lineHeight: 1.3,
                }}
              >
                {game.tagline}
              </div>
            ) : null}
          </div>
          <MetaRow game={game} compact />
        </div>
      </div>
    ),
    size
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS. If TS complains about `next/og` not being found, the fork's package layout may differ — check `node_modules/next/og` and adjust the import path if needed (rare).

- [ ] **Step 3: Verify tests still pass**

Run: `npm test`
Expected: 83/83 — no test regressions (this file is not tested).

- [ ] **Step 4: Verify the build picks up the new route**

Run: `npm run build`
Expected: build succeeds. Look for `/gallery/[id]/opengraph-image` or similar in the build output. If the build fails for env-related Supabase reasons unrelated to this file (same pre-existing issue as Plan A), STOP and report — but TS clean is the gating criterion. The controller will dev-server-verify the visual output separately.

- [ ] **Step 5: Commit**

```bash
git add app/gallery/[id]/opengraph-image.tsx
git commit -m "feat(seo): dynamic 1200x630 OG image route per game"
```

---

## Self-review

**1. Spec coverage** — every section of the spec maps to a task:
- `extractBlockText` → Task 1
- `composeStepText` + richer HowTo → Task 2
- `buildBreadcrumbListLd` → Task 3
- `buildCollectionPageLd` → Task 4
- CollectionPage mounting + canonical on `/gallery` → Task 5
- BreadcrumbList mounting + canonical on `/gallery/[id]` → Task 6
- OG image route → Task 7

**2. Placeholder scan** — every step has exact code, an exact command, or an explicit "skipped during automated execution" note. No "TBD", no "add validation", no "similar to Task N".

**3. Type consistency:**
- `extractBlockText(block: ContentBlock): string` defined in Task 1, imported in Task 2.
- `composeStepText(card: GalleryCard)` private to `json-ld.ts`, only consumed inside `buildGameJsonLd`.
- `buildBreadcrumbListLd(game: GalleryGame, siteUrl: string)` defined in Task 3, consumed in Task 6.
- `buildCollectionPageLd(games: GalleryGame[], siteUrl: string)` defined in Task 4, consumed in Task 5.
- `SITE_URL` from `@/app/_lib/site-config` (Plan A) consumed in Tasks 5 and 6.
- `safeJsonLdScript` from `@/app/_lib/safe-jsonld` (Plan A) consumed in Tasks 5 and 6.

**4. Order** — every dependency flows forward:
- Task 1 (extractBlockText) → consumed by Task 2 (composeStepText).
- Task 3 (buildBreadcrumbListLd) → consumed by Task 6.
- Task 4 (buildCollectionPageLd) → consumed by Task 5.
- Task 7 (OG image) — independent, can run anytime after the start; placed last because it's the heaviest single task.

Test count math: 70 (current main) + 5 (T1) + 3 (T2) + 2 (T3) + 3 (T4) = **83** after Task 4. Tasks 5–7 add no tests, leaving the final count at 83/83.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-21-gallery-seo-depth.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
