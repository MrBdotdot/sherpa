# Published Game Discovery: Gallery Directory + Reading Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make published Sherpa games discoverable by search engines and AI answer engines by building a live gallery directory and per-game server-rendered reading pages at `/gallery/[id]`.

**Architecture:** The existing `/gallery` page switches from hardcoded data to a live Supabase query. A new `/gallery/[id]` Server Component renders each game as a readable document with full SEO metadata and JSON-LD structured data. The interactive player at `/play/[id]` is unchanged.

**Tech Stack:** Next.js Server Components, `supabaseAdmin` (service role, bypasses RLS), JSON-LD, Next.js `generateMetadata`, Tailwind CSS.

---

## Publishing model

- `publish_status = 'published'` → game appears in gallery automatically, reading page is live
- `publish_status = 'draft'` → not listed, shareable only via private invite link
- No separate opt-in toggle — publishing is the commitment to going public

---

## Data model changes

### `games` table

Add one column:

```sql
ALTER TABLE games ADD COLUMN featured boolean NOT NULL DEFAULT false;
```

No other schema changes needed. All new per-game metadata lives inside the existing `system_settings` JSONB column.

### `SystemSettings` type — new `gameMeta` field

```ts
// app/_lib/authoring-types.ts
gameMeta?: {
  tagline?: string;           // one-liner shown on gallery card and reading page
  designer?: string;          // defaults to user display name if blank
  playerCount?: string;       // e.g. "2–4"
  playTime?: string;          // e.g. "60–90 min"
  complexity?: "Light" | "Medium" | "Heavy";
  ageRange?: string;          // e.g. "13+"
  tags?: string[];            // e.g. ["strategy", "cooperative"]
  cardImage?: string;         // gallery thumbnail URL; falls back to home card heroImage
};
```

---

## Files to create / modify

| File | Action | What changes |
|------|--------|-------------|
| `app/_lib/authoring-types.ts` | Modify | Add `gameMeta?` to `SystemSettings` |
| `app/_lib/gallery-queries.ts` | **Create** | Server-side Supabase queries for gallery index and reading page |
| `app/gallery/page.tsx` | Modify | Replace `GALLERY_ENTRIES` with live Supabase query; add URL-param filtering |
| `app/gallery/[id]/page.tsx` | **Create** | Reading page Server Component |
| `app/gallery/[id]/layout.tsx` | **Create** | `generateMetadata` for OG + title + description |
| `app/_components/gallery/reading-page.tsx` | **Create** | Reading page UI: hero, TOC sidebar, card sections, CTA strip |
| `app/_components/gallery/block-renderer.tsx` | **Create** | Converts card `blocks` JSONB to semantic HTML |
| `app/_components/editor/experience-tab.tsx` | Modify | Add "Gallery listing" subsection with `gameMeta` fields |
| `app/_lib/gallery-data.ts` | Modify | Retire after seeding curated entries to database |
| `supabase/seed-gallery.sql` | **Create** | Seeds existing curated entries as real game records with `featured = true` |

---

## `gallery-queries.ts`

Two functions:

```ts
// Fetch all published games for gallery index
export async function fetchPublishedGames(opts?: {
  tag?: string;
  complexity?: "Light" | "Medium" | "Heavy";
  page?: number;
}): Promise<GalleryGameRow[]>

// Fetch single game + cards for reading page
export async function fetchPublishedGame(id: string): Promise<{
  game: GalleryGameRow;
  cards: CardRow[];
} | null>
```

Both use `supabaseAdmin` (service role, bypasses RLS) — safe because they only read `publish_status = 'published'` rows.

Gallery index query:
```ts
supabaseAdmin
  .from("games")
  .select("id, title, system_settings, featured, created_at")
  .eq("publish_status", "published")
  .order("featured", { ascending: false })
  .order("created_at", { ascending: false })
  .range(page * 60, page * 60 + 59)
```

Reading page query:
```ts
supabaseAdmin
  .from("games")
  .select("id, title, system_settings, user_id, created_at")
  .eq("id", id)
  .eq("publish_status", "published")
  .single()

supabaseAdmin
  .from("cards")
  .select("id, kind, title, summary, hero_image, blocks, card_size")
  .eq("game_id", id)
  .neq("kind", "home")
  .order("created_at", { ascending: true })
```

---

## Gallery index (`/gallery`)

### Data

Replace import of `GALLERY_ENTRIES` with `fetchPublishedGames(searchParams)`. The page receives `searchParams` from Next.js and passes `tag` and `complexity` to the query.

### Filtering

Filter chips push URL search params via a lightweight `"use client"` `GalleryFilters` component:
- Genre chips: All, Strategy, Cooperative, Thematic, Party (maps to `tags` array contains)
- Complexity chips: Light, Medium, Heavy (maps to `complexity` exact match)
- Active chip highlighted; clicking an active chip clears the filter
- No filter = show all

### Pagination

- Default limit: 60 per page
- "Load more" button appends `?page=N` to URL, server re-renders with next batch
- V1: simple pagination, not infinite scroll

### Card display

Same 3-column grid with featured card spanning 2 rows. Fields pulled from `system_settings.gameMeta`:
- Title (falls back to `games.title`)
- Tagline (shown if present; omitted if blank)
- Designer (shown if present)
- Player count, play time, complexity (shown as meta chips if present)
- Card image (from `gameMeta.cardImage`, falls back to home card `hero_image` if available, else solid accent color)

---

## Reading page (`/gallery/[id]`)

### `layout.tsx` — metadata

```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const result = await fetchPublishedGame(params.id);
  if (!result) return { title: "Not found" };

  const { game } = result;
  const meta = game.system_settings?.gameMeta ?? {};

  return {
    title: `${game.title} — Interactive Rulebook · Sherpa`,
    description: meta.tagline ?? `Interactive rulebook for ${game.title}.`,
    openGraph: {
      title: game.title,
      description: meta.tagline ?? `Interactive rulebook for ${game.title}.`,
      images: meta.cardImage ? [{ url: meta.cardImage }] : [],
      type: "article",
    },
  };
}
```

### `page.tsx` — Server Component

Fetches game + cards via `fetchPublishedGame`. Returns 404 if not found or not published. Passes data to `<ReadingPage>` client component and injects JSON-LD `<script>` block.

### JSON-LD shape

```json
{
  "@context": "https://schema.org",
  "@type": "Game",
  "name": "<game.title>",
  "description": "<gameMeta.tagline>",
  "numberOfPlayers": {
    "@type": "QuantitativeValue",
    "minValue": <parsed min>,
    "maxValue": <parsed max>
  },
  "typicalAgeRange": "<gameMeta.ageRange>",
  "author": { "@type": "Person", "name": "<gameMeta.designer>" },
  "mainEntity": {
    "@type": "HowTo",
    "name": "How to play <game.title>",
    "step": [
      {
        "@type": "HowToStep",
        "name": "<card.title>",
        "text": "<card.summary>"
      }
    ]
  }
}
```

### `reading-page.tsx` — UI layout

Structure (dark theme, matches gallery aesthetic):

```
Sticky top bar
  └─ Sherpa logo · "Create your rulebook →" CTA

Hero section (server-rendered)
  └─ Hero image (cardImage or accent color solid)
  └─ Game title (h1)
  └─ Meta chips: player count · play time · complexity · age range

"Open interactive board →" strip
  └─ Links to /play/[id]

Two-column body (max-w-5xl, 200px sidebar + 1fr main)
  Sidebar (sticky, top-16)
    └─ "Contents" label
    └─ Nav list: one link per card (card.title)

  Main content
    └─ One <article> per card
        ├─ Card number badge
        ├─ h2: card.title
        ├─ p.summary: card.summary
        └─ <BlockRenderer blocks={card.blocks} />

Footer
  └─ "Game title · Rulebook by Designer · Published with Sherpa"
  └─ "Create your own interactive rulebook →"
```

Active TOC item highlights as user scrolls (IntersectionObserver on each article).

---

## `block-renderer.tsx`

Converts `blocks` JSONB array to semantic HTML. Supported block types:

| Block type | HTML output |
|------------|-------------|
| `text` / `paragraph` | `<p>` |
| `heading` | `<h3>` or `<h4>` based on level |
| `bullet_list` | `<ul><li>` |
| `ordered_list` | `<ol><li>` |
| `image` | `<figure><img alt={caption}><figcaption>` |
| `divider` | `<hr>` |
| Unknown types | Skipped silently |

Rich text marks (bold, italic, code) rendered as `<strong>`, `<em>`, `<code>`.

---

## Experience tab — Gallery listing section

New `EditorSubsection` titled "Gallery listing" added to the Experience tab, below the Behavior section and above Languages:

Fields:
- **Tagline** — `InputField`, placeholder "One sentence about your game"
- **Designer** — `InputField`, placeholder "Your name or studio"
- **Players** — `InputField`, placeholder "2–4"
- **Play time** — `InputField`, placeholder "60–90 min"
- **Complexity** — `SelectField`: Light / Medium / Heavy
- **Age range** — `InputField`, placeholder "13+"
- **Tags** — comma-separated `InputField`, placeholder "strategy, cooperative"
- **Gallery image** — image upload (same pattern as game icon); defaults to home card hero

All fields call `onSystemSettingChange("gameMeta", { ...systemSettings.gameMeta, [field]: value })`.

---

## Curated entries seed (`supabase/seed-gallery.sql`)

The 6 existing entries in `gallery-data.ts` (Cascade, Ironveil, Solaseed, Switchback, Foundry 9, Papercut) get inserted as real game records owned by a dedicated `sherpa-curated@sherpa.so` service account, with `featured = true` for Ironveil.

After the seed is confirmed live, `gallery-data.ts` is deleted and its import in `gallery/page.tsx` is removed.

---

## Verification

1. **Gallery index**: Publish a test game → appears in `/gallery` within one page load. Unpublish → disappears.
2. **Filtering**: `?tag=strategy` shows only games with that tag. `?complexity=Heavy` filters correctly. Combining both works.
3. **Reading page**: `/gallery/[id]` renders game title, all cards as articles, TOC sidebar. No JS required for content to be visible.
4. **SEO**: `curl https://localhost:3000/gallery/[id]` returns full HTML with title, meta description, OG tags, and JSON-LD block — no JS needed.
5. **404**: Unpublished or nonexistent game returns 404 page.
6. **Interactive CTA**: "Open interactive board →" links correctly to `/play/[id]`.
7. **gameMeta fields**: Fill in fields in Experience tab → save → reload reading page → meta chips appear, JSON-LD reflects values.
8. **TypeScript**: `npx tsc --noEmit` — no new errors.
