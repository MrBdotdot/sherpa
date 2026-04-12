import { render } from "@react-email/components";
import { Resend } from "resend";
import * as React from "react";
import { BillingEvent } from "@/app/_lib/email/billing-event";
import { ConfirmEmail } from "@/app/_lib/email/confirm-email";
import { PasswordReset } from "@/app/_lib/email/password-reset";
import { Welcome } from "@/app/_lib/email/welcome";
import { TeamInvite } from "@/app/_lib/email/team-invite";

const KNOWN_TEMPLATES = ["confirm-email", "password-reset", "welcome", "billing-event", "team-invite"] as const;
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

  if (typeof to !== "string" || !to.includes("@")) {
    return Response.json({ error: "Missing or invalid 'to' email address" }, { status: 400 });
  }

  const p = (props ?? {}) as Record<string, unknown>;

  // 5. Build React Email element
  let subject: string;
  let emailElement: React.ReactElement;

  if (template === "billing-event") {
    const event = "payment_failed" as const;
    subject = "Payment failed — action required";
    emailElement = <BillingEvent event={event} />;
  } else if (template === "confirm-email") {
    const confirmUrl = typeof p.confirmUrl === "string" ? p.confirmUrl : "";
    subject = "Confirm your Sherpa email";
    emailElement = <ConfirmEmail confirmUrl={confirmUrl} />;
  } else if (template === "password-reset") {
    const resetUrl = typeof p.resetUrl === "string" ? p.resetUrl : "";
    subject = "Reset your Sherpa password";
    emailElement = <PasswordReset resetUrl={resetUrl} />;
  } else if (template === "team-invite") {
    const inviterName = typeof p.inviterName === "string" ? p.inviterName : "Someone";
    const gameTitle = typeof p.gameTitle === "string" ? p.gameTitle : "a game";
    const role = p.role === "viewer" ? "viewer" : "editor";
    const acceptUrl = typeof p.acceptUrl === "string" ? p.acceptUrl : "";
    subject = `You've been invited to collaborate on "${gameTitle}" in Sherpa`;
    emailElement = <TeamInvite inviterName={inviterName} gameTitle={gameTitle} role={role} acceptUrl={acceptUrl} />;
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
