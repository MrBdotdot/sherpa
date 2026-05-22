# SEO/AEO Foundation + Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Sherpa's marketing site and gallery crawlable + rich-result eligible by adding `robots.ts`, `sitemap.ts`, expanded root metadata, landing-page `WebSite`/`Organization`/`SoftwareApplication` JSON-LD, FAQ schema colocated with the existing visual FAQ, and one small hero-copy nudge for AI Overviews.

**Architecture:** Shared `site-config.ts` module exports `SITE_URL`/brand strings (read from `NEXT_PUBLIC_SITE_URL` env with a `https://sherpa.games` fallback). A shared `safe-jsonld.ts` helper is extracted from `app/gallery/[id]/page.tsx` so the landing's three JSON-LD blocks reuse the same `</script>`-injection escape. The dynamic `sitemap.ts` calls `fetchPublishedGames` at request time so newly-published games appear in the sitemap immediately. FAQ schema is inline in the existing `<FAQ />` component, driven by the same `items` array as the visible accordion, so the structured data and visible content can never drift.

**Tech Stack:** Next.js 16 App Router metadata APIs (`Metadata`, `MetadataRoute.Sitemap`, `MetadataRoute.Robots`, conventions for `app/sitemap.ts` and `app/robots.ts`), TypeScript strict, vitest 4, schema.org JSON-LD.

---

## Pre-flight

Per Sherpa's `AGENTS.md`, this is a custom Next.js 16 fork. The metadata API surface (`Metadata` type, `sitemap.ts`/`robots.ts` conventions, `metadataBase`, title templates) is standard App Router and was used without trouble in the previous gallery feature. If anything below errors against an unexpected fork-specific signature, open `node_modules/next/dist/docs/` and adjust to match. The most likely place to hit a divergence is the `MetadataRoute.Sitemap` / `MetadataRoute.Robots` type shape — both are stable across Next 13–16 in upstream.

---

## File map

| File | Role |
|------|------|
| `app/_lib/site-config.ts` | **New.** `SITE_URL`, `SITE_NAME`, `SITE_DESCRIPTION`, `SOFTWARE_DESCRIPTION`, `CONTACT_EMAIL`, `LOGO_PATH`, `SOCIAL_PROFILES`. Single source of truth. |
| `app/_lib/safe-jsonld.ts` | **New.** Extracted `safeJsonLdScript` helper. |
| `app/gallery/[id]/page.tsx` | Modify. Replace local `safeJsonLdScript` with import. |
| `app/robots.ts` | **New.** Allow/disallow rules + sitemap pointer. |
| `app/sitemap.ts` | **New.** Dynamic sitemap with exported pure `buildSitemapEntries` helper. |
| `app/sitemap.test.ts` | **New.** Unit tests for `buildSitemapEntries` (4 tests). |
| `app/layout.tsx` | Modify. Expand `metadata` (metadataBase, title template, defaults). |
| `app/page.tsx` | Modify. Add per-page `metadata`; mount `<LandingStructuredData />`. |
| `app/_components/landing/structured-data.tsx` | **New.** Server Component exporting three builders + render component. |
| `app/_components/landing/structured-data.test.ts` | **New.** Unit tests for `buildWebSiteLd`, `buildOrganizationLd`, `buildSoftwareApplicationLd` (6 tests). |
| `app/_components/landing/sections.tsx` | Modify. `<FAQ />` emits inline `FAQPage` JSON-LD; `<Hero />` `sub` string updated. |

---

## Task 1: Create `site-config.ts`

**Files:**
- Create: `app/_lib/site-config.ts`

- [ ] **Step 1: Write the file**

Create `app/_lib/site-config.ts`:

```ts
/**
 * Site-wide configuration. Reads `NEXT_PUBLIC_SITE_URL` from env (set per-environment
 * in Vercel project settings); falls back to the production marketing URL so dev,
 * preview, and missing-env builds never break.
 */
export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sherpa.games").replace(/\/$/, "");

export const SITE_NAME = "Sherpa";

export const SITE_DESCRIPTION =
  "Interactive rulebooks for board games — scan a QR, learn to play.";

/** Long-form description used in SoftwareApplication JSON-LD and landing metadata. */
export const SOFTWARE_DESCRIPTION =
  "Sherpa is a tool for board game designers to make their rulebooks interactive. " +
  "Import a PDF or Figma file, place hotspots and guided tours on the board, then " +
  "publish a QR card. Players scan and learn the game — no app required.";

export const CONTACT_EMAIL = "hello@sherpa.games";

export const LOGO_PATH = "/sherpa-icon.svg";

/** Social profile URLs for Organization.sameAs. Populate once handles are claimed. */
export const SOCIAL_PROFILES: string[] = [];
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS — no errors. (The module exports constants only; nothing references it yet.)

- [ ] **Step 3: Verify tests still pass**

Run: `npm test`
Expected: 59/59 — no regressions.

- [ ] **Step 4: Commit**

```bash
git add app/_lib/site-config.ts
git commit -m "feat(seo): add site-config module for URL + brand constants"
```

---

## Task 2: Extract `safe-jsonld.ts`

This is a pure refactor — `safeJsonLdScript` currently lives at the top of `app/gallery/[id]/page.tsx`. Extract it so the landing structured-data component can share the same helper.

**Files:**
- Create: `app/_lib/safe-jsonld.ts`
- Modify: `app/gallery/[id]/page.tsx`

- [ ] **Step 1: Create the shared helper module**

Create `app/_lib/safe-jsonld.ts`:

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

- [ ] **Step 2: Update gallery/[id]/page.tsx to use the shared helper**

Open `app/gallery/[id]/page.tsx`. Find the local helper definition (the JSDoc block + `function safeJsonLdScript(obj: unknown): string { ... }`) and DELETE it.

Then change the imports at the top of the file. Find:

```tsx
import { notFound } from "next/navigation";
import { fetchPublishedGame } from "@/app/_lib/gallery-queries";
import { ReadingPage } from "@/app/_components/gallery/reading-page";
import { buildGameJsonLd } from "@/app/_components/gallery/json-ld";
```

Replace with:

```tsx
import { notFound } from "next/navigation";
import { fetchPublishedGame } from "@/app/_lib/gallery-queries";
import { ReadingPage } from "@/app/_components/gallery/reading-page";
import { buildGameJsonLd } from "@/app/_components/gallery/json-ld";
import { safeJsonLdScript } from "@/app/_lib/safe-jsonld";
```

The call site `safeJsonLdScript(ld)` inside `dangerouslySetInnerHTML` does not change.

- [ ] **Step 3: Verify TypeScript and tests**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm test`
Expected: 59/59 still passing. Behavior is unchanged.

- [ ] **Step 4: Commit**

```bash
git add app/_lib/safe-jsonld.ts app/gallery/[id]/page.tsx
git commit -m "refactor(seo): extract safeJsonLdScript to shared module"
```

---

## Task 3: Create `app/robots.ts`

**Files:**
- Create: `app/robots.ts`

- [ ] **Step 1: Write the file**

Create `app/robots.ts`:

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

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Verify tests**

Run: `npm test`
Expected: 59/59 — no regressions.

- [ ] **Step 4: Manually verify the resolved output**

Start the dev server (or skip if controller is doing dev verification separately):

```bash
npm run dev
# in another shell:
curl http://localhost:3000/robots.txt
```

Expected output:

```
User-Agent: *
Allow: /
Allow: /gallery
Disallow: /studio
Disallow: /analytics
Disallow: /play
Disallow: /login
Disallow: /invite
Disallow: /reset-password
Disallow: /api

Sitemap: https://sherpa.games/sitemap.xml
```

(The `Sitemap:` URL will use the `NEXT_PUBLIC_SITE_URL` env var when set, otherwise `https://sherpa.games`.)

This step can be skipped during automated execution — the controller will dev-server-verify separately.

- [ ] **Step 5: Commit**

```bash
git add app/robots.ts
git commit -m "feat(seo): add robots.ts with allow/disallow rules + sitemap pointer"
```

---

## Task 4: Create `sitemap.ts` with `buildSitemapEntries` + tests

Strict TDD here: write the test, see it fail, implement, see it pass.

**Files:**
- Create: `app/sitemap.test.ts`
- Create: `app/sitemap.ts`

- [ ] **Step 1: Write failing tests**

Create `app/sitemap.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildSitemapEntries } from "./sitemap";

describe("buildSitemapEntries", () => {
  it("includes the homepage as a static URL", () => {
    const out = buildSitemapEntries([], "https://sherpa.games", new Date("2026-05-21T00:00:00Z"));
    const home = out.find((e) => e.url === "https://sherpa.games/");
    expect(home).toBeDefined();
    expect(home?.priority).toBe(1.0);
    expect(home?.changeFrequency).toBe("weekly");
  });

  it("includes the gallery index as a static URL", () => {
    const out = buildSitemapEntries([], "https://sherpa.games", new Date("2026-05-21T00:00:00Z"));
    const gallery = out.find((e) => e.url === "https://sherpa.games/gallery");
    expect(gallery).toBeDefined();
    expect(gallery?.priority).toBe(0.8);
    expect(gallery?.changeFrequency).toBe("daily");
  });

  it("appends one entry per published game", () => {
    const out = buildSitemapEntries(
      [
        { id: "ironveil", createdAt: "2026-01-20T00:00:00Z" },
        { id: "cascade", createdAt: "2026-02-14T00:00:00Z" },
      ],
      "https://sherpa.games",
      new Date("2026-05-21T00:00:00Z")
    );
    expect(out.find((e) => e.url === "https://sherpa.games/gallery/ironveil")).toBeDefined();
    expect(out.find((e) => e.url === "https://sherpa.games/gallery/cascade")).toBeDefined();
  });

  it("uses the game's createdAt as lastModified when available", () => {
    const out = buildSitemapEntries(
      [{ id: "ironveil", createdAt: "2026-01-20T00:00:00Z" }],
      "https://sherpa.games",
      new Date("2026-05-21T00:00:00Z")
    );
    const entry = out.find((e) => e.url === "https://sherpa.games/gallery/ironveil");
    expect(entry?.lastModified).toEqual(new Date("2026-01-20T00:00:00Z"));
  });

  it("falls back to `now` when the game has no createdAt", () => {
    const now = new Date("2026-05-21T00:00:00Z");
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

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- sitemap`
Expected: FAIL — module `./sitemap` does not exist.

- [ ] **Step 3: Create `app/sitemap.ts`**

Create `app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/app/_lib/site-config";
import { fetchPublishedGames } from "@/app/_lib/gallery-queries";

export const dynamic = "force-dynamic";

type GameSeed = { id: string; createdAt?: string };

/**
 * Pure helper: builds the sitemap entry list from a list of published games,
 * the site URL, and a "now" reference date used as the lastModified fallback.
 * Extracted from the default export for testability (no Supabase mocking needed).
 */
export function buildSitemapEntries(
  games: GameSeed[],
  siteUrl: string,
  now: Date
): MetadataRoute.Sitemap {
  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/gallery`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  const gameUrls: MetadataRoute.Sitemap = games.map((g) => ({
    url: `${siteUrl}/gallery/${g.id}`,
    lastModified: g.createdAt ? new Date(g.createdAt) : now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticUrls, ...gameUrls];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const games = await fetchPublishedGames({ page: 0 });
  return buildSitemapEntries(games, SITE_URL, new Date());
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- sitemap`
Expected: PASS — 5/5 green.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: 64/64 (was 59; +5 new sitemap tests).

- [ ] **Step 6: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/sitemap.ts app/sitemap.test.ts
git commit -m "feat(seo): add dynamic sitemap.ts with tested URL builder"
```

---

## Task 5: Expand root metadata in `app/layout.tsx`

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update imports + metadata export**

Open `app/layout.tsx`. The current state has these imports at the top (lines 1–3) and an existing `metadata` export around line 28:

```ts
import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono, Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css";
```

Add the site-config import just after the existing imports:

```ts
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/app/_lib/site-config";
```

Find the current `metadata` block:

```ts
export const metadata: Metadata = {
  title: "Sherpa",
  description: "Build interactive rules experiences for board games.",
  icons: {
    icon: "/sherpa-icon.svg",
  },
};
```

Replace with:

```ts
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
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
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

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS. (If the `Metadata` type complains about `"max-image-preview"` literal-vs-string, the property key needs the quotes because of the hyphen — they're already there. No other type issues expected.)

- [ ] **Step 3: Verify tests still pass**

Run: `npm test`
Expected: 64/64.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(seo): expand root metadata with metadataBase, title template, OG defaults"
```

---

## Task 6: `<LandingStructuredData />` component + tests

Strict TDD: write tests for the three pure builders first, then implement.

**Files:**
- Create: `app/_components/landing/structured-data.test.ts`
- Create: `app/_components/landing/structured-data.tsx`

- [ ] **Step 1: Write failing tests**

Create `app/_components/landing/structured-data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  buildWebSiteLd,
  buildOrganizationLd,
  buildSoftwareApplicationLd,
} from "./structured-data";

describe("buildWebSiteLd", () => {
  it("emits a WebSite with @context, @type, name, url, description", () => {
    const ld = buildWebSiteLd();
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("WebSite");
    expect(ld.name).toBe("Sherpa");
    expect(typeof ld.url).toBe("string");
    expect(ld.url.startsWith("http")).toBe(true);
    expect(ld.description).toBeTruthy();
  });
});

describe("buildOrganizationLd", () => {
  it("emits an Organization with @context, @type, name, url, logo, email", () => {
    const ld = buildOrganizationLd();
    expect(ld["@type"]).toBe("Organization");
    expect(ld.name).toBe("Sherpa");
    expect(ld.email).toBe("hello@sherpa.games");
    expect(typeof ld.logo).toBe("string");
    expect((ld.logo as string).endsWith("/sherpa-icon.svg")).toBe(true);
  });

  it("omits sameAs when SOCIAL_PROFILES is empty", () => {
    const ld = buildOrganizationLd();
    expect("sameAs" in ld).toBe(false);
  });
});

describe("buildSoftwareApplicationLd", () => {
  it("emits a SoftwareApplication with required schema.org fields", () => {
    const ld = buildSoftwareApplicationLd();
    expect(ld["@type"]).toBe("SoftwareApplication");
    expect(ld.name).toBe("Sherpa");
    expect(ld.applicationCategory).toBe("DesignApplication");
    expect(ld.operatingSystem).toBe("Web");
    expect(typeof ld.description).toBe("string");
    expect((ld.description as string)).toContain("board game designers");
  });

  it("omits offers (pricing not finalized)", () => {
    const ld = buildSoftwareApplicationLd();
    expect("offers" in ld).toBe(false);
  });

  it("omits aggregateRating (no real reviews to claim)", () => {
    const ld = buildSoftwareApplicationLd();
    expect("aggregateRating" in ld).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- structured-data`
Expected: FAIL — module `./structured-data` does not exist.

- [ ] **Step 3: Implement the component**

Create `app/_components/landing/structured-data.tsx`:

```tsx
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  SOFTWARE_DESCRIPTION,
  CONTACT_EMAIL,
  LOGO_PATH,
  SOCIAL_PROFILES,
} from "@/app/_lib/site-config";
import { safeJsonLdScript } from "@/app/_lib/safe-jsonld";

export function buildWebSiteLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  };
}

export function buildOrganizationLd(): Record<string, unknown> {
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

export function buildSoftwareApplicationLd(): Record<string, unknown> {
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
  const blocks = [
    buildWebSiteLd(),
    buildOrganizationLd(),
    buildSoftwareApplicationLd(),
  ];
  return (
    <>
      {blocks.map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLdScript(ld) }}
        />
      ))}
    </>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- structured-data`
Expected: PASS — 6/6 green.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: 70/70 (was 64; +6 new structured-data tests).

- [ ] **Step 6: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/_components/landing/structured-data.tsx app/_components/landing/structured-data.test.ts
git commit -m "feat(seo): add WebSite + Organization + SoftwareApplication JSON-LD for landing"
```

---

## Task 7: Mount `<LandingStructuredData />` + landing-page metadata

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add per-page metadata + mount the structured-data component**

Open `app/page.tsx`. The current contents are:

```tsx
import "./_components/landing/landing.css";
import { Nav, Hero, How, Feats, Showcase, FAQ, CTABand, Footer } from "@/app/_components/landing/sections";
import { DemoSection } from "@/app/_components/landing/demo";
import { PricingSection } from "@/app/_components/landing/pricing";

export default function LandingPage() {
  return (
    <div className="sherpa-landing">
      <Nav />
      <Hero />
      <How />
      <Feats />
      <DemoSection />
      <Showcase />
      <PricingSection />
      <FAQ />
      <CTABand />
      <Footer />
    </div>
  );
}
```

Replace the entire file with:

```tsx
import type { Metadata } from "next";
import "./_components/landing/landing.css";
import { Nav, Hero, How, Feats, Showcase, FAQ, CTABand, Footer } from "@/app/_components/landing/sections";
import { DemoSection } from "@/app/_components/landing/demo";
import { PricingSection } from "@/app/_components/landing/pricing";
import { LandingStructuredData } from "@/app/_components/landing/structured-data";
import { SITE_URL, SOFTWARE_DESCRIPTION } from "@/app/_lib/site-config";

const LANDING_TITLE = "Sherpa — Interactive rulebooks for board games";

export const metadata: Metadata = {
  title: LANDING_TITLE,
  description: SOFTWARE_DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: LANDING_TITLE,
    description: SOFTWARE_DESCRIPTION,
    url: SITE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: LANDING_TITLE,
    description: SOFTWARE_DESCRIPTION,
  },
};

export default function LandingPage() {
  return (
    <>
      <LandingStructuredData />
      <div className="sherpa-landing">
        <Nav />
        <Hero />
        <How />
        <Feats />
        <DemoSection />
        <Showcase />
        <PricingSection />
        <FAQ />
        <CTABand />
        <Footer />
      </div>
    </>
  );
}
```

Note: the explicit `title: LANDING_TITLE` overrides the root layout's title template — `app/layout.tsx`'s `template: "%s · Sherpa"` only fires for child pages that set `title` as a plain string. Since the landing page already includes "Sherpa" in its title, it does not need the template suffix.

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Verify tests still pass**

Run: `npm test`
Expected: 70/70.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(seo): add landing-page metadata + mount structured data"
```

---

## Task 8: FAQ JSON-LD colocated with `<FAQ />`

**Files:**
- Modify: `app/_components/landing/sections.tsx`

The existing `FAQ()` function (around line 583 in `sections.tsx`) defines an `items` array of 7 Q&As and renders them as a visible accordion. Add an inline `<script type="application/ld+json">` driven by the same array, so the structured data can never drift from what humans see.

- [ ] **Step 1: Add the import for the safe-jsonld helper**

Open `app/_components/landing/sections.tsx`. The current imports at the top include `import React from "react";` and others. Add this line near the existing imports (group with the `@/app/_lib/...` imports if any exist; otherwise add at the bottom of the import block):

```ts
import { safeJsonLdScript } from "@/app/_lib/safe-jsonld";
```

- [ ] **Step 2: Update the FAQ component to emit FAQPage JSON-LD**

Find the `export function FAQ()` declaration. It currently looks like:

```tsx
export function FAQ() {
  const items = [
    { q: "Do players need to install anything?", a: "No. We'll never ask them to. Sherpa rulebooks open in the phone's browser when players scan the QR. No app, no login, no account for your players." },
    // ... 6 more items ...
  ];

  return (
    <section id="faq" className="section faq">
      <div className="wrap faq-grid">
        {/* ... existing markup ... */}
      </div>
    </section>
  );
}
```

DO NOT touch the `items` array — leave its 7 entries exactly as they are. Edit only the JSX returned. Find the line that currently reads `return (` and replace the body so the returned JSX is:

```tsx
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
        {/* ... existing visible markup unchanged ... */}
      </div>
    </section>
  );
```

That is: `const faqLd = { ... }` declared BEFORE the `return`, and a `<script>` element inserted as the first child of `<section id="faq">` BEFORE the existing `<div className="wrap faq-grid">`. The existing `<div className="wrap faq-grid">` and everything inside it stays exactly as it was.

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS. (`safeJsonLdScript` accepts `unknown` so the typed `faqLd` object passes without complaint.)

- [ ] **Step 4: Verify tests still pass**

Run: `npm test`
Expected: 70/70.

- [ ] **Step 5: Commit**

```bash
git add app/_components/landing/sections.tsx
git commit -m "feat(seo): emit FAQPage JSON-LD alongside visible FAQ"
```

---

## Task 9: Hero copy update for AEO clarity

**Files:**
- Modify: `app/_components/landing/sections.tsx`

One small text change — the hero's `sub` string. Headline and eyebrow stay.

- [ ] **Step 1: Update the `sub` string**

Open `app/_components/landing/sections.tsx`. Inside the `Hero()` function (around line 70-ish), find the line:

```ts
  const sub = "Sherpa turns your rulebook into an interactive learn-to-play that fits on a QR card. Drop it in the box, stick it on your convention table, share it with playtesters. Rules answer themselves.";
```

Replace with:

```ts
  const sub = "Sherpa is a tool for board game designers. Turn your rulebook into something players actually read — import your PDF or Figma, drop hotspots on the board, and publish a QR card. Stick it in the box, on your convention table, or send it to playtesters. Rules answer themselves.";
```

That is the only change in this task.

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Verify tests still pass**

Run: `npm test`
Expected: 70/70.

- [ ] **Step 4: Commit**

```bash
git add app/_components/landing/sections.tsx
git commit -m "feat(seo): hero copy now opens with 'Sherpa is a tool for board game designers' for AI citation"
```

---

## Self-review

**1. Spec coverage** — every section of the spec maps to a task:

- `site-config.ts` (spec § Domain configuration) → Task 1
- `safe-jsonld.ts` extraction (spec § `app/_lib/safe-jsonld.ts`) → Task 2
- `robots.ts` (spec § `app/robots.ts`) → Task 3
- `sitemap.ts` (spec § `app/sitemap.ts`) → Task 4
- Root layout metadata (spec § Root layout metadata expansion) → Task 5
- `<LandingStructuredData />` (spec § Landing page metadata + structured data) → Task 6
- Landing per-page metadata + mounting (spec § Mounting) → Task 7
- FAQ schema (spec § FAQ schema (colocated)) → Task 8
- Hero copy (spec § Hero copy update) → Task 9

No gaps.

**2. Placeholder scan** — every step has either exact code, an exact command, or an explicit "this step is skipped during automated execution" note. No "TBD", no "add validation", no "similar to Task N".

**3. Type consistency:**

- `SITE_URL`, `SITE_NAME`, `SITE_DESCRIPTION`, `SOFTWARE_DESCRIPTION`, `CONTACT_EMAIL`, `LOGO_PATH`, `SOCIAL_PROFILES` defined once in Task 1, consumed identically in Tasks 3, 4, 5, 6, 7.
- `safeJsonLdScript` defined in Task 2, consumed in Tasks 6 and 8.
- `buildWebSiteLd`, `buildOrganizationLd`, `buildSoftwareApplicationLd` declared in tests (Task 6 Step 1), implemented identically in Task 6 Step 3.
- `buildSitemapEntries(games, siteUrl, now)` declared in tests (Task 4 Step 1), implemented with the same signature in Task 4 Step 3.

**4. Order**: dependencies flow forward.

- Task 1 (site-config) is consumed by Tasks 3, 4, 5, 6, 7.
- Task 2 (safe-jsonld) is consumed by Tasks 6 and 8.
- Task 6 (structured-data) is consumed by Task 7.
- Tasks 8 and 9 both touch `sections.tsx` but in different functions (`FAQ` vs `Hero`) — sequential commits.

---

## Out-of-scope / Plan B candidates

Already documented in the spec. Reproduced here so the implementer can sanity-check what NOT to add:

- `SearchAction` on `WebSite` (needs `?q=` text search on `/gallery` first)
- `CollectionPage` / `ItemList` on `/gallery` index
- `BreadcrumbList` on `/gallery/[id]`
- Richer `HowToStep.text` extracted from card blocks
- Dynamic per-game OG images (`opengraph-image.tsx` at 1200×630)
- `llms.txt` at site root
- `noindex` metadata per gated route (currently covered by `robots.ts`)
- Proper PNG logo file (SVG works for now)
- Populating `Organization.sameAs` (no social handles claimed yet)
- Pricing in `SoftwareApplication.offers` (pricing in flux)

---

Plan complete and saved to `docs/superpowers/plans/2026-05-21-seo-aeo-foundation-landing.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
