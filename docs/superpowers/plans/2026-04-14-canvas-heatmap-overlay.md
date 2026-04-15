# Canvas Heatmap Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Heatmap" tab to the analytics dashboard that shows the game's board image with sized, color-coded dots on each hotspot position encoding click density.

**Architecture:** A new `GET /api/analytics/board` route fetches the home page hero image and hotspot positions from Supabase. The analytics page (`app/analytics/page.tsx`) gains tab state and a lazy board-data fetch triggered on first Heatmap tab activation. A `HeatmapOverlay` component co-located in the analytics page renders the board with absolute-positioned dots and hover tooltips.

**Tech Stack:** Next.js App Router (client component), Supabase (postgres via `supabaseAdmin`), React hooks, Tailwind CSS. No new dependencies.

---

## File structure

| File | Change | Responsibility |
|------|--------|---------------|
| `app/api/analytics/board/route.ts` | Create | Supabase query — returns `{ heroImage, hotspots[] }` |
| `app/analytics/page.tsx` | Modify | Tab state, board fetch, tab bar UI, `HeatmapOverlay` component |
| `app/_lib/authoring-utils.ts` | Modify | Bump `APP_VERSION` to `"v0.23.1"` |
| `app/_lib/patch-notes.ts` | Modify | Add v0.23.1 entry |

---

## Task 1: `/api/analytics/board` route

**Files:**
- Create: `app/api/analytics/board/route.ts`

This route follows the exact same auth pattern as every other analytics route in `app/api/analytics/*/route.ts`: `getRequestUser` → `assertGameMember` → query → respond.

The Supabase query selects only the columns needed (`id, title, kind, x, y, hero_image`) from `cards` where `game_id = gameId`. The home card (`kind === "home"`) supplies `hero_image`. All other cards supply the hotspot list.

- [ ] **Step 1: Create the route file**

```ts
// app/api/analytics/board/route.ts
import { getRequestUser } from "@/app/_lib/api-auth";
import { assertGameMember } from "@/app/_lib/analytics-auth";
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { isValidUUID } from "@/app/_lib/analytics-params";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  if (!gameId) return Response.json({ error: "Missing gameId" }, { status: 400 });
  if (!isValidUUID(gameId)) return Response.json({ error: "Invalid gameId" }, { status: 400 });

  const isMember = await assertGameMember(gameId, user.id);
  if (!isMember) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { data: cards, error } = await supabaseAdmin
    .from("cards")
    .select("id, title, kind, x, y, hero_image")
    .eq("game_id", gameId);

  if (error || !cards) {
    return Response.json({ error: "Failed to load board" }, { status: 500 });
  }

  const homeCard = cards.find((c) => c.kind === "home");
  const hotspots = cards
    .filter((c) => c.kind !== "home")
    .map((c) => ({ id: c.id as string, title: c.title as string, x: (c.x as number) ?? 50, y: (c.y as number) ?? 50 }));

  return Response.json({
    heroImage: (homeCard?.hero_image as string) ?? "",
    hotspots,
  });
}
```

- [ ] **Step 2: Verify types**

```bash
cd C:/Users/Bee/authoring-interface && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manually test the route**

With the dev server running, open a browser and navigate to:
```
http://localhost:3000/api/analytics/board?gameId=<a-real-game-id>
```
(Copy a game ID from the URL bar while in the editor.)

Expected: JSON with `heroImage` (a storage URL string) and `hotspots` array (each with `id`, `title`, `x`, `y` numbers).

- [ ] **Step 4: Commit**

```bash
git add app/api/analytics/board/route.ts
git commit -m "feat: add /api/analytics/board route for heatmap board data"
```

---

## Task 2: Tab state + board fetch in analytics page

**Files:**
- Modify: `app/analytics/page.tsx`

The `AnalyticsDashboard` function (line ~221) already has many `useState` and `useEffect` declarations. Add:
1. A `BoardData` type near the other types at the top of the file (lines 7–27)
2. Three new pieces of state/ref inside `AnalyticsDashboard`
3. A `useEffect` to reset board state when `gameId` changes
4. A `handleTabChange` function

`useRef` is not currently imported — add it to the React import at line 3.

- [ ] **Step 1: Add the `BoardData` type**

In `app/analytics/page.tsx`, find the type block near line 7. After the `PathData` type definition, add:

```ts
type BoardData = {
  heroImage: string;
  hotspots: { id: string; title: string; x: number; y: number }[];
};
```

- [ ] **Step 2: Add `useRef` to the React import**

Change line 3 from:
```ts
import { Suspense, useCallback, useEffect, useState } from "react";
```
to:
```ts
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
```

- [ ] **Step 3: Add state and the board reset effect inside `AnalyticsDashboard`**

Inside `AnalyticsDashboard`, after the existing `const [exporting, setExporting] = useState(false);` line (~line 242), add:

```ts
const [activeTab, setActiveTab] = useState<"overview" | "heatmap">("overview");
const [boardData, setBoardData] = useState<BoardData | null>(null);
const boardFetchedRef = useRef(false);

// Reset board cache when the game changes
useEffect(() => {
  boardFetchedRef.current = false;
  setBoardData(null);
}, [gameId]);
```

- [ ] **Step 4: Add `handleTabChange` inside `AnalyticsDashboard`**

After the `handleExport` function (~line 286), add:

```ts
function handleTabChange(tab: "overview" | "heatmap") {
  setActiveTab(tab);
  if (tab === "heatmap" && !boardFetchedRef.current && gameId) {
    boardFetchedRef.current = true;
    apiFetch(`/api/analytics/board?gameId=${gameId}`)
      .then((r) => r.json())
      .then(setBoardData)
      .catch(() => {
        // boardData stays null — the overlay shows its empty state
      });
  }
}
```

- [ ] **Step 5: Verify types**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/analytics/page.tsx
git commit -m "feat: add tab state and board fetch logic to analytics page"
```

---

## Task 3: Tab bar UI

**Files:**
- Modify: `app/analytics/page.tsx`

The tab bar goes between the closing `</div>` of the header block and the opening `<div className="mx-auto max-w-6xl px-6 py-8 space-y-6">` of the chart grid (around line 343–345).

The existing chart-grid `<div className="mx-auto max-w-6xl px-6 py-8 space-y-6">` (and everything inside it, ending at line ~592) must be wrapped in `{activeTab === "overview" && (...)}`. The heatmap content renders after it when `activeTab === "heatmap"`.

- [ ] **Step 1: Insert the tab bar**

In `app/analytics/page.tsx`, find the end of the header block. It ends with a `</div>` just before:
```tsx
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
```

Insert the tab bar between those two elements:

```tsx
      {/* Tab bar */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex">
            {(["overview", "heatmap"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)}
                className={`px-4 py-3 text-sm font-medium capitalize transition border-b-2 ${
                  activeTab === tab
                    ? "border-neutral-900 text-neutral-900 font-semibold"
                    : "border-transparent text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>
```

- [ ] **Step 2: Wrap the chart grid in the Overview tab condition**

Wrap the `<div className="mx-auto max-w-6xl px-6 py-8 space-y-6">` block (and its entire contents, ending at `</div>` before the closing `</div>` of the outer wrapper) like this:

```tsx
      {activeTab === "overview" && (
        <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
          {/* ... all existing chart content unchanged ... */}
        </div>
      )}
      {activeTab === "heatmap" && (
        <HeatmapOverlay boardData={boardData} hotspots={hotspots} />
      )}
```

`HeatmapOverlay` is defined in Task 4 — TypeScript will error until then, so verify types after Task 4.

- [ ] **Step 3: Manually verify the tab bar renders**

Open the analytics page in a browser. Confirm:
- "Overview" and "Heatmap" tabs appear below the header
- "Overview" tab is underlined by default
- Clicking "Heatmap" switches the underline (charts disappear, placeholder until Task 4)
- Clicking back to "Overview" shows the charts again

- [ ] **Step 4: Commit**

```bash
git add app/analytics/page.tsx
git commit -m "feat: add tab bar UI to analytics page"
```

---

## Task 4: `HeatmapOverlay` component

**Files:**
- Modify: `app/analytics/page.tsx`

Add the `HeatmapOverlay` component above the `AnalyticsDashboard` function (before line ~221). It is co-located in `page.tsx` because it is analytics-page-specific and uses the `HotspotData`, `BoardData`, and `formatDuration` identifiers already defined there.

**Join logic:** For each board hotspot, find the matching analytics entry by `title`. Compute `pctOfTotal` from the full analytics set. `pctOfMax` is clicks relative to the hotspot with most clicks (controls dot size and color).

**Dot sizing:** `diameter = clicks > 0 ? Math.round(14 + (pctOfMax / 100) * 42) : 14` — range 14–56px.

**Color:** `pctOfMax < 34` → blue `#3b82f6`; `< 67` → yellow `#eab308`; `≥ 67` → red `#ef4444`. Zero-click hotspots: grey `rgba(156,163,175,0.5)` with grey border.

- [ ] **Step 1: Add the `dotColor` helper and `HeatmapOverlay` component**

Insert the following above the `AnalyticsDashboard` function in `app/analytics/page.tsx`:

```tsx
// ── Heatmap ───────────────────────────────────────────────────────

function dotColor(pctOfMax: number): string {
  if (pctOfMax < 34) return "#3b82f6";
  if (pctOfMax < 67) return "#eab308";
  return "#ef4444";
}

function HeatmapOverlay({
  boardData,
  hotspots,
}: {
  boardData: BoardData | null;
  hotspots: HotspotData | null;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!boardData) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="aspect-video w-full animate-pulse bg-neutral-100" />
          <div className="h-12 border-t border-neutral-100" />
        </div>
      </div>
    );
  }

  const analyticsRows = hotspots ?? [];
  const totalClicks = analyticsRows.reduce((sum, h) => sum + h.clicks, 0);
  const maxClicks = Math.max(...analyticsRows.map((h) => h.clicks), 1);

  const joined = boardData.hotspots.map((bh) => {
    const analytics = analyticsRows.find((h) => h.title === bh.title);
    const clicks = analytics?.clicks ?? 0;
    const avgDurationSeconds = analytics?.avgDurationSeconds ?? 0;
    const pctOfTotal = totalClicks > 0 ? Math.round((clicks / totalClicks) * 100) : 0;
    const pctOfMax = Math.round((clicks / maxClicks) * 100);
    return { ...bh, clicks, avgDurationSeconds, pctOfTotal, pctOfMax };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {/* Board */}
        <div className="relative aspect-video w-full bg-neutral-900">
          {boardData.heroImage && (
            <img
              src={boardData.heroImage}
              alt="Board"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {joined.map((h) => {
            const isZero = h.clicks === 0;
            const diameter = isZero ? 14 : Math.round(14 + (h.pctOfMax / 100) * 42);
            const color = isZero ? "rgba(156,163,175,0.5)" : dotColor(h.pctOfMax);
            const isHovered = hoveredId === h.id;
            return (
              <div
                key={h.id}
                className="absolute"
                style={{ left: `${h.x}%`, top: `${h.y}%`, transform: "translate(-50%, -50%)" }}
                onMouseEnter={() => setHoveredId(h.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div
                  className="rounded-full transition-all"
                  style={{
                    width: diameter,
                    height: diameter,
                    background: color,
                    border: isZero ? "1.5px solid rgba(156,163,175,0.6)" : "none",
                    boxShadow: !isZero && isHovered ? `0 0 0 3px ${color}40` : "none",
                    opacity: isZero ? 1 : 0.85,
                  }}
                />
                {isHovered && (
                  <div
                    className="pointer-events-none absolute z-20 whitespace-nowrap rounded-xl border border-neutral-100 bg-white px-3 py-2 shadow-xl"
                    style={{
                      bottom: "calc(100% + 8px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                  >
                    <div className="text-xs font-semibold text-neutral-900">{h.title}</div>
                    <div className="mt-0.5 text-[11px] text-neutral-500">
                      {h.clicks.toLocaleString()} clicks
                      {totalClicks > 0 && ` · ${h.pctOfTotal}% of total`}
                      {h.avgDurationSeconds > 0 && ` · ${formatDuration(h.avgDurationSeconds)} avg`}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 border-t border-neutral-100 px-5 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-neutral-400">
            Click density
          </span>
          {([
            { color: "#3b82f6", label: "Low" },
            { color: "#eab308", label: "Medium" },
            { color: "#ef4444", label: "High" },
          ] as const).map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, opacity: 0.85 }} />
              <span className="text-[10px] text-neutral-500">{label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: "rgba(156,163,175,0.5)", border: "1px solid rgba(156,163,175,0.6)" }}
            />
            <span className="text-[10px] text-neutral-500">No clicks</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manually test the heatmap**

Open the analytics page. Click "Heatmap" tab. Confirm:
- Loading skeleton visible while board data loads
- Board image appears once loaded
- Coloured dots sit roughly on hotspot positions
- Hovering a dot shows the tooltip (title, click count, % of total, avg dwell time)
- Zero-click hotspots show as small grey dots
- Legend row visible at the bottom
- Switching back to Overview and then to Heatmap again does NOT re-fetch (skeleton should not flash — board data is cached)

- [ ] **Step 4: Commit**

```bash
git add app/analytics/page.tsx
git commit -m "feat: add HeatmapOverlay component to analytics page"
```

---

## Task 5: Version bump + patch notes

**Files:**
- Modify: `app/_lib/authoring-utils.ts` (line 16)
- Modify: `app/_lib/patch-notes.ts`

- [ ] **Step 1: Bump `APP_VERSION`**

In `app/_lib/authoring-utils.ts`, change:
```ts
export const APP_VERSION = "v0.23.0";
```
to:
```ts
export const APP_VERSION = "v0.23.1";
```

- [ ] **Step 2: Add patch notes entry**

In `app/_lib/patch-notes.ts`, insert a new entry as the first element of `PATCH_NOTES`:

```ts
  {
    version: "v0.23.1",
    date: "2026-04-14",
    changes: [
      "Analytics: new Heatmap tab shows hotspot click density overlaid on the board image",
    ],
  },
```

- [ ] **Step 3: Verify types and commit**

```bash
npx tsc --noEmit
git add app/_lib/authoring-utils.ts app/_lib/patch-notes.ts
git commit -m "chore: bump version to v0.23.1"
```
