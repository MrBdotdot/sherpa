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
