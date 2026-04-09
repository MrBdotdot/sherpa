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
