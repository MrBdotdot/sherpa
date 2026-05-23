/**
 * Site-wide configuration. Reads `NEXT_PUBLIC_SITE_URL` from env (set per-environment
 * in Vercel project settings); falls back to the production marketing URL so dev,
 * preview, and missing-env builds never break.
 */
export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sherpa.games").replace(/\/$/, "");

export const SITE_NAME = "Sherpa";

export const SITE_DESCRIPTION =
  "Interactive rulebooks for board games — scan a QR, learn to play.";

/** Long-form description used in SoftwareApplication JSON-LD and landing metadata. */
export const SOFTWARE_DESCRIPTION =
  "Sherpa is a tool for board game designers to make their rulebooks interactive. " +
  "Import a PDF or Figma file, place hotspots and guided tours on the board, then " +
  "publish a QR card. Players scan and learn the game — no app required.";

export const CONTACT_EMAIL = "hello@sherpa.games";

export const LOGO_PATH = "/sherpa-icon.svg";

/** Social profile URLs for Organization.sameAs. Populate once handles are claimed. */
export const SOCIAL_PROFILES: string[] = [];
