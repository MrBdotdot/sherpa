# Gallery Polish + Per-Game SEO/AEO Depth

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deepen the SEO and AEO surface area on the gallery routes that Plan A established. AI engines get the actual rule text per chapter (not just a one-line summary), Google gets `CollectionPage`/`ItemList`/`BreadcrumbList` for richer SERPs, and social shares get a proper 1200×630 OG image per game instead of an awkwardly-cropped author photo. This is **Plan B** in the larger SEO/AEO sweep; Plan A ([2026-05-21-seo-aeo-foundation-landing-design.md](./2026-05-21-seo-aeo-foundation-landing-design.md)) already shipped robots, sitemap, root metadata, and landing-page structured data.

**Architecture:** Five non-overlapping pieces, each touching its own surface. (1) A new pure `extractBlockText` mirrors the existing `renderBlockToString` — converts a `ContentBlock` to plain text instead of HTML, so the JSON-LD HowToStep gets readable prose, not markup. (2) `composeStepText(card)` in `json-ld.ts` combines `card.summary` + extracted block text, capped at 1500 chars per step, with sentence-boundary truncation. (3) A new `buildBreadcrumbListLd` in `json-ld.ts` emits the schema.org breadcrumb trail for `/gallery/[id]`. (4) A new `collection-jsonld.ts` file owns `buildCollectionPageLd` for `/gallery`. (5) A new `app/gallery/[id]/opengraph-image.tsx` route uses Next's `ImageResponse` to render 1200×630 PNGs server-side — split layout (image left, brand-blue right with title/tagline/meta) when the game has a `cardImage`; all-blue branded fallback otherwise. Canonical URLs land as `alternates.canonical` additions on the two gallery routes' existing metadata.

**Tech Stack:** Next.js 16 `ImageResponse` from `next/og` for the OG image. Schema.org JSON-LD via the existing `safeJsonLdScript` helper from Plan A. TypeScript strict, vitest 4 for unit tests on the pure helpers. No new runtime dependencies.

---

## Files to create / modify

| File | Action | What changes |
|------|--------|-------------|
| `app/_components/gallery/block-renderer.tsx` | Modify | Add exported `extractBlockText(block)` — plain-text mirror of `renderBlockToString`. |
| `app/_components/gallery/block-renderer.test.tsx` | Modify | Add tests for `extractBlockText` (5 tests). |
| `app/_components/gallery/json-ld.ts` | Modify | (a) Add private `composeStepText(card)` helper. (b) Update `buildGameJsonLd` to use it. (c) Add new exported `buildBreadcrumbListLd(game, siteUrl)`. |
| `app/_components/gallery/json-ld.test.ts` | Modify | Add tests for richer HowToStep + the breadcrumb builder (5 new tests). |
| `app/_components/gallery/collection-jsonld.ts` | **Create** | `buildCollectionPageLd(games, siteUrl)` returning a `CollectionPage` + nested `ItemList`. |
| `app/_components/gallery/collection-jsonld.test.ts` | **Create** | Tests for `buildCollectionPageLd` (3 tests). |
| `app/gallery/page.tsx` | Modify | (a) Add `alternates.canonical`. (b) Build + inject `<script>` with CollectionPage JSON-LD. |
| `app/gallery/[id]/page.tsx` | Modify | Build + inject second `<script>` with BreadcrumbList JSON-LD alongside the existing Game block. |
| `app/gallery/[id]/layout.tsx` | Modify | Add `alternates.canonical` to the metadata returned by `generateMetadata`. |
| `app/gallery/[id]/opengraph-image.tsx` | **Create** | Next `ImageResponse` route — 1200×630 PNG. Split layout when `cardImage` exists; all-blue fallback otherwise. |

---

## `extractBlockText` design

Lives in `app/_components/gallery/block-renderer.tsx`, alongside the existing `renderBlockToString`. Same input type (`ContentBlock`), different output (plain text instead of HTML).

```ts
/**
 * Plain-text counterpart to renderBlockToString. Used by the HowToStep
 * JSON-LD builder to feed AI engines actual rule prose instead of card
 * summaries. Returns "" for non-text blocks and empty values.
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

Design notes:
- Image, video, callout, consent, tabs, section, step-rail, carousel — all return `""` (same skip set as `renderBlockToString`).
- `bullets` and `steps` get a leading `"• "` per line — this is what AI engines actually quote, so visible bullet chars help them format quoted output.
- `h2`/`h3` blocks are included raw (no `# ` prefix) — they read as section headers in context, helping AI engines structure their summaries.
- Trailing/leading whitespace stripped via `.trim()` on the input and per-line.

---

## `composeStepText` design

Private helper inside `app/_components/gallery/json-ld.ts`. Combines `card.summary` with extracted block content, capped at 1500 characters per step.

```ts
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

  // Truncate at last sentence boundary inside the cap; else word boundary.
  const truncated = composed.slice(0, MAX_STEP_LENGTH);
  const lastSentence = truncated.lastIndexOf(". ");
  if (lastSentence > MAX_STEP_LENGTH * 0.5) {
    return truncated.slice(0, lastSentence + 1) + "…";
  }
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "…";
}
```

Behavior summary:
- No text blocks → return `card.summary` unchanged (fallback to existing behavior).
- Has text blocks → join `summary` + each block's extracted text with blank lines.
- Total length ≤ 1500 → return as-is.
- Total length > 1500 → truncate at the last `". "` (sentence boundary), provided it's past 750 chars (so we don't truncate too aggressively for content that has no early sentence breaks); fall back to last-space truncation; always append `"…"`.

The `buildGameJsonLd` function's `mainEntity.step` mapping changes from:

```ts
step: cards.map((c) => ({ "@type": "HowToStep", name: c.title, text: c.summary })),
```

to:

```ts
step: cards.map((c) => ({ "@type": "HowToStep", name: c.title, text: composeStepText(c) })),
```

Everything else in `buildGameJsonLd` is untouched.

---

## `buildBreadcrumbListLd` design

New exported function in `app/_components/gallery/json-ld.ts`:

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

`siteUrl` passed as a parameter (not read directly from `site-config`) for testability — same pattern as `buildSitemapEntries` in Plan A. Caller in `/gallery/[id]/page.tsx` passes `SITE_URL`.

---

## `buildCollectionPageLd` design

Lives in a new file `app/_components/gallery/collection-jsonld.ts`:

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

Mounted in `app/gallery/page.tsx`. The function only knows about the first page of games — that's by design, since `fetchPublishedGames({ page: 0 })` returns up to 60 results, well within Google's tolerance for `ItemList` entries. Subsequent pages (if Sherpa scales past 60 published games) are not currently in the JSON-LD; Plan C territory.

---

## Mounting on `/gallery/page.tsx`

The existing static `metadata` export gets `alternates.canonical` added. Inside `GalleryPage`, before the existing `<div className="min-h-screen ...">`, inject the CollectionPage `<script>`:

```tsx
import { buildCollectionPageLd } from "@/app/_components/gallery/collection-jsonld";
import { safeJsonLdScript } from "@/app/_lib/safe-jsonld";
import { SITE_URL } from "@/app/_lib/site-config";

export const metadata = {
  title: "Gallery — Sherpa",
  description: "Interactive rules experiences built with Sherpa.",
  alternates: { canonical: `${SITE_URL}/gallery` },
};

// ... inside the default export:
const ld = buildCollectionPageLd(games, SITE_URL);

return (
  <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdScript(ld) }}
    />
    <div className="min-h-screen ..." style={{ ... }}>
      {/* existing markup unchanged */}
    </div>
  </>
);
```

Note: `games` is already in scope from `fetchPublishedGames(...)` earlier in the function.

---

## Mounting on `/gallery/[id]/page.tsx`

The existing file already imports `buildGameJsonLd` + `safeJsonLdScript` and emits one `<script>` block. Add a second `<script>` for the breadcrumb using the new `buildBreadcrumbListLd` import + `SITE_URL`.

```tsx
import { buildGameJsonLd, buildBreadcrumbListLd } from "@/app/_components/gallery/json-ld";
import { SITE_URL } from "@/app/_lib/site-config";
// ... existing imports ...

// ... inside the default async function:
const { game, cards } = result;
const ld = buildGameJsonLd(game, cards);
const breadcrumbs = buildBreadcrumbListLd(game, SITE_URL);

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

---

## Mounting on `/gallery/[id]/layout.tsx`

The existing `generateMetadata` returns title/description/openGraph/twitter. Add `alternates.canonical`:

```ts
return {
  title: `${game.title} — Interactive Rulebook · Sherpa`,
  description,
  alternates: { canonical: `${SITE_URL}/gallery/${id}` },
  openGraph: { /* unchanged */ },
  twitter: { /* unchanged */ },
};
```

The `SITE_URL` import comes from `@/app/_lib/site-config` (already used elsewhere in the file? — not currently; add the import).

---

## OG image: `app/gallery/[id]/opengraph-image.tsx`

Next's file convention for route-specific OG images. The default export receives `params` (matching the segment), fetches the game, and returns an `ImageResponse` from `next/og`. The result is served at `/gallery/<id>/opengraph-image` and automatically referenced by the OpenGraph metadata generated in `layout.tsx` (Next's metadata API picks up the convention).

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

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchPublishedGame(id);

  if (!result) {
    // Fallback for missing/unpublished — should rarely fire since the route
    // itself would 404 first, but defensive.
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

  // Branded layout (no photo)
  if (!heroImage) {
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
          <div style={{ fontSize: 28, color: TEXT_MUTED, letterSpacing: "0.1em" }}>SHERPA</div>
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

  // Split layout (with photo)
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
          <div style={{ fontSize: 24, color: TEXT_MUTED, letterSpacing: "0.1em" }}>SHERPA</div>
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

function MetaRow({
  game,
  compact = false,
}: {
  game: { complexity?: string; playerCount?: string; playTime?: string };
  compact?: boolean;
}) {
  const fontSize = compact ? 22 : 26;
  const gap = compact ? 20 : 32;
  const dotColor: Record<string, string> = {
    Light: "#22c55e",
    Medium: "#f59e0b",
    Heavy: "#ef4444",
  };
  const parts: React.ReactNode[] = [];
  if (game.complexity) {
    parts.push(
      <div key="c" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            background: dotColor[game.complexity] ?? "#9ca3af",
            display: "inline-block",
          }}
        />
        <span>{game.complexity}</span>
      </div>
    );
  }
  if (game.playerCount) parts.push(<span key="p">{game.playerCount} players</span>);
  if (game.playTime) parts.push(<span key="t">{game.playTime}</span>);

  return (
    <div style={{ display: "flex", gap, fontSize, color: TEXT_DIM }}>
      {parts.map((node, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>{node}</div>
      ))}
    </div>
  );
}
```

Notes:
- `runtime` defaults to `nodejs` (omitted). The route calls `supabaseAdmin` via `fetchPublishedGame`, which is `server-only` and works fine in the Node runtime. Avoiding `edge` keeps things simple.
- `dynamic = "force-dynamic"` ensures the image regenerates when game data changes (e.g. author edits the tagline). At low volume the cost is negligible.
- Uses system fonts (no Google Font loading) — the OG image renders cleanly without the font-fetch round-trip. Future polish could load Instrument Sans + Fraunces for brand fidelity (Plan C).
- The `MetaRow` helper is internal to the file. Not exported. Not tested (Next's `ImageResponse` JSX-to-PNG pipeline is not easily unit-testable; verification is visual via the live URL).
- Falls back gracefully when `game.cardImage` is empty (uses `homeHeroImage`) and finally to the all-blue branded layout when both are absent.

---

## Tests

### `block-renderer.test.tsx` — 5 new tests for `extractBlockText`

```ts
import { describe, it, expect } from "vitest";
import { renderBlockToString, extractBlockText } from "./block-renderer";
// ... (existing renderBlockToString tests unchanged)

describe("extractBlockText", () => {
  it("returns the value of a prose text block as-is", () => {
    expect(extractBlockText({ id: "b", type: "text", value: "Hello world", blockFormat: "prose" }))
      .toBe("Hello world");
  });

  it("includes h2 and h3 headings as raw text", () => {
    expect(extractBlockText({ id: "b", type: "text", value: "Setup", blockFormat: "h2" }))
      .toBe("Setup");
    expect(extractBlockText({ id: "b", type: "text", value: "Detail", blockFormat: "h3" }))
      .toBe("Detail");
  });

  it("prefixes bullet and step lines with '• ' and joins by newline", () => {
    expect(extractBlockText({ id: "b", type: "text", value: "alpha\nbeta\ngamma", blockFormat: "bullets" }))
      .toBe("• alpha\n• beta\n• gamma");
    expect(extractBlockText({ id: "b", type: "text", value: "one\ntwo", blockFormat: "steps" }))
      .toBe("• one\n• two");
  });

  it("returns empty string for non-text block types", () => {
    expect(extractBlockText({ id: "b", type: "image", value: "https://x/y.jpg" })).toBe("");
    expect(extractBlockText({ id: "b", type: "video", value: "https://yt/x" })).toBe("");
    expect(extractBlockText({ id: "b", type: "carousel", value: "" })).toBe("");
  });

  it("trims whitespace and returns empty for blank values", () => {
    expect(extractBlockText({ id: "b", type: "text", value: "   ", blockFormat: "prose" })).toBe("");
    expect(extractBlockText({ id: "b", type: "text", value: "  Hello  ", blockFormat: "prose" })).toBe("Hello");
  });
});
```

### `json-ld.test.ts` — 5 new tests

Add tests for the richer HowToStep text (composeStepText behavior — verified through buildGameJsonLd's output) + `buildBreadcrumbListLd`:

```ts
describe("buildGameJsonLd with richer HowToStep", () => {
  it("uses card.summary when the card has no text blocks", () => {
    const cards = [{ id: "c1", kind: "page", title: "Setup", summary: "Lay out tiles.", heroImage: "", blocks: [], cardSize: "medium" }];
    const ld = buildGameJsonLd(baseGame, cards);
    const step = (ld.mainEntity.step as Array<{ text: string }>)[0];
    expect(step.text).toBe("Lay out tiles.");
  });

  it("joins summary + extracted block text with blank lines", () => {
    const cards = [{
      id: "c1", kind: "page", title: "Setup", summary: "Lay out tiles.", heroImage: "", cardSize: "medium",
      blocks: [
        { id: "b1", type: "text", value: "Place the board in the center.", blockFormat: "prose" },
        { id: "b2", type: "text", value: "Each player picks a color.", blockFormat: "prose" },
      ],
    }];
    const ld = buildGameJsonLd(baseGame, cards);
    const step = (ld.mainEntity.step as Array<{ text: string }>)[0];
    expect(step.text).toBe(
      "Lay out tiles.\n\nPlace the board in the center.\n\nEach player picks a color."
    );
  });

  it("truncates composed text exceeding 1500 chars at a sentence boundary with …", () => {
    const long = "A".repeat(800) + ". " + "B".repeat(800);
    const cards = [{
      id: "c1", kind: "page", title: "Setup", summary: "Short.", heroImage: "", cardSize: "medium",
      blocks: [{ id: "b1", type: "text", value: long, blockFormat: "prose" }],
    }];
    const ld = buildGameJsonLd(baseGame, cards);
    const step = (ld.mainEntity.step as Array<{ text: string }>)[0];
    expect(step.text.length).toBeLessThanOrEqual(1501); // 1500 + ellipsis
    expect(step.text.endsWith("…")).toBe(true);
  });
});

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

(`baseGame` is the fixture already present in `json-ld.test.ts` from Plan A's gallery work.)

### `collection-jsonld.test.ts` — 3 tests

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

**Total new tests: 13.** Going from 70/70 to 83/83.

---

## Verification (after merge)

1. **`curl https://sherpa.games/gallery/ironveil/opengraph-image`** — returns a 1200×630 PNG. (Replace `ironveil` with any published game id.)
2. **View source on `/gallery/ironveil`** — confirm TWO `<script type="application/ld+json">` blocks: one with `"@type":"Game"`, one with `"@type":"BreadcrumbList"`.
3. **View source on `/gallery`** — confirm a `<script type="application/ld+json">` block with `"@type":"CollectionPage"` containing an `ItemList`.
4. **Paste a game URL into the Rich Results Test** (`https://search.google.com/test/rich-results`) — should detect both Game and BreadcrumbList. No critical errors.
5. **Paste a game URL into Twitter's Card Validator or `https://www.opengraph.xyz/`** — confirm the OG image renders as the split layout (or all-blue fallback if no `cardImage`).
6. **Inspect a published game's reading page in DevTools** — search for the `application/ld+json` script tag and confirm `step[].text` is substantially longer than `card.summary` for cards that have prose blocks.
7. **`npm test`** — 83/83 passing.
8. **`npx tsc --noEmit`** — clean.

---

## Out of scope (deferred to Plan C or beyond)

- **Loading Sherpa brand fonts in the OG image** (Instrument Sans, Fraunces) — system fonts ship faster and look fine at 1200×630 viewing sizes.
- **OG image variants for the gallery index** (`/gallery/opengraph-image.tsx`) — current Plan A landing OG metadata covers `/` and `/gallery` uses inherited defaults. Could add a custom one later.
- **Localized JSON-LD** — Sherpa already has multi-language support in the player, but the gallery is English-only.
- **Multiple-page sitemap with `page=2..N`** — current sitemap caps at the first page (60 games). When Sherpa scales past ~60 published games, expand.
- **Pagination support in CollectionPage** — first 60 only; same scaling note.
- **`SearchAction` on WebSite** — still requires a `?q=` text search on `/gallery` to claim honestly.
- **`llms.txt`** — emerging convention; revisit when adoption is clearer.
- **`Review`/`AggregateRating` on Game** — only legitimate once Sherpa surfaces real player reviews.
- **`noindex` per gated route** — already covered by `robots.ts` disallow; belt-and-braces only.

---

## Plain-language summary

For your future-self reading this in six months: this plan deepens what Plan A established. After Plan A, search engines could find Sherpa pages and knew the basics of what each game was. After Plan B, they'll see:

1. **The actual rule text per chapter**, not just a one-line summary, so AI engines (ChatGPT, Perplexity, Google AI Overviews) can give substantive answers when someone asks "how do you play Ironveil".
2. **A breadcrumb trail** on each game page, which Google sometimes renders as `sherpa.games › Gallery › Ironveil` in search results.
3. **The gallery itself as a structured collection** of games, helping Google understand "this page is a directory of these N games" rather than just "this page mentions some game names".
4. **A proper 1200×630 image when someone shares a game link** on Twitter/Bluesky/iMessage/Slack/Discord — game title on a brand-blue right half, the author's photo on the left half (or all-blue with the title if there's no photo).
5. **Canonical URLs** declared on each page, so if anyone ever copies a Sherpa URL with tracking params (`?utm_source=...`), Google still treats the clean URL as the real one and consolidates ranking signals there.

The plumbing (a small helper to extract plain text from block content, a small helper to combine summaries with that text and truncate at 1500 chars per chapter, three new JSON-LD builder functions, one new Next.js image route) is bookkeeping so all of this works without making any visible page feel different to a human reader.
