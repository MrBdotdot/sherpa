# Transactional Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up Resend as the transactional email provider for confirmation, password reset, welcome, and billing (stub) emails.
**Architecture:** React Email templates live in `app/_lib/email/`; a single POST route at `app/api/email/send/route.ts` validates, renders, and dispatches via the Resend SDK; Supabase auth emails (confirm + reset) are routed through Resend's custom SMTP rather than the API route.
**Tech Stack:** Resend SDK, `@react-email/components`, Next.js App Router Route Handlers, React 19, TypeScript.

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json` (via npm install)

- [ ] Step 1: Run `npm install resend @react-email/components` from the project root.
- [ ] Step 2: Run `npm run build` — Expected: clean build (no new type errors introduced by the packages).
- [ ] Step 3: Commit: `chore: install resend and @react-email/components`

---

### Task 2: Create shared email layout

**Files:**
- Create: `app/_lib/email/email-layout.tsx`

- [ ] Step 1: Create `app/_lib/email/email-layout.tsx` with the following content:

```tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface EmailLayoutProps {
  children: React.ReactNode;
  previewText: string;
}

export function EmailLayout({ children, previewText }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: "#f4f5f8", fontFamily: "'Inter', Arial, sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "560px", margin: "40px auto", padding: "0 16px" }}>
          {/* Logo */}
          <Section style={{ padding: "24px 0 16px" }}>
            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "middle" }}>
                    <div
                      style={{
                        display: "inline-block",
                        width: "32px",
                        height: "32px",
                        backgroundColor: "#1e3a8a",
                        borderRadius: "8px",
                        textAlign: "center",
                        lineHeight: "32px",
                        fontWeight: 700,
                        fontSize: "14px",
                        color: "#ffffff",
                      }}
                    >
                      S
                    </div>
                  </td>
                  <td style={{ verticalAlign: "middle", paddingLeft: "10px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 600, color: "#111827", letterSpacing: "-0.3px" }}>
                      Sherpa
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Content card */}
          <Section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "40px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            {children}
          </Section>

          {/* Footer */}
          <Section style={{ padding: "24px 0 40px", textAlign: "center" }}>
            <Text style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 4px" }}>
              Questions?{" "}
              <Link href="mailto:support@sherpa.app" style={{ color: "#6b7280", textDecoration: "underline" }}>
                support@sherpa.app
              </Link>
            </Text>
            <Text style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 4px" }}>
              <Link href="https://sherpa.app/privacy" style={{ color: "#6b7280", textDecoration: "underline" }}>
                Privacy policy
              </Link>
            </Text>
            <Text style={{ fontSize: "12px", color: "#d1d5db", margin: "0" }}>
              You&apos;re receiving this because you have a Sherpa account.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] Step 2: Run `npm run build` — Expected: clean build.
- [ ] Step 3: Commit: `feat(email): add shared EmailLayout wrapper`

---

### Task 3: Create confirm-email template

**Files:**
- Create: `app/_lib/email/confirm-email.tsx`

- [ ] Step 1: Create `app/_lib/email/confirm-email.tsx` with the following content:

```tsx
import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./email-layout";

interface ConfirmEmailProps {
  confirmUrl: string;
}

export function ConfirmEmail({ confirmUrl }: ConfirmEmailProps) {
  return (
    <EmailLayout previewText="Confirm your Sherpa email address">
      <Heading
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#111827",
          margin: "0 0 12px",
          letterSpacing: "-0.3px",
        }}
      >
        Confirm your email
      </Heading>
      <Text style={{ fontSize: "15px", color: "#4b5563", lineHeight: "1.6", margin: "0 0 28px" }}>
        Thanks for signing up for Sherpa. Click the button below to confirm your email address and
        activate your account.
      </Text>
      <Button
        href={confirmUrl}
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
        Confirm your email
      </Button>
      <Text style={{ fontSize: "13px", color: "#9ca3af", margin: "0" }}>
        This link expires in 24 hours. If you didn&apos;t create a Sherpa account, you can safely
        ignore this email.
      </Text>
    </EmailLayout>
  );
}

export default ConfirmEmail;
```

- [ ] Step 2: Run `npm run build` — Expected: clean build.
- [ ] Step 3: Commit: `feat(email): add confirm-email template`

---

### Task 4: Create password-reset template

**Files:**
- Create: `app/_lib/email/password-reset.tsx`

- [ ] Step 1: Create `app/_lib/email/password-reset.tsx` with the following content:

```tsx
import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./email-layout";

interface PasswordResetProps {
  resetUrl: string;
}

export function PasswordReset({ resetUrl }: PasswordResetProps) {
  return (
    <EmailLayout previewText="Reset your Sherpa password">
      <Heading
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#111827",
          margin: "0 0 12px",
          letterSpacing: "-0.3px",
        }}
      >
        Reset your password
      </Heading>
      <Text style={{ fontSize: "15px", color: "#4b5563", lineHeight: "1.6", margin: "0 0 28px" }}>
        We received a request to reset your Sherpa password. Click the button below to choose a new
        one.
      </Text>
      <Button
        href={resetUrl}
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
        Reset your password
      </Button>
      <Text style={{ fontSize: "13px", color: "#9ca3af", margin: "0" }}>
        This link expires in 1 hour. If you didn&apos;t request a password reset, you can safely
        ignore this email — your password will not change.
      </Text>
    </EmailLayout>
  );
}

export default PasswordReset;
```

- [ ] Step 2: Run `npm run build` — Expected: clean build.
- [ ] Step 3: Commit: `feat(email): add password-reset template`

---

### Task 5: Create welcome template

**Files:**
- Create: `app/_lib/email/welcome.tsx`

- [ ] Step 1: Create `app/_lib/email/welcome.tsx` with the following content:

```tsx
import { Button, Heading, Link, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./email-layout";

interface WelcomeProps {
  firstName?: string;
}

export function Welcome({ firstName }: WelcomeProps) {
  const greeting = firstName ? `Welcome, ${firstName}!` : "Welcome to Sherpa!";

  return (
    <EmailLayout previewText="Your Sherpa workspace is ready">
      <Heading
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#111827",
          margin: "0 0 12px",
          letterSpacing: "-0.3px",
        }}
      >
        {greeting}
      </Heading>
      <Text style={{ fontSize: "15px", color: "#4b5563", lineHeight: "1.6", margin: "0 0 16px" }}>
        Sherpa lets you build interactive rules experiences for board games — beautiful, tap-to-reveal
        rule cards your whole table can explore without needing an app.
      </Text>
      <Text style={{ fontSize: "15px", color: "#4b5563", lineHeight: "1.6", margin: "0 0 28px" }}>
        Your workspace is ready. Head to the studio to create your first game, add a canvas, and
        start building.
      </Text>
      <Button
        href="https://studio.sherpa.app"
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
        Open the studio
      </Button>
      <Text style={{ fontSize: "13px", color: "#9ca3af", margin: "0" }}>
        Need help?{" "}
        <Link href="mailto:support@sherpa.app" style={{ color: "#6b7280", textDecoration: "underline" }}>
          support@sherpa.app
        </Link>{" "}
        is always here.
      </Text>
    </EmailLayout>
  );
}

export default Welcome;
```

- [ ] Step 2: Run `npm run build` — Expected: clean build.
- [ ] Step 3: Commit: `feat(email): add welcome template`

---

### Task 6: Create billing-event stub template

**Files:**
- Create: `app/_lib/email/billing-event.tsx`

- [ ] Step 1: Create `app/_lib/email/billing-event.tsx` with the following content:

```tsx
import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./email-layout";

// TODO: implement when Stripe integration lands
// This template is a placeholder only. The API route returns 501 for billing-event.
// Real receipt, payment-failed, and cancellation templates are part of the Stripe spec.

export type BillingEventType = "receipt" | "payment-failed" | "cancellation";

interface BillingEventProps {
  eventType: BillingEventType;
  customerEmail: string;
}

export function BillingEvent({ eventType, customerEmail }: BillingEventProps) {
  return (
    <EmailLayout previewText="Sherpa billing notification">
      <Heading
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#111827",
          margin: "0 0 12px",
          letterSpacing: "-0.3px",
        }}
      >
        Billing notification
      </Heading>
      <Text style={{ fontSize: "15px", color: "#4b5563", lineHeight: "1.6", margin: "0 0 16px" }}>
        This is a placeholder for the {eventType} billing email sent to {customerEmail}.
      </Text>
      <Text style={{ fontSize: "13px", color: "#9ca3af", margin: "0" }}>
        Billing emails are not yet fully implemented. This stub will be replaced when the Stripe
        integration lands.
      </Text>
    </EmailLayout>
  );
}

export default BillingEvent;
```

- [ ] Step 2: Run `npm run build` — Expected: clean build.
- [ ] Step 3: Commit: `feat(email): add billing-event stub template`

---

### Task 7: Create the /api/email/send route

**Files:**
- Create: `app/api/email/send/route.ts`

- [ ] Step 1: Create the directory `app/api/email/send/` if it does not exist (mkdir is fine; the route file itself is created in the next step).

- [ ] Step 2: Create `app/api/email/send/route.ts` with the following content:

```ts
import { render } from "@react-email/components";
import { Resend } from "resend";
import { ConfirmEmail } from "@/app/_lib/email/confirm-email";
import { PasswordReset } from "@/app/_lib/email/password-reset";
import { Welcome } from "@/app/_lib/email/welcome";
import { BillingEvent, type BillingEventType } from "@/app/_lib/email/billing-event";

const KNOWN_TEMPLATES = ["confirm-email", "password-reset", "welcome", "billing-event"] as const;
type TemplateName = (typeof KNOWN_TEMPLATES)[number];

function isKnownTemplate(t: unknown): t is TemplateName {
  return KNOWN_TEMPLATES.includes(t as TemplateName);
}

export async function POST(request: Request) {
  // 1. Validate API key
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "RESEND_API_KEY is not configured" }, { status: 500 });
  }

  // 2. Parse body
  let body: { template: unknown; to: unknown; props: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { template, to, props } = body;

  // 3. Validate template
  if (!isKnownTemplate(template)) {
    return Response.json(
      { error: `Unknown template "${template}". Must be one of: ${KNOWN_TEMPLATES.join(", ")}` },
      { status: 400 }
    );
  }

  // 4. Billing stub — return 501 immediately
  if (template === "billing-event") {
    return Response.json({ error: "Billing emails not yet implemented" }, { status: 501 });
  }

  if (typeof to !== "string" || !to.includes("@")) {
    return Response.json({ error: "Missing or invalid 'to' email address" }, { status: 400 });
  }

  const p = (props ?? {}) as Record<string, unknown>;

  // 5. Build React Email element
  let subject: string;
  let emailElement: React.ReactElement;

  if (template === "confirm-email") {
    const confirmUrl = typeof p.confirmUrl === "string" ? p.confirmUrl : "";
    subject = "Confirm your Sherpa email";
    emailElement = <ConfirmEmail confirmUrl={confirmUrl} />;
  } else if (template === "password-reset") {
    const resetUrl = typeof p.resetUrl === "string" ? p.resetUrl : "";
    subject = "Reset your Sherpa password";
    emailElement = <PasswordReset resetUrl={resetUrl} />;
  } else {
    // welcome
    const firstName = typeof p.firstName === "string" ? p.firstName : undefined;
    subject = "Welcome to Sherpa";
    emailElement = <Welcome firstName={firstName} />;
  }

  // 6. Render to HTML
  const html = await render(emailElement);

  // 7. Send via Resend
  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({
      from: "Sherpa <hello@sherpa.app>",
      to,
      subject,
      html,
    });
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email/send] Resend error:", message);
    return Response.json({ error: "Failed to send email", detail: message }, { status: 500 });
  }
}
```

- [ ] Step 3: Run `npm run build` — Expected: clean build. If JSX in a `.ts` file causes an error, rename the file to `route.tsx` and update the import paths accordingly — but try `.ts` first since `@react-email/components` render is not JSX itself in the route; adjust the JSX element construction inside a `.tsx` file if needed.

  **Note on file extension:** Because the route directly instantiates JSX (`<ConfirmEmail ... />`), the file **must** be `route.tsx`. If the build errors on JSX in `route.ts`, run:
  ```bash
  mv app/api/email/send/route.ts app/api/email/send/route.tsx
  ```
  Then re-run `npm run build`.

- [ ] Step 4: Commit: `feat(email): add POST /api/email/send route handler`

---

### Task 8: Add welcome email trigger to login-screen

**Files:**
- Modify: `app/_components/login-screen.tsx`

- [ ] Step 1: The `LoginScreen` component uses `supabase.auth.signUp()` for new account creation and shows a confirmation screen (`setConfirm(true)`) on success. The new-user detection in the spec uses `SIGNED_IN` event comparison of `created_at === last_sign_in_at` — but the login screen is a client component with no `onAuthStateChange` listener. The correct approach for this component is to fire the welcome email **immediately after a successful `signUp()` call**, before the user has confirmed their email, so we know it is a brand-new account.

  Locate the sign-up success branch in `handleSubmit` (the `else` block around line 96–98 in the current file):
  ```ts
  } else {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setConfirm(true);
  }
  ```

  Replace it with:
  ```ts
  } else {
    const { data: signUpData, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setConfirm(true);
      // Fire-and-forget welcome email — do not await so sign-up flow is not blocked
      void fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: "welcome",
          to: email,
          props: {},
        }),
      }).catch(() => {
        // Intentionally ignored — welcome email failure must not affect sign-up UX
      });
    }
  }
  ```

- [ ] Step 2: Run `npm run build` — Expected: clean build.
- [ ] Step 3: Commit: `feat(email): fire welcome email on new sign-up`

---

### Task 9: Add RESEND_API_KEY to environment

**Files:**
- Modify: `.env.local` (manually — not committed)

- [ ] Step 1: Open `.env.local` and add the following line (value comes from the Resend dashboard after account setup in Task 10):
  ```
  RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```

- [ ] Step 2: Confirm `.env.local` is listed in `.gitignore`. Run:
  ```bash
  grep ".env.local" .gitignore
  ```
  Expected: `.env.local` appears. If it does not, add it.

- [ ] Step 3: No commit — `.env.local` is not committed.

---

### Task 10: Manual infrastructure — Resend account + domain

> These are one-time manual steps. No code changes.

- [ ] Step 1: Create a Resend account at https://resend.com. Free tier gives 3,000 emails/month with no credit card.

- [ ] Step 2: In the Resend dashboard, add the sending domain `sherpa.app`. Resend will show three DNS records to add.

- [ ] Step 3: In the Cloudflare dashboard for the `sherpa.app` zone, add the following records:

  **SPF** (Resend provides the exact value — it will look like):
  ```
  Type: TXT
  Name: sherpa.app  (or "@")
  Value: v=spf1 include:amazonses.com ~all
  ```
  *(Use the exact SPF value Resend provides, which may differ.)*

  **DKIM** (Resend provides two CNAME records):
  ```
  Type: CNAME
  Name: resend._domainkey
  Value: <provided by Resend dashboard>
  ```

  **DMARC:**
  ```
  Type: TXT
  Name: _dmarc.sherpa.app  (or "_dmarc")
  Value: v=DMARC1; p=none; rua=mailto:admin@sherpa.app
  ```

- [ ] Step 4: In the Resend dashboard, click "Verify DNS records". Wait for propagation (up to 48 hours; usually minutes in Cloudflare). Domain status should become "Verified".

- [ ] Step 5: In the Resend dashboard, create an API key with "Sending access" scope. Copy it.

- [ ] Step 6: Add the API key value to `.env.local` as `RESEND_API_KEY=re_...` (Task 9 Step 1).

- [ ] Step 7: In the Vercel dashboard for this project, add `RESEND_API_KEY` under Settings → Environment Variables (Production + Preview). Redeploy.

---

### Task 11: Manual infrastructure — Supabase custom SMTP

> These are one-time manual steps. No code changes.

- [ ] Step 1: Open the Supabase dashboard → select the Sherpa project → Authentication → Settings → SMTP Settings.

- [ ] Step 2: Enable "Custom SMTP" and fill in:
  - **Host:** `smtp.resend.com`
  - **Port:** `465`
  - **Username:** `resend`
  - **Password:** `<RESEND_API_KEY value>`
  - **Sender name:** `Sherpa`
  - **Sender email:** `hello@sherpa.app`

- [ ] Step 3: Save settings. Supabase will send a test email to verify — check it arrives from `hello@sherpa.app`.

- [ ] Step 4: In the Supabase dashboard → Auth → Email Templates, update the **Confirm signup** template.
  - The template must use `{{ .ConfirmationURL }}` as the link target.
  - Render `ConfirmEmail` to static HTML using `@react-email/components/render` and paste the result into the Supabase template editor, replacing `{{ .ConfirmationURL }}` placeholder in the button `href` with the Supabase variable.
  - To generate the static HTML, run this one-off script from the project root:
    ```bash
    node -e "
    const { render } = require('@react-email/components');
    const { ConfirmEmail } = require('./app/_lib/email/confirm-email');
    const React = require('react');
    render(React.createElement(ConfirmEmail, { confirmUrl: '{{ .ConfirmationURL }}' }))
      .then(html => process.stdout.write(html));
    "
    ```
  - Paste the output HTML into the Supabase Confirm signup template body.

- [ ] Step 5: Repeat Step 4 for the **Reset password** template, using `PasswordReset` with `resetUrl: '{{ .ConfirmationURL }}'`.

---

### Task 12: Bump version and patch notes

**Files:**
- Modify: `app/_lib/authoring-utils.ts` (APP_VERSION)
- Modify: `app/_lib/patch-notes.ts`

- [ ] Step 1: In `app/_lib/authoring-utils.ts`, bump `APP_VERSION` from `"v0.17.10"` to `"v0.18.0"` (minor bump — this is a new feature set).

- [ ] Step 2: In `app/_lib/patch-notes.ts`, prepend a new entry at the top of the `PATCH_NOTES` array:
  ```ts
  {
    version: "v0.18.0",
    date: "2026-04-08",
    notes: [
      "Transactional email via Resend: confirmation, password reset, welcome emails",
      "Branded React Email templates with Sherpa logo and footer",
      "POST /api/email/send route for all outbound email",
      "Welcome email fires automatically on new account sign-up",
      "Billing email stub returns 501 until Stripe integration lands",
    ],
  },
  ```

- [ ] Step 3: Run `npm run build` — Expected: clean build.
- [ ] Step 4: Commit: `feat(email): transactional email v0.18.0 — Resend integration with React Email templates`

---

## Verification checklist

After all tasks are complete and infrastructure is configured:

- [ ] Create a new account → confirmation email arrives from `hello@sherpa.app`, Sherpa-branded, confirmation link works.
- [ ] Request password reset → email arrives promptly (not rate-limited), reset link redirects to `/reset-password` and works.
- [ ] Complete sign-up → welcome email arrives within a few seconds.
- [ ] Sign in to an existing account → welcome email does NOT fire.
- [ ] Call `POST /api/email/send` with `{ "template": "billing-event", "to": "test@example.com", "props": {} }` → receives `501` with `{ "error": "Billing emails not yet implemented" }`.
- [ ] Call `POST /api/email/send` with `{ "template": "unknown", "to": "test@example.com", "props": {} }` → receives `400`.
- [ ] Call `POST /api/email/send` without `RESEND_API_KEY` set → receives `500`.
- [ ] Check Resend dashboard → sent emails appear with delivery status "Delivered".
- [ ] Check Supabase dashboard → custom SMTP shows as connected.
- [ ] Run `npm run build` one final time — no errors or warnings.
