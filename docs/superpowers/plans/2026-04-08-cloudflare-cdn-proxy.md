# Cloudflare CDN Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route all sherpa.app traffic through Cloudflare to eliminate direct Supabase Storage egress costs by proxying and caching images at the edge.
**Architecture:** Register `sherpa.app` through Cloudflare Registrar so Cloudflare is authoritative DNS from day one; point the app at Vercel via CNAME with the orange-cloud proxy enabled; deploy a Cloudflare Worker at `assets.sherpa.app` that rewrites requests to the Supabase Storage public URL and caches responses for 30 days.
**Tech Stack:** Cloudflare Registrar, Cloudflare DNS, Cloudflare Workers (free tier), Vercel custom domains, Supabase Storage (unchanged as origin), Next.js `next/image`.

---

### Task 1: Register sherpa.app via Cloudflare Registrar

**Files:**
- Manual: Cloudflare dashboard

- [ ] Step 1: Go to [cloudflare.com](https://cloudflare.com) and log in. In the left sidebar click **Domain Registration → Register Domains**.
- [ ] Step 2: Search for `sherpa.app`. Confirm the price (~$10/year) and complete checkout. Cloudflare becomes the authoritative DNS provider immediately — no nameserver migration needed.
- [ ] Step 3: Verify: In **Domain Registration → Manage Domains** confirm `sherpa.app` appears with status **Active**.

---

### Task 2: Configure SSL/TLS mode

**Files:**
- Manual: Cloudflare dashboard

- [ ] Step 1: In the Cloudflare dashboard, select the `sherpa.app` zone. Go to **SSL/TLS → Overview**.
- [ ] Step 2: Set the encryption mode to **Full** (not Full Strict, not Flexible). This tells Cloudflare to encrypt the connection to Vercel using Vercel's certificate without requiring Cloudflare Origin CA validation. Flexible must not be used — it causes redirect loops with Vercel's forced HTTPS.
- [ ] Step 3: Verify: The selected tile reads "Full" and shows a checkmark.

---

### Task 3: Add Vercel custom domain

**Files:**
- Manual: Vercel dashboard

- [ ] Step 1: Go to [vercel.com](https://vercel.com), open the Sherpa project, and navigate to **Settings → Domains**.
- [ ] Step 2: Click **Add**, enter `sherpa.app`, and confirm. Vercel will show the required CNAME target: `cname.vercel-dns.com`.
- [ ] Step 3: Repeat for `www.sherpa.app` — add it as a second custom domain. Vercel will configure it to redirect to `sherpa.app`.
- [ ] Step 4: Verify: Both domains show status **Invalid Configuration** for now — this is expected until DNS records are added in the next task.

---

### Task 4: Add DNS records for app routing

**Files:**
- Manual: Cloudflare dashboard

- [ ] Step 1: In the Cloudflare dashboard for `sherpa.app`, go to **DNS → Records** and click **Add record**.
- [ ] Step 2: Add the apex record:
  - Type: `CNAME`
  - Name: `sherpa.app` (Cloudflare will display this as `@`)
  - Target: `cname.vercel-dns.com`
  - Proxy status: **Proxied** (orange cloud ON)
  - TTL: Auto
- [ ] Step 3: Add the www record:
  - Type: `CNAME`
  - Name: `www`
  - Target: `cname.vercel-dns.com`
  - Proxy status: **Proxied** (orange cloud ON)
  - TTL: Auto
- [ ] Step 4: Verify: In the Vercel dashboard under **Settings → Domains**, both `sherpa.app` and `www.sherpa.app` should switch to **Valid Configuration** within a few minutes. If they remain invalid after 5 minutes, confirm the proxy status is orange (not grey) in Cloudflare DNS.
- [ ] Step 5: Open `https://sherpa.app` in a browser. Confirm the app loads and the browser shows a valid SSL padlock. Open `https://www.sherpa.app` and confirm it redirects to `https://sherpa.app`.

---

### Task 5: Deploy Cloudflare Worker for image proxy

**Files:**
- Manual: Cloudflare dashboard (Workers editor)

- [ ] Step 1: In the Cloudflare dashboard, go to **Workers & Pages → Overview** and click **Create application → Create Worker**.
- [ ] Step 2: Name the worker `sherpa-image-proxy` and click **Deploy** (deploys the default hello-world stub).
- [ ] Step 3: Click **Edit code** to open the inline editor. Replace all contents with the following Worker script. Replace `<project>` with the actual Supabase project ref (found in the Supabase dashboard under **Project Settings → General → Reference ID**, e.g. `abcdefghijklmnop`):

```ts
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const supabaseUrl = `https://<project>.supabase.co/storage/v1/object/public/sherpa-images${url.pathname}`;
    const response = await fetch(supabaseUrl, {
      cf: { cacheEverything: true, cacheTtl: 2592000 },
    });
    return response;
  },
};
```

- [ ] Step 4: Click **Save and deploy**. Confirm the editor shows "Deployed successfully".
- [ ] Step 5: Verify by opening the worker's preview URL (`sherpa-image-proxy.<account>.workers.dev`) and appending a known image path from Supabase Storage. Confirm the image loads. Note the `workers.dev` subdomain shown on the Worker overview page — you'll need it in the next task.

---

### Task 6: Add assets DNS record and route Worker

**Files:**
- Manual: Cloudflare dashboard

- [ ] Step 1: In **DNS → Records**, add the assets record:
  - Type: `CNAME`
  - Name: `assets`
  - Target: `sherpa-image-proxy.<account>.workers.dev` (use the exact subdomain from Task 5 Step 5)
  - Proxy status: **Proxied** (orange cloud ON)
  - TTL: Auto
- [ ] Step 2: In the Worker settings (**Workers & Pages → sherpa-image-proxy → Settings → Triggers**), click **Add Custom Domain** and enter `assets.sherpa.app`. Click **Add Custom Domain** to confirm. Cloudflare will provision a certificate automatically.
- [ ] Step 3: Verify: Navigate to `https://assets.sherpa.app/<known-image-path>` in a browser (use a path from Supabase Storage, e.g. `userId/gameId/timestamp_randomid.jpg`). Confirm the image loads over HTTPS. Check the response headers — `CF-Cache-Status` will be `MISS` on first load.

---

### Task 7: Add email DNS records (Resend)

**Files:**
- Manual: Cloudflare dashboard and Resend dashboard

- [ ] Step 1: In the [Resend dashboard](https://resend.com), go to **Domains → Add Domain** and enter `sherpa.app`. Resend will display the required DNS records: one SPF TXT on `@`, one DKIM TXT on `resend._domainkey`, and optionally a DMARC record.
- [ ] Step 2: In Cloudflare **DNS → Records**, add the SPF record:
  - Type: `TXT`
  - Name: `@`
  - Content: paste the exact SPF value from Resend (e.g. `v=spf1 include:amazonses.com ~all`)
  - Proxy status: DNS Only (grey cloud — TXT records cannot be proxied)
- [ ] Step 3: Add the DKIM record:
  - Type: `TXT`
  - Name: `resend._domainkey`
  - Content: paste the exact DKIM value from Resend
  - Proxy status: DNS Only
- [ ] Step 4: Add the DMARC record:
  - Type: `TXT`
  - Name: `_dmarc`
  - Content: `v=DMARC1; p=none; rua=mailto:admin@sherpa.app`
  - Proxy status: DNS Only
- [ ] Step 5: Back in the Resend dashboard, click **Verify**. Confirm all records show a green checkmark. DNS propagation can take up to 10 minutes.

---

### Task 8: Rewrite image URLs in supabase-storage.ts

**Files:**
- Modify: `app/_lib/supabase-storage.ts`

- [ ] Step 1: Open `app/_lib/supabase-storage.ts`. The current `uploadImage` function ends with:

```ts
const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
return data.publicUrl;
```

Replace those two lines with:

```ts
supabase.storage.from(BUCKET).getPublicUrl(path); // validates path exists
return `https://assets.sherpa.app/${path}`;
```

The full function after the change:

```ts
export async function uploadImage(
  file: File,
  userId: string,
  gameId: string
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${gameId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  supabase.storage.from(BUCKET).getPublicUrl(path); // validates path exists
  return `https://assets.sherpa.app/${path}`;
}
```

- [ ] Step 2: Verify: Upload a test image in the studio. Open browser DevTools → Network and find the upload response. Confirm the returned URL begins with `https://assets.sherpa.app/`.
- [ ] Step 3: Verify backwards compatibility: Load a game that has images with the old direct Supabase URL (format: `https://<project>.supabase.co/storage/v1/object/public/sherpa-images/...`). Confirm the images still render correctly — Supabase Storage remains publicly accessible as a fallback origin.
- [ ] Step 4: Commit.

---

### Task 9: Add assets.sherpa.app to next/image remote patterns

**Files:**
- Modify: `next.config.ts`

- [ ] Step 1: Open `next.config.ts`. The current config has no `images` key. Add a `images.remotePatterns` entry for both the CDN domain and the Supabase origin (so existing stored URLs continue to work with `next/image`):

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.sherpa.app",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] Step 2: Run `npm run build` locally and confirm no build errors related to image hostnames.
- [ ] Step 3: Verify: In a local dev session (`npm run dev`), open a page that renders a `next/image` component using an `assets.sherpa.app` URL and confirm the image loads without a console error about unauthorized hostnames.
- [ ] Step 4: Commit.

---

### Task 10: End-to-end verification

**Files:**
- No file changes — verification only

- [ ] Step 1: Load `https://sherpa.app` in an incognito window. Confirm the app loads, SSL padlock is shown, and the URL remains `sherpa.app` (not redirected to Vercel's `.vercel.app` domain).
- [ ] Step 2: Load `https://www.sherpa.app`. Confirm it redirects to `https://sherpa.app`.
- [ ] Step 3: In the authoring studio, upload a new image. In DevTools → Network, locate the uploaded image URL in the response. Confirm it starts with `https://assets.sherpa.app/`.
- [ ] Step 4: Open a published game as a player. In DevTools → Network, filter by image type. Confirm all game images are served from `assets.sherpa.app`. Check the response headers and note `CF-Cache-Status: MISS` (first request, cold cache).
- [ ] Step 5: Hard-reload the same player page (Ctrl+Shift+R). Check image response headers again. Confirm `CF-Cache-Status: HIT` — images are now served from Cloudflare's edge cache.
- [ ] Step 6: In the Cloudflare dashboard → `sherpa.app` zone → **Analytics & Logs → Traffic**, confirm request counts are increasing for both the zone and the Worker.
- [ ] Step 7: Open a game that still has images stored with the old direct Supabase URL. Confirm those images load correctly (backwards compatibility check).
- [ ] Step 8: Monitor Supabase dashboard → **Storage → Usage** over the next 24–48 hours. Confirm bandwidth numbers decline as Cloudflare cache warms up.
