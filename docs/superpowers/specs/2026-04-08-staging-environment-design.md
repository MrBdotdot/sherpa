# Staging Environment — Design Spec

**Date:** 2026-04-08
**Status:** Approved

## Context

All code changes currently ship directly to production (`sherpa.app`) on every push to `main`. A bug in a deployment is immediately visible to publishers. This spec adds a staging environment (`staging.sherpa.app`) — a rehearsal space where code changes are deployed and tested before being promoted to production. Publishers never interact with staging. It is purely a developer tool for validating changes safely before they reach real users.

## Scope

- `staging` branch in GitHub, protected from direct pushes
- Vercel staging environment pointing at `staging.sherpa.app`
- Separate Supabase project for staging data isolation
- Dedicated environment variables for staging
- DNS record in Cloudflare for `staging.sherpa.app`
- Documented day-to-day workflow

**Out of scope:** Publisher draft/publish/revert workflow (Spec K), automated testing pipelines, CI/CD beyond what Vercel provides natively.

## Branch structure

| Branch | Deploys to | Purpose |
|--------|-----------|---------|
| `main` | `sherpa.app` | Production — what publishers use |
| `staging` | `staging.sherpa.app` | Staging — developer testing before promotion |
| Feature branches | Vercel preview URL | Per-change previews, short-lived |

Both `main` and `staging` are **protected branches** in GitHub:
- No direct pushes allowed
- All changes arrive via pull request
- PRs into `main` must come from `staging` (or hotfix branches for urgent production fixes)

## Day-to-day workflow

```
1. Create feature branch from staging
2. Write code
3. Open PR → staging
4. Vercel builds and deploys to staging.sherpa.app automatically
5. Test on staging.sherpa.app against staging Supabase
6. Merge PR into staging
7. Open PR: staging → main
8. Final review — confirm staging.sherpa.app looks correct
9. Merge into main → ships to sherpa.app
```

Hotfix exception: urgent production bugs can be branched from `main`, fixed, merged directly to `main`, then back-merged to `staging` to keep branches in sync.

## Vercel configuration

Vercel supports multiple Git branch environments natively. In the Vercel project dashboard:

1. Add `staging` branch as a separate environment
2. Assign custom domain `staging.sherpa.app` to the staging environment
3. Set staging-specific environment variables (see below)

Vercel builds and deploys automatically on every push to `staging` — no additional CI configuration needed.

## Supabase — separate staging project

Staging gets its own Supabase project, completely isolated from production. This ensures:
- Test data doesn't pollute production
- Destructive migrations can be tested safely
- RLS changes can be validated without risking real publisher data

The staging Supabase schema mirrors production. When a migration is written, it is run on staging first, verified, then run on production.

## Environment variables

Two complete sets — one per environment. Set in Vercel dashboard per environment.

| Variable | Production | Staging |
|----------|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production Supabase URL | Staging Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production anon key | Staging anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production service role | Staging service role |
| `NEXT_PUBLIC_SENTRY_DSN` | Production DSN | Same DSN — tagged `environment: "staging"` in Sentry config |
| `RESEND_API_KEY` | Production Resend key | Same key — Resend free tier covers both |
| `NEXT_PUBLIC_BASE_DOMAIN` | `sherpa.app` | `staging.sherpa.app` |
| `NEXT_PUBLIC_SHERPA_BUILD_DOMAIN` | `sherpa.build` | `staging.sherpa.build` (or omit — subdomain routing not needed on staging) |

## DNS — Cloudflare (`sherpa.app` zone)

One new record:

| Type | Name | Value | Proxied |
|------|------|-------|---------|
| CNAME | `staging` | `cname.vercel-dns.com` | Yes |

## No code changes required

This spec is entirely configuration — GitHub branch settings, Vercel environment setup, Supabase project creation, DNS record, and environment variables. Zero application code changes.

## Files changed

| Location | Change |
|----------|--------|
| GitHub repository settings | Protect `main` and `staging` branches, require PRs |
| Vercel dashboard | Add staging environment, assign `staging.sherpa.app`, set env vars |
| Supabase dashboard | Create new staging project, run schema migrations |
| Cloudflare DNS | Add `staging` CNAME record |

## Verification

1. Push a change to the `staging` branch — confirm Vercel builds and deploys to `staging.sherpa.app` automatically
2. Confirm `staging.sherpa.app` loads correctly with staging Supabase data
3. Confirm `sherpa.app` (production) is unaffected by changes on `staging`
4. Attempt a direct push to `main` — confirm GitHub blocks it
5. Attempt a direct push to `staging` — confirm GitHub blocks it
6. Confirm Sentry errors from `staging.sherpa.app` are tagged `environment: staging` in the dashboard
7. Merge `staging` → `main` via PR — confirm production deploys correctly
