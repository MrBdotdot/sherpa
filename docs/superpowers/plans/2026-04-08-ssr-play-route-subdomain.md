# SSR Play Route & Subdomain Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the player-facing play route to a server-side rendered async Server Component and add human-readable subdomain routing (`wingspan.sherpa.build`) with a slug management UI in the Experience tab.

**Architecture:** A new `middleware.ts` at the project root intercepts `*.sherpa.build` requests at the edge and rewrites them to a new `app/play/by-slug/[slug]/page.tsx` route, which calls `resolveSlug()` then `loadGame()` server-side; the existing `app/play/[gameId]/page.tsx` is simultaneously converted from a client component to an async Server Component that also calls `loadGame()` server-side, eliminating the loading spinner for both entry points. `PlayerView` remains a `"use client"` component but becomes purely presentational — all data arrives as props from the server layer above it.

**Tech Stack:** Next.js async Server Components, Next.js Middleware (Edge Runtime), Supabase Postgres (slug column + index), React 19 client components, Tailwind CSS

---

## Task 1: Database — add slug column

**Files:**
- Create: `supabase/add-slug.sql`

- [ ] Step 1: Create the SQL migration file:
  ```sql
  -- Add slug field to games table
  -- Run in Supabase Dashboard → SQL Editor

  ALTER TABLE games ADD COLUMN IF NOT EXISTS slug text UNIQUE;
  CREATE INDEX IF NOT EXISTS games_slug_idx ON games (slug);
  ```

- [ ] Step 2: Run the SQL in the Supabase Dashboard SQL Editor. Verify: `SELECT column_name FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'slug';` returns one row.

- [ ] Step 3: Commit: `git add supabase/add-slug.sql && git commit -m "db: add slug column and index to games table"`

---

## Task 2: Types — add slug to SystemSettings and game row

**Files:**
- Modify: `app/_lib/authoring-types.ts`

- [ ] Step 1: Read `app/_lib/authoring-types.ts`. Locate the `SystemSettings` type (line 165). `slug` is a game-level field, not a per-system-setting; add a standalone `GameMeta` type and also add `slug` directly to `SystemSettings` for convenient access in the UI:

  In `authoring-types.ts`, add `slug?: string;` as the last property inside the `SystemSettings` type, before the closing `}`:
  ```ts
    /** Human-readable URL slug — e.g. "wingspan" resolves to wingspan.sherpa.build */
    slug?: string;
  ```

- [ ] Step 2: Run `npm run build` — Expected: clean build with no type errors.

- [ ] Step 3: Commit: `git add app/_lib/authoring-types.ts && git commit -m "types: add slug field to SystemSettings"`

---

## Task 3: Utility — add generateSlug() to authoring-utils.ts

**Files:**
- Modify: `app/_lib/authoring-utils.ts`

- [ ] Step 1: Read `app/_lib/authoring-utils.ts`. After the `APP_VERSION` export line, add `generateSlug`:
  ```ts
  export function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")   // strip special chars
      .trim()
      .replace(/\s+/g, "-")            // spaces → hyphens
      .replace(/-+/g, "-")             // collapse multiple hyphens
      .slice(0, 60);
  }
  ```

- [ ] Step 2: Run `npm run build` — Expected: clean build.

- [ ] Step 3: Commit: `git add app/_lib/authoring-utils.ts && git commit -m "utils: add generateSlug helper"`

---

## Task 4: Supabase helpers — add resolveSlug() and update saveGame()

**Files:**
- Modify: `app/_lib/supabase-game.ts`

- [ ] Step 1: Read `app/_lib/supabase-game.ts`. After the `deleteGame` export, add:
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

- [ ] Step 2: Add a `checkSlugAvailable` helper for the inline uniqueness check in the UI (used by the Experience tab on blur):
  ```ts
  export async function checkSlugAvailable(
    slug: string,
    currentGameId: string
  ): Promise<boolean> {
    const { data } = await supabase
      .from("games")
      .select("id")
      .eq("slug", slug)
      .neq("id", currentGameId)
      .maybeSingle();
    return data === null;
  }
  ```

- [ ] Step 3: Update `saveGame()` to persist the slug. The upsert object currently has `id`, `user_id`, `title`, `system_settings`, `card_order`. Add `slug` from `systemSettings`:
  ```ts
  const { error: gameError } = await supabase.from("games").upsert({
    id: gameId,
    user_id: userId,
    title: gameTitle,
    system_settings: systemSettings,
    card_order: cardOrder,
    slug: systemSettings.slug ?? null,
  });
  ```

- [ ] Step 4: Run `npm run build` — Expected: clean build.

- [ ] Step 5: Commit: `git add app/_lib/supabase-game.ts && git commit -m "supabase: add resolveSlug, checkSlugAvailable, persist slug in saveGame"`

---

## Task 5: Middleware — subdomain rewrite

**Files:**
- Create: `middleware.ts` (project root, alongside `next.config.ts`)

- [ ] Step 1: Read the Next.js middleware guide at `node_modules/next/dist/docs/` to confirm the current API. Verify that `NextRequest`, `NextResponse`, and the `config.matcher` export are still the correct pattern for this version of Next.js.

- [ ] Step 2: Create `middleware.ts`:
  ```ts
  import { NextRequest, NextResponse } from "next/server";

  export function middleware(request: NextRequest) {
    const hostname = request.headers.get("host") ?? "";

    // Only intercept *.sherpa.build subdomains — not apex
    const isSherpaBuildSubdomain =
      hostname.endsWith(".sherpa.build") && hostname !== "sherpa.build";

    if (!isSherpaBuildSubdomain) return NextResponse.next();

    const slug = hostname.replace(/\.sherpa\.build$/, "");

    // Rewrite internally to the slug resolution route
    return NextResponse.rewrite(
      new URL(`/play/by-slug/${encodeURIComponent(slug)}`, request.url)
    );
  }

  export const config = {
    matcher: ["/((?!api|_next|_static|favicon).*)"],
  };
  ```

- [ ] Step 3: Run `npm run build` — Expected: clean build. Middleware compiles successfully.

- [ ] Step 4: Commit: `git add middleware.ts && git commit -m "middleware: rewrite *.sherpa.build subdomains to /play/by-slug/[slug]"`

---

## Task 6: Not-found screen — shared branded 404 component

**Files:**
- Create: `app/_components/play-not-found.tsx`

- [ ] Step 1: Create the branded not-found screen used by both play routes:
  ```tsx
  export function PlayNotFound() {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-6 text-center">
        <div>
          <div className="text-xl font-semibold text-white">
            Experience not found
          </div>
          <div className="mt-2 text-sm text-neutral-400">
            This experience wasn&apos;t found or hasn&apos;t been published yet.
          </div>
        </div>
        <a
          href="https://sherpa.app/gallery"
          className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
        >
          Browse the gallery
        </a>
      </div>
    );
  }
  ```

- [ ] Step 2: Run `npm run build` — Expected: clean build.

- [ ] Step 3: Commit: `git add app/_components/play-not-found.tsx && git commit -m "ui: add shared PlayNotFound branded 404 component"`

---

## Task 7: Convert app/play/[gameId]/page.tsx to async Server Component

**Files:**
- Modify: `app/play/[gameId]/page.tsx`

- [ ] Step 1: Read `app/play/[gameId]/page.tsx`. The current file uses `"use client"`, `useEffect`, `useState`, `useParams`. Replace the entire file contents with:
  ```tsx
  import { loadGame } from "@/app/_lib/supabase-game";
  import { PlayerView } from "@/app/_components/player-view";
  import { PlayNotFound } from "@/app/_components/play-not-found";

  export default async function PlayPage({
    params,
  }: {
    params: Promise<{ gameId: string }>;
  }) {
    const { gameId } = await params;
    const data = await loadGame(gameId, { publishedOnly: true });
    if (!data) return <PlayNotFound />;
    return <PlayerView pages={data.pages} systemSettings={data.systemSettings} />;
  }
  ```

  Note: read the Next.js docs in `node_modules/next/dist/docs/` to confirm whether `params` is a `Promise` in this version before writing the final code — the API changed in Next.js 15.

- [ ] Step 2: Run `npm run build` — Expected: clean build; `PlayPage` should show as a Server Component (no `"use client"` directive, no React hooks).

- [ ] Step 3: Commit: `git add "app/play/[gameId]/page.tsx" && git commit -m "feat: convert play route to async Server Component (SSR, no spinner)"`

---

## Task 8: New route — app/play/by-slug/[slug]/page.tsx

**Files:**
- Create: `app/play/by-slug/[slug]/page.tsx`

- [ ] Step 1: Confirm the directory exists or will be created automatically by Next.js on build. Create the file:
  ```tsx
  import { resolveSlug, loadGame } from "@/app/_lib/supabase-game";
  import { PlayerView } from "@/app/_components/player-view";
  import { PlayNotFound } from "@/app/_components/play-not-found";

  export default async function PlayBySlugPage({
    params,
  }: {
    params: Promise<{ slug: string }>;
  }) {
    const { slug } = await params;
    const gameId = await resolveSlug(slug);
    if (!gameId) return <PlayNotFound />;

    const data = await loadGame(gameId, { publishedOnly: true });
    if (!data) return <PlayNotFound />;

    return <PlayerView pages={data.pages} systemSettings={data.systemSettings} />;
  }
  ```

  Again, confirm `params` Promise pattern against this version's Next.js docs.

- [ ] Step 2: Run `npm run build` — Expected: clean build; new route appears in build output.

- [ ] Step 3: Commit: `git add "app/play/by-slug/[slug]/page.tsx" && git commit -m "feat: add by-slug play route for subdomain resolution"`

---

## Task 9: Slug change confirmation modal

**Files:**
- Create: `app/_components/slug-change-modal.tsx`

- [ ] Step 1: Create the confirmation modal. It mirrors the pattern of `confirm-delete-modal.tsx`. The modal shows a destructive warning and requires the user to type the new slug before confirming:
  ```tsx
  "use client";

  import { useEffect, useRef, useState } from "react";

  export function SlugChangeModal({
    newSlug,
    onConfirm,
    onCancel,
  }: {
    newSlug: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) {
    const [confirmInput, setConfirmInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const canConfirm = confirmInput === newSlug;

    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    useEffect(() => {
      function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") onCancel();
      }
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onCancel]);

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onPointerDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      >
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          {/* Warning banner */}
          <div className="rounded-t-2xl bg-red-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">!</div>
              <div>
                <div className="text-sm font-semibold text-red-800">
                  Changing your game URL will break existing links permanently
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 space-y-4">
            {/* Consequence list */}
            <ul className="space-y-2 text-sm text-neutral-700">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-red-500">&#x2022;</span>
                QR codes printed on boxes or inserts will stop working
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-red-500">&#x2022;</span>
                Shared links (social media, email, retailer sites) will stop working
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-red-500">&#x2022;</span>
                Player bookmarks will stop working
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-red-500">&#x2022;</span>
                This cannot be undone
              </li>
            </ul>

            {/* Typed confirmation */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-600">
                Type <span className="font-mono font-semibold text-neutral-900">{newSlug}</span> to confirm
              </label>
              <input
                ref={inputRef}
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={newSlug}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 placeholder:text-neutral-300"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!canConfirm}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Change URL permanently
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] Step 2: Run `npm run build` — Expected: clean build.

- [ ] Step 3: Commit: `git add app/_components/slug-change-modal.tsx && git commit -m "ui: add SlugChangeModal with typed confirmation for destructive slug changes"`

---

## Task 10: Experience tab — Game URL field with inline slug editor

**Files:**
- Modify: `app/_components/editor/experience-tab.tsx`

- [ ] Step 1: Read `app/_components/editor/experience-tab.tsx` in full. Add the following new props to the `ExperienceTab` component type signature (inside the existing `{...}` props object type):
  ```ts
  currentGameId: string;
  isGamePublished: boolean;
  onSlugSave: (slug: string) => void;
  ```

- [ ] Step 2: Add new imports at the top of the file:
  ```ts
  import { useState, useRef } from "react"; // already has useState — add useRef
  import { checkSlugAvailable } from "@/app/_lib/supabase-game";
  import { generateSlug } from "@/app/_lib/authoring-utils";
  import { SlugChangeModal } from "@/app/_components/slug-change-modal";
  ```
  Note: `useState` is already imported; add `useRef` to the existing import. The `useMemo` import is already present too.

- [ ] Step 3: Add slug-related local state inside the `ExperienceTab` function body, after the existing `bggInput` state declarations:
  ```ts
  const currentSlug = systemSettings.slug ?? "";
  const [slugDraft, setSlugDraft] = useState(currentSlug);
  const [slugEditing, setSlugEditing] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const slugInputRef = useRef<HTMLInputElement>(null);
  ```

- [ ] Step 4: Add the slug format validator and blur handler:
  ```ts
  const SLUG_PATTERN = /^[a-z0-9-]+$/;

  function validateSlugFormat(value: string): string {
    if (!value) return "";
    if (value.length > 60) return "Maximum 60 characters";
    if (!SLUG_PATTERN.test(value)) return "Only lowercase letters, numbers, and hyphens";
    return "";
  }

  async function handleSlugBlur() {
    const trimmed = slugDraft.trim();
    if (!trimmed || trimmed === currentSlug) {
      setSlugError("");
      setSlugEditing(false);
      setSlugDraft(currentSlug);
      return;
    }
    const formatError = validateSlugFormat(trimmed);
    if (formatError) {
      setSlugError(formatError);
      return;
    }
    setSlugChecking(true);
    setSlugError("");
    try {
      const available = await checkSlugAvailable(trimmed, currentGameId);
      if (!available) {
        setSlugError("This URL is already taken");
        setSlugChecking(false);
        return;
      }
    } catch {
      setSlugError("Could not check availability. Try again.");
      setSlugChecking(false);
      return;
    }
    setSlugChecking(false);
    setSlugDraft(trimmed);
  }

  function handleSlugSaveClick() {
    const trimmed = slugDraft.trim();
    if (!trimmed || trimmed === currentSlug || slugError) return;
    if (isGamePublished && currentSlug) {
      // Show confirmation modal only when changing an existing slug on a published game
      setPendingSlug(trimmed);
    } else {
      onSlugSave(trimmed);
      setSlugEditing(false);
    }
  }

  function handleSlugConfirm() {
    if (!pendingSlug) return;
    onSlugSave(pendingSlug);
    setPendingSlug(null);
    setSlugEditing(false);
  }
  ```

- [ ] Step 5: Add the "Game URL" `EditorSection` JSX. Insert it as the first section inside the outer `<div className="divide-y divide-neutral-200">`, before the "Languages" section:
  ```tsx
  {/* Game URL */}
  <EditorSection title="Game URL">
    <div className="space-y-3">
      {slugEditing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={slugInputRef}
              type="text"
              value={slugDraft}
              maxLength={60}
              onChange={(e) => {
                setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                setSlugError("");
              }}
              onBlur={handleSlugBlur}
              aria-label="Game URL slug"
              className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400"
              placeholder="your-game-name"
            />
            <span className="shrink-0 text-sm text-neutral-400">.sherpa.build</span>
          </div>
          {slugChecking ? (
            <p className="text-xs text-neutral-400">Checking availability...</p>
          ) : slugError ? (
            <p className="text-xs text-red-500">{slugError}</p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSlugDraft(currentSlug);
                setSlugEditing(false);
                setSlugError("");
              }}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                !slugDraft.trim() ||
                slugDraft.trim() === currentSlug ||
                !!slugError ||
                slugChecking
              }
              onClick={handleSlugSaveClick}
              className="rounded-lg bg-[#3B82F6] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#2563EB] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save URL
            </button>
          </div>
        </div>
      ) : currentSlug ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
          <span className="min-w-0 truncate font-mono text-sm text-neutral-900">
            {currentSlug}.sherpa.build
          </span>
          <button
            type="button"
            onClick={() => {
              setSlugDraft(currentSlug);
              setSlugEditing(true);
              setTimeout(() => slugInputRef.current?.focus(), 0);
            }}
            className="shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Edit
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-neutral-500">
            Not set — your game uses a private link.
          </p>
          <button
            type="button"
            onClick={() => {
              const suggested = generateSlug(currentGameName);
              setSlugDraft(suggested);
              setSlugEditing(true);
              setTimeout(() => slugInputRef.current?.focus(), 0);
            }}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Set game URL
          </button>
        </div>
      )}
    </div>
  </EditorSection>
  ```

- [ ] Step 6: Render the `SlugChangeModal` at the bottom of the returned JSX (inside the outer `<div>`, after all `EditorSection` blocks):
  ```tsx
  {pendingSlug ? (
    <SlugChangeModal
      newSlug={pendingSlug}
      onConfirm={handleSlugConfirm}
      onCancel={() => setPendingSlug(null)}
    />
  ) : null}
  ```

- [ ] Step 7: Run `npm run build` — Expected: TypeScript will error on missing props `currentGameId`, `isGamePublished`, `onSlugSave` at the call site in `page-editor-modal.tsx`. Proceed to Task 11.

---

## Task 11: Wire slug props through PageEditorModal and authoring-studio

**Files:**
- Modify: `app/_components/page-editor-modal.tsx`
- Modify: `app/_components/authoring-studio.tsx`

### page-editor-modal.tsx

- [ ] Step 1: Read `app/_components/page-editor-modal.tsx`. Add three new props to `PageEditorModalProps`:
  ```ts
  currentGameId: string;
  isGamePublished: boolean;
  onSlugSave: (slug: string) => void;
  ```

- [ ] Step 2: Destructure them in the `PageEditorModal` function signature alongside the existing props.

- [ ] Step 3: Pass them through to `<ExperienceTab>` at the call site (around line 420):
  ```tsx
  <ExperienceTab
    currentGameId={currentGameId}
    currentGameName={currentGameName}
    isGamePublished={isGamePublished}
    localeFeature={localeFeature}
    onBggImport={onBggImport}
    onGameIconUpload={onGameIconUpload}
    onLocaleLanguagesChange={onLocaleLanguagesChange}
    onLocalePromoteLanguageToDefault={onLocalePromoteLanguageToDefault}
    onLocaleSourceTextChange={onLocaleSourceTextChange}
    onLocaleTranslationChange={onLocaleTranslationChange}
    onSystemSettingChange={onSystemSettingChange}
    onSlugSave={onSlugSave}
    pages={pages}
    systemSettings={systemSettings}
  />
  ```

### authoring-studio.tsx

- [ ] Step 4: Read `app/_components/authoring-studio.tsx`. Locate where `PageEditorModal` is rendered (search for `currentGameId={currentGameId}`). Determine `isGamePublished` from the pages array — the home card's `publishStatus === "published"`:
  ```ts
  const isGamePublished = pages.some(
    (p) => p.kind === "home" && p.publishStatus === "published"
  );
  ```
  Add this derived value near the other page-derived constants.

- [ ] Step 5: Add an `onSlugSave` handler in `authoring-studio.tsx`:
  ```ts
  function handleSlugSave(slug: string) {
    onSystemSettingChange("slug", slug);
  }
  ```
  (If `onSystemSettingChange` is not directly available, use the existing pattern for system setting changes — typically via `updateSystemSettings` or similar.)

- [ ] Step 6: Pass the new props to `<PageEditorModal>`:
  ```tsx
  currentGameId={currentGameId}
  isGamePublished={isGamePublished}
  onSlugSave={handleSlugSave}
  ```

- [ ] Step 7: Run `npm run build` — Expected: clean build with no type errors.

- [ ] Step 8: Commit: `git add app/_components/editor/experience-tab.tsx app/_components/page-editor-modal.tsx app/_components/authoring-studio.tsx && git commit -m "feat: add Game URL slug editor in Experience tab with uniqueness check and confirmation modal"`

---

## Task 12: Update live view URL in authoring-studio to use slug

**Files:**
- Modify: `app/_components/authoring-studio.tsx`

- [ ] Step 1: Read `app/_components/authoring-studio.tsx`. Find the `liveViewHref` constant (currently around line 311). It reads:
  ```ts
  const liveViewHref = currentGameId
      ? `https://${currentGameId}.${BASE_DOMAIN}`
      : `/play/${currentGameId}`
  ```
  Update it to prefer the slug-based URL when a slug exists:
  ```ts
  const currentSlug = systemSettings?.slug;
  const liveViewHref = currentSlug
    ? `https://${currentSlug}.sherpa.build`
    : currentGameId
    ? `/play/${currentGameId}`
    : null;
  ```

- [ ] Step 2: Run `npm run build` — Expected: clean build.

- [ ] Step 3: Commit: `git add app/_components/authoring-studio.tsx && git commit -m "feat: live view link uses slug URL when slug is set"`

---

## Task 13: Bump APP_VERSION and add PATCH_NOTES entry

**Files:**
- Modify: `app/_lib/authoring-utils.ts`
- Modify: `app/_lib/patch-notes.ts` (or wherever PATCH_NOTES is defined)

- [ ] Step 1: Read `app/_lib/authoring-utils.ts`. Increment `APP_VERSION` by one patch version (e.g. `"v0.17.10"` → `"v0.17.11"`).

- [ ] Step 2: Read `app/_lib/patch-notes.ts`. Add a new entry at the top of the `PATCH_NOTES` array:
  ```ts
  {
    version: "v0.17.11",
    date: "2026-04-08",
    notes: [
      "Game experiences now load instantly — no more spinner on player links",
      "Publishers can now set a custom game URL (e.g. wingspan.sherpa.build) in the Experience tab",
      "Slug changes on published games require typed confirmation to prevent accidental link breakage",
    ],
  },
  ```

- [ ] Step 3: Run `npm run build` — Expected: clean build.

- [ ] Step 4: Commit: `git add app/_lib/authoring-utils.ts app/_lib/patch-notes.ts && git commit -m "chore: bump version to v0.17.11, add SSR and slug feature to patch notes"`

---

## Task 14: Manual infrastructure steps (not automated — do in Cloudflare + Vercel dashboards)

No code changes. These steps must be performed manually by the publisher.

- [ ] Step 1: **Register `sherpa.build` domain** via Cloudflare Registrar (~$10/year). Confirm it is added to the Cloudflare account that controls DNS.

- [ ] Step 2: **Add wildcard DNS records** in the `sherpa.build` Cloudflare zone:

  | Type | Name | Value | Proxied |
  |------|------|-------|---------|
  | CNAME | `*` | `cname.vercel-dns.com` | Yes |
  | CNAME | `sherpa.build` (apex) | `cname.vercel-dns.com` | Yes |

- [ ] Step 3: **Add `*.sherpa.build` as a wildcard custom domain** in the Vercel project dashboard (Vercel Pro plan required for wildcard domains). Vercel will prompt for DNS verification — the wildcard CNAME added in Step 2 satisfies this.

- [ ] Step 4: Wait for DNS propagation (~5 minutes with Cloudflare proxy active). Verify by visiting a known-slug URL in a browser.

---

## Task 15: End-to-end verification

- [ ] Step 1: In the Experience tab, set a slug for a test game (e.g. `test-game-sherpa`). Confirm the "Game URL" field shows `test-game-sherpa.sherpa.build`.

- [ ] Step 2: Visit `https://test-game-sherpa.sherpa.build` — confirm the game loads with no spinner, correct content visible immediately.

- [ ] Step 3: Visit `https://sherpa.app/play/[gameId]` for the same game — confirm the fallback route still works.

- [ ] Step 4: Visit `https://unknown-slug-xyz.sherpa.build` — confirm branded 404 ("Experience not found") is shown.

- [ ] Step 5: In Experience tab, try setting an invalid slug (e.g. `My Game!`) — confirm inline error "Only lowercase letters, numbers, and hyphens" appears.

- [ ] Step 6: Try setting a slug that is already taken — confirm inline error "This URL is already taken" appears after focus leaves the field.

- [ ] Step 7: On a published game, change the slug — confirm `SlugChangeModal` appears, confirm button is disabled until the new slug is typed exactly, then confirm the slug changes and old URL returns 404.

- [ ] Step 8: On an unpublished game (never published home card), change the slug — confirm no confirmation modal appears, change saves immediately.

- [ ] Step 9: Confirm `PlayerView` receives data as props with no internal loading state (no `useEffect`-based fetch inside `player-view.tsx`).

- [ ] Step 10: Run `npm run build` — Expected: clean build with no type errors or warnings.
