import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./email-layout";

interface TeamInviteProps {
  inviterName: string;
  gameTitle: string;
  role: "editor" | "viewer";
  acceptUrl: string;
}

const ROLE_DESCRIPTION: Record<"editor" | "viewer", string> = {
  editor: "You'll be able to edit cards and content.",
  viewer: "You'll be able to view the game in read-only mode.",
};

export function TeamInvite({ inviterName, gameTitle, role, acceptUrl }: TeamInviteProps) {
  return (
    <EmailLayout previewText={`${inviterName} invited you to collaborate on "${gameTitle}" in Sherpa`}>
      <Heading
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#111827",
          margin: "0 0 12px",
          letterSpacing: "-0.3px",
        }}
      >
        You&apos;ve been invited to collaborate
      </Heading>
      <Text style={{ fontSize: "15px", color: "#4b5563", lineHeight: "1.6", margin: "0 0 8px" }}>
        <strong>{inviterName}</strong> has invited you to collaborate on{" "}
        <strong>&ldquo;{gameTitle}&rdquo;</strong> in Sherpa.
      </Text>
      <Text style={{ fontSize: "15px", color: "#4b5563", lineHeight: "1.6", margin: "0 0 28px" }}>
        Your role: <strong>{role.charAt(0).toUpperCase() + role.slice(1)}</strong> — {ROLE_DESCRIPTION[role]}
      </Text>
      <Button
        href={acceptUrl}
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
        Accept invitation
      </Button>
      <Text style={{ fontSize: "13px", color: "#9ca3af", margin: "0" }}>
        This invitation expires in 7 days. If you don&apos;t have a Sherpa account yet, you&apos;ll be
        prompted to create one after clicking the link.
      </Text>
    </EmailLayout>
  );
}

export default TeamInvite;
