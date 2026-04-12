# Team Collaboration — Design Spec

**Date:** 2026-04-11
**Status:** Approved for implementation

---

## Overview

Pro and Studio users can invite collaborators to individual games. Collaboration is async (no simultaneous real-time editing), per-game (each game has its own member list), and role-based (Owner, Editor, Viewer). Team management lives in Account Settings → Team & Access, where the owner selects a game and manages its members and pending invitations.

---

## Plan Gating

| Plan | Collaborator seats |
|---|---|
| Free | None |
| Pro | 1 collaborator across all owned games (owner + 1 total) |
| Studio | Unlimited |
| Lifetime | None (single-user license) |

The seat limit for Pro is per account, not per game. A Pro user can invite 1 collaborator across all their games combined. This intentionally discourages publishers from using Pro — if you need multiple collaborators across multiple games, Studio is the right tier.

The `usePlan()` hook gains a `maxCollaborators: number | 'unlimited' | 0` field:
- Free/Lifetime → `0`
- Pro → `1`
- Studio → `'unlimited'`

The billing spec table is updated: Pro now shows `1` for Team seats (previously `❌`).

---

## Roles

| Role | Edit game content | Invite others | Remove members | Delete game | Transfer ownership |
|---|---|---|---|---|---|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editor | ✅ | ❌ | ❌ | ❌ | ❌ |
| Viewer | ❌ | ❌ | ❌ | ❌ | ❌ |

Ownership is tracked by `games.user_id`. Editors and Viewers are stored in `game_members`. There is no Owner row in `game_members` — the owner is always the user matching `games.user_id`.

---

## Data Model

```sql
CREATE TABLE game_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     text NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('editor', 'viewer')),
  invited_by  uuid REFERENCES auth.users(id),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, user_id)
);

CREATE TABLE game_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     text NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL CHECK (role IN ('editor', 'viewer')),
  token       uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL DEFAULT now() + INTERVAL '7 days',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, email)
);
```

---

## RLS Changes

`games` table — add policies so members can access games they're on:
- Editors: `SELECT` and `UPDATE` where `game_id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')`
- Viewers: `SELECT` only, same subquery with `role = 'viewer'`

`cards` table — same pattern via `game_id`.

`game_members`:
- Owner (`games.user_id = auth.uid()`): full CRUD
- Members: `SELECT` their own game's member list

`game_invitations`:
- Owner: full CRUD on their game's invitations
- Token-based acceptance: no auth required for `SELECT` by token (public route)

---

## Invitation Flow

1. Owner opens Account Settings → Team & Access, selects a game, enters an email + role, clicks **Invite**
2. `POST /api/invitations` creates a `game_invitations` row and sends a Resend email with:
   - Subject: `"[Game Title] — You've been invited to collaborate on Sherpa"`
   - Link: `https://app.sherpa.com/invite/accept?token=<uuid>`
3. Invitee clicks the link → `/invite/accept` page:
   - If not logged in: redirected to `/login?returnUrl=/invite/accept?token=...`
   - If logged in: the page looks up the token, creates a `game_members` row, deletes the invitation, and redirects to the authoring studio with the game open
4. Tokens expire after 7 days. Expired tokens show a "This invite has expired" message with a prompt to ask the owner to resend.
5. The owner can **Resend** (resets `expires_at` to now + 7 days) or **Revoke** (deletes the row) any pending invite at any time.

If an invitee already has an account and is logged in when they click the link, the accept is immediate — no redirect through login.

---

## Game Ownership Transfer

Accessible from the "Danger zone" section of the Team tab for the selected game.

**Flow:**
1. Owner clicks **Transfer game ownership…** → a confirmation modal opens
2. Owner selects the new owner from existing members, or enters any email (which triggers an invite-style flow)
3. Modal asks: *"What should happen to your access after transfer?"*
   - **Stay as Editor** (default) — owner is inserted into `game_members` with role `editor`
   - **Remove my access** — no `game_members` row created
4. On confirm: `games.user_id` is updated to the new owner's `user_id`
5. The new owner can later change or remove the previous owner's role through normal member management

Transfer is only available to the current owner. It is immediate and cannot be undone except by the new owner transferring back.

---

## UI — Team & Access Section

Location: Account Settings → Team & Access (already stubbed in `account-sections.tsx`).

**Layout (per the approved mockup):**

- **Game selector** — dropdown listing all games owned by the current user. Defaults to the first game.
- **Member list** — one row per member (owner first, then editors/viewers). Each non-owner row has:
  - Avatar + name + email
  - Role selector (Editor / Viewer) — changing role immediately calls `PATCH /api/game-members/:id`
  - Remove button — calls `DELETE /api/game-members/:id`
- **Pending invites** — below members, one row per pending `game_invitation`. Shows email, role, "pending" badge. Resend and Revoke actions.
- **Invite form** — email input + role selector + Invite button. Calls `POST /api/invitations`.
- **Seat counter** — shown for Pro users only: *"1 of 1 collaborator seat used"* with an upgrade CTA to Studio if at limit. Hidden for Studio (unlimited).
- **Danger zone** — Transfer game ownership button. Separated by a divider at the bottom of the section.

**Plan gate:** Free and Lifetime users see a locked state in the Team section: *"Team collaboration is available on Pro and Studio plans"* with an Upgrade CTA.

---

## API Routes

All routes require authentication. Owner-only actions return 403 if called by a non-owner.

| Method | Route | Action |
|---|---|---|
| `GET` | `/api/game-members?gameId=...` | List members for a game |
| `PATCH` | `/api/game-members/:id` | Update member role |
| `DELETE` | `/api/game-members/:id` | Remove member |
| `GET` | `/api/invitations?gameId=...` | List pending invitations for a game |
| `POST` | `/api/invitations` | Create invitation + send email |
| `DELETE` | `/api/invitations/:id` | Revoke invitation |
| `PATCH` | `/api/invitations/:id` | Resend (reset expiry) |
| `POST` | `/api/invitations/accept` | Accept invitation by token (no auth required) |
| `POST` | `/api/games/:gameId/transfer` | Transfer ownership |

**Seat enforcement (Pro):** `POST /api/invitations` checks the count of distinct `user_id`s in `game_members` across all games owned by the inviting user. If already at limit (1 for Pro), returns 403 with `{ error: "seat_limit_reached" }`.

---

## Email Template

Sent via Resend using the existing email infrastructure.

**Subject:** `You've been invited to collaborate on "[Game Title]" in Sherpa`

**Body:**
- Inviter's name and game title
- Their assigned role (Editor / Viewer) with a one-line description of what they can do
- Prominent "Accept invitation" button → `/invite/accept?token=...`
- "This invitation expires in 7 days" note
- Footer: if they don't have a Sherpa account, they'll be prompted to create one after clicking

---

## Edge Cases

| Case | Handling |
|---|---|
| Invitee email matches an existing member | `POST /api/invitations` returns 409 — they're already on the game |
| Invitee email already has a pending invite for this game | Return 409 — offer Resend instead |
| Token expired | Accept page shows "Invite expired" with prompt to contact the owner |
| Token already used | Accept page shows "Already accepted" with link to the authoring studio |
| Owner tries to invite themselves | API returns 400 |
| Pro user hits seat limit | API returns 403 with `seat_limit_reached`; UI shows upgrade prompt |
| Owner is removed from Supabase Auth | `ON DELETE CASCADE` removes their `games` rows; collaborators lose access automatically |
| Member is removed from Supabase Auth | `ON DELETE CASCADE` removes their `game_members` row |
| New owner not yet a Sherpa user | Transfer flow sends an invite email; transfer completes when they accept |

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/add-team.sql` | Create | `game_members` + `game_invitations` tables + RLS policies |
| `app/_hooks/usePlan.tsx` | Modify | Add `maxCollaborators: number \| 'unlimited' \| 0` |
| `app/api/game-members/route.ts` | Create | `GET` list, owner-gated |
| `app/api/game-members/[memberId]/route.ts` | Create | `PATCH` role, `DELETE` remove |
| `app/api/invitations/route.ts` | Create | `GET` list, `POST` create + send email |
| `app/api/invitations/[invitationId]/route.ts` | Create | `DELETE` revoke, `PATCH` resend |
| `app/api/invitations/accept/route.ts` | Create | `POST` accept by token (no auth required) |
| `app/api/games/[gameId]/transfer/route.ts` | Create | `POST` transfer ownership |
| `app/invite/accept/page.tsx` | Create | Client page — handles token, shows result, redirects |
| `app/_lib/email/team-invite.tsx` | Create | Resend email template for invitations |
| `app/_components/account/account-sections.tsx` | Modify | Replace `TeamSection` stub with full implementation |
| `docs/superpowers/specs/2026-04-09-stripe-billing-design.md` | Modify | Update Pro team seats from ❌ to `1` |

---

## What Does Not Change

- The authoring studio's card editor, canvas, and block editors — no changes
- The player route — collaborators access the authoring studio, not the player
- Supabase Storage — images and assets are still per-game, accessible to all members
- The game data model (cards, system settings) — no structural changes
