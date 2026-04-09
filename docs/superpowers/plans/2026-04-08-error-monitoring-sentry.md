# Error Monitoring (Sentry) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Sentry into the Sherpa authoring interface so all client, server, and edge errors are captured with readable stack traces and noise-filtered to actionable signals only.
**Architecture:** The Sentry Next.js wizard generates four SDK init files and wraps `next.config.ts` with `withSentryConfig()`; the client config is then edited to add noise filters and disable performance tracing; `app/error.tsx` (which calls `ErrorRecoveryShell`) is updated to call `Sentry.captureException` so caught React errors are forwarded before the fallback UI is shown.
**Tech Stack:** @sentry/nextjs, Next.js App Router, Vercel (CI source map uploads via SENTRY_AUTH_TOKEN)

---

### Task 1: Run the Sentry wizard

**Files:**
- Create: `sentry.client.config.ts` (generated)
- Create: `sentry.server.config.ts` (generated)
- Create: `sentry.edge.config.ts` (generated)
- Create: `instrumentation.ts` (generated)
- Modify: `next.config.ts` (wizard wraps export with `withSentryConfig()`)

- [ ] Step 1: From the project root, run the Sentry wizard — accept all defaults when prompted, enter the DSN when the wizard asks for it:
  ```bash
  npx @sentry/wizard@latest -i nextjs
  ```
  The wizard installs `@sentry/nextjs`, generates the four config files listed above, and modifies `next.config.ts`.

- [ ] Step 2: Verify the four generated files exist and `next.config.ts` now imports `withSentryConfig`:
  ```bash
  ls sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts instrumentation.ts
  grep withSentryConfig next.config.ts
  ```
  Expected: all four files present; grep prints at least one match.

- [ ] Step 3: Run: `npm run build` — Expected: clean build with no type errors. (Source map upload will fail because `SENTRY_AUTH_TOKEN` is not set yet — that is expected at this step.)

- [ ] Step 4: Commit:
  ```
  feat: install Sentry via wizard (client/server/edge configs + next.config wrap)
  ```

---

### Task 2: Add environment variables

**Files:**
- Modify: `.env.local`

- [ ] Step 1: Append the two Sentry env vars to `.env.local`:
  ```
  NEXT_PUBLIC_SENTRY_DSN=<paste DSN from Sentry project settings → Client Keys>
  SENTRY_AUTH_TOKEN=<paste token from Sentry org settings → Auth Tokens → Create Internal Integration>
  ```
  The DSN looks like `https://abc123@o123456.ingest.sentry.io/789`. The auth token needs the scopes `project:releases` and `org:read`.

- [ ] Step 2: Add both variables to Vercel — go to Project → Settings → Environment Variables and add:
  - `NEXT_PUBLIC_SENTRY_DSN` — all environments (Production, Preview, Development)
  - `SENTRY_AUTH_TOKEN` — Production and Preview only (used during CI builds for source map upload)

- [ ] Step 3: Confirm `.env.local` is listed in `.gitignore` so the token is never committed:
  ```bash
  grep ".env.local" .gitignore
  ```
  Expected: `.env.local` appears. If it does not, add it.

---

### Task 3: Configure noise filters and disable performance tracing in `sentry.client.config.ts`

**Files:**
- Modify: `sentry.client.config.ts`

- [ ] Step 1: Open `sentry.client.config.ts`. Locate the `Sentry.init({})` call. Add `tracesSampleRate: 0` and the `ignoreErrors` array so the init block reads:
  ```ts
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0,
    ignoreErrors: [
      // User connectivity issues — not our bugs
      "NetworkError",
      "Failed to fetch",
      "Load failed",
      // Supabase auth token expiry — handled by existing refresh logic
      "Invalid Refresh Token",
      "Refresh Token Not Found",
      // Browser extension interference
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
    ],
  });
  ```
  Remove any `tracesSampleRate`, `tracePropagationTargets`, or `replaysSessionSampleRate` lines the wizard may have generated; keep everything else (e.g. `debug` flag, `environment`).

- [ ] Step 2: Run: `npm run build` — Expected: clean build.

- [ ] Step 3: Commit:
  ```
  feat: configure Sentry noise filters and disable performance tracing
  ```

---

### Task 4: Confirm `sentry.server.config.ts` and `sentry.edge.config.ts` have `tracesSampleRate: 0`

**Files:**
- Modify: `sentry.server.config.ts`
- Modify: `sentry.edge.config.ts`

- [ ] Step 1: Open `sentry.server.config.ts`. Ensure `tracesSampleRate: 0` is present in the `Sentry.init()` call. Add it if the wizard generated a non-zero value.

- [ ] Step 2: Open `sentry.edge.config.ts`. Apply the same change — set `tracesSampleRate: 0`.

- [ ] Step 3: Run: `npm run build` — Expected: clean build.

- [ ] Step 4: Commit:
  ```
  feat: disable performance tracing on server and edge Sentry configs
  ```

---

### Task 5: Wire Sentry into `app/error.tsx`

**Files:**
- Modify: `app/error.tsx`

The file currently logs the error to the console but does not forward it to Sentry. The `error.tsx` boundary is what Next.js calls when a segment throws; this is distinct from `error-recovery-shell.tsx` which is the pure presentational component. The capture call belongs in `error.tsx`.

- [ ] Step 1: Add the Sentry import and replace the bare `console.error` with a `Sentry.captureException` call. The full updated file:
  ```tsx
  "use client";

  import { useEffect } from "react";
  import * as Sentry from "@sentry/nextjs";
  import { ErrorRecoveryShell } from "@/app/_components/error-recovery-shell";

  export default function Error({
    error,
    unstable_retry,
  }: {
    error: Error & { digest?: string };
    unstable_retry: () => void;
  }) {
    useEffect(() => {
      Sentry.captureException(error, {
        extra: { digest: error.digest },
      });
    }, [error]);

    return (
      <ErrorRecoveryShell
        title="The workspace hit an unexpected snag."
        message="Sherpa caught the error before the entire app blanked out. Try the recovery action below, then jump back into your rules experience."
        digest={error.digest}
        onRetry={unstable_retry}
      />
    );
  }
  ```

- [ ] Step 2: Run: `npm run build` — Expected: clean build with no type errors.

- [ ] Step 3: Commit:
  ```
  feat: forward React error boundary exceptions to Sentry
  ```

---

### Task 6: Verify end-to-end in development

**Files:** (no file changes — verification only)

- [ ] Step 1: Start the dev server:
  ```bash
  npm run dev
  ```

- [ ] Step 2: Trigger a deliberate client error in the studio. One way — temporarily add a throw to any rendered component, e.g. in `app/_components/authoring-studio.tsx`:
  ```ts
  throw new Error("sentry-test: deliberate studio error");
  ```
  Navigate to the studio route. Confirm the `ErrorRecoveryShell` fallback appears.

- [ ] Step 3: Open the Sentry dashboard → Issues. Confirm the `sentry-test: deliberate studio error` event appears with:
  - correct file name (`authoring-studio.tsx`) and line number in the stack trace
  - `digest` in the extra context

- [ ] Step 4: Remove the deliberate throw and save the file.

- [ ] Step 5: Simulate offline by disabling the network in DevTools. Perform an action that would normally trigger a fetch. Confirm no new issues appear in Sentry for `Failed to fetch` or `NetworkError`.

- [ ] Step 6: Confirm source maps are working on a production build — run:
  ```bash
  npm run build && npm run start
  ```
  Trigger a test error, check the Sentry issue. Stack trace should show `.tsx` file names and real line numbers, not minified bundle identifiers.

- [ ] Step 7: Commit any cleanup (removal of test throw if not already removed):
  ```
  chore: remove Sentry verification test throw
  ```

---

### Task 7: Verify source maps are not publicly served

**Files:** (no file changes — verification only)

- [ ] Step 1: After a production build, find the generated source map file path. It will be under `.next/static/chunks/` with a `.js.map` extension.

- [ ] Step 2: With the production server running (`npm run start`), attempt to fetch the source map directly:
  ```bash
  curl -I http://localhost:3000/_next/static/chunks/<bundle-name>.js.map
  ```
  Expected: `404 Not Found`. The `withSentryConfig()` wrapper deletes source maps from the public build output after uploading them to Sentry.

---

## Environment variable reference

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | `.env.local` + Vercel (all envs) | Tells the browser SDK which project to send errors to |
| `SENTRY_AUTH_TOKEN` | `.env.local` + Vercel (prod + preview) | Allows `withSentryConfig()` to upload source maps during CI builds |

## Files changed summary

| File | Change |
|---|---|
| `sentry.client.config.ts` | Generated by wizard; edited to add noise filters and `tracesSampleRate: 0` |
| `sentry.server.config.ts` | Generated by wizard; edited to set `tracesSampleRate: 0` |
| `sentry.edge.config.ts` | Generated by wizard; edited to set `tracesSampleRate: 0` |
| `instrumentation.ts` | Generated by wizard; no manual edits needed |
| `next.config.ts` | Wrapped with `withSentryConfig()` by wizard |
| `app/error.tsx` | Adds `Sentry.captureException(error, { extra: { digest } })` in `useEffect` |
| `.env.local` | Adds `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` |
| Vercel dashboard | Both env vars added to production environment |
