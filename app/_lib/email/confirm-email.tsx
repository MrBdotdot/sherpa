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
