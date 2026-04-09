# Database Backup Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect publisher game data from accidental deletion by converting `deleteGame()` to a soft-delete and filtering soft-deleted games out of all read queries.
**Architecture:** A new `deleted_at timestamptz` column on the `games` table serves as the deletion flag; all reads add `.is("deleted_at", null)`; the game-switcher modal query gets the same filter; a SQL file captures the migration for both production and staging dashboards. PITR enablement is documented as a deferred manual task tied to the first paying customer.
**Tech Stack:** Supabase (Postgres), TypeScript, Supabase JS client (`@supabase/supabase-js`)

---

### Task 1: Create the SQL migration file

**Files:**
- Create: `supabase/add-soft-delete.sql`

- [ ] Step 1: Create the file with the following content exactly:

  ```sql
  -- Soft-delete support for the games table.
  -- Run once against production and once against staging via the Supabase SQL editor.
  -- Safe to re-run: IF NOT EXISTS guards prevent errors on repeat execution.

  ALTER TABLE games
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

  CREATE INDEX IF NOT EXISTS games_deleted_at_idx
    ON games (deleted_at)
    WHERE deleted_at IS NULL;
  ```

- [ ] Step 2: Commit — `git commit -m "chore: add soft-delete SQL migration for games table"`

---

### Task 2: Update `deleteGame()` to soft-delete

**Files:**
- Modify: `app/_lib/supabase-game.ts`

- [ ] Step 1: Replace the `deleteGame` function body. Change:

  ```ts
  export async function deleteGame(gameId: string): Promise<void> {
    const { error } = await supabase
      .from("games")
      .delete()
      .eq("id", gameId);

    if (error) throw error;
  }
  ```

  To:

  ```ts
  export async function deleteGame(gameId: string): Promise<void> {
    const { error } = await supabase
      .from("games")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", gameId);

    if (error) throw error;
  }
  ```

- [ ] Step 2: Commit — `git commit -m "feat: soft-delete games instead of hard DELETE"`

---

### Task 3: Filter soft-deleted games out of `loadGame()`

**Files:**
- Modify: `app/_lib/supabase-game.ts`

- [ ] Step 1: In `loadGame()`, add `.is("deleted_at", null)` to the games query. Change:

  ```ts
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();
  ```

  To:

  ```ts
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .is("deleted_at", null)
    .single();
  ```

- [ ] Step 2: Commit — `git commit -m "fix: exclude soft-deleted games from loadGame query"`

---

### Task 4: Filter soft-deleted games out of the game-switcher modal

**Files:**
- Modify: `app/_components/game-switcher-modal.tsx`

- [ ] Step 1: In the `useEffect` that fetches the game list (around line 166), add `.is("deleted_at", null)` before `.order(...)`. Change:

  ```ts
  supabase
    .from("games")
    .select("id, title, system_settings")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
  ```

  To:

  ```ts
  supabase
    .from("games")
    .select("id, title, system_settings")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
  ```

- [ ] Step 2: Commit — `git commit -m "fix: exclude soft-deleted games from game-switcher list"`

---

### Task 5: Bump APP_VERSION and add patch note

**Files:**
- Modify: `app/_lib/authoring-utils.ts`
- Modify: `app/_lib/patch-notes.ts`

- [ ] Step 1: In `app/_lib/authoring-utils.ts`, change:

  ```ts
  export const APP_VERSION = "v0.17.10";
  ```

  To:

  ```ts
  export const APP_VERSION = "v0.17.11";
  ```

- [ ] Step 2: In `app/_lib/patch-notes.ts`, prepend a new entry at the top of the `PATCH_NOTES` array (before the `v0.17.10` object):

  ```ts
  {
    version: "v0.17.11",
    date: "2026-04-08",
    changes: [
      "Game deletion is now a soft-delete: deleted games are hidden but recoverable by an admin without a full database restore",
    ],
  },
  ```

- [ ] Step 3: Run: `npm run build` — Expected: clean build with no TypeScript errors

- [ ] Step 4: Commit — `git commit -m "chore: bump to v0.17.11, note soft-delete in patch notes"`

---

### Task 6: Manual — Run the SQL migration on staging

> This task is performed in the Supabase dashboard, not in code. Complete after deploying Task 1–5 to confirm the migration works before touching production.

- [ ] Step 1: Open the Supabase staging project dashboard
- [ ] Step 2: Navigate to **SQL Editor** (left sidebar)
- [ ] Step 3: Paste the full contents of `supabase/add-soft-delete.sql` into a new query tab
- [ ] Step 4: Click **Run** — Expected: `ALTER TABLE` and `CREATE INDEX` succeed with no errors
- [ ] Step 5: Verify in **Table Editor → games** that the `deleted_at` column is present with type `timestamptz` and default `NULL`
- [ ] Step 6: Manually test soft-delete end-to-end in the staging studio:
  - Delete a game via the UI — confirm it disappears from the game list
  - In **SQL Editor**, run `SELECT id, deleted_at FROM games WHERE deleted_at IS NOT NULL;` — confirm the deleted game appears with a non-null timestamp
  - Run `UPDATE games SET deleted_at = NULL WHERE id = '<gameId>';` — confirm the game reappears in the studio without a page refresh

---

### Task 7: Manual — Run the SQL migration on production

> Only after Task 6 passes on staging. Production `deleted_at IS NULL` filter is already live in the deployed code from Tasks 2–4.

- [ ] Step 1: Open the **production** Supabase project dashboard
- [ ] Step 2: Navigate to **SQL Editor**
- [ ] Step 3: Paste the full contents of `supabase/add-soft-delete.sql` into a new query tab
- [ ] Step 4: Click **Run** — Expected: clean execution, no errors
- [ ] Step 5: Verify in **Table Editor → games** that `deleted_at` column exists
- [ ] Step 6: Smoke-test in the production studio with a throwaway game:
  - Delete the game — confirm it disappears from the switcher
  - In SQL Editor, confirm the row still exists with `deleted_at` set

---

### Task 8: Manual — Enable PITR on first paying customer (deferred)

> Trigger: first publisher on a paid plan. Do not perform this task before that point — the $25/month Pro cost is not justified until publisher data has real value.

- [ ] Step 1: In the production Supabase project dashboard, navigate to **Settings → Billing**
- [ ] Step 2: Upgrade project to the **Pro** plan
- [ ] Step 3: Navigate to **Settings → Backups**
- [ ] Step 4: Confirm **Point in Time Recovery** shows as active
- [ ] Step 5: Confirm the retention window shows **7 days**
- [ ] Step 6: Confirm the staging project is still on the **Free tier** (check staging dashboard → Settings → Billing)
- [ ] Step 7: Add a note to the internal runbook (Notion/Linear) documenting the PITR restore procedure:
  - Assess impact: which game(s), which publisher(s), approximate incident time
  - Check soft-delete first: `UPDATE games SET deleted_at = NULL WHERE id = '<gameId>';` in SQL Editor
  - For data corruption: dashboard → **Backups** → select restore point just before incident → restore
  - Notify affected publishers via Resend email
  - Document root cause and add a guard

---
