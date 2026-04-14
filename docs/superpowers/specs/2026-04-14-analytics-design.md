# Analytics — Design Spec

**Date:** 2026-04-14
**Status:** Approved for implementation

---

## Overview

The analytics dashboard UI already exists in `app/analytics/page.tsx` and is fully built — all charts, panels, and stat cards are production-ready. The only missing piece is the data pipeline. This spec covers wiring real data from PostHog into the existing dashboard, adding four new metric panels, replacing the date range toggle with a full date range picker with period-over-period comparison, and adding CSV export.

---

## Architecture

**Approach:** PostHog JS SDK in the player + Next.js API routes querying PostHog's HogQL Query API.

- The player view instruments events via `posthog-js`
- The analytics dashboard fetches from Next.js API routes that proxy PostHog's Query API
- PostHog's private API key stays server-side (`POSTHOG_API_KEY`) — never exposed to the client
- The public project key (`NEXT_PUBLIC_POSTHOG_KEY`) is used only for event capture in the player

**No cookies, no persistent identity, no consent banner required:**

PostHog is initialized with:
- `ip: false` — IP addresses not captured
- `disable_persistence: true` — no cookies or localStorage written; no cross-session identity
- `autocapture: false` — only explicit `posthog.capture()` calls are sent

This makes all analytics session-scoped and anonymous. "Unique players" is renamed "Unique sessions" in the dashboard to reflect this accurately.

---

## Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Client | PostHog project API key (write-only, safe to expose) |
| `POSTHOG_API_KEY` | Server only | PostHog personal/query API key (read, never expose) |
| `NEXT_PUBLIC_POSTHOG_HOST` | Client | PostHog host (e.g. `https://eu.posthog.com`) |
| `POSTHOG_PROJECT_ID` | Server only | PostHog numeric project ID for Query API URLs |

---

## Section 1: Event Instrumentation

`posthog-js` is initialized in `app/play/[gameId]/layout.tsx` via a new `PostHogProvider` component. Six events are captured in the player view:

| Event | Fired when | Properties |
|---|---|---|
| `game_viewed` | Game data loads successfully | `gameId`, `layoutMode` (`desktop` / `mobile-landscape` / `mobile-portrait`) |
| `card_viewed` | Player opens a hotspot/card | `gameId`, `cardId`, `cardTitle` |
| `card_closed` | Player closes a card | `gameId`, `cardId`, `durationSeconds` (time from `card_viewed` to `card_closed`) |
| `hotspot_clicked` | Hotspot pin tapped | `gameId`, `hotspotId`, `hotspotTitle` |
| `search_performed` | Search query submitted | `gameId`, `query` |
| `language_changed` | Language switcher used | `gameId`, `fromCode`, `toCode` |

**Files modified:**
- `app/play/[gameId]/layout.tsx` — add `<PostHogProvider>`
- NEW `app/_components/PostHogProvider.tsx` — initializes PostHog with anonymous config
- `app/play/[gameId]/page.tsx` — fire `game_viewed`
- `app/_components/player-view.tsx` (or relevant child components) — fire `card_viewed`, `card_closed`, `hotspot_clicked`, `search_performed`, `language_changed`

---

## Section 2: API Route Layer

Nine routes under `app/api/analytics/`. All routes:
- Require the requesting user to be authenticated (Supabase session check)
- Verify the authenticated user is a member of the requested `gameId` before querying PostHog (owners and collaborators both have access)
- Accept `gameId`, `from`, `to` (ISO date strings) as query parameters
- The `overview` route additionally accepts `compareFrom`, `compareTo` for period comparison

| Route | Returns |
|---|---|
| `GET /api/analytics/overview` | Sessions count, unique sessions, avg session duration — current period + previous period deltas |
| `GET /api/analytics/sessions` | `{ date: string, count: number }[]` — daily session counts |
| `GET /api/analytics/hotspots` | `{ title: string, clicks: number, avgDurationSeconds: number }[]` |
| `GET /api/analytics/exit-cards` | `{ title: string, exits: number }[]` — last card viewed before session end |
| `GET /api/analytics/devices` | `{ label: string, pct: number }[]` |
| `GET /api/analytics/paths` | `{ path: string, pct: number }[]` — top navigation sequences |
| `GET /api/analytics/search-terms` | `{ query: string, count: number }[]` |
| `GET /api/analytics/peak-usage` | `{ hour: number, count: number }[]` — 0–23 |
| `GET /api/analytics/languages` | `{ code: string, label: string, count: number }[]` |
| `GET /api/analytics/export` | CSV file download — raw events for selected range |

Each route constructs a HogQL query, POSTs to `https://{POSTHOG_HOST}/api/projects/{POSTHOG_PROJECT_ID}/query`, and returns the shaped result. Authorization failure returns 403. PostHog errors return 502.

---

## Section 3: Dashboard Refactor

**File modified:** `app/analytics/page.tsx`

### Data fetching

Mock data generators (`seeded`, `generateSessions`, `GAME_DATA`, `FALLBACK_DATA`) are removed. Each panel fetches from its API route via `useEffect` + `fetch` on mount and when the date range changes. Panels render a skeleton state while loading.

### Date range picker

The 7d/30d/90d toggle is replaced with:
- Three preset buttons: **7d**, **30d**, **90d**
- A **Custom** option that reveals two date inputs (from/to)
- The previous period is computed automatically: same duration, ending the day before `from`
- `compareFrom` and `compareTo` are derived from the selected range and passed to the `overview` route

### Stat cards

| Card | Value | Change |
|---|---|---|
| Sessions | Total sessions in range | % delta vs previous period (↑/↓) |
| Unique sessions | Distinct session IDs | % delta vs previous period |
| Avg session | Mean duration | % delta vs previous period |
| ~~Return rate~~ | Removed — requires persistent identity |

### New panels

**Exit cards** — horizontal bar chart ranked by exit count. Tells authors which card players leave from most — high exits with short dwell time signals a confusing card.

**Search terms** — ranked list of most common queries. The most actionable signal for authors: what are players failing to find via navigation?

**Peak usage** — bar chart of sessions by hour of day (0–23, UTC). Shows whether engagement is convention-heavy (weekend spikes) or casual home play (evening peaks).

**Language distribution** — horizontal bars showing which language codes are active across sessions. Helps authors prioritize translation work.

### Removed

- Mock data note at the bottom of the dashboard
- "Live data requires PostHog integration" notice in the header
- Return rate stat card

---

## Section 4: CSV Export

An **Export CSV** button in the dashboard header triggers a download of all raw events for the selected game and date range.

- Calls `GET /api/analytics/export?gameId=&from=&to=`
- Route queries PostHog for all events in range, shapes into CSV rows, returns with `Content-Disposition: attachment; filename="sherpa-analytics-{gameId}-{from}-{to}.csv"` header
- Same authorization check as other routes

**CSV columns:**

| Column | Notes |
|---|---|
| `timestamp` | ISO 8601 |
| `event` | Event name |
| `session_id` | Anonymous session identifier |
| `card_id` | Present for card/hotspot events |
| `card_title` | Human-readable card name |
| `query` | Present for `search_performed` events |
| `language_code` | Present for `language_changed` events |
| `device` | `desktop`, `mobile-landscape`, or `mobile-portrait` |

---

## Security

1. **Authorization** — every API route verifies the requesting user is authenticated via Supabase session and is a member of the `gameId` (owner or collaborator) before querying PostHog. Returns 403 otherwise.
2. **Key separation** — `NEXT_PUBLIC_POSTHOG_KEY` is write-only (event capture). `POSTHOG_API_KEY` is read-only (queries), server-side only, never in a `NEXT_PUBLIC_` variable.
3. **No persistent tracking** — `disable_persistence: true` and `ip: false` ensure no cookies are written and no IPs are stored. No consent banner required.

---

## Out of Scope

- Return rate (requires persistent user identity → requires consent banner)
- Cookie consent banner
- Per-game analytics enable/disable toggle
- PostHog session recordings
- Supabase event storage / webhook sync
- Real-time / streaming analytics
