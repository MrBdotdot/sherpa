import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./email-layout";

export type BillingEventType = "payment_failed";

interface BillingEventProps {
  event: BillingEventType;
}

export function BillingEvent({ event }: BillingEventProps) {
  if (event === "payment_failed") {
    return (
      <EmailLayout previewText="We couldn't process your Sherpa payment — action required">
        <Heading
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 12px",
            letterSpacing: "-0.3px",
          }}
        >
          Payment failed
        </Heading>
        <Text style={{ fontSize: "15px", color: "#4b5563", lineHeight: "1.6", margin: "0 0 16px" }}>
          We weren&apos;t able to process your most recent Sherpa subscription payment. This can happen
          when a card expires, has insufficient funds, or the billing details change.
        </Text>
        <Text style={{ fontSize: "15px", color: "#4b5563", lineHeight: "1.6", margin: "0 0 28px" }}>
          Update your payment method to keep your plan active. If no action is taken, your account
          will revert to the free plan.
        </Text>
        <Button
          href="https://studio.sherpa.app/settings/billing"
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
          Update payment method
        </Button>
        <Text style={{ fontSize: "13px", color: "#9ca3af", margin: "0" }}>
          Questions? Reach us at{" "}
          <a href="mailto:support@sherpa.app" style={{ color: "#6b7280", textDecoration: "underline" }}>
            support@sherpa.app
          </a>
          .
        </Text>
      </EmailLayout>
    );
  }

  // Fallback for future event types
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
      <Text style={{ fontSize: "15px", color: "#4b5563", lineHeight: "1.6", margin: "0" }}>
        There&apos;s an update to your Sherpa billing. Log in to your account for details.
      </Text>
    </EmailLayout>
  );
}

export default BillingEvent;
