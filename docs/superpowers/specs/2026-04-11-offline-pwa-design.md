# Offline / PWA Support — Design Spec

**Date:** 2026-04-11
**Status:** Approved for implementation

---

## Overview

Players and designers should be able to load a game once (at home, before a convention) and have it work fully offline at the table. The player app (`/play/[gameId]`) becomes a Progressive Web App: installable to the home screen and automatically cached on first visit.

The authoring interface stays online-only.

---

## Scope

**Cached automatically on first game load:**
- Play page HTML (app shell)
- Supabase game metadata + cards API responses
- All card images (hero images, block images, feature images) from Supabase Storage
- Stripe entitlement API response (branding preference)

**Not cached automatically:**
- 3D model files (GLB/GLTF) — opt-in only, with user acknowledgment of storage cost
- The authoring interface

**Installable:** The play route exposes a web app manifest so browsers offer "Add to Home Screen". A subtle banner nudges users who haven't installed yet.

---

## Architecture

### Service worker

A hand-authored service worker at `public/sw.js` uses Workbox runtime libraries. No Next.js PWA plugin — this avoids fragility with Next.js version changes. Workbox handles cache strategies, expiry, and versioning; we own the routing rules.

Registered by a client component (`ServiceWorkerRegistration`) mounted in the play route layout. Registration is scoped to `/play/` so the service worker does not intercept authoring interface requests.

### Web app manifest

`app/manifest.ts` — Next.js App Router manifest route. Defines app name, icons, theme color, `display: standalone`, and `start_url: /play`. Linked automatically by Next.js via the route.

### Caching strategies

| Resource | Strategy | TTL | Notes |
|---|---|---|---|
| Play page HTML | Network-first | 7 days | Serve fresh when online; cached when offline |
| Supabase REST API (game + cards) | Network-first | 7 days | Cache keyed on full URL including query params |
| Supabase Storage images | Cache-first | 30 days | Safe: new uploads get new URLs (timestamp in filename) |
| Stripe entitlement (`/api/stripe/entitlement`) | Network-first | 1 day | Falls back to cached branding pref if offline |
| 3D model files (opt-in) | Cache-first | 30 days | Only fetched if game has `cache3dModels: true` |

Cache names are versioned (e.g., `sherpa-images-v1`). On service worker activation, stale caches from prior versions are deleted.

### Image warming

After `loadGame()` resolves in the player, a `warmGameCache()` utility iterates all image URLs in the loaded cards (hero images, block images, canvas feature images) and fetches each into the Workbox image cache if not already present. When all fetches settle, the offline indicator fires.

### 3D model caching

`SystemSettings` gains an optional boolean field `cache3dModels` (default `false`). Since `SystemSettings` is stored as JSONB on the `games` table, no database migration is needed. When `cache3dModels: true`, the player's `warmGameCache()` also fetches `systemSettings.modelUrl` into the Workbox model cache.

The authoring interface shows a toggle in `overview-tab.tsx` directly beneath the existing `modelUrl` input, visible only when `backgroundType === "model-3d"`: *"Cache 3D model for offline."* The first time the toggle is enabled for a game, a one-time callout displays the estimated storage cost (derived from the model file's `Content-Length` response header, shown as "~X MB"). The toggle state is persisted via the existing `onSystemSettingChange("cache3dModels", value)` mechanism.

---

## UX Components

### OfflineBadge

A toast that appears at the bottom of the player after `warmGameCache()` completes.

- **Success:** *"Ready for offline"* + checkmark icon. Auto-dismisses after 3 seconds.
- **Failure (quota exceeded or fetch errors):** *"Offline unavailable"* + warning icon. Auto-dismisses after 3 seconds.
- On repeat visits where the cache is already warm, `warmGameCache()` detects all resources are cached and skips the toast entirely.

### InstallPrompt

A persistent banner at the bottom of the player, shown only when:
1. The browser fires `beforeinstallprompt` (app is installable), AND
2. The user has not previously installed or dismissed the prompt (checked via `localStorage`)

Banner text: *"Add to home screen for offline access"* with an **Install** button and a **×** dismiss. Tapping Install triggers the deferred native browser install prompt. On install or dismiss, the banner is hidden and the `localStorage` flag is set so it never reappears.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `public/sw.js` | Create | Workbox service worker — routing rules, cache strategies |
| `app/manifest.ts` | Create | Web app manifest for installability |
| `app/play/[gameId]/layout.tsx` | Create | Mount `ServiceWorkerRegistration`, scopes SW to play route |
| `app/_components/ServiceWorkerRegistration.tsx` | Create | Client component — registers SW, scoped to `/play/` |
| `app/play/[gameId]/_components/OfflineBadge.tsx` | Create | "Ready for offline" toast |
| `app/play/[gameId]/_components/InstallPrompt.tsx` | Create | "Add to Home Screen" banner |
| `app/_lib/warm-game-cache.ts` | Create | Iterates card image URLs, fetches into Workbox cache, returns success/fail |
| `app/play/[gameId]/page.tsx` | Modify | Call `warmGameCache()` after `loadGame()`, pass result to `OfflineBadge` |
| `app/_lib/authoring-types.ts` | Modify | Add `cache3dModels?: boolean` to `SystemSettings` (stored in JSONB — no DB migration needed) |
| `app/_components/editor/overview-tab.tsx` | Modify | Add 3D cache toggle beneath the existing `modelUrl` input, with one-time storage callout |
| `package.json` | Modify | Add `workbox-window`, `workbox-routing`, `workbox-strategies`, `workbox-expiration`, `workbox-cacheable-response` |

---

## Edge Cases

| Case | Handling |
|---|---|
| Storage quota exceeded during image warm | Catch error, show "Offline unavailable" toast, continue — partial cache is better than nothing |
| Game updated after caching (card content changed) | Network-first for API data means fresh content loads when online; cache updates automatically |
| Image URL updated (designer re-uploads image) | New upload gets a new URL, so new URL is fetched and cached fresh; old URL expires after 30 days |
| 3D model file very large | File size shown in toggle callout so user can make an informed choice |
| User visits play URL while already offline (first visit) | Loading spinner, then standard Supabase/network error — no special handling needed beyond what exists today |
| Service worker update available | Workbox `skipWaiting` + `clientsClaim` ensures new SW activates on next navigation |
| Browser doesn't support service workers | `ServiceWorkerRegistration` checks for support before registering; app works normally without offline |

---

## What Does Not Change

- The authoring interface — online only, no service worker intercept
- Card data model (blocks, features) — no changes except adding `cache3dModels` to the game record
- The play route's loading and rendering logic — `warmGameCache()` runs after load, does not block render
- Supabase Storage — no changes to how images are stored or served
