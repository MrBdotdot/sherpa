# Canvas Heatmap Overlay — Design Spec

**Feature:** Heatmap tab on the analytics dashboard showing hotspot click density overlaid on the actual board image.

**Version target:** v0.23.1

---

## What it does

Adds a "Heatmap" tab to the analytics page. When active, it shows the game's board hero image with a circle overlay on each hotspot position. Circle size encodes relative click count; color encodes heat (blue → yellow → red). Hovering a circle reveals a tooltip with the hotspot's title, raw click count, share of total clicks, and average dwell time.

Hotspots that have no click data are shown as small dim grey circles so authors can identify hotspots that are being ignored.

---

## Where it lives

The analytics page (`app/analytics/page.tsx`) gains a tab switcher between "Overview" and "Heatmap", positioned below the existing header bar. The Overview tab renders the existing chart grid unchanged. The Heatmap tab renders the new board overlay.

---

## Data flow

### New API route: `GET /api/analytics/board`

**File:** `app/api/analytics/board/route.ts`

**Auth:** Same pattern as all other analytics routes — `getRequestUser` + `assertGameMember`.

**Query params:** `gameId` (UUID, required)

**Response:**
```ts
{
  heroImage: string;           // URL of the home page hero image
  hotspots: {
    id: string;
    title: string;
    x: number;                 // 0–100 percentage, left position on canvas
    y: number;                 // 0–100 percentage, top position on canvas
  }[];
}
```

**Supabase query:** Fetch all card rows for the game, filter to `kind !== "home"` for hotspot positions, read `x`, `y`, `title`, `id` columns. Read `hero_image` from the home page card (`kind === "home"`).

**No date range param** — hotspot positions are structural, not time-bounded.

### Analytics page state

New state added to `app/analytics/page.tsx`:

```ts
type BoardData = {
  heroImage: string;
  hotspots: { id: string; title: string; x: number; y: number }[];
};

const [activeTab, setActiveTab] = useState<"overview" | "heatmap">("overview");
const [boardData, setBoardData] = useState<BoardData | null>(null);
const boardFetchedRef = useRef(false);
```

Board data is fetched **lazily** — only when the Heatmap tab is first activated. Once fetched it is not re-fetched (the geometry doesn't change with date range). It does re-fetch if `gameId` changes.

```ts
function handleTabChange(tab: "overview" | "heatmap") {
  setActiveTab(tab);
  if (tab === "heatmap" && !boardFetchedRef.current && gameId) {
    boardFetchedRef.current = true;
    apiFetch(`/api/analytics/board?gameId=${gameId}`)
      .then((r) => r.json())
      .then(setBoardData);
  }
}
```

When `gameId` changes, reset board state so the next Heatmap tab activation fetches fresh data:

```ts
useEffect(() => {
  boardFetchedRef.current = false;
  setBoardData(null);
}, [gameId]);
```

### Client-side join

The `HeatmapOverlay` component receives both `boardData` and `hotspots` (the existing analytics data). It joins them by matching `boardData.hotspots[i].title === hotspots[j].title` (exact string match — same value captured by PostHog `hotspotTitle` property).

For each board hotspot, the component derives:
- `clicks` — from analytics data (0 if no match)
- `avgDurationSeconds` — from analytics data (0 if no match)
- `pctOfTotal` — `clicks / totalClicks * 100`, computed from the full hotspots array

---

## HeatmapOverlay component

**File:** `app/analytics/page.tsx` (co-located, not a separate file — it's analytics-only)

**Props:**
```ts
{
  boardData: BoardData;
  hotspots: HotspotData;   // existing analytics type
}
```

### Board container

Renders the hero image as a `position: relative` container with `aspect-video` (16:9). The image is `<img src={heroImage} className="w-full h-full object-cover" />` inside the container. All dots are `position: absolute` children of this same container, so percentage positions align with the image.

**Aspect ratio note:** Hotspot `x`/`y` values are percentages of whatever viewport the author used when placing the pins — typically close to 16:9 on a laptop, but not guaranteed. The heatmap is directional, not pixel-perfect: dots will be spatially close to the correct board element but may not sit exactly on top of it on non-16:9 boards.

### Dot rendering

For each hotspot in `boardData.hotspots`:

**Size:** Linearly interpolated from the hotspot's relative click share. Min diameter 14px (zero clicks), max diameter 56px (highest-click hotspot). Formula: `14 + (pctOfMax / 100) * 42` where `pctOfMax` is `clicks / maxClicks * 100` and `maxClicks = Math.max(...joinedHotspots.map(h => h.clicks), 1)`.

**Color:** Interpolated across three stops based on `pctOfMax`:
- 0–33%: blue (`#3b82f6`)
- 34–66%: yellow (`#eab308`)
- 67–100%: red (`#ef4444`)

**Zero-click hotspots:** diameter 14px, `rgba(156,163,175,0.5)` fill with `1.5px solid rgba(156,163,175,0.6)` border. Not included in the color scale.

**Position:** `position: absolute; left: ${x}%; top: ${y}%; transform: translate(-50%, -50%)`

**Hover state:** Tooltip rendered above the dot (flips below if near top edge). Contains:
- Hotspot title (bold)
- `${clicks} clicks · ${pctOfTotal}% of total · ${formatDuration(avgDurationSeconds)} avg`

Tooltip is implemented with local `hoveredId` state — no external library.

### Legend

Below the board container, inside the same white card:
- "Click density" label
- Three colour swatches: Low (blue) / Medium (yellow) / High (red)
- "No clicks" swatch (grey, right-aligned)

---

## Tab bar

Positioned in a `border-b border-neutral-200 bg-white` strip below the existing header. Two buttons: "Overview" and "Heatmap". Active tab has `border-b-2 border-neutral-900 font-semibold text-neutral-900`; inactive has `text-neutral-500`.

The date range picker and Export CSV button remain in the header and apply to both tabs. Board data does not re-fetch when the date range changes (positions are static); analytics hotspot data for the tooltip values does update with date range since `fetchAll` already handles that.

---

## Loading state

When the Heatmap tab is active and `boardData` is null (fetch in flight): show a single `rounded-2xl border border-neutral-200 bg-white` card with an `aspect-video` skeleton (`animate-pulse bg-neutral-100`).

---

## Versioning

- `APP_VERSION` bumped to `"v0.23.1"` in `app/_lib/authoring-utils.ts`
- Patch notes entry in `app/_lib/patch-notes.ts`: "Analytics: new Heatmap tab shows hotspot click density overlaid on the board image"

---

## Out of scope

- Clicking a dot does not navigate to the card or filter other charts
- No zoom or pan on the board image
- No temporal animation (not a time-lapse heatmap)
- No touch/mobile interaction on the analytics page (analytics is a desktop tool)
