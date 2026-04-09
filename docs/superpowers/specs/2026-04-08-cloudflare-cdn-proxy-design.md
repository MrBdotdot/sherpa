# CDN Proxy (Cloudflare Full Proxy) — Design Spec

**Date:** 2026-04-08
**Status:** Approved

## Context

Image traffic currently flows directly from player browsers to Supabase Storage, with no caching layer. Every player downloads every image from Supabase on every session — charged as egress at $0.09/GB beyond the Pro tier's 250GB/month included. A viral game with 5,000 sessions could consume 35GB in a weekend from a single publisher. This spec puts Cloudflare in front of all traffic — the app (via Vercel) and images (via Supabase Storage) — caching images at the edge and flattening the egress cost curve to near-zero.

## Scope

- Register `sherpa.app` through Cloudflare Registrar
- Connect Vercel deployment to `sherpa.app` via Cloudflare DNS (full proxy)
- Cloudflare Worker for Supabase Storage image proxy at `assets.sherpa.app`
- SSL/TLS configuration to prevent redirect loops
- Image URL rewrite in `supabase-storage.ts` to use `assets.sherpa.app`
- Full DNS record set including Resend email records (Spec B)

**Out of scope:** Cloudflare Workers beyond image proxy, advanced security rules, rate limiting, analytics configuration (available in Cloudflare dashboard by default).

## Domain registration

Register `sherpa.app` via Cloudflare Registrar (cloudflare.com/products/registrar). Cost: ~$10/year at-cost, no markup. Cloudflare becomes authoritative DNS provider from day one — no migration from another registrar needed.

## Vercel connection

Add `sherpa.app` as a custom domain in the Vercel project dashboard. Vercel provides a CNAME target.

### DNS records — app routing

| Type | Name | Value | Proxied |
|------|------|-------|---------|
| CNAME | `sherpa.app` | `cname.vercel-dns.com` | Yes (orange cloud) |
| CNAME | `www` | `cname.vercel-dns.com` | Yes (orange cloud) |

**Proxied (orange cloud)** means all traffic routes through Cloudflare before reaching Vercel — enabling caching, DDoS protection, and unified analytics.

## SSL/TLS configuration

Cloudflare dashboard → SSL/TLS → Overview: set mode to **Full** (not Full Strict).

- **Full** — Cloudflare encrypts traffic to Vercel using Vercel's certificate (valid, but not verified against Cloudflare's CA)
- **Full Strict** — requires a Cloudflare Origin CA certificate on Vercel — unnecessary complexity
- **Flexible** — do NOT use — causes redirect loops between Cloudflare and Vercel's forced HTTPS

## Supabase image proxy (Cloudflare Worker)

### Worker route
`assets.sherpa.app/*` → Worker rewrites to Supabase Storage public URL and returns cached response.

### Worker logic
```ts
// Cloudflare Worker — assets.sherpa.app
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const supabaseUrl = `https://<project>.supabase.co/storage/v1/object/public/sherpa-images${url.pathname}`;
    const response = await fetch(supabaseUrl, { cf: { cacheEverything: true, cacheTtl: 2592000 } });
    return response;
  }
}
```

Cache TTL: **30 days** (2,592,000 seconds). Safe because image filenames include a timestamp + random ID (set in A1 spec) — a re-uploaded image gets a new URL, so stale cache is never served.

### DNS record — image CDN
| Type | Name | Value | Proxied |
|------|------|-------|---------|
| CNAME | `assets` | `<worker>.workers.dev` | Yes |

## Image URL rewrite — `supabase-storage.ts`

After a successful upload, `getPublicUrl()` returns the direct Supabase URL. Rewrite it to the `assets.sherpa.app` equivalent before returning to the caller:

```ts
// Before:
const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
return data.publicUrl;
// → https://<project>.supabase.co/storage/v1/object/public/sherpa-images/<path>

// After:
return `https://assets.sherpa.app/${path}`;
```

All four upload hooks receive the rewritten URL and store it in the game data. Existing images stored with the direct Supabase URL continue to work — Supabase Storage remains publicly accessible as a fallback. New uploads use `assets.sherpa.app` from this point forward.

## Page caching

Cloudflare respects `Cache-Control` headers set by Vercel:
- Static assets (JS bundles, CSS, fonts): cached at Cloudflare edge automatically — reduces Vercel bandwidth usage
- `/play/[gameId]` (dynamic): `Cache-Control: no-store` — Cloudflare passes through to Vercel, not cached
- Images via `assets.sherpa.app`: 30-day cache as above

No additional Cloudflare cache configuration needed for the app.

## Full DNS record set

All records for `sherpa.app` in Cloudflare DNS:

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| CNAME | `sherpa.app` | `cname.vercel-dns.com` | App → Vercel |
| CNAME | `www` | `cname.vercel-dns.com` | www → Vercel |
| CNAME | `assets` | `<worker>.workers.dev` | Image CDN |
| TXT | `@` | SPF record (from Resend) | Email sending auth |
| TXT | `resend._domainkey` | DKIM record (from Resend) | Email signing |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:admin@sherpa.app` | Email monitoring |

## Cost

| Item | Cost |
|------|------|
| Domain registration | ~$10/year |
| Cloudflare proxy + DNS | Free |
| Cloudflare Worker (image proxy) | Free (100,000 requests/day on free tier) |
| Cloudflare Workers paid tier | $5/month if exceeding 100k requests/day — only relevant at significant scale |

At 10,000 player sessions/month with ~10 image requests per session = 100,000 image requests/month = ~3,300/day. Well within the free tier.

## Files changed

| File / Location | Change |
|----------------|--------|
| `app/_lib/supabase-storage.ts` | Rewrite returned URL from Supabase domain to `assets.sherpa.app` |
| `next.config.ts` | Add `assets.sherpa.app` to `images.remotePatterns` (alongside Supabase domain) |
| Cloudflare dashboard | Register domain, add DNS records, configure SSL mode, deploy Worker |
| Vercel dashboard | Add `sherpa.app` custom domain |

## Verification

1. Load `https://sherpa.app` — confirm app loads correctly, SSL padlock shown
2. Load `https://www.sherpa.app` — confirm redirects to `sherpa.app`
3. Upload a new image in the studio — confirm stored URL uses `assets.sherpa.app` domain
4. Load a published game as a player — confirm images load from `assets.sherpa.app` in network tab
5. Load the same game twice — confirm second load shows images served from Cloudflare cache (check `CF-Cache-Status: HIT` response header)
6. Check Cloudflare analytics dashboard — confirm requests are being counted
7. Check Supabase Storage bandwidth — confirm it drops after caching warms up
8. Confirm existing images stored with direct Supabase URLs still load correctly
