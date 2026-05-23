import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  SOFTWARE_DESCRIPTION,
  CONTACT_EMAIL,
  LOGO_PATH,
  SOCIAL_PROFILES,
} from "@/app/_lib/site-config";
import { safeJsonLdScript } from "@/app/_lib/safe-jsonld";

export function buildWebSiteLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
  };
}

export function buildOrganizationLd(): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}${LOGO_PATH}`,
    email: CONTACT_EMAIL,
  };
  if (SOCIAL_PROFILES.length > 0) ld.sameAs = SOCIAL_PROFILES;
  return ld;
}

export function buildSoftwareApplicationLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    description: SOFTWARE_DESCRIPTION,
    url: SITE_URL,
  };
}

export function LandingStructuredData() {
  const blocks = [
    buildWebSiteLd(),
    buildOrganizationLd(),
    buildSoftwareApplicationLd(),
  ];
  return (
    <>
      {blocks.map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLdScript(ld) }}
        />
      ))}
    </>
  );
}
