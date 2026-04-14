# Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire real PostHog analytics into the existing Sherpa dashboard — replacing all mock data with live events captured from the player view, served through authenticated Next.js API routes.

**Architecture:** `posthog-js` captures six events in the player view (anonymous, no cookies, no IP). Nine Next.js API routes proxy PostHog's HogQL Query API and enforce game-membership authorization. The analytics dashboard page fetches all routes in parallel via `apiFetch` and renders real data. A tenth route serves CSV exports.

**Tech stack:** React 18, TypeScript, Next.js App Router, `posthog-js`, PostHog HogQL Query API, Supabase (auth + membership checks), Tailwind CSS.

---

## File map

| File | Action |
|---|---|
| `app/_components/PostHogProvider.tsx` | **Create** — initializes PostHog with anonymous config, exports provider |
| `app/play/[gameId]/layout.tsx` | **Modify** — wrap children in `PostHogProvider` |
| `app/play/[gameId]/page.tsx` | **Modify** — pass `gameId` to `PlayerView`; fire `game_viewed` after load |
| `app/_components/player-view.tsx` | **Modify** — add `gameId` prop; fire `card_viewed`, `card_closed`, `hotspot_clicked`, `language_changed` |
| `app/_lib/posthog-query.ts` | **Create** — `hogql(query)` helper: POSTs to PostHog Query API, returns `{ results, columns }` |
| `app/_lib/analytics-auth.ts` | **Create** — `assertGameMember(gameId, userId)`: returns true if user owns or is a member of the game |
| `app/api/analytics/overview/route.ts` | **Create** — sessions, unique sessions, avg duration + period deltas |
| `app/api/analytics/sessions/route.ts` | **Create** — daily session counts for the line chart |
| `app/api/analytics/hotspots/route.ts` | **Create** — click counts + avg dwell time per card |
| `app/api/analytics/exit-cards/route.ts` | **Create** — last card viewed per session, ranked by frequency |
| `app/api/analytics/devices/route.ts` | **Create** — desktop / landscape / portrait breakdown |
| `app/api/analytics/paths/route.ts` | **Create** — top 2-step navigation pairs per session |
| `app/api/analytics/search-terms/route.ts` | **Create** — most common `search_performed` queries |
| `app/api/analytics/peak-usage/route.ts` | **Create** — session count by hour of day (UTC) |
| `app/api/analytics/languages/route.ts` | **Create** — language distribution across sessions |
| `app/api/analytics/export/route.ts` | **Create** — streams all events for a date range as a CSV download |
| `app/analytics/page.tsx` | **Modify** — replace mock data + generators with API calls; add date range picker; add four new panels; add export button |
| `app/_lib/authoring-utils.ts` | **Modify** — bump `APP_VERSION` to `"v0.23.0"` |
| `app/_lib/patch-notes.ts` | **Modify** — add v0.23.0 entry |

---

## Task 1 — PostHog setup: install, provider, env vars

**Files:** Create `app/_components/PostHogProvider.tsx`, modify `app/play/[gameId]/layout.tsx`

- [ ] **Install `posthog-js`:**

```bash
npm install posthog-js
```

- [ ] **Add env vars** to `.env.local` (and your Vercel/production env):

```
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com
POSTHOG_API_KEY=phx_xxxxxxxxxxxxxxxxxxxx
POSTHOG_PROJECT_ID=12345
```

`NEXT_PUBLIC_POSTHOG_KEY` is the project API key (write-only, safe to expose). `POSTHOG_API_KEY` is a personal API key with query access — server-side only, never in a `NEXT_PUBLIC_` variable.

- [ ] **Create `app/_components/PostHogProvider.tsx`:**

```tsx
"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.posthog.com",
      ip: false,
      disable_persistence: true,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
```

- [ ] **Modify `app/play/[gameId]/layout.tsx`** to wrap children in `PostHogProvider`:

```tsx
import { ServiceWorkerRegistration } from "@/app/_components/ServiceWorkerRegistration";
import { PostHogProvider } from "@/app/_components/PostHogProvider";

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceWorkerRegistration />
      <PostHogProvider>{children}</PostHogProvider>
    </>
  );
}
```

- [ ] **Verify TypeScript:** `npx tsc --noEmit` — no errors.

- [ ] **Commit:**

```bash
git add app/_components/PostHogProvider.tsx app/play/[gameId]/layout.tsx package.json package-lock.json
git commit -m "feat: add PostHog provider to play layout (anonymous, no cookies)"
```

---

## Task 2 — Fire `game_viewed` from the play page

**Files:** Modify `app/play/[gameId]/page.tsx`, modify `app/_components/player-view.tsx`

- [ ] **Add `gameId` prop to `PlayerView`** in `app/_components/player-view.tsx`. Change the props type and function signature:

```tsx
export function PlayerView({
  pages,
  systemSettings,
  hasBranding = false,
  gameId,
}: {
  pages: PageItem[];
  systemSettings: SystemSettings;
  hasBranding?: boolean;
  gameId: string;
}) {
```

`gameId` is not used yet — it will be used in Task 3. Adding it now avoids two passes through this file.

- [ ] **Update the `PlayerView` call in `app/play/[gameId]/page.tsx`** to pass `gameId`, and fire `game_viewed` after load. Add the `usePostHog` import and the effect:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { loadGame } from "@/app/_lib/supabase-game";
import { PlayerView } from "@/app/_components/player-view";
import { PageItem, SystemSettings } from "@/app/_lib/authoring-types";
import { warmGameCache } from "@/app/_lib/warm-game-cache";
import { OfflineBadge } from "./_components/OfflineBadge";
import { InstallPrompt } from "./_components/InstallPrompt";

export default function PlayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const posthog = usePostHog();
  const [pages, setPages] = useState<PageItem[] | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [hasBranding, setHasBranding] = useState(true);
  const [cacheStatus, setCacheStatus] = useState<
    "idle" | "already-cached" | "success" | "error"
  >("idle");

  useEffect(() => {
    if (!gameId) return;
    loadGame(gameId)
      .then((data) => {
        if (data && data.pages.some((p) => p.kind === "home")) {
          setPages(data.pages);
          setSystemSettings(data.systemSettings);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true));
  }, [gameId]);

  // Fire game_viewed once pages are loaded
  useEffect(() => {
    if (!gameId || !pages || !systemSettings) return;
    const layoutMode =
      window.innerWidth < 600
        ? "mobile-portrait"
        : window.innerWidth < 1024
        ? "mobile-landscape"
        : "desktop";
    posthog?.capture("game_viewed", { gameId, layoutMode });
  }, [gameId, pages, systemSettings, posthog]);

  useEffect(() => {
    if (!gameId) return;
    const stored = localStorage.getItem(`sherpa-entitlement-${gameId}`);
    if (stored !== null) setHasBranding(stored === "true");
    fetch("/api/stripe/entitlement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    })
      .then((r) => r.json())
      .then((data: { hasBranding?: boolean }) => {
        const value = data.hasBranding ?? true;
        setHasBranding(value);
        localStorage.setItem(`sherpa-entitlement-${gameId}`, String(value));
      })
      .catch(() => {
        if (stored === null) setHasBranding(true);
      });
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !pages || !systemSettings) return;
    warmGameCache(gameId, pages, systemSettings).then((status) => {
      console.log("[warmGameCache] result:", status);
      setCacheStatus(status);
    });
  }, [gameId, pages, systemSettings]);

  if (notFound) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-6 text-center">
        <div>
          <div className="text-xl font-semibold text-white">Experience not found</div>
          <div className="mt-2 text-sm text-neutral-400">
            This link may be invalid or the experience is not published.
          </div>
        </div>
        <a
          href="/gallery"
          className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
        >
          Browse the gallery
        </a>
      </div>
    );
  }

  if (!pages || !systemSettings) {
    return (
      <div
        className="flex h-screen items-center justify-center bg-neutral-950"
        role="status"
        aria-label="Loading experience"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  return (
    <>
      <PlayerView
        pages={pages}
        systemSettings={systemSettings}
        hasBranding={hasBranding}
        gameId={gameId}
      />
      <OfflineBadge status={cacheStatus} />
      <InstallPrompt />
    </>
  );
}
```

- [ ] **Verify TypeScript:** `npx tsc --noEmit` — no errors.

- [ ] **Commit:**

```bash
git add app/play/[gameId]/page.tsx app/_components/player-view.tsx
git commit -m "feat: fire game_viewed PostHog event on player load"
```

---

## Task 3 — Fire `card_viewed`, `card_closed`, `hotspot_clicked`

**Files:** Modify `app/_components/player-view.tsx`

The three events all originate from player-view.tsx. `card_viewed` fires when a card opens. `card_closed` fires when it finishes closing (in `handleModuleExitEnd`) with the elapsed dwell time. `hotspot_clicked` fires when a hotspot pin is tapped (wrapped around `handleSelectPage`).

- [ ] **Add the PostHog hook and a timing ref** near the top of the `PlayerView` function body, after the existing `useRef` declarations:

```tsx
import { usePostHog } from "posthog-js/react";

// inside PlayerView, after existing refs:
const posthog = usePostHog();
const cardOpenTimeRef = useRef<number | null>(null);
```

- [ ] **Wrap `handleSelectPage`** to fire `card_viewed` when a non-home card opens and `hotspot_clicked` when called from a hotspot. Replace the existing `handleSelectPage` function with:

```tsx
function handleSelectPage(id: string) {
  const page = localizedPages.find((p) => p.id === id);
  if (!page || page.kind === "home") {
    handleDismissContent();
    return;
  }
  if (modulePageRef.current && !isModuleExitingRef.current) {
    setNavHistory((prev) => [
      ...prev,
      { pageId: modulePageRef.current!.id, scrollTop: contentScrollRef.current?.scrollTop ?? 0 },
    ]);
  }
  posthog?.capture("card_viewed", { gameId, cardId: page.id, cardTitle: page.title });
  cardOpenTimeRef.current = Date.now();
  setSelectedPageId(id);
  modulePageRef.current = page;
  isModuleExitingRef.current = false;
  setModulePage(page);
  setIsModuleExiting(false);
}
```

- [ ] **Add a hotspot-specific wrapper** used only by `HotspotPin` (not back-navigation). Add this function after `handleSelectPage`:

```tsx
function handleHotspotSelect(id: string) {
  const page = localizedPages.find((p) => p.id === id);
  if (page && page.kind !== "home") {
    posthog?.capture("hotspot_clicked", {
      gameId,
      hotspotId: id,
      hotspotTitle: page.title,
    });
  }
  handleSelectPage(id);
}
```

- [ ] **Update the `HotspotPin` map** in the JSX to use `handleHotspotSelect`:

```tsx
{hotspotPages.map((page, i) => (
  <HotspotPin
    key={page.id}
    page={page}
    index={i}
    isSelected={page.id === resolvedSelectedPageId}
    isLayoutEditMode={false}
    isPreviewMode={true}
    accentColor={accentColor}
    fontThemeClass={fontThemeClass}
    hotspotContainerSize={hotspotContainerSize}
    hotspotDotSize={hotspotDotSize}
    hotspotLabelSize={hotspotLabelSize}
    accentActiveStyle={accentActiveStyle}
    accentRingStyle={accentRingStyle}
    onSelectPage={handleHotspotSelect}
    onHotspotPointerDown={NOOP_PTR}
    onDeleteHotspot={NOOP}
  />
))}
```

- [ ] **Fire `card_closed` in `handleModuleExitEnd`** with dwell duration:

```tsx
function handleModuleExitEnd() {
  if (cardOpenTimeRef.current !== null && modulePageRef.current) {
    const durationSeconds = Math.round((Date.now() - cardOpenTimeRef.current) / 1000);
    posthog?.capture("card_closed", {
      gameId,
      cardId: modulePageRef.current.id,
      cardTitle: modulePageRef.current.title,
      durationSeconds,
    });
    cardOpenTimeRef.current = null;
  }
  modulePageRef.current = null;
  isModuleExitingRef.current = false;
  setModulePage(null);
  setIsModuleExiting(false);
  setSelectedPageId(homePage?.id ?? "");
}
```

- [ ] **Verify TypeScript:** `npx tsc --noEmit` — no errors.

- [ ] **Commit:**

```bash
git add app/_components/player-view.tsx
git commit -m "feat: fire card_viewed, card_closed, hotspot_clicked PostHog events"
```

---

## Task 4 — Fire `language_changed`

**Files:** Modify `app/_components/player-view.tsx`

- [ ] **Add a language change wrapper** after `handleModuleExitEnd`:

```tsx
function handleLanguageChange(code: string) {
  if (code !== activeLanguageCode) {
    posthog?.capture("language_changed", {
      gameId,
      fromCode: activeLanguageCode,
      toCode: code,
    });
  }
  setActiveLanguageCode(code);
}
```

- [ ] **Update `FeaturePlacer`** in the JSX to use the wrapper:

```tsx
<FeaturePlacer
  features={features}
  isLayoutEditMode={false}
  accentColor={accentColor}
  fontThemeClass={fontThemeClass}
  surfaceStyleClass={surfaceStyleClass}
  pages={localizedPages}
  activeLanguageCode={activeLanguageCode}
  availableLanguages={localeLanguages}
  isPreviewMode
  onCanvasFeaturePointerDown={NOOP_PTR}
  onSelectCanvasFeature={NOOP}
  onLanguageChange={handleLanguageChange}
  onSelectPage={handleSelectPage}
/>
```

- [ ] **Verify TypeScript:** `npx tsc --noEmit` — no errors.

- [ ] **Commit:**

```bash
git add app/_components/player-view.tsx
git commit -m "feat: fire language_changed PostHog event"
```

---

## Task 5 — Shared PostHog query helper + analytics auth helper

**Files:** Create `app/_lib/posthog-query.ts`, create `app/_lib/analytics-auth.ts`

- [ ] **Create `app/_lib/posthog-query.ts`:**

```ts
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.posthog.com";
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY ?? "";
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID ?? "";

export interface HogQLResult {
  results: unknown[][];
  columns: string[];
}

/**
 * Execute a HogQL query against PostHog's Query API.
 * Server-side only — uses POSTHOG_API_KEY which must never reach the client.
 */
export async function hogql(query: string): Promise<HogQLResult> {
  const res = await fetch(
    `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${POSTHOG_API_KEY}`,
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      cache: "no-store",
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostHog query failed ${res.status}: ${text}`);
  }
  return res.json() as Promise<HogQLResult>;
}
```

- [ ] **Create `app/_lib/analytics-auth.ts`:**

```ts
import { supabaseAdmin } from "@/app/_lib/supabase-admin";

/**
 * Returns true if `userId` is the owner of `gameId` or a game_member of it.
 * Used by all analytics API routes to gate access.
 */
export async function assertGameMember(gameId: string, userId: string): Promise<boolean> {
  const { data: game } = await supabaseAdmin
    .from("games")
    .select("id")
    .eq("id", gameId)
    .eq("user_id", userId)
    .single();
  if (game) return true;

  const { data: member } = await supabaseAdmin
    .from("game_members")
    .select("id")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .single();
  return !!member;
}
```

- [ ] **Verify TypeScript:** `npx tsc --noEmit` — no errors.

- [ ] **Commit:**

```bash
git add app/_lib/posthog-query.ts app/_lib/analytics-auth.ts
git commit -m "feat: add PostHog HogQL helper and analytics auth helper"
```

---

## Task 6 — `overview` and `sessions` API routes

**Files:** Create `app/api/analytics/overview/route.ts`, create `app/api/analytics/sessions/route.ts`

Every analytics route follows the same pattern:
1. `getRequestUser(request)` — 401 if unauthenticated
2. `assertGameMember(gameId, user.id)` — 403 if not a member
3. `hogql(...)` — query PostHog
4. Shape and return the result

- [ ] **Create `app/api/analytics/overview/route.ts`:**

```ts
import { getRequestUser } from "@/app/_lib/api-auth";
import { assertGameMember } from "@/app/_lib/analytics-auth";
import { hogql } from "@/app/_lib/posthog-query";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const compareFrom = searchParams.get("compareFrom");
  const compareTo = searchParams.get("compareTo");
  if (!gameId || !from || !to) {
    return Response.json({ error: "Missing gameId, from, or to" }, { status: 400 });
  }

  const isMember = await assertGameMember(gameId, user.id);
  if (!isMember) return Response.json({ error: "Forbidden" }, { status: 403 });

  async function fetchPeriod(f: string, t: string) {
    const q = `
      SELECT
        count(distinct distinct_id) AS sessions,
        avg(duration_seconds) AS avg_duration_seconds
      FROM (
        SELECT
          distinct_id,
          dateDiff('second', min(timestamp), max(timestamp)) AS duration_seconds
        FROM events
        WHERE properties.gameId = '${gameId}'
          AND timestamp >= '${f}'
          AND timestamp < '${t}'
        GROUP BY distinct_id
      )
    `;
    const { results } = await hogql(q);
    const row = results[0] ?? [0, 0];
    return {
      sessions: Number(row[0]) || 0,
      avgDurationSeconds: Number(row[1]) || 0,
    };
  }

  const [current, previous] = await Promise.all([
    fetchPeriod(from, to),
    compareFrom && compareTo ? fetchPeriod(compareFrom, compareTo) : Promise.resolve(null),
  ]);

  function pctDelta(curr: number, prev: number | undefined) {
    if (!prev || prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  }

  return Response.json({
    sessions: current.sessions,
    avgDurationSeconds: current.avgDurationSeconds,
    sessionsDelta: previous ? pctDelta(current.sessions, previous.sessions) : null,
    avgDurationDelta: previous
      ? pctDelta(current.avgDurationSeconds, previous.avgDurationSeconds)
      : null,
  });
}
```

- [ ] **Create `app/api/analytics/sessions/route.ts`:**

```ts
import { getRequestUser } from "@/app/_lib/api-auth";
import { assertGameMember } from "@/app/_lib/analytics-auth";
import { hogql } from "@/app/_lib/posthog-query";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!gameId || !from || !to) {
    return Response.json({ error: "Missing gameId, from, or to" }, { status: 400 });
  }

  const isMember = await assertGameMember(gameId, user.id);
  if (!isMember) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { results } = await hogql(`
    SELECT
      toDate(timestamp) AS date,
      count(distinct distinct_id) AS sessions
    FROM events
    WHERE event = 'game_viewed'
      AND properties.gameId = '${gameId}'
      AND timestamp >= '${from}'
      AND timestamp < '${to}'
    GROUP BY date
    ORDER BY date
  `);

  return Response.json(
    results.map((row) => ({ date: String(row[0]), sessions: Number(row[1]) }))
  );
}
```

- [ ] **Verify TypeScript:** `npx tsc --noEmit` — no errors.

- [ ] **Commit:**

```bash
git add app/api/analytics/overview/route.ts app/api/analytics/sessions/route.ts
git commit -m "feat: analytics overview and sessions API routes"
```

---

## Task 7 — `hotspots` and `exit-cards` API routes

**Files:** Create `app/api/analytics/hotspots/route.ts`, create `app/api/analytics/exit-cards/route.ts`

- [ ] **Create `app/api/analytics/hotspots/route.ts`:**

```ts
import { getRequestUser } from "@/app/_lib/api-auth";
import { assertGameMember } from "@/app/_lib/analytics-auth";
import { hogql } from "@/app/_lib/posthog-query";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!gameId || !from || !to) {
    return Response.json({ error: "Missing gameId, from, or to" }, { status: 400 });
  }

  const isMember = await assertGameMember(gameId, user.id);
  if (!isMember) return Response.json({ error: "Forbidden" }, { status: 403 });

  // Click counts from hotspot_clicked
  const clicksResult = await hogql(`
    SELECT
      properties.hotspotTitle AS title,
      count() AS clicks
    FROM events
    WHERE event = 'hotspot_clicked'
      AND properties.gameId = '${gameId}'
      AND timestamp >= '${from}'
      AND timestamp < '${to}'
    GROUP BY title
    ORDER BY clicks DESC
    LIMIT 20
  `);

  // Avg dwell time from card_closed (keyed by cardTitle which matches hotspotTitle)
  const dwellResult = await hogql(`
    SELECT
      properties.cardTitle AS title,
      avg(toFloat64OrNull(properties.durationSeconds)) AS avg_seconds
    FROM events
    WHERE event = 'card_closed'
      AND properties.gameId = '${gameId}'
      AND timestamp >= '${from}'
      AND timestamp < '${to}'
    GROUP BY title
  `);

  const dwellMap = new Map(
    dwellResult.results.map((row) => [String(row[0]), Number(row[1]) || 0])
  );

  const maxClicks = Number(clicksResult.results[0]?.[1]) || 1;
  const hotspots = clicksResult.results.map((row) => {
    const clicks = Number(row[1]);
    return {
      title: String(row[0]),
      clicks,
      avgDurationSeconds: dwellMap.get(String(row[0])) ?? 0,
      pct: Math.round((clicks / maxClicks) * 100),
    };
  });

  return Response.json(hotspots);
}
```

- [ ] **Create `app/api/analytics/exit-cards/route.ts`:**

Exit card = the last `card_viewed` event for each session (distinct_id), ranked by frequency.

```ts
import { getRequestUser } from "@/app/_lib/api-auth";
import { assertGameMember } from "@/app/_lib/analytics-auth";
import { hogql } from "@/app/_lib/posthog-query";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!gameId || !from || !to) {
    return Response.json({ error: "Missing gameId, from, or to" }, { status: 400 });
  }

  const isMember = await assertGameMember(gameId, user.id);
  if (!isMember) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { results } = await hogql(`
    SELECT
      last_card,
      count() AS exits
    FROM (
      SELECT
        distinct_id,
        arrayLast(x -> 1, groupArray(properties.cardTitle)) AS last_card
      FROM events
      WHERE event = 'card_viewed'
        AND properties.gameId = '${gameId}'
        AND timestamp >= '${from}'
        AND timestamp < '${to}'
      GROUP BY distinct_id
      HAVING last_card != ''
    )
    GROUP BY last_card
    ORDER BY exits DESC
    LIMIT 10
  `);

  return Response.json(
    results.map((row) => ({ title: String(row[0]), exits: Number(row[1]) }))
  );
}
```

- [ ] **Verify TypeScript:** `npx tsc --noEmit` — no errors.

- [ ] **Commit:**

```bash
git add app/api/analytics/hotspots/route.ts app/api/analytics/exit-cards/route.ts
git commit -m "feat: analytics hotspots and exit-cards API routes"
```

---

## Task 8 — `devices`, `languages`, `paths`, `search-terms`, `peak-usage` routes

**Files:** Create five route files.

- [ ] **Create `app/api/analytics/devices/route.ts`:**

```ts
import { getRequestUser } from "@/app/_lib/api-auth";
import { assertGameMember } from "@/app/_lib/analytics-auth";
import { hogql } from "@/app/_lib/posthog-query";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!gameId || !from || !to) {
    return Response.json({ error: "Missing gameId, from, or to" }, { status: 400 });
  }

  const isMember = await assertGameMember(gameId, user.id);
  if (!isMember) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { results } = await hogql(`
    SELECT
      properties.layoutMode AS device,
      count() AS sessions
    FROM events
    WHERE event = 'game_viewed'
      AND properties.gameId = '${gameId}'
      AND timestamp >= '${from}'
      AND timestamp < '${to}'
    GROUP BY device
    ORDER BY sessions DESC
  `);

  const total = results.reduce((sum, row) => sum + Number(row[1]), 0) || 1;
  const COLOR_MAP: Record<string, string> = {
    desktop: "#0ea5e9",
    "mobile-landscape": "#8b5cf6",
    "mobile-portrait": "#f59e0b",
  };
  const LABEL_MAP: Record<string, string> = {
    desktop: "Desktop",
    "mobile-landscape": "Mobile Landscape",
    "mobile-portrait": "Mobile Portrait",
  };

  return Response.json(
    results.map((row) => ({
      device: String(row[0]),
      label: LABEL_MAP[String(row[0])] ?? String(row[0]),
      sessions: Number(row[1]),
      pct: Math.round((Number(row[1]) / total) * 100),
      color: COLOR_MAP[String(row[0])] ?? "#94a3b8",
    }))
  );
}
```

- [ ] **Create `app/api/analytics/languages/route.ts`:**

```ts
import { getRequestUser } from "@/app/_lib/api-auth";
import { assertGameMember } from "@/app/_lib/analytics-auth";
import { hogql } from "@/app/_lib/posthog-query";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!gameId || !from || !to) {
    return Response.json({ error: "Missing gameId, from, or to" }, { status: 400 });
  }

  const isMember = await assertGameMember(gameId, user.id);
  if (!isMember) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { results } = await hogql(`
    SELECT
      properties.toCode AS language_code,
      count() AS switches
    FROM events
    WHERE event = 'language_changed'
      AND properties.gameId = '${gameId}'
      AND timestamp >= '${from}'
      AND timestamp < '${to}'
    GROUP BY language_code
    ORDER BY switches DESC
    LIMIT 10
  `);

  return Response.json(
    results.map((row) => ({ code: String(row[0]), switches: Number(row[1]) }))
  );
}
```

- [ ] **Create `app/api/analytics/paths/route.ts`:**

Top 2-step navigation pairs: for each session, take the first two `card_viewed` events and form "Card A → Card B".

```ts
import { getRequestUser } from "@/app/_lib/api-auth";
import { assertGameMember } from "@/app/_lib/analytics-auth";
import { hogql } from "@/app/_lib/posthog-query";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!gameId || !from || !to) {
    return Response.json({ error: "Missing gameId, from, or to" }, { status: 400 });
  }

  const isMember = await assertGameMember(gameId, user.id);
  if (!isMember) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { results } = await hogql(`
    SELECT
      concat(first_card, ' → ', second_card) AS path,
      count() AS sessions
    FROM (
      SELECT
        distinct_id,
        groupArray(properties.cardTitle)[1] AS first_card,
        groupArray(properties.cardTitle)[2] AS second_card
      FROM events
      WHERE event = 'card_viewed'
        AND properties.gameId = '${gameId}'
        AND timestamp >= '${from}'
        AND timestamp < '${to}'
      GROUP BY distinct_id
      HAVING length(groupArray(properties.cardTitle)) >= 2
    )
    WHERE second_card != ''
    GROUP BY path
    ORDER BY sessions DESC
    LIMIT 5
  `);

  const total = results.reduce((sum, row) => sum + Number(row[1]), 0) || 1;
  return Response.json(
    results.map((row) => ({
      path: String(row[0]),
      sessions: Number(row[1]),
      pct: Math.round((Number(row[1]) / total) * 100),
    }))
  );
}
```

- [ ] **Create `app/api/analytics/search-terms/route.ts`:**

```ts
import { getRequestUser } from "@/app/_lib/api-auth";
import { assertGameMember } from "@/app/_lib/analytics-auth";
import { hogql } from "@/app/_lib/posthog-query";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!gameId || !from || !to) {
    return Response.json({ error: "Missing gameId, from, or to" }, { status: 400 });
  }

  const isMember = await assertGameMember(gameId, user.id);
  if (!isMember) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { results } = await hogql(`
    SELECT
      lower(trim(properties.query)) AS term,
      count() AS searches
    FROM events
    WHERE event = 'search_performed'
      AND properties.gameId = '${gameId}'
      AND timestamp >= '${from}'
      AND timestamp < '${to}'
    GROUP BY term
    ORDER BY searches DESC
    LIMIT 10
  `);

  return Response.json(
    results.map((row) => ({ query: String(row[0]), count: Number(row[1]) }))
  );
}
```

- [ ] **Create `app/api/analytics/peak-usage/route.ts`:**

```ts
import { getRequestUser } from "@/app/_lib/api-auth";
import { assertGameMember } from "@/app/_lib/analytics-auth";
import { hogql } from "@/app/_lib/posthog-query";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!gameId || !from || !to) {
    return Response.json({ error: "Missing gameId, from, or to" }, { status: 400 });
  }

  const isMember = await assertGameMember(gameId, user.id);
  if (!isMember) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { results } = await hogql(`
    SELECT
      toHour(timestamp) AS hour,
      count(distinct distinct_id) AS sessions
    FROM events
    WHERE event = 'game_viewed'
      AND properties.gameId = '${gameId}'
      AND timestamp >= '${from}'
      AND timestamp < '${to}'
    GROUP BY hour
    ORDER BY hour
  `);

  // Fill in hours with zero if missing
  const byHour = new Map(results.map((row) => [Number(row[0]), Number(row[1])]));
  const hours = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    sessions: byHour.get(h) ?? 0,
  }));

  return Response.json(hours);
}
```

- [ ] **Verify TypeScript:** `npx tsc --noEmit` — no errors.

- [ ] **Commit:**

```bash
git add \
  app/api/analytics/devices/route.ts \
  app/api/analytics/languages/route.ts \
  app/api/analytics/paths/route.ts \
  app/api/analytics/search-terms/route.ts \
  app/api/analytics/peak-usage/route.ts
git commit -m "feat: analytics devices, languages, paths, search-terms, peak-usage routes"
```

---

## Task 9 — `export` API route

**Files:** Create `app/api/analytics/export/route.ts`

- [ ] **Create `app/api/analytics/export/route.ts`:**

```ts
import { getRequestUser } from "@/app/_lib/api-auth";
import { assertGameMember } from "@/app/_lib/analytics-auth";
import { hogql } from "@/app/_lib/posthog-query";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!gameId || !from || !to) {
    return Response.json({ error: "Missing gameId, from, or to" }, { status: 400 });
  }

  const isMember = await assertGameMember(gameId, user.id);
  if (!isMember) return new Response("Forbidden", { status: 403 });

  const { results } = await hogql(`
    SELECT
      toString(timestamp) AS timestamp,
      event,
      distinct_id AS session_id,
      ifNull(properties.cardId, '') AS card_id,
      ifNull(properties.cardTitle, '') AS card_title,
      ifNull(properties.query, '') AS query,
      ifNull(properties.toCode, '') AS language_code,
      ifNull(properties.layoutMode, '') AS device
    FROM events
    WHERE properties.gameId = '${gameId}'
      AND timestamp >= '${from}'
      AND timestamp < '${to}'
    ORDER BY timestamp
    LIMIT 100000
  `);

  const header = "timestamp,event,session_id,card_id,card_title,query,language_code,device\n";
  const rows = results
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(",")
    )
    .join("\n");

  const filename = `sherpa-analytics-${gameId}-${from}-${to}.csv`;
  return new Response(header + rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Verify TypeScript:** `npx tsc --noEmit` — no errors.

- [ ] **Commit:**

```bash
git add app/api/analytics/export/route.ts
git commit -m "feat: analytics CSV export route"
```

---

## Task 10 — Dashboard: replace mock data, add date range picker

**Files:** Modify `app/analytics/page.tsx`

This task removes all mock data and wires the existing panels to real API data. The new panels (exit cards, search terms, peak usage, languages) are added in Task 11.

- [ ] **Replace `app/analytics/page.tsx`** with the following. This is a full file replacement — the mock data generators are removed entirely and the dashboard now fetches real data:

```tsx
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/_lib/api-fetch";

// ── Types ─────────────────────────────────────────────────────────

type OverviewData = {
  sessions: number;
  avgDurationSeconds: number;
  sessionsDelta: number | null;
  avgDurationDelta: number | null;
};

type SessionsData = { date: string; sessions: number }[];

type HotspotData = {
  title: string;
  clicks: number;
  avgDurationSeconds: number;
  pct: number;
}[];

type DeviceData = { device: string; label: string; sessions: number; pct: number; color: string }[];

type PathData = { path: string; sessions: number; pct: number }[];

// ── Utilities ─────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getRangeParams(from: Date, to: Date): { from: string; to: string; compareFrom: string; compareTo: string } {
  const days = Math.round((to.getTime() - from.getTime()) / 86400000);
  const compareFrom = addDays(from, -days);
  const compareTo = from;
  return {
    from: formatDate(from),
    to: formatDate(to),
    compareFrom: formatDate(compareFrom),
    compareTo: formatDate(compareTo),
  };
}

// ── Charts (unchanged from existing file) ─────────────────────────

function LineChart({ data, color = "#0ea5e9" }: { data: number[]; color?: string }) {
  const W = 600;
  const H = 80;
  const pad = { top: 8, bottom: 4, left: 0, right: 0 };
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = pad.left + (i / Math.max(data.length - 1, 1)) * (W - pad.left - pad.right);
    const y = pad.top + (1 - v / max) * (H - pad.top - pad.bottom);
    return [x, y] as [number, number];
  });
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area =
    pts.length > 0
      ? `M${pts[0][0]},${H} ` + pts.map(([x, y]) => `L${x},${y}`).join(" ") + ` L${pts[pts.length - 1][0]},${H} Z`
      : "";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={area} fill="url(#chartGrad)" />}
      {pts.length > 1 && (
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )}
    </svg>
  );
}

function DonutChart({ segments }: { segments: { label: string; pct: number; color: string }[] }) {
  const R = 36;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="h-20 w-20" aria-hidden="true">
      {segments.map((s) => {
        const dash = (s.pct / 100) * C;
        const gap = C - dash;
        const el = (
          <circle key={s.label} cx="50" cy="50" r={R} fill="none" stroke={s.color} strokeWidth="18"
            strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset} transform="rotate(-90 50 50)" />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

// ── Stat card ─────────────────────────────────────────────────────

function StatCard({
  label, value, delta, sub,
}: {
  label: string;
  value: string;
  delta?: number | null;
  sub?: string;
}) {
  const trendColor = !delta ? "text-neutral-400" : delta > 0 ? "text-emerald-600" : "text-red-500";
  const trendIcon = !delta ? null : delta > 0 ? "↑" : "↓";
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <div className="text-2xl font-bold text-neutral-900">{value}</div>
        {trendIcon && delta !== null && (
          <span className={`text-sm font-semibold ${trendColor}`}>
            {trendIcon} {Math.abs(delta)}%
          </span>
        )}
      </div>
      {sub && <div className="mt-0.5 text-xs text-neutral-400">{sub}</div>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 animate-pulse">
      <div className="h-3 w-24 rounded bg-neutral-200" />
      <div className="mt-3 h-7 w-20 rounded bg-neutral-200" />
    </div>
  );
}

// ── Date range picker ─────────────────────────────────────────────

type Preset = "7d" | "30d" | "90d" | "custom";

function DateRangePicker({
  from, to, onChange,
}: {
  from: Date;
  to: Date;
  onChange: (from: Date, to: Date) => void;
}) {
  const [preset, setPreset] = useState<Preset>("30d");
  const [customFrom, setCustomFrom] = useState(formatDate(from));
  const [customTo, setCustomTo] = useState(formatDate(to));

  function applyPreset(p: "7d" | "30d" | "90d") {
    const today = new Date();
    const days = p === "7d" ? 7 : p === "30d" ? 30 : 90;
    const newFrom = addDays(today, -days);
    setPreset(p);
    onChange(newFrom, today);
  }

  function applyCustom() {
    const f = new Date(customFrom);
    const t = new Date(customTo);
    if (!isNaN(f.getTime()) && !isNaN(t.getTime()) && f < t) {
      setPreset("custom");
      onChange(f, t);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center rounded-xl border border-neutral-200 bg-neutral-100 p-0.5">
        {(["7d", "30d", "90d"] as const).map((p) => (
          <button key={p} type="button" onClick={() => applyPreset(p)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${preset === p ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}>
            {p}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={customFrom}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs text-neutral-700 outline-none focus:border-sky-400"
        />
        <span className="text-xs text-neutral-400">→</span>
        <input
          type="date"
          value={customTo}
          onChange={(e) => setCustomTo(e.target.value)}
          className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs text-neutral-700 outline-none focus:border-sky-400"
        />
        <button
          type="button"
          onClick={applyCustom}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────

function AnalyticsDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const gameId = searchParams.get("game") ?? "";
  const gameName = searchParams.get("name") ?? "Untitled";
  const studio = searchParams.get("studio") ?? "";

  const today = new Date();
  const [from, setFrom] = useState(() => addDays(today, -30));
  const [to, setTo] = useState(() => today);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [sessions, setSessions] = useState<SessionsData | null>(null);
  const [hotspots, setHotspots] = useState<HotspotData | null>(null);
  const [devices, setDevices] = useState<DeviceData | null>(null);
  const [paths, setPaths] = useState<PathData | null>(null);
  const [exitCards, setExitCards] = useState<{ title: string; exits: number }[] | null>(null);
  const [searchTerms, setSearchTerms] = useState<{ query: string; count: number }[] | null>(null);
  const [peakUsage, setPeakUsage] = useState<{ hour: number; sessions: number }[] | null>(null);
  const [languages, setLanguages] = useState<{ code: string; switches: number }[] | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!gameId) return;
    const { from: f, to: t, compareFrom, compareTo } = getRangeParams(from, to);
    const base = `/api/analytics`;
    const qs = `gameId=${gameId}&from=${f}&to=${t}`;
    const overviewQs = `${qs}&compareFrom=${compareFrom}&compareTo=${compareTo}`;

    setOverview(null);
    setSessions(null);
    setHotspots(null);
    setDevices(null);
    setPaths(null);
    setExitCards(null);
    setSearchTerms(null);
    setPeakUsage(null);
    setLanguages(null);

    const [ov, sess, hot, dev, path, exit, search, peak, lang] = await Promise.allSettled([
      apiFetch(`${base}/overview?${overviewQs}`).then((r) => r.json()),
      apiFetch(`${base}/sessions?${qs}`).then((r) => r.json()),
      apiFetch(`${base}/hotspots?${qs}`).then((r) => r.json()),
      apiFetch(`${base}/devices?${qs}`).then((r) => r.json()),
      apiFetch(`${base}/paths?${qs}`).then((r) => r.json()),
      apiFetch(`${base}/exit-cards?${qs}`).then((r) => r.json()),
      apiFetch(`${base}/search-terms?${qs}`).then((r) => r.json()),
      apiFetch(`${base}/peak-usage?${qs}`).then((r) => r.json()),
      apiFetch(`${base}/languages?${qs}`).then((r) => r.json()),
    ]);

    if (ov.status === "fulfilled") setOverview(ov.value);
    if (sess.status === "fulfilled") setSessions(sess.value);
    if (hot.status === "fulfilled") setHotspots(hot.value);
    if (dev.status === "fulfilled") setDevices(dev.value);
    if (path.status === "fulfilled") setPaths(path.value);
    if (exit.status === "fulfilled") setExitCards(exit.value);
    if (search.status === "fulfilled") setSearchTerms(search.value);
    if (peak.status === "fulfilled") setPeakUsage(peak.value);
    if (lang.status === "fulfilled") setLanguages(lang.value);
  }, [gameId, from, to]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleExport() {
    setExporting(true);
    try {
      const f = formatDate(from);
      const t = formatDate(to);
      const res = await apiFetch(`/api/analytics/export?gameId=${gameId}&from=${f}&to=${t}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sherpa-analytics-${gameId}-${f}-${t}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const sessionCounts = sessions?.map((s) => s.sessions) ?? [];
  const totalSessions = sessionCounts.reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-white transition"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M8 2L3 6.5 8 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Editor
            </button>
            <div className="h-5 w-px bg-neutral-200" />
            <div>
              {studio && <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{studio}</div>}
              <div className="text-base font-semibold text-neutral-900">{gameName}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-50"
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {overview ? (
            <>
              <StatCard
                label="Sessions"
                value={overview.sessions.toLocaleString()}
                delta={overview.sessionsDelta}
                sub="vs prev period"
              />
              <StatCard
                label="Unique sessions"
                value={overview.sessions.toLocaleString()}
                sub="distinct page loads"
              />
              <StatCard
                label="Avg session"
                value={formatDuration(overview.avgDurationSeconds)}
                delta={overview.avgDurationDelta}
                sub="per visit"
              />
            </>
          ) : (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}
        </div>

        {/* Sessions over time */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-1 text-sm font-semibold text-neutral-900">Sessions over time</div>
          <div className="mb-4 text-xs text-neutral-400">
            {sessions ? `${totalSessions.toLocaleString()} total in range` : "Loading…"}
          </div>
          {sessions ? (
            <>
              <LineChart data={sessionCounts} color="#0ea5e9" />
              <div className="mt-2 flex justify-between text-[10px] text-neutral-300">
                <span>{sessions[0]?.date ?? ""}</span>
                <span>{sessions[sessions.length - 1]?.date ?? ""}</span>
              </div>
            </>
          ) : (
            <div className="h-20 animate-pulse rounded-xl bg-neutral-100" />
          )}
        </div>

        {/* Hotspot performance + Device breakdown */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="mb-1 text-sm font-semibold text-neutral-900">Hotspot performance</div>
            <div className="mb-4 text-xs text-neutral-400">Ranked by total clicks</div>
            {hotspots ? (
              <div className="space-y-3">
                {hotspots.map((h, i) => (
                  <div key={h.title}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 text-[11px] font-semibold text-neutral-300">#{i + 1}</span>
                        <span className="truncate text-sm font-medium text-neutral-800">{h.title}</span>
                      </div>
                      <div className="shrink-0 flex items-center gap-3 text-xs text-neutral-400">
                        <span className="font-semibold text-neutral-700">{h.clicks.toLocaleString()}</span>
                        <span>{formatDuration(h.avgDurationSeconds)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-neutral-100">
                      <div className="h-1.5 rounded-full bg-sky-400 transition-all" style={{ width: `${h.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 animate-pulse rounded-xl bg-neutral-100" />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="mb-1 text-sm font-semibold text-neutral-900">Device breakdown</div>
              <div className="mb-3 text-xs text-neutral-400">How players access the experience</div>
              {devices ? (
                <div className="flex items-center gap-5">
                  <DonutChart segments={devices} />
                  <div className="space-y-2">
                    {devices.map((d) => (
                      <div key={d.device} className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-neutral-600">{d.label}</span>
                        <span className="ml-auto pl-3 text-xs font-semibold text-neutral-800">{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-20 animate-pulse rounded-xl bg-neutral-100" />
              )}
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="mb-1 text-sm font-semibold text-neutral-900">Top navigation paths</div>
              <div className="mb-3 text-xs text-neutral-400">Most common 2-step journeys</div>
              {paths ? (
                <div className="space-y-2">
                  {paths.map((p) => (
                    <div key={p.path} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs text-neutral-700">{p.path}</div>
                        <div className="mt-1 h-1 w-full rounded-full bg-neutral-100">
                          <div className="h-1 rounded-full bg-violet-400" style={{ width: `${p.pct}%` }} />
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-neutral-500">{p.pct}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-6 animate-pulse rounded-lg bg-neutral-100" />)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense>
      <AnalyticsDashboard />
    </Suspense>
  );
}
```

- [ ] **Verify TypeScript:** `npx tsc --noEmit` — no errors.

- [ ] **Commit:**

```bash
git add app/analytics/page.tsx
git commit -m "feat: wire analytics dashboard to real PostHog data, add date range picker"
```

---

## Task 11 — Dashboard: four new panels

**Files:** Modify `app/analytics/page.tsx`

Add exit cards, search terms, peak usage, and language distribution panels. Insert them into the dashboard's `return` JSX after the hotspot/device row.

- [ ] **Add the four new panels** inside the `<div className="mx-auto max-w-6xl ...">` container, after the hotspot/device grid and before the closing `</div>`:

```tsx
        {/* Exit cards + Search terms */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="mb-1 text-sm font-semibold text-neutral-900">Exit cards</div>
            <div className="mb-4 text-xs text-neutral-400">
              Last card players viewed before leaving — high exits with short dwell time may indicate confusion
            </div>
            {exitCards ? (
              exitCards.length > 0 ? (
                <div className="space-y-3">
                  {exitCards.map((c, i) => (
                    <div key={c.title} className="flex items-center gap-3">
                      <span className="shrink-0 text-[11px] font-semibold text-neutral-300">#{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-neutral-800">{c.title}</span>
                      <span className="shrink-0 text-sm font-semibold text-neutral-700">{c.exits.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400">No data yet for this range.</p>
              )
            ) : (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-6 animate-pulse rounded-lg bg-neutral-100" />)}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="mb-1 text-sm font-semibold text-neutral-900">Search terms</div>
            <div className="mb-4 text-xs text-neutral-400">
              What players are searching for — high-frequency terms that don't match a hotspot name suggest a labelling gap
            </div>
            {searchTerms ? (
              searchTerms.length > 0 ? (
                <div className="space-y-2">
                  {searchTerms.map((s) => (
                    <div key={s.query} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate text-sm text-neutral-700">{s.query}</span>
                      <span className="shrink-0 text-xs font-semibold text-neutral-500">{s.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400">No search events recorded yet.</p>
              )
            ) : (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-6 animate-pulse rounded-lg bg-neutral-100" />)}
              </div>
            )}
          </div>
        </div>

        {/* Peak usage + Language distribution */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="mb-1 text-sm font-semibold text-neutral-900">Peak usage</div>
            <div className="mb-4 text-xs text-neutral-400">Sessions by hour of day (UTC)</div>
            {peakUsage ? (
              <div className="flex items-end gap-0.5 h-20">
                {peakUsage.map(({ hour, sessions: s }) => {
                  const max = Math.max(...peakUsage.map((p) => p.sessions), 1);
                  const height = Math.round((s / max) * 100);
                  return (
                    <div key={hour} className="group relative flex-1 flex flex-col items-center justify-end h-full">
                      <div
                        className="w-full rounded-sm bg-sky-400 transition-all"
                        style={{ height: `${height}%` }}
                      />
                      {hour % 6 === 0 && (
                        <div className="absolute -bottom-4 text-[9px] text-neutral-400">{hour}:00</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-20 animate-pulse rounded-xl bg-neutral-100" />
            )}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="mb-1 text-sm font-semibold text-neutral-900">Language distribution</div>
            <div className="mb-4 text-xs text-neutral-400">Language switches by players</div>
            {languages ? (
              languages.length > 0 ? (
                <div className="space-y-2">
                  {languages.map((l) => (
                    <div key={l.code} className="flex items-center gap-3">
                      <span className="w-10 shrink-0 text-xs font-semibold text-neutral-500 uppercase">{l.code}</span>
                      <div className="min-w-0 flex-1 h-2 rounded-full bg-neutral-100">
                        <div
                          className="h-2 rounded-full bg-indigo-400"
                          style={{
                            width: `${Math.round((l.switches / (languages[0]?.switches || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="shrink-0 text-xs text-neutral-500">{l.switches.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400">No language switches recorded yet.</p>
              )
            ) : (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-6 animate-pulse rounded-lg bg-neutral-100" />)}
              </div>
            )}
          </div>
        </div>
```

- [ ] **Verify TypeScript:** `npx tsc --noEmit` — no errors.

- [ ] **Commit:**

```bash
git add app/analytics/page.tsx
git commit -m "feat: add exit cards, search terms, peak usage, language panels to analytics dashboard"
```

---

## Task 12 — Version bump and patch notes

**Files:** Modify `app/_lib/authoring-utils.ts`, `app/_lib/patch-notes.ts`

- [ ] **Bump version** in `app/_lib/authoring-utils.ts`:

```ts
export const APP_VERSION = "v0.23.0";
```

- [ ] **Add patch notes entry** at the top of `PATCH_NOTES` in `app/_lib/patch-notes.ts`:

```ts
{
  version: "v0.23.0",
  date: "2026-04-14",
  changes: [
    "Analytics dashboard now shows real data — sessions, hotspot performance, device breakdown, navigation paths",
    "New panels: exit cards, search terms, peak usage by hour, language distribution",
    "Date range picker with period-over-period comparison on all stat cards",
    "Export any date range as a CSV from the analytics dashboard header",
  ],
},
```

- [ ] **Stage and commit:**

```bash
git add app/_lib/authoring-utils.ts app/_lib/patch-notes.ts
git commit -m "chore: bump to v0.23.0 — real analytics pipeline"
```

---

## Self-review

### Spec coverage

| Spec requirement | Task |
|---|---|
| PostHog initialized with `ip: false`, `disable_persistence: true`, `autocapture: false` | Task 1 |
| `game_viewed` event with `gameId`, `layoutMode` | Task 2 |
| `card_viewed`, `card_closed` with `durationSeconds`, `hotspot_clicked` | Task 3 |
| `language_changed` | Task 4 |
| PostHog HogQL query helper, server-side only | Task 5 |
| Analytics auth: owner OR team member | Task 5 |
| `overview` route with period deltas | Task 6 |
| `sessions` route | Task 6 |
| `hotspots` route | Task 7 |
| `exit-cards` route | Task 7 |
| `devices`, `languages`, `paths`, `search-terms`, `peak-usage` routes | Task 8 |
| `export` CSV route | Task 9 |
| Dashboard replaces mock data with API calls | Task 10 |
| Date range picker (presets + custom) with period-over-period comparison | Task 10 |
| Export CSV button in dashboard header | Task 10 |
| Four new panels: exit cards, search terms, peak usage, languages | Task 11 |
| Return rate removed | Task 10 (not present in new StatCard grid) |
| "Unique players" → "Unique sessions" | Task 10 |
| Version bump to v0.23.0 | Task 12 |

All requirements covered. ✓
