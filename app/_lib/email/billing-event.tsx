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
