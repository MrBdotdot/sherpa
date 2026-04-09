# SSR Play Route & Subdomain Routing — Design Spec

**Date:** 2026-04-08
**Status:** Approved

## Context

The `/play/[gameId]` route is fully client-rendered — players see a blank page with a spinner while JavaScript loads and Supabase is fetched client-side. There is no readable URL structure; game links are raw UUIDs. This spec converts the play route to server-side rendering (eliminating the spinner), adds subdomain-based routing (`wingspan.sherpa.build`), and gives publishers a editable, human-readable game URL they control.

## Scope

- Register `sherpa.build` domain via Cloudflare Registrar
- Wildcard DNS + Vercel connection for `*.sherpa.build`
- `slug` field on `games` table
- Next.js middleware for subdomain → gameId resolution
- Convert play route to async Server Component (SSR)
- Slug management UI in Experience tab with confirmation modal for slug changes
- Fallback: `/play/[gameId]` continues to work for draft previews and internal links

**Out of scope:** Old slug redirects (not built — warning modal makes consequences clear), gallery/landing page at `sherpa.build` apex (future), per-publisher custom domains (future).

## Domains

| Domain | Purpose |
|--------|---------|
| `sherpa.app` | Authoring studio (publishers) |
| `sherpa.build` | Player-facing experiences |

Both registered via Cloudflare Registrar. `sherpa.build` is new (~$10/year).

## DNS — Cloudflare (`sherpa.build` zone)

| Type | Name | Value | Proxied |
|------|------|-------|---------|
| CNAME | `*` | `cname.vercel-dns.com` | Yes |
| CNAME | `sherpa.build` (apex) | `cname.vercel-dns.com` | Yes |

Wildcard covers all game subdomains. Apex points to Vercel for future landing/gallery use.

## Vercel configuration

Add `*.sherpa.build` as a wildcard custom domain in the Vercel project dashboard. Vercel supports wildcard domains on Pro plan.

## Database — `slug` field

```sql
ALTER TABLE games ADD COLUMN slug text UNIQUE;
CREATE INDEX games_slug_idx ON games (slug);
```

- `text UNIQUE` — enforced at database level, no two games share a slug
- Nullable — games without a slug fall back to `/play/[gameId]`
- Max length: 60 characters (enforced client-side)
- Format: lowercase letters, numbers, hyphens only — no spaces, no special characters

### Slug generation

Auto-generated from title on game creation:
```ts
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")   // strip special chars
    .trim()
    .replace(/\s+/g, "-")            // spaces → hyphens
    .replace(/-+/g, "-")             // collapse multiple hyphens
    .slice(0, 60);
}
```

Generated slug is a suggestion — publisher must confirm or edit before it's saved. Null until confirmed.

## Middleware — `middleware.ts`

Intercepts all requests to `*.sherpa.build`. Runs at the edge before any page renders.

```ts
export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const isSherpaBuild = hostname.endsWith(".sherpa.build");
  if (!isSherpaBuild) return NextResponse.next();

  const slug = hostname.replace(".sherpa.build", "");
  // Rewrite to /play/by-slug/[slug] — server component resolves slug → gameId
  return NextResponse.rewrite(new URL(`/play/by-slug/${slug}`, request.url));
}

export const config = {
  matcher: ["/((?!api|_next|_static|favicon).*)"],
};
```

A new route `app/play/by-slug/[slug]/page.tsx` resolves the slug to a gameId via Supabase, then renders the same `PlayerView` as the existing play route.

## Play route — SSR conversion

### `app/play/[gameId]/page.tsx`

Remove `"use client"`. Convert to async Server Component:

```ts
// Before: useEffect + useState + client fetch
// After:
export default async function PlayPage({ params }: { params: { gameId: string } }) {
  const data = await loadGame(params.gameId, { publishedOnly: true });
  if (!data) return <NotFoundScreen />;
  return <PlayerView pages={data.pages} systemSettings={data.systemSettings} />;
}
```

`loadGame()` called server-side using the anon key — respects RLS, only returns published games.

### `app/play/by-slug/[slug]/page.tsx`

New route. Resolves slug → gameId, then delegates to same render logic:

```ts
export default async function PlayBySlugPage({ params }: { params: { slug: string } }) {
  const gameId = await resolveSlug(params.slug); // SELECT id FROM games WHERE slug = $1
  if (!gameId) return <NotFoundScreen />;
  const data = await loadGame(gameId, { publishedOnly: true });
  if (!data) return <NotFoundScreen />;
  return <PlayerView pages={data.pages} systemSettings={data.systemSettings} />;
}
```

### `PlayerView` — client boundary

`PlayerView` remains `"use client"` — it handles all interactivity (hotspot clicks, modal opens, carousel navigation). It receives fully-loaded data as props from the server component above. No data fetching inside `PlayerView`.

### Not-found screen

Branded 404 for `sherpa.build` — dark background, Sherpa logo, "This experience wasn't found or hasn't been published yet", link to `sherpa.app/gallery`.

## Slug management UI

### Experience tab — Game URL field

New field below the game title section:

```
Game URL
[wingspan-european-expansion        ] .sherpa.build  [Edit]
```

- Shows current slug or "Not set — your game uses a private link" if null
- Edit button opens inline slug editor with real-time format validation
- On blur: unique check via Supabase (`SELECT id FROM games WHERE slug = $1 AND id != $2`)
- Inline error if taken: "This URL is already taken"
- Inline error if invalid format: "Only lowercase letters, numbers, and hyphens"
- Save button commits slug to database

### Slug change confirmation modal

Triggered when a publisher edits a slug on a game that has previously been published (`publish_status = 'published'` on home card). Not shown for games that have never been published.

**Modal content:**
- Red warning banner: "Changing your game URL will break existing links permanently"
- Consequence list:
  - QR codes printed on boxes or inserts will stop working
  - Shared links (social media, email, retailer sites) will stop working
  - Player bookmarks will stop working
  - This cannot be undone
- Confirmation input: "Type the new URL to confirm" — must match the new slug exactly before the confirm button activates
- Buttons: "Cancel" (primary, blue) · "Change URL permanently" (destructive, red, only active when input matches)

## Supabase helper — `resolveSlug()`

New function in `supabase-game.ts`:

```ts
export async function resolveSlug(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from("games")
    .select("id")
    .eq("slug", slug)
    .single();
  return data?.id ?? null;
}
```

## Files changed

| File | Change |
|------|--------|
| `middleware.ts` | New — subdomain rewrite logic |
| `app/play/[gameId]/page.tsx` | Convert to async Server Component |
| `app/play/by-slug/[slug]/page.tsx` | New — slug resolution route |
| `app/_components/player-view.tsx` | Remove internal data fetching, accept full data as props |
| `app/_components/editor/experience-tab.tsx` | Add Game URL field + slug editor |
| `app/_components/slug-change-modal.tsx` | New — confirmation modal with typed confirmation |
| `app/_lib/supabase-game.ts` | Add `resolveSlug()` function |
| `app/_lib/authoring-types.ts` | Add `slug?: string` to game/system settings types |
| `app/_lib/authoring-utils.ts` | Add `generateSlug()` utility |
| Supabase dashboard | Run `ALTER TABLE games ADD COLUMN slug text UNIQUE` |
| Cloudflare dashboard | Register `sherpa.build`, add wildcard DNS |
| Vercel dashboard | Add `*.sherpa.build` wildcard custom domain |

## Edge cases

| Case | Handling |
|------|---------|
| Slug not found | Branded 404 page on `sherpa.build` |
| Game exists but not published | 404 — same as not found (anon key + RLS returns nothing) |
| Slug conflict on save | Inline error, save blocked until slug is unique |
| Game has no slug | Falls back to `sherpa.app/play/[gameId]` — shown in studio as "private link" |
| Publisher changes slug, game never published | No confirmation modal — nothing to break |
| Publisher changes slug, game was published | Full confirmation modal with typed confirmation required |
| `/play/[gameId]` accessed directly | Still works — used for draft preview and internal studio links |
| `sherpa.build` apex (no subdomain) | Passes through to Vercel — gallery/landing page placeholder |

## Verification

1. Visit `wingspan.sherpa.build` — confirm game loads with no spinner, correct content
2. Visit `sherpa.app/play/[gameId]` — confirm fallback still works
3. Visit `unknown-slug.sherpa.build` — confirm branded 404 shown
4. Edit slug in Experience tab — confirm format validation and uniqueness check work
5. Change slug on a published game — confirm confirmation modal appears, typed confirmation required
6. Change slug on an unpublished game — confirm no modal, change saves immediately
7. After slug change — confirm old URL returns 404, new URL works
8. Check Cloudflare — confirm wildcard DNS resolving correctly
9. Confirm `PlayerView` receives data as props with no client-side loading state
