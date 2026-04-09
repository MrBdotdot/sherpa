import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Disable performance tracing — we only want error monitoring
  tracesSampleRate: 0,

  // Filter out noise that is not actionable
  ignoreErrors: [
    // User connectivity issues — not our bugs
    "NetworkError",
    "Failed to fetch",
    "Load failed",
    // Supabase auth token expiry — handled by existing refresh logic
    "Invalid Refresh Token",
    "Refresh Token Not Found",
    // Browser extension interference
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
  ],
});
