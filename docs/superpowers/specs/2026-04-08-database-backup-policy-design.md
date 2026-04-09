# Database Backup Policy — Design Spec

**Date:** 2026-04-08
**Status:** Approved

## Context

Supabase free tier provides daily backups with 7-day retention but no point-in-time recovery (PITR). A bad migration, accidental deletion, or data corruption could mean losing up to 24 hours of publisher work. This spec documents when and how to enable PITR, and adds a soft-delete guard on games as a secondary recovery layer available immediately.

## Scope

- Supabase Pro PITR — trigger, steps, and verification
- Soft-delete on `games` table as immediate secondary protection
- Internal restore runbook outline
- Staging backup policy (intentionally minimal)

**Out of scope:** Publisher data export (future product feature), automated backup testing, cross-region replication.

## Supabase PITR

### Trigger
Enable on first paying customer. The $25/month Pro cost should be offset by revenue before enabling. Do not enable on free tier — the cost is not justified until publisher data has real value.

### What Pro unlocks
- 7-day point-in-time recovery — restore to any second within the last 7 days
- 8GB database storage (vs 500MB free)
- Higher connection limits
- Custom SMTP (used by Resend integration — Spec B)

### Enablement steps
1. Upgrade production Supabase project to Pro in the Supabase dashboard
2. PITR activates automatically — no additional configuration required
3. Verify: Supabase dashboard → Settings → Backups → confirm PITR shows as active
4. Confirm retention window shows 7 days

### Staging
Staging Supabase remains on the free tier. Losing staging data is inconvenient but not catastrophic — no PITR needed.

## Soft-delete on `games` table

A hard-delete safety net available immediately, before PITR is enabled. Adds a `deleted_at` timestamp — deleted games are hidden from all queries but remain in the database, recoverable by an admin without a full restore.

### Schema change
```sql
ALTER TABLE games ADD COLUMN deleted_at timestamptz DEFAULT NULL;
CREATE INDEX games_deleted_at_idx ON games (deleted_at) WHERE deleted_at IS NULL;
```

### RLS and query changes
All queries that read games add `AND deleted_at IS NULL` to filter out soft-deleted games. The existing `deleteGame()` function changes from a hard DELETE to an UPDATE:

```ts
// Before (hard delete):
supabase.from("games").delete().eq("id", gameId)

// After (soft delete):
supabase.from("games").update({ deleted_at: new Date().toISOString() }).eq("id", gameId)
```

### Recovery
An admin can recover a soft-deleted game by setting `deleted_at = NULL` directly in the Supabase dashboard SQL editor. No code required for recovery — it's a manual operation for now.

### Cascade behaviour
`cards` table has `ON DELETE CASCADE` from `games`. With soft-delete, cards are NOT deleted when the game is soft-deleted — they remain in place and are restored automatically when `deleted_at` is cleared. This is correct behaviour.

### Permanent deletion
A background job (or manual SQL) can hard-delete games where `deleted_at` is older than 30 days. This keeps the database clean without requiring immediate hard deletes. Implementation of the background job is deferred — for now, permanent cleanup is manual via Supabase dashboard.

## Internal restore runbook (outline)

Document and store in the team's internal notes (Notion, Linear, etc.):

1. **Assess impact** — which game(s) affected, which publisher(s), approximate time of incident
2. **Check soft-delete first** — if a game was accidentally deleted, recover via `UPDATE games SET deleted_at = NULL WHERE id = '<gameId>'` in Supabase SQL editor
3. **If data corruption** — go to Supabase dashboard → Backups → select restore point just before incident
4. **Notify affected publishers** — email via Resend, explain what happened and what was restored
5. **Post-incident** — document root cause, add a guard to prevent recurrence

## Files changed

| File / Location | Change |
|----------------|--------|
| `supabase/add-soft-delete.sql` | New — `deleted_at` column, index |
| `app/_lib/supabase-game.ts` | Update `deleteGame()` to soft-delete, add `deleted_at IS NULL` filter to all game queries |
| Supabase dashboard (production) | Run `add-soft-delete.sql`, upgrade to Pro when first customer lands |
| Supabase dashboard (staging) | Run `add-soft-delete.sql`, remain on free tier |

## Verification

1. Delete a game in the studio — confirm it disappears from the game list
2. Confirm the game row still exists in Supabase with `deleted_at` set (check via SQL editor)
3. Set `deleted_at = NULL` manually — confirm game reappears in the studio
4. After Pro upgrade: confirm PITR shows as active in Supabase dashboard → Settings → Backups
5. Confirm staging Supabase remains on free tier
