# SEO/AEO Foundation + Landing Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Sherpa discoverable by search engines (Google) and AI answer engines (ChatGPT, Perplexity, Google AI Overviews) by giving them crawler infrastructure, rich landing-page metadata, and structured FAQ data. This is **Plan A** in the larger SEO/AEO sweep; Plan B (gallery polish + per-game depth) follows in a separate spec.

**Architecture:** Three layers — (1) crawler infrastructure (`robots.ts`, `sitemap.ts`, expanded root metadata) so bots know what to crawl and what's canonical, (2) landing-page surface (per-page metadata + `WebSite`/`Organization`/`SoftwareApplication` JSON-LD) so they have rich content to extract, (3) FAQ schema colocated with the existing visual FAQ component so the structured Q&A stays in lockstep with what humans see. Plus one small hero-copy nudge for clean AI-Overview citation.

**Tech Stack:** Next.js 16 App Router metadata APIs (`Metadata` type, `sitemap.ts`, `robots.ts`), schema.org JSON-LD, the existing `safeJsonLdScript` `</script>`-injection escape helper (extracted to a shared module).

---

## Domain configuration

Everything reads from `NEXT_PUBLIC_SITE_URL`, set in Vercel project env. Default fallback `https://sherpa.games` so dev/preview/missing-env never break — but the env var should be set per-environment in production.

```ts
// app/_lib/site-config.ts (new)
export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sherpa.games").replace(/\/$/, "");

export const SITE_NAME = "Sherpa";

export const SITE_DESCRIPTION =
  "Interactive rulebooks for board games — scan a QR, learn to play.";

export const SOFTWARE_DESCRIPTION =
  "Sherpa is a tool for board game designers to make their rulebooks interactive. " +
  "Import a PDF or Figma file, place hotspots and guided tours on the board, then " +
  "publish a QR card. Players scan and learn the game — no app required.";

export const CONTACT_EMAIL = "hello@sherpa.games";

export const LOGO_PATH = "/sherpa-icon.svg";

// TODO: populate once social handles are claimed.
export const SOCIAL_PROFILES: string[] = [];
```

---

## Files to create / modify

| File | Action | What changes |
|------|--------|-------------|
| `app/_lib/site-config.ts` | **Create** | Single source of truth for URL, brand strings, descriptions, social profile array. |
| `app/_lib/safe-jsonld.ts` | **Create** | Extract the `safeJsonLdScript` helper from `app/gallery/[id]/page.tsx` so both landing + gallery share one implementation. |
| `app/gallery/[id]/page.tsx` | Modify | Import `safeJsonLdScript` from the shared module instead of declaring it locally. |
| `app/robots.ts` | **Create** | Allow `/`, `/gallery/*`; disallow gated routes; link sitemap. |
| `app/sitemap.ts` | **Create** | Dynamic — calls `fetchPublishedGames` at request time so newly-published games appear immediately. |
| `app/sitemap.test.ts` | **Create** | Unit tests for the pure URL-building logic (factored out into a helper). |
| `app/layout.tsx` | Modify | Expand `metadata`: `metadataBase`, title template, default OG, default Twitter, default robots. |
| `app/page.tsx` | Modify | Add per-page `metadata` export. Mount `<LandingStructuredData />`. |
| `app/_components/landing/structured-data.tsx` | **Create** | Server Component emitting `WebSite` + `Organization` + `SoftwareApplication` JSON-LD via three named builder functions. |
| `app/_components/landing/structured-data.test.ts` | **Create** | Unit tests for the three JSON-LD builders. |
| `app/_components/landing/sections.tsx` | Modify | (a) `<FAQ />` emits inline `FAQPage` JSON-LD from its `items` array; (b) `<Hero />` `sub` string is updated for AEO clarity. |

---

## `app/robots.ts`

Public surface = `/`, `/gallery`, `/gallery/[id]`. Everything else is gated, internal, or non-content (`/api`).

```ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/app/_lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/gallery"],
        disallow: [
          "/studio",
          "/analytics",
          "/play",
          "/login",
          "/invite",
          "/reset-password",
          "/api",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

---

## `app/sitemap.ts`

**Dynamic.** Calls `fetchPublishedGames({ page: 0 })` at request time. Newly published games appear in the sitemap on the next crawler hit (no deploy needed). Cost: ~2 Supabase queries per `/sitemap.xml` request. Crawlers fetch sitemaps infrequently — negligible.

```ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/app/_lib/site-config";
import { fetchPublishedGames } from "@/app/_lib/gallery-queries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const games = await fetchPublishedGames({ page: 0 });
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/gallery`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ];

  const gameUrls: MetadataRoute.Sitemap = games.map((g) => ({
    url: `${SITE_URL}/gallery/${g.id}`,
    lastModified: g.createdAt ? new Date(g.createdAt) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticUrls, ...gameUrls];
}
```

If `fetchPublishedGames` returns more than the page-1 size in future, we revisit pagination; for now the index caps at 60 published games and that's well within Google's 50k-URL sitemap limit.

---

## `app/_lib/safe-jsonld.ts`

```ts
/**
 * JSON-LD is embedded into a <script type="application/ld+json"> block. If any
 * field in the structured-data object contains the literal text `</script>`,
 * it would terminate the script element and become an injection vector when
 * interpolated via dangerouslySetInnerHTML. Escape `<` to `<` — this is
 * the standard mitigation and remains valid JSON.
 */
export function safeJsonLdScript(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
```

`app/gallery/[id]/page.tsx` is updated to `import { safeJsonLdScript } from "@/app/_lib/safe-jsonld";` and its local copy of the function is removed.

---

## Root layout metadata expansion

`app/layout.tsx` currently exports a minimal `metadata` (`title: "Sherpa"`, description, favicon). Expand it so child pages can override individual fields without re-stating defaults.

```ts
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/app/_lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  icons: { icon: "/sherpa-icon.svg" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};
```

The title template `"%s · Sherpa"` means:
- Landing page (sets `title: "..."` itself) → its own title verbatim
- Gallery (`title: "Gallery — Sherpa"` already, hard-coded) → unchanged
- Per-game reading page (`title: "Ironveil — Interactive Rulebook · Sherpa"` from Task 7) → unchanged

(Existing routes that already include `· Sherpa` in their explicit title get rendered as-is because they don't use the template. Non-overriding pages get the template suffix.)

---

## Landing page metadata + structured data

### Per-page metadata on `app/page.tsx`

```ts
import type { Metadata } from "next";
import { SOFTWARE_DESCRIPTION, SITE_URL } from "@/app/_lib/site-config";

export const metadata: Metadata = {
  title: "Sherpa — Interactive rulebooks for board games",
  description: SOFTWARE_DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Sherpa — Interactive rulebooks for board games",
    description: SOFTWARE_DESCRIPTION,
    url: SITE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sherpa — Interactive rulebooks for board games",
    description: SOFTWARE_DESCRIPTION,
  },
};
```

### `<LandingStructuredData />` component

`app/_components/landing/structured-data.tsx`. Server Component, no `"use client"`. Exports three pure JSON-LD builder functions (testable) and a render component that emits all three as separate `<script>` blocks.

```tsx
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SOFTWARE_DESCRIPTION, CONTACT_EMAIL, LOGO_PATH, SOCIAL_PROFILES } from "@/app/_lib/site-config";
import { safeJsonLdScript } from "@/app/_lib/safe-jsonld";

export function buildWebSiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  };
}

export function buildOrganizationLd() {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}${LOGO_PATH}`,
    email: CONTACT_EMAIL,
  };
  if (SOCIAL_PROFILES.length > 0) ld.sameAs = SOCIAL_PROFILES;
  return ld;
}

export function buildSoftwareApplicationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    description: SOFTWARE_DESCRIPTION,
    url: SITE_URL,
  };
}

export function LandingStructuredData() {
  const blocks = [buildWebSiteLd(), buildOrganizationLd(), buildSoftwareApplicationLd()];
  return (
    <>
      {blocks.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLdScript(ld) }} />
      ))}
    </>
  );
}
```

Notes:
- **No `aggregateRating`** — making up ratings risks Google penalty.
- **No `offers`** — pricing is in flux per the brainstorm.
- **No `SearchAction` on `WebSite`** — would claim a `?q=` search feature that doesn't exist. Deferred to Plan B if/when text search lands.
- **`sameAs`** is omitted entirely (rather than emitting an empty array) when no social profiles are configured. Empty arrays don't break validation but are noise.

### Mounting

`app/page.tsx`:

```tsx
import { LandingStructuredData } from "@/app/_components/landing/structured-data";
// ... existing imports ...

export default function LandingPage() {
  return (
    <>
      <LandingStructuredData />
      <div className="sherpa-landing">
        <Nav />
        {/* ... existing sections ... */}
      </div>
    </>
  );
}
```

---

## FAQ schema (colocated)

The existing `FAQ()` function in `app/_components/landing/sections.tsx` already has an `items` array with 7 Q&As. Same source of truth — emit a `<script type="application/ld+json">` from the same component using the same array. If a Q&A is added/changed/removed, both the accordion and the structured data update in lockstep.

```tsx
import { safeJsonLdScript } from "@/app/_lib/safe-jsonld";

export function FAQ() {
  const items = [
    /* ... existing 7 Q&As unchanged ... */
  ];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <section id="faq" className="section faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdScript(faqLd) }}
      />
      <div className="wrap faq-grid">
        {/* ... existing visible FAQ markup unchanged ... */}
      </div>
    </section>
  );
}
```

Single source of truth = no drift risk.

---

## Hero copy update

`app/_components/landing/sections.tsx` → `Hero()` function. The `sub` string changes; `headline` and `eyebrow` stay the same.

**Before:**

```ts
const sub = "Sherpa turns your rulebook into an interactive learn-to-play that fits on a QR card. Drop it in the box, stick it on your convention table, share it with playtesters. Rules answer themselves.";
```

**After:**

```ts
const sub = "Sherpa is a tool for board game designers. Turn your rulebook into something players actually read — import your PDF or Figma, drop hotspots on the board, and publish a QR card. Stick it in the box, on your convention table, or send it to playtesters. Rules answer themselves.";
```

Why: AI Overviews / ChatGPT / Perplexity extract literal text. A clean "Sherpa is a tool for X" opening sentence under the H1 dramatically improves the chance of being cited accurately.

---

## Tests

Two new test files, both vitest, both targeting pure helpers (matches the existing codebase pattern of testing only pure logic).

### `app/_components/landing/structured-data.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { buildWebSiteLd, buildOrganizationLd, buildSoftwareApplicationLd } from "./structured-data";

describe("buildWebSiteLd", () => {
  it("emits a WebSite with @context, name, url, description", () => {
    const ld = buildWebSiteLd();
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("WebSite");
    expect(ld.name).toBe("Sherpa");
    expect(typeof ld.url).toBe("string");
    expect(ld.description).toBeTruthy();
  });
});

describe("buildOrganizationLd", () => {
  it("emits an Organization with @context, name, url, logo, email", () => {
    const ld = buildOrganizationLd();
    expect(ld["@type"]).toBe("Organization");
    expect(ld.name).toBe("Sherpa");
    expect(ld.email).toBe("hello@sherpa.games");
    expect(typeof ld.logo).toBe("string");
  });
  it("omits sameAs when SOCIAL_PROFILES is empty", () => {
    const ld = buildOrganizationLd();
    expect(ld.sameAs).toBeUndefined();
  });
});

describe("buildSoftwareApplicationLd", () => {
  it("emits a SoftwareApplication with required schema.org fields", () => {
    const ld = buildSoftwareApplicationLd();
    expect(ld["@type"]).toBe("SoftwareApplication");
    expect(ld.name).toBe("Sherpa");
    expect(ld.applicationCategory).toBe("DesignApplication");
    expect(ld.operatingSystem).toBe("Web");
    expect(ld.description).toContain("board game designers");
  });
  it("omits offers and aggregateRating", () => {
    const ld = buildSoftwareApplicationLd();
    expect(ld.offers).toBeUndefined();
    expect(ld.aggregateRating).toBeUndefined();
  });
});
```

### `app/sitemap.test.ts`

The `sitemap()` function calls Supabase, which we don't mock. Factor the pure URL-building logic into a separate helper inside `sitemap.ts` and test just that:

```ts
// In sitemap.ts:
export function buildSitemapEntries(games: { id: string; createdAt?: string }[], siteUrl: string, now: Date): MetadataRoute.Sitemap { ... }

// In sitemap.test.ts:
import { describe, it, expect } from "vitest";
import { buildSitemapEntries } from "./sitemap";

describe("buildSitemapEntries", () => {
  it("includes the homepage and gallery as static URLs", () => {
    const out = buildSitemapEntries([], "https://sherpa.games", new Date("2026-05-21"));
    expect(out.find((e) => e.url === "https://sherpa.games/")).toBeDefined();
    expect(out.find((e) => e.url === "https://sherpa.games/gallery")).toBeDefined();
  });
  it("appends one entry per published game", () => {
    const out = buildSitemapEntries(
      [{ id: "ironveil", createdAt: "2026-01-20T00:00:00Z" }],
      "https://sherpa.games",
      new Date("2026-05-21")
    );
    expect(out.find((e) => e.url === "https://sherpa.games/gallery/ironveil")).toBeDefined();
  });
  it("uses the game's createdAt as lastModified when available", () => {
    const out = buildSitemapEntries(
      [{ id: "ironveil", createdAt: "2026-01-20T00:00:00Z" }],
      "https://sherpa.games",
      new Date("2026-05-21")
    );
    const entry = out.find((e) => e.url === "https://sherpa.games/gallery/ironveil");
    expect(entry?.lastModified).toEqual(new Date("2026-01-20T00:00:00Z"));
  });
  it("falls back to `now` when the game has no createdAt", () => {
    const now = new Date("2026-05-21");
    const out = buildSitemapEntries(
      [{ id: "x", createdAt: undefined }],
      "https://sherpa.games",
      now
    );
    const entry = out.find((e) => e.url === "https://sherpa.games/gallery/x");
    expect(entry?.lastModified).toEqual(now);
  });
});
```

---

## Verification

After merge, manually verify against production:

1. `curl https://sherpa.games/robots.txt` — returns the expected allow/disallow + sitemap line.
2. `curl https://sherpa.games/sitemap.xml` — valid XML, includes `/`, `/gallery`, and one entry per published game.
3. View source on `https://sherpa.games/` — confirm three JSON-LD `<script>` blocks (WebSite, Organization, SoftwareApplication) plus the FAQ block.
4. Paste `https://sherpa.games/` into Google's **Rich Results Test** (`https://search.google.com/test/rich-results`) — should detect `WebSite`, `Organization`, `SoftwareApplication`, and `FAQPage`. No critical errors.
5. Inspect the rendered hero — `<p class="lede">` starts with "Sherpa is a tool for board game designers."
6. Run `npm test` — was 59/59 after Plan A (the gallery one), should land at ~67/67 after this plan (~8 new tests).
7. Run `npx tsc --noEmit` — clean.

---

## Out of scope for Plan A

These were considered and explicitly deferred to Plan B or beyond:

- **`SearchAction` on `WebSite`** — requires a real `?q=` text-search endpoint on `/gallery`.
- **`/gallery` index `CollectionPage` + `ItemList` JSON-LD** — Plan B.
- **`BreadcrumbList` on `/gallery/[id]`** — Plan B.
- **Richer `HowToStep.text` extracted from card blocks** (not just `card.summary`) — Plan B.
- **Dynamic per-game OG images** (`opengraph-image.tsx` at 1200×630) — Plan B.
- **`llms.txt` at site root** (emerging AEO convention) — Plan B.
- **`noindex` on gated routes via per-route metadata** — currently handled by `robots.ts` `disallow`; per-route `noindex` is belt-and-braces, Plan B if needed.
- **A proper PNG logo** at `/sherpa-logo.png` (600×600+) — when convenient; SVG works.
- **Populating `Organization.sameAs`** with real social profile URLs — when handles are claimed.
- **Pricing in `SoftwareApplication.offers`** — when pricing is finalized.

---

## Plain-language summary

For your future-self reading this in six months:

We're telling Google and ChatGPT three things about the Sherpa marketing site:

1. **Here's a map of every page worth crawling** (`sitemap.xml`) and **here's what's private** (`robots.txt`). Without these, search engines guess at what to index — and they often guess wrong, indexing things like login pages.

2. **Here's the structured pitch for Sherpa** — three small data blocks invisibly attached to the home page that say "Sherpa is a website" (`WebSite`), "Sherpa is a company / brand" (`Organization`), and "Sherpa is software for board game designers, runs on the web, here's a one-paragraph description" (`SoftwareApplication`).

3. **Here are the FAQs in a format Google can show as expandable answers in search results** (`FAQPage`). This is the single highest-leverage piece for AI engines — they cite FAQ schemas heavily.

Plus one tiny copy edit on the hero that gives AI engines a clean "Sherpa is X for Y" sentence to quote.

The plumbing (env var for the production URL, a shared escape helper, dynamic sitemap, factored-out test helpers) is bookkeeping so this code works in dev, preview, and prod without surprises.
