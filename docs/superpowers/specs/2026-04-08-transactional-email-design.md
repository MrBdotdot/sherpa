# Transactional Email — Design Spec

**Date:** 2026-04-08
**Status:** Approved

## Context

Supabase's default email infrastructure is rate-limited (2 emails/hour on free tier), unbranded, and not under our control. Password reset is a tester milestone blocker. Welcome emails improve activation. Billing emails are required before charging money. This spec wires up Resend as the transactional email provider for all four email types, with billing emails stubbed and ready for the Stripe integration.

## Scope

- Resend account + domain verification via Cloudflare DNS
- Supabase custom SMTP → Resend for auth emails
- React Email templates for all four email types
- Single `/api/email/send` API route
- Welcome email trigger on confirmed sign-up
- Billing email stub (501 until Stripe lands)

**Out of scope:** Stripe integration, notification preference emails (UI toggles exist but are deferred), marketing/broadcast emails.

## Infrastructure

### Resend setup
- Provider: Resend (free tier — 3,000 emails/month, no credit card required)
- Sending domain: `sherpa.app`
- From address: `hello@sherpa.app`
- API key: `RESEND_API_KEY` in `.env.local` (and Vercel environment variables)

### Cloudflare DNS records
Three records added to the `sherpa.app` zone in Cloudflare:
- **SPF** — TXT record authorising Resend to send on behalf of the domain
- **DKIM** — TXT record for cryptographic signing (provided by Resend dashboard)
- **DMARC** — TXT record `v=DMARC1; p=none; rua=mailto:admin@sherpa.app` (monitoring mode to start)

### Supabase custom SMTP
Configured in Supabase Dashboard → Auth → SMTP Settings:
- Host: `smtp.resend.com`
- Port: 465
- Username: `resend`
- Password: `RESEND_API_KEY`
- Sender name: `Sherpa`
- Sender email: `hello@sherpa.app`

This replaces Supabase's shared mail server for confirmation and password reset emails.

## File structure

```
app/
  _lib/
    email/
      email-layout.tsx        — shared branded wrapper (logo, footer, support link)
      confirm-email.tsx       — email confirmation template
      password-reset.tsx      — password reset template
      welcome.tsx             — welcome email template
      billing-event.tsx       — billing stub template (receipt, payment-failed, cancellation)
  api/
    email/
      send/
        route.ts              — single POST endpoint for all outbound email
```

## Templates

### Shared layout — `email-layout.tsx`
Accepts `{ children, previewText }`. Renders:
- Sherpa logo (top)
- White content card with `children`
- Footer: `support@sherpa.app` · privacy policy link · "You're receiving this because you have a Sherpa account"

### Email confirmation — `confirm-email.tsx`
Props: `{ confirmUrl: string }`
Content: Brief welcome, "Confirm your email" CTA button linking to `confirmUrl`, note that the link expires in 24 hours.

### Password reset — `password-reset.tsx`
Props: `{ resetUrl: string }`
Content: "You requested a password reset" heading, "Reset your password" CTA button, "If you didn't request this, ignore this email" note, link expires in 1 hour.

### Welcome — `welcome.tsx`
Props: `{ firstName?: string }`
Content: "Welcome to Sherpa" heading, 2–3 sentence explanation of what Sherpa is, "Open the studio" CTA button linking to the app, link to docs/support.

### Billing stub — `billing-event.tsx`
Props: `{ eventType: "receipt" | "payment-failed" | "cancellation", customerEmail: string }`
Content: Stub body with a `// TODO: implement when Stripe integration lands` comment. Returns a minimal plain-text placeholder email so the route doesn't error when called prematurely.

## API route — `app/api/email/send/route.ts`

Single `POST` endpoint. Request body:
```ts
{
  template: "confirm-email" | "password-reset" | "welcome" | "billing-event";
  to: string;
  props: Record<string, unknown>;
}
```

Behaviour:
1. Validate `RESEND_API_KEY` is present — return 500 if missing
2. Validate `template` is a known value — return 400 if not
3. Instantiate the React Email template with `props`
4. Call Resend SDK `emails.send()` with rendered HTML
5. Return 200 on success, 500 on Resend error
6. `billing-event` template: return 501 with `{ error: "Billing emails not yet implemented" }` until Stripe lands

Auth: internal API routes called server-side. No public auth required on this route — callers are trusted Next.js server contexts. Add `x-internal-secret` header check if exposed to client in future.

## Email triggers

### Email confirmation
Supabase → Resend SMTP (direct, no API route). Supabase dashboard email template updated to use `confirm-email.tsx` rendered HTML. Supabase injects `{{ .ConfirmationURL }}` into the template.

### Password reset
Supabase → Resend SMTP (direct, no API route). Supabase dashboard email template updated to use `password-reset.tsx` rendered HTML. Supabase injects `{{ .ConfirmationURL }}` into the template.

### Welcome email
Triggered in `app/_components/login-screen.tsx` on `SIGNED_IN` auth event, only when the session is brand new (detected via `session.user.created_at === session.user.last_sign_in_at`). Calls `POST /api/email/send` with `template: "welcome"`. Fire-and-forget — does not block the sign-in flow.

### Billing emails (stub)
Stripe webhook handler (future spec) will call `POST /api/email/send` with `template: "billing-event"` and the appropriate `eventType`. The route returns 501 until implemented — Stripe spec picks up from here.

## Files changed

| File | Change |
|------|--------|
| `app/_lib/email/email-layout.tsx` | New — shared email wrapper |
| `app/_lib/email/confirm-email.tsx` | New — confirmation template |
| `app/_lib/email/password-reset.tsx` | New — password reset template |
| `app/_lib/email/welcome.tsx` | New — welcome template |
| `app/_lib/email/billing-event.tsx` | New — billing stub template |
| `app/api/email/send/route.ts` | New — unified send endpoint |
| `app/_components/login-screen.tsx` | Add welcome email trigger on new sign-in |
| `.env.local` | Add `RESEND_API_KEY` |
| Vercel dashboard | Add `RESEND_API_KEY` environment variable |
| Supabase dashboard | Configure custom SMTP settings |
| Cloudflare DNS | Add SPF, DKIM, DMARC records |

## Dependencies

```bash
npm install resend @react-email/components
```

## Verification

1. Create a new account → confirm email arrives from `hello@sherpa.app` with Sherpa branding, confirmation link works
2. Request password reset → email arrives promptly (not rate-limited), reset link redirects to `/reset-password` and works
3. Complete sign-up confirmation → welcome email arrives within a few seconds
4. Confirm welcome email does not send on subsequent logins (only on first sign-in)
5. Call `/api/email/send` with `template: "billing-event"` → receives 501 response
6. Check Resend dashboard → sent emails appear with delivery status
7. Check Supabase dashboard → custom SMTP shows as connected
