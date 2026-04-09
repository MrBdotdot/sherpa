# Error Monitoring (Sentry) — Design Spec

**Date:** 2026-04-08
**Status:** Approved

## Context

Errors in the authoring studio and play route are currently invisible unless a user reports them. A publisher locked out of the studio or a player hitting a broken experience may never surface the issue. This spec adds Sentry error monitoring to both surfaces so crashes are captured with full stack traces, file names, and line numbers — enabling diagnosis before users give up and leave.

## Scope

- Sentry Next.js SDK via wizard setup
- Error capture on client (studio + play route), server (API routes), and edge (middleware)
- Error boundary integration in `error-recovery-shell.tsx`
- Source maps configured for readable stack traces
- Noise filtering for non-actionable errors
- Email alerts on new issues (Sentry default)

**Out of scope:** Performance tracing, session replay, Slack/Discord notifications (deferred until team grows), user feedback widget.

## Setup

### Wizard
```bash
npx @sentry/wizard@latest -i nextjs
```

The wizard generates:
- `sentry.client.config.ts` — browser-side SDK init
- `sentry.server.config.ts` — server-side SDK init  
- `sentry.edge.config.ts` — edge runtime SDK init
- `instrumentation.ts` — Next.js instrumentation hook
- Modifies `next.config.ts` to wrap with `withSentryConfig()`

### Environment variables
- `NEXT_PUBLIC_SENTRY_DSN` — added to `.env.local` and Vercel environment variables
- `SENTRY_AUTH_TOKEN` — added to Vercel environment variables for source map uploads during CI builds

### Sentry project settings
- Free tier (5,000 error events/month)
- Alert: email to account owner on first occurrence of a new issue (default)
- No Slack/Discord integration — revisit when team grows, Discord preferred

## What gets captured

| Surface | Runtime | Examples |
|---------|---------|---------|
| Authoring studio | Client (browser) | Uncaught React errors, unhandled promise rejections, Supabase save failures |
| Play route | Client (browser) | Game load failures, render errors, missing data |
| API routes | Server (Node) | `/api/email/send` errors, `/api/bgg` failures |
| Middleware | Edge | Routing failures |

## Error boundary integration

`app/_components/error-recovery-shell.tsx` — add `Sentry.captureException(error)` call inside the error handler. This ensures errors caught by the boundary (which would otherwise be swallowed and only show the recovery UI) are reported to Sentry with full context before the user sees the fallback screen.

```ts
// Inside error-recovery-shell.tsx error handler:
Sentry.captureException(error, { extra: { componentStack } });
```

## Noise filtering — `sentry.client.config.ts`

Suppress three categories of non-actionable errors:

```ts
ignoreErrors: [
  // User connectivity issues — not our bugs
  'NetworkError',
  'Failed to fetch',
  'Load failed',
  // Supabase auth token expiry — handled gracefully by existing refresh logic
  'Invalid Refresh Token',
  'Refresh Token Not Found',
  // Browser extension interference
  /^chrome-extension:\/\//,
  /^moz-extension:\/\//,
],
```

## Source maps

`withSentryConfig()` in `next.config.ts` uploads source maps to Sentry on every production build. Source map files are deleted after upload and not served publicly. Stack traces in the Sentry dashboard show actual file paths and line numbers (e.g. `player-view.tsx:178`) rather than minified bundle references.

## Sampling

- **Error events:** 100% — capture all errors. At current scale, volume is negligible relative to the 5,000/month free tier limit.
- **Performance tracing:** disabled (`tracesSampleRate: 0`). Adds overhead with no pre-launch benefit.

## Files changed

| File | Change |
|------|--------|
| `sentry.client.config.ts` | New — browser SDK init with noise filters |
| `sentry.server.config.ts` | New — server SDK init |
| `sentry.edge.config.ts` | New — edge SDK init |
| `instrumentation.ts` | New — Next.js instrumentation hook |
| `next.config.ts` | Wrapped with `withSentryConfig()` |
| `app/_components/error-recovery-shell.tsx` | Add `Sentry.captureException()` in error handler |
| `.env.local` | Add `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` |
| Vercel dashboard | Add both env vars to production environment |

## Dependencies

```bash
npm install @sentry/nextjs
```

(Installed automatically by the wizard)

## Verification

1. Trigger a deliberate error in the studio (e.g. temporarily throw in a component) — confirm it appears in Sentry dashboard with correct file name and line number
2. Trigger a deliberate error in the play route — confirm it appears separately in Sentry
3. Confirm source maps are working — stack trace shows `tsx` file names, not minified bundle references
4. Confirm `Failed to fetch` errors do not appear in Sentry when going offline
5. Confirm Supabase token refresh errors do not appear in Sentry
6. Confirm email alert arrives on first new issue detection
7. Confirm source map files are not publicly accessible (404 on direct URL access)
