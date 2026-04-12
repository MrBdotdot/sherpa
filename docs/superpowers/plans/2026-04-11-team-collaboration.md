# Team Collaboration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow Pro and Studio users to invite collaborators (Editors and Viewers) to individual games, managed from Account Settings → Team & Access.

**Architecture:** Two new tables (`game_members`, `game_invitations`) store accepted members and pending invites. New RLS policies extend game/card access to editors and viewers. Nine API routes handle CRUD. The existing `TeamSection` stub in `account-sections.tsx` is replaced with a full implementation. Invitation emails use the existing Resend infrastructure.

**Tech Stack:** TypeScript, Next.js App Router API routes, Supabase (Postgres + RLS), Resend (@react-email/components), Vitest

---

## Context for implementers

- **Supabase admin client** (`supabaseAdmin` from `@/app/_lib/supabase-admin`) uses the service role key — bypasses RLS. Use for all server-side reads/writes on new tables.
- **Auth pattern** in API routes: use `getRequestUser(request)` from `@/app/_lib/api-auth` (created in Task 2). Returns `User | null`.
- **Email**: all emails go through `POST /api/email/send` with `{ template, to, props }`. The route renders React Email components via Resend.
- **usePlan hook** (`@/app/_hooks/usePlan`) exposes `plan`, `hasTeamSeats`, `maxCollaborators`. `hasTeamSeats` is true for Pro and Studio.
- **Supabase client** (client-side, `@/app/_lib/supabase`) is the anon-key client subject to RLS. Use for loading the game list in `TeamSection` (RLS limits it to owned games automatically).
- **game_members stores denormalized user info** (email, display_name) written at acceptance time — avoids cross-schema joins to `auth.users`.

---

## Task 1: SQL migration — game_members, game_invitations, RLS

**Files:**
- Create: `supabase/add-team.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/add-team.sql`:

```sql
-- Run in Supabase Dashboard → SQL Editor
-- Requires: schema.sql, add-auth.sql already applied.

-- ── game_members ─────────────────────────────────────────────────────────────
-- Accepted collaborators. Owner is NOT stored here — ownership is games.user_id.
CREATE TABLE IF NOT EXISTS game_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      text NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('editor', 'viewer')),
  email        text NOT NULL,         -- denormalized from auth.users at acceptance time
  display_name text,                  -- denormalized from user_metadata at acceptance time
  invited_by   uuid REFERENCES auth.users(id),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, user_id)
);

ALTER TABLE game_members ENABLE ROW LEVEL SECURITY;

-- Owners manage their games' members
CREATE POLICY "owners_manage_members" ON game_members
  FOR ALL USING (
    game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
  ) WITH CHECK (
    game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
  );

-- ── game_invitations ─────────────────────────────────────────────────────────
-- Pending invitations. Converted to game_members on acceptance.
CREATE TABLE IF NOT EXISTS game_invitations (
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

ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY;

-- Owners manage invitations for their games
CREATE POLICY "owners_manage_invitations" ON game_invitations
  FOR ALL USING (
    game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
  ) WITH CHECK (
    game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
  );

-- ── Extended RLS on games ─────────────────────────────────────────────────────
-- Allow editors to read and update games they are members of.
-- (Existing "users_own_games" policy remains — these are additive via OR.)

CREATE POLICY "editors_read_games" ON games
  FOR SELECT USING (
    id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')
  );

CREATE POLICY "editors_update_games" ON games
  FOR UPDATE USING (
    id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')
  ) WITH CHECK (
    id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')
  );

CREATE POLICY "viewers_read_games" ON games
  FOR SELECT USING (
    id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'viewer')
  );

-- ── Extended RLS on cards ─────────────────────────────────────────────────────

CREATE POLICY "editors_read_cards" ON cards
  FOR SELECT USING (
    game_id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')
  );

CREATE POLICY "editors_write_cards" ON cards
  FOR INSERT WITH CHECK (
    game_id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')
  );

CREATE POLICY "editors_update_cards" ON cards
  FOR UPDATE USING (
    game_id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')
  ) WITH CHECK (
    game_id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')
  );

CREATE POLICY "editors_delete_cards" ON cards
  FOR DELETE USING (
    game_id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')
  );

CREATE POLICY "viewers_read_cards" ON cards
  FOR SELECT USING (
    game_id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'viewer')
  );
```

- [ ] **Step 2: Run the migration**

In Supabase Dashboard → SQL Editor, paste and run the entire file.

Expected: No errors. Tables `game_members` and `game_invitations` appear in Table Editor → public schema.

- [ ] **Step 3: Commit**

```bash
git add supabase/add-team.sql
git commit -m "chore: add game_members and game_invitations schema with RLS"
```

---

## Task 2: Auth helper for API routes

**Files:**
- Create: `app/_lib/api-auth.ts`

- [ ] **Step 1: Create the helper**

Create `app/_lib/api-auth.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

function cookiesFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return cookieHeader.split(";").map((c) => {
    const [name, ...rest] = c.trim().split("=");
    return { name: name.trim(), value: rest.join("=") };
  });
}

/**
 * Returns the authenticated Supabase user from the request cookies,
 * or null if not authenticated.
 */
export async function getRequestUser(request: Request): Promise<User | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll: () => cookiesFromRequest(request),
        setAll: () => {},
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/_lib/api-auth.ts
git commit -m "chore: add getRequestUser auth helper for API routes"
```

---

## Task 3: Update usePlan — add maxCollaborators

**Files:**
- Modify: `app/_hooks/usePlan.tsx`
- Create: `app/_hooks/usePlan.test.ts`

- [ ] **Step 1: Write failing tests**

Create `app/_hooks/usePlan.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { deriveEntitlements } from "./usePlan";

describe("deriveEntitlements", () => {
  it("free plan has no publish, branding shown, no team seats, 0 collaborators", () => {
    const r = deriveEntitlements("free", null);
    expect(r.canPublish).toBe(false);
    expect(r.hasBranding).toBe(true);
    expect(r.hasTeamSeats).toBe(false);
    expect(r.maxCollaborators).toBe(0);
  });

  it("pro plan can publish, no branding, has team seats, 1 collaborator", () => {
    const r = deriveEntitlements("pro", null);
    expect(r.canPublish).toBe(true);
    expect(r.hasBranding).toBe(false);
    expect(r.hasTeamSeats).toBe(true);
    expect(r.maxCollaborators).toBe(1);
  });

  it("studio plan can publish, no branding, has team seats, unlimited collaborators", () => {
    const r = deriveEntitlements("studio", null);
    expect(r.canPublish).toBe(true);
    expect(r.hasBranding).toBe(false);
    expect(r.hasTeamSeats).toBe(true);
    expect(r.maxCollaborators).toBe("unlimited");
  });

  it("lifetime plan can publish, no branding, no team seats, 0 collaborators", () => {
    const r = deriveEntitlements("lifetime", null);
    expect(r.canPublish).toBe(true);
    expect(r.hasBranding).toBe(false);
    expect(r.hasTeamSeats).toBe(false);
    expect(r.maxCollaborators).toBe(0);
  });

  it("expired pro plan is treated as free", () => {
    const expired = new Date(Date.now() - 1000).toISOString();
    const r = deriveEntitlements("pro", expired);
    expect(r.canPublish).toBe(false);
    expect(r.hasTeamSeats).toBe(false);
    expect(r.maxCollaborators).toBe(0);
  });

  it("non-expired pro plan with future expires_at retains entitlements", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const r = deriveEntitlements("pro", future);
    expect(r.canPublish).toBe(true);
    expect(r.hasTeamSeats).toBe(true);
    expect(r.maxCollaborators).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test app/_hooks/usePlan.test.ts
```

Expected: Errors about `deriveEntitlements` not being exported and `maxCollaborators` not existing.

- [ ] **Step 3: Update usePlan.tsx**

Replace the contents of `app/_hooks/usePlan.tsx`:

```typescript
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Plan = "free" | "pro" | "studio" | "lifetime";

export type PlanState = {
  plan: Plan;
  planExpiresAt: string | null;
  canPublish: boolean;
  hasBranding: boolean;
  hasTeamSeats: boolean;
  maxCollaborators: 0 | 1 | "unlimited";
  isLoading: boolean;
};

const defaultState: PlanState = {
  plan: "free",
  planExpiresAt: null,
  canPublish: false,
  hasBranding: true,
  hasTeamSeats: false,
  maxCollaborators: 0,
  isLoading: true,
};

const PlanContext = createContext<PlanState>(defaultState);

export function deriveEntitlements(
  plan: Plan,
  planExpiresAt: string | null
): Omit<PlanState, "plan" | "planExpiresAt" | "isLoading"> {
  const isExpired =
    planExpiresAt !== null &&
    plan !== "lifetime" &&
    new Date(planExpiresAt) < new Date();

  const effectivePlan: Plan = isExpired ? "free" : plan;

  return {
    canPublish:
      effectivePlan === "pro" ||
      effectivePlan === "studio" ||
      effectivePlan === "lifetime",
    hasBranding: effectivePlan === "free",
    hasTeamSeats: effectivePlan === "pro" || effectivePlan === "studio",
    maxCollaborators:
      effectivePlan === "studio"
        ? "unlimited"
        : effectivePlan === "pro"
        ? 1
        : 0,
  };
}

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlanState>(defaultState);

  useEffect(() => {
    fetch("/api/stripe/entitlement")
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((data: { plan: Plan; planExpiresAt: string | null }) => {
        setState({
          plan: data.plan,
          planExpiresAt: data.planExpiresAt,
          ...deriveEntitlements(data.plan, data.planExpiresAt),
          isLoading: false,
        });
      })
      .catch(() => {
        setState({
          plan: "free",
          planExpiresAt: null,
          ...deriveEntitlements("free", null),
          isLoading: false,
        });
      });
  }, []);

  return <PlanContext.Provider value={state}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanState {
  return useContext(PlanContext);
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test app/_hooks/usePlan.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add app/_hooks/usePlan.tsx app/_hooks/usePlan.test.ts
git commit -m "feat: add maxCollaborators to usePlan (pro=1, studio=unlimited)"
```

---

## Task 4: Team invite email template

**Files:**
- Create: `app/_lib/email/team-invite.tsx`
- Modify: `app/api/email/send/route.tsx`

- [ ] **Step 1: Create the email template**

Create `app/_lib/email/team-invite.tsx`:

```typescript
import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./email-layout";

interface TeamInviteProps {
  inviterName: string;
  gameTitle: string;
  role: "editor" | "viewer";
  acceptUrl: string;
}

const ROLE_DESCRIPTION: Record<"editor" | "viewer", string> = {
  editor: "You'll be able to edit cards and content.",
  viewer: "You'll be able to view the game in read-only mode.",
};

export function TeamInvite({ inviterName, gameTitle, role, acceptUrl }: TeamInviteProps) {
  return (
    <EmailLayout previewText={`${inviterName} invited you to collaborate on "${gameTitle}" in Sherpa`}>
      <Heading
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#111827",
          margin: "0 0 12px",
          letterSpacing: "-0.3px",
        }}
      >
        You&apos;ve been invited to collaborate
      </Heading>
      <Text style={{ fontSize: "15px", color: "#4b5563", lineHeight: "1.6", margin: "0 0 8px" }}>
        <strong>{inviterName}</strong> has invited you to collaborate on{" "}
        <strong>&ldquo;{gameTitle}&rdquo;</strong> in Sherpa.
      </Text>
      <Text style={{ fontSize: "15px", color: "#4b5563", lineHeight: "1.6", margin: "0 0 28px" }}>
        Your role: <strong>{role.charAt(0).toUpperCase() + role.slice(1)}</strong> — {ROLE_DESCRIPTION[role]}
      </Text>
      <Button
        href={acceptUrl}
        style={{
          display: "inline-block",
          backgroundColor: "#3b82f6",
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: 600,
          padding: "12px 28px",
          borderRadius: "9999px",
          textDecoration: "none",
          marginBottom: "28px",
        }}
      >
        Accept invitation
      </Button>
      <Text style={{ fontSize: "13px", color: "#9ca3af", margin: "0" }}>
        This invitation expires in 7 days. If you don&apos;t have a Sherpa account yet, you&apos;ll be
        prompted to create one after clicking the link.
      </Text>
    </EmailLayout>
  );
}

export default TeamInvite;
```

- [ ] **Step 2: Register the template in the email send route**

In `app/api/email/send/route.tsx`, make the following changes:

Add the import at the top (after the existing imports):
```typescript
import { TeamInvite } from "@/app/_lib/email/team-invite";
```

Add `"team-invite"` to the `KNOWN_TEMPLATES` array:
```typescript
const KNOWN_TEMPLATES = ["confirm-email", "password-reset", "welcome", "billing-event", "team-invite"] as const;
```

Add a handler in the template switch (before the `else` / `welcome` branch):
```typescript
} else if (template === "team-invite") {
  const inviterName = typeof p.inviterName === "string" ? p.inviterName : "Someone";
  const gameTitle = typeof p.gameTitle === "string" ? p.gameTitle : "a game";
  const role = p.role === "viewer" ? "viewer" : "editor";
  const acceptUrl = typeof p.acceptUrl === "string" ? p.acceptUrl : "";
  subject = `You've been invited to collaborate on "${gameTitle}" in Sherpa`;
  emailElement = <TeamInvite inviterName={inviterName} gameTitle={gameTitle} role={role} acceptUrl={acceptUrl} />;
} else {
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/_lib/email/team-invite.tsx app/api/email/send/route.tsx
git commit -m "feat: add team-invite email template"
```

---

## Task 5: Game members API routes

**Files:**
- Create: `app/api/game-members/route.ts`
- Create: `app/api/game-members/[memberId]/route.ts`

- [ ] **Step 1: Create the list route**

Create `app/api/game-members/route.ts`:

```typescript
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { getRequestUser } from "@/app/_lib/api-auth";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  if (!gameId) return Response.json({ error: "Missing gameId" }, { status: 400 });

  // Verify caller owns this game
  const { data: game } = await supabaseAdmin
    .from("games")
    .select("id")
    .eq("id", gameId)
    .eq("user_id", user.id)
    .single();

  if (!game) return Response.json({ error: "Not found" }, { status: 404 });

  // Members for this game
  const { data: members, error } = await supabaseAdmin
    .from("game_members")
    .select("id, user_id, role, email, display_name, joined_at")
    .eq("game_id", gameId)
    .order("joined_at");

  if (error) return Response.json({ error: "Failed to load members" }, { status: 500 });

  // Total collaborators across all owned games (for Pro seat limit display)
  const { count: totalCollaborators } = await supabaseAdmin
    .from("game_members")
    .select("user_id", { count: "exact", head: true })
    .in(
      "game_id",
      (
        await supabaseAdmin.from("games").select("id").eq("user_id", user.id)
      ).data?.map((g) => g.id) ?? []
    );

  return Response.json({ members: members ?? [], totalCollaborators: totalCollaborators ?? 0 });
}
```

- [ ] **Step 2: Create the role + remove route**

Create `app/api/game-members/[memberId]/route.ts`:

```typescript
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { getRequestUser } from "@/app/_lib/api-auth";

async function verifyOwnership(memberId: string, userId: string): Promise<boolean> {
  const { data: member } = await supabaseAdmin
    .from("game_members")
    .select("game_id")
    .eq("id", memberId)
    .single();
  if (!member) return false;

  const { data: game } = await supabaseAdmin
    .from("games")
    .select("id")
    .eq("id", member.game_id)
    .eq("user_id", userId)
    .single();
  return !!game;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await params;
  if (!(await verifyOwnership(memberId, user.id))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let body: { role?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { role } = body;
  if (role !== "editor" && role !== "viewer") {
    return Response.json({ error: "Invalid role" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("game_members")
    .update({ role })
    .eq("id", memberId);

  if (error) return Response.json({ error: "Failed to update role" }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await params;
  if (!(await verifyOwnership(memberId, user.id))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("game_members")
    .delete()
    .eq("id", memberId);

  if (error) return Response.json({ error: "Failed to remove member" }, { status: 500 });
  return Response.json({ ok: true });
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/game-members/route.ts app/api/game-members/[memberId]/route.ts
git commit -m "feat: add game-members API (GET, PATCH role, DELETE)"
```

---

## Task 6: Invitations API routes

**Files:**
- Create: `app/api/invitations/route.ts`
- Create: `app/api/invitations/[invitationId]/route.ts`
- Create: `app/api/invitations/accept/route.ts`

- [ ] **Step 1: Create the list + create route**

Create `app/api/invitations/route.ts`:

```typescript
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { getRequestUser } from "@/app/_lib/api-auth";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  if (!gameId) return Response.json({ error: "Missing gameId" }, { status: 400 });

  // Verify ownership
  const { data: game } = await supabaseAdmin
    .from("games")
    .select("id")
    .eq("id", gameId)
    .eq("user_id", user.id)
    .single();
  if (!game) return Response.json({ error: "Not found" }, { status: 404 });

  const { data: invitations, error } = await supabaseAdmin
    .from("game_invitations")
    .select("id, email, role, expires_at, created_at")
    .eq("game_id", gameId)
    .order("created_at");

  if (error) return Response.json({ error: "Failed to load invitations" }, { status: 500 });
  return Response.json({ invitations: invitations ?? [] });
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { gameId?: unknown; email?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { gameId, email, role } = body;
  if (typeof gameId !== "string") return Response.json({ error: "Missing gameId" }, { status: 400 });
  if (typeof email !== "string" || !email.includes("@")) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }
  if (role !== "editor" && role !== "viewer") {
    return Response.json({ error: "Invalid role" }, { status: 400 });
  }

  // Verify ownership + get game title
  const { data: game } = await supabaseAdmin
    .from("games")
    .select("id, title")
    .eq("id", gameId)
    .eq("user_id", user.id)
    .single();
  if (!game) return Response.json({ error: "Not found" }, { status: 404 });

  // Prevent inviting yourself
  if (email === user.email) {
    return Response.json({ error: "Cannot invite yourself" }, { status: 400 });
  }

  // Check if already a member
  const { data: existing } = await supabaseAdmin
    .from("game_members")
    .select("id")
    .eq("game_id", gameId)
    .eq("email", email)
    .maybeSingle();
  if (existing) return Response.json({ error: "already_member" }, { status: 409 });

  // Pro seat limit: max 1 collaborator total across all owned games
  const { data: ownedGames } = await supabaseAdmin
    .from("games")
    .select("id")
    .eq("user_id", user.id);
  const ownedGameIds = (ownedGames ?? []).map((g) => g.id);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const plan = profile?.plan ?? "free";

  if (plan === "free" || plan === "lifetime") {
    return Response.json({ error: "Team collaboration requires Pro or Studio plan" }, { status: 403 });
  }

  if (plan === "pro" && ownedGameIds.length > 0) {
    const { count } = await supabaseAdmin
      .from("game_members")
      .select("id", { count: "exact", head: true })
      .in("game_id", ownedGameIds);
    if ((count ?? 0) >= 1) {
      return Response.json({ error: "seat_limit_reached" }, { status: 403 });
    }
  }

  // Upsert invitation (resend if pending invite already exists)
  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: invitation, error: insertError } = await supabaseAdmin
    .from("game_invitations")
    .upsert(
      { game_id: gameId, email, role, invited_by: user.id, expires_at: newExpiry },
      { onConflict: "game_id,email" }
    )
    .select("id, token")
    .single();

  if (insertError || !invitation) {
    return Response.json({ error: "Failed to create invitation" }, { status: 500 });
  }

  // Send invite email directly via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const { Resend } = await import("resend");
    const { render } = await import("@react-email/components");
    const React = (await import("react")).default;
    const { TeamInvite } = await import("@/app/_lib/email/team-invite");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://studio.sherpa.app";
    const acceptUrl = `${appUrl}/invite/accept?token=${invitation.token}`;
    const inviterName =
      typeof user.user_metadata?.first_name === "string"
        ? user.user_metadata.first_name
        : user.email ?? "Someone";

    const html = await render(
      React.createElement(TeamInvite, { inviterName, gameTitle: game.title, role, acceptUrl })
    );
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: "Sherpa <hello@sherpa.app>",
      to: email,
      subject: `You've been invited to collaborate on "${game.title}" in Sherpa`,
      html,
    });
  }

  return Response.json({ ok: true }, { status: 201 });
}
```

- [ ] **Step 2: Create the resend + revoke route**

Create `app/api/invitations/[invitationId]/route.ts`:

```typescript
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { getRequestUser } from "@/app/_lib/api-auth";

async function verifyInvitationOwnership(invitationId: string, userId: string): Promise<boolean> {
  const { data: inv } = await supabaseAdmin
    .from("game_invitations")
    .select("game_id")
    .eq("id", invitationId)
    .single();
  if (!inv) return false;

  const { data: game } = await supabaseAdmin
    .from("games")
    .select("id")
    .eq("id", inv.game_id)
    .eq("user_id", userId)
    .single();
  return !!game;
}

// PATCH: resend (reset expiry)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { invitationId } = await params;
  if (!(await verifyInvitationOwnership(invitationId, user.id))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin
    .from("game_invitations")
    .update({ expires_at: newExpiry })
    .eq("id", invitationId);

  if (error) return Response.json({ error: "Failed to resend" }, { status: 500 });
  return Response.json({ ok: true });
}

// DELETE: revoke
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { invitationId } = await params;
  if (!(await verifyInvitationOwnership(invitationId, user.id))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("game_invitations")
    .delete()
    .eq("id", invitationId);

  if (error) return Response.json({ error: "Failed to revoke" }, { status: 500 });
  return Response.json({ ok: true });
}
```

- [ ] **Step 3: Create the accept route**

Create `app/api/invitations/accept/route.ts`:

```typescript
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { getRequestUser } from "@/app/_lib/api-auth";

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token } = body;
  if (typeof token !== "string") {
    return Response.json({ error: "Missing token" }, { status: 400 });
  }

  // Look up invitation
  const { data: invitation } = await supabaseAdmin
    .from("game_invitations")
    .select("id, game_id, email, role, expires_at")
    .eq("token", token)
    .single();

  if (!invitation) return Response.json({ error: "invalid_token" }, { status: 404 });

  if (new Date(invitation.expires_at) < new Date()) {
    return Response.json({ error: "expired_token" }, { status: 410 });
  }

  // Email must match the authenticated user
  if (invitation.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return Response.json({ error: "email_mismatch" }, { status: 403 });
  }

  // Already a member?
  const { data: existing } = await supabaseAdmin
    .from("game_members")
    .select("id")
    .eq("game_id", invitation.game_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Already accepted — just redirect
    await supabaseAdmin.from("game_invitations").delete().eq("id", invitation.id);
    return Response.json({ gameId: invitation.game_id });
  }

  // Create member row
  const displayName =
    typeof user.user_metadata?.first_name === "string"
      ? user.user_metadata.first_name
      : null;

  const { error: memberError } = await supabaseAdmin.from("game_members").insert({
    game_id: invitation.game_id,
    user_id: user.id,
    role: invitation.role,
    email: user.email ?? invitation.email,
    display_name: displayName,
    invited_by: null,
  });

  if (memberError) return Response.json({ error: "Failed to accept" }, { status: 500 });

  // Delete invitation
  await supabaseAdmin.from("game_invitations").delete().eq("id", invitation.id);

  return Response.json({ gameId: invitation.game_id });
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/invitations/route.ts app/api/invitations/[invitationId]/route.ts app/api/invitations/accept/route.ts
git commit -m "feat: add invitations API (list, create, resend, revoke, accept)"
```

---

## Task 7: Game transfer API route

**Files:**
- Create: `app/api/games/[gameId]/transfer/route.ts`

- [ ] **Step 1: Create the transfer route**

Create `app/api/games/[gameId]/transfer/route.ts`:

```typescript
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { getRequestUser } from "@/app/_lib/api-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { gameId } = await params;

  // Verify ownership
  const { data: game } = await supabaseAdmin
    .from("games")
    .select("id, title")
    .eq("id", gameId)
    .eq("user_id", user.id)
    .single();
  if (!game) return Response.json({ error: "Not found" }, { status: 404 });

  let body: { newOwnerEmail?: unknown; previousOwnerStaysAsEditor?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { newOwnerEmail, previousOwnerStaysAsEditor } = body;
  if (typeof newOwnerEmail !== "string" || !newOwnerEmail.includes("@")) {
    return Response.json({ error: "Invalid newOwnerEmail" }, { status: 400 });
  }
  if (newOwnerEmail.toLowerCase() === (user.email ?? "").toLowerCase()) {
    return Response.json({ error: "Cannot transfer to yourself" }, { status: 400 });
  }

  // Look up new owner in auth.users
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const newOwner = users?.users?.find(
    (u) => u.email?.toLowerCase() === newOwnerEmail.toLowerCase()
  );
  if (!newOwner) {
    return Response.json({ error: "user_not_found" }, { status: 404 });
  }

  // If previous owner stays as editor, insert them into game_members
  if (previousOwnerStaysAsEditor === true) {
    const displayName =
      typeof user.user_metadata?.first_name === "string"
        ? user.user_metadata.first_name
        : null;
    await supabaseAdmin.from("game_members").upsert(
      {
        game_id: gameId,
        user_id: user.id,
        role: "editor",
        email: user.email ?? "",
        display_name: displayName,
      },
      { onConflict: "game_id,user_id" }
    );
  }

  // Remove new owner from game_members if they were already a member
  await supabaseAdmin
    .from("game_members")
    .delete()
    .eq("game_id", gameId)
    .eq("user_id", newOwner.id);

  // Transfer ownership
  const { error } = await supabaseAdmin
    .from("games")
    .update({ user_id: newOwner.id })
    .eq("id", gameId);

  if (error) return Response.json({ error: "Transfer failed" }, { status: 500 });

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/games/[gameId]/transfer/route.ts"
git commit -m "feat: add game ownership transfer API"
```

---

## Task 8: Accept invite page

**Files:**
- Create: `app/invite/accept/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/invite/accept/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/app/_lib/supabase";

type Status = "loading" | "success" | "expired" | "invalid" | "mismatch" | "not_logged_in";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [gameId, setGameId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    async function accept() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Redirect to login, then back here
        router.push(`/login?returnUrl=${encodeURIComponent(`/invite/accept?token=${token}`)}`);
        return;
      }

      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        const data: { gameId?: string } = await res.json();
        setGameId(data.gameId ?? null);
        setStatus("success");
        // Redirect to studio after a brief moment
        setTimeout(() => {
          router.push("/");
        }, 2500);
      } else {
        const data: { error?: string } = await res.json();
        if (data.error === "expired_token") setStatus("expired");
        else if (data.error === "email_mismatch") setStatus("mismatch");
        else setStatus("invalid");
      }
    }

    accept();
  }, [token, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-6 text-center">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1e3a8a] text-lg font-bold text-white">
        S
      </div>

      {status === "loading" && (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white mb-4" />
          <p className="text-neutral-400 text-sm">Accepting invitation…</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="text-xl font-semibold text-white mb-2">You&apos;re in!</div>
          <p className="text-neutral-400 text-sm">
            You now have access to the game. Redirecting to the studio…
          </p>
        </>
      )}

      {status === "expired" && (
        <>
          <div className="text-xl font-semibold text-white mb-2">Invitation expired</div>
          <p className="text-neutral-400 text-sm">
            This invite link expired after 7 days. Ask the game owner to send a new invitation.
          </p>
        </>
      )}

      {status === "mismatch" && (
        <>
          <div className="text-xl font-semibold text-white mb-2">Wrong account</div>
          <p className="text-neutral-400 text-sm">
            This invitation was sent to a different email address. Sign in with the correct account and try again.
          </p>
          <button
            className="mt-4 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10"
            onClick={() => supabase.auth.signOut().then(() => router.push(`/login?returnUrl=${encodeURIComponent(`/invite/accept?token=${token}}`)}))}
          >
            Sign in with a different account
          </button>
        </>
      )}

      {status === "invalid" && (
        <>
          <div className="text-xl font-semibold text-white mb-2">Invalid invitation</div>
          <p className="text-neutral-400 text-sm">
            This invitation link is invalid or has already been used.
          </p>
          <a
            href="/"
            className="mt-4 inline-block rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10"
          >
            Go to studio
          </a>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/invite/accept/page.tsx
git commit -m "feat: add invite accept page"
```

---

## Task 9: TeamSection UI

**Files:**
- Modify: `app/_components/account/account-sections.tsx`

This task replaces the `TeamSection` stub (lines ~400–438) with a full implementation. The surrounding sections remain unchanged.

- [ ] **Step 1: Define types at the top of account-sections.tsx**

After the existing imports in `app/_components/account/account-sections.tsx`, add:

```typescript
// ── Team types ─────────────────────────────────────────────────
type GameSummary = { id: string; title: string };
type GameMember = { id: string; user_id: string; role: "editor" | "viewer"; email: string; display_name: string | null; joined_at: string };
type GameInvitation = { id: string; email: string; role: "editor" | "viewer"; expires_at: string; created_at: string };
```

Also add the `usePlan` import at the top of the file (alongside the existing imports — `supabase`, `React`, `useState`, `useEffect` are already there):

```typescript
import { usePlan } from "@/app/_hooks/usePlan";
```

- [ ] **Step 2: Replace the TeamSection function**

Replace the entire `TeamSection` function (from `type TeamSectionProps` to the closing `}` of the function) with:

```typescript
type TeamSectionProps = {
  userDisplayName: string;
  userEmail: string;
  userAvatarUrl?: string | null;
  userInitial: string;
};

export function TeamSection({ userDisplayName, userEmail, userAvatarUrl, userInitial }: TeamSectionProps) {
  const { hasTeamSeats, maxCollaborators } = usePlan();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [members, setMembers] = useState<GameMember[]>([]);
  const [invitations, setInvitations] = useState<GameInvitation[]>([]);
  const [totalCollaborators, setTotalCollaborators] = useState(0);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [transferStaysAsEditor, setTransferStaysAsEditor] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Load owned games
  useEffect(() => {
    supabase
      .from("games")
      .select("id, title")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = (data ?? []) as GameSummary[];
        setGames(list);
        if (list.length > 0) setSelectedGameId(list[0].id);
      });
  }, []);

  // Load members + invitations for selected game
  useEffect(() => {
    if (!selectedGameId) return;
    Promise.all([
      fetch(`/api/game-members?gameId=${selectedGameId}`).then((r) => r.json()),
      fetch(`/api/invitations?gameId=${selectedGameId}`).then((r) => r.json()),
    ]).then(([membersData, invitesData]) => {
      setMembers((membersData as { members: GameMember[]; totalCollaborators: number }).members ?? []);
      setTotalCollaborators((membersData as { totalCollaborators: number }).totalCollaborators ?? 0);
      setInvitations((invitesData as { invitations: GameInvitation[] }).invitations ?? []);
    });
  }, [selectedGameId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGameId || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: selectedGameId, email: inviteEmail.trim(), role: inviteRole }),
    });
    setInviting(false);
    if (res.ok) {
      setInviteEmail("");
      // Refresh
      const inv = await fetch(`/api/invitations?gameId=${selectedGameId}`).then((r) => r.json()) as { invitations: GameInvitation[] };
      setInvitations(inv.invitations ?? []);
    } else {
      const data = await res.json() as { error?: string };
      if (data.error === "seat_limit_reached") {
        setInviteError("You've reached the collaborator limit for your plan. Upgrade to Studio for unlimited seats.");
      } else if (data.error === "already_member") {
        setInviteError("This person is already a member of this game.");
      } else {
        setInviteError("Failed to send invitation. Please try again.");
      }
    }
  }

  async function handleRoleChange(memberId: string, role: "editor" | "viewer") {
    await fetch(`/api/game-members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
  }

  async function handleRemoveMember(memberId: string) {
    await fetch(`/api/game-members/${memberId}`, { method: "DELETE" });
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }

  async function handleResendInvitation(invitationId: string) {
    await fetch(`/api/invitations/${invitationId}`, { method: "PATCH" });
  }

  async function handleRevokeInvitation(invitationId: string) {
    await fetch(`/api/invitations/${invitationId}`, { method: "DELETE" });
    setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGameId || !transferEmail.trim()) return;
    setTransferring(true);
    setTransferError(null);
    const res = await fetch(`/api/games/${selectedGameId}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newOwnerEmail: transferEmail.trim(), previousOwnerStaysAsEditor: transferStaysAsEditor }),
    });
    setTransferring(false);
    if (res.ok) {
      // Remove this game from the local list (owner no longer owns it)
      setGames((prev) => prev.filter((g) => g.id !== selectedGameId));
      setSelectedGameId(null);
      setMembers([]);
      setInvitations([]);
      setShowTransfer(false);
      setTransferEmail("");
    } else {
      const data = await res.json() as { error?: string };
      if (data.error === "user_not_found") {
        setTransferError("No Sherpa account found for that email address.");
      } else {
        setTransferError("Transfer failed. Please try again.");
      }
    }
  }

  function memberInitial(member: GameMember) {
    return (member.display_name?.[0] ?? member.email[0] ?? "?").toUpperCase();
  }

  function memberLabel(member: GameMember) {
    return member.display_name ?? member.email;
  }

  if (!hasTeamSeats) {
    return (
      <div>
        <SectionHeader title="Team & access" description="Invite collaborators and manage their permissions." />
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-5 text-center">
          <p className="text-sm font-medium text-neutral-700 mb-1">Team collaboration requires Pro or Studio</p>
          <p className="text-xs text-neutral-400 mb-4">Pro includes 1 collaborator seat. Studio is unlimited.</p>
          <button className="rounded-full bg-neutral-900 px-5 py-2 text-xs font-semibold text-white hover:bg-neutral-800">
            See plans
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Team & access" description="Invite collaborators and manage their permissions per game." />

      {/* Game selector */}
      {games.length === 0 ? (
        <p className="text-sm text-neutral-400 mb-4">No games yet.</p>
      ) : (
        <div className="mb-4">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Manage team for
          </label>
          <select
            value={selectedGameId ?? ""}
            onChange={(e) => setSelectedGameId(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300"
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>
      )}

      {selectedGameId && (
        <>
          {/* Member list */}
          <div className="mb-3 overflow-hidden rounded-xl border border-neutral-200">
            {/* Owner row */}
            <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt={userDisplayName} className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a] text-xs font-semibold text-white">
                  {userInitial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-neutral-900">{userDisplayName || userEmail}</div>
                <div className="text-xs text-neutral-400">{userEmail}</div>
              </div>
              <span className="rounded-full bg-blue-500 px-2.5 py-1 text-[10px] font-semibold text-white">Owner</span>
            </div>

            {/* Member rows */}
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 last:border-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600">
                  {memberInitial(member)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-neutral-900">{memberLabel(member)}</div>
                  <div className="text-xs text-neutral-400">{member.email}</div>
                </div>
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value as "editor" | "viewer")}
                  className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-700 focus:outline-none"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}

            {/* Pending invitations */}
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 last:border-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-400">
                  ?
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-neutral-500 italic">{inv.email}</div>
                  <div className="text-xs text-neutral-400">Invite pending · {inv.role}</div>
                </div>
                <button onClick={() => handleResendInvitation(inv.id)} className="text-xs text-neutral-500 hover:text-neutral-700">
                  Resend
                </button>
                <button onClick={() => handleRevokeInvitation(inv.id)} className="text-xs text-red-500 hover:text-red-700">
                  Revoke
                </button>
              </div>
            ))}
          </div>

          {/* Invite form */}
          <form onSubmit={handleInvite} className="mb-2 flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              required
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {inviting ? "Sending…" : "Invite"}
            </button>
          </form>

          {inviteError && (
            <p className="mb-2 text-xs text-red-600">{inviteError}</p>
          )}

          {/* Seat counter (Pro only) */}
          {maxCollaborators === 1 && (
            <p className="mb-4 text-right text-xs text-neutral-400">
              {totalCollaborators} of 1 collaborator seat used ·{" "}
              <span className="cursor-pointer text-violet-600 hover:underline">Upgrade to Studio for unlimited</span>
            </p>
          )}

          {/* Danger zone */}
          <div className="mt-6 border-t border-neutral-100 pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Danger zone</p>
            {!showTransfer ? (
              <button
                onClick={() => setShowTransfer(true)}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-100"
              >
                Transfer game ownership…
              </button>
            ) : (
              <form onSubmit={handleTransfer} className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="mb-3 text-sm font-medium text-red-800">Transfer ownership of this game</p>
                <input
                  type="email"
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                  placeholder="New owner's email address"
                  required
                  className="mb-3 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none"
                />
                <label className="mb-3 flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={transferStaysAsEditor}
                    onChange={(e) => setTransferStaysAsEditor(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  Keep me as an Editor after transfer
                </label>
                {transferError && <p className="mb-2 text-xs text-red-700">{transferError}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={transferring || !transferEmail.trim()}
                    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {transferring ? "Transferring…" : "Confirm transfer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowTransfer(false); setTransferEmail(""); setTransferError(null); }}
                    className="rounded-lg border border-neutral-200 px-4 py-2 text-xs text-neutral-600 hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Manual verification**

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`. Sign in as `will@wbeestudio.com` (plan: `pro`). Open Account Settings → Team & Access. Verify:

- A game is selected in the dropdown
- Your user row shows with "Owner" badge
- The invite form is present
- The seat counter reads "0 of 1 collaborator seat used"
- Transfer ownership button is present

Test invite flow:
1. Invite `help@wbeestudio.com` as Editor
2. Check that the invitation appears in the pending list
3. Open the invite email and click "Accept invitation"
4. Verify the `/invite/accept` page redirects to the studio
5. Back in Account Settings → Team, verify `help@wbeestudio.com` now appears as a member

- [ ] **Step 5: Commit**

```bash
git add app/_components/account/account-sections.tsx
git commit -m "feat: implement TeamSection — invite, manage, transfer ownership"
```

---

## Task 10: Run full test suite

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass (usePlan tests + inject-links tests + warm-game-cache tests).

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.
