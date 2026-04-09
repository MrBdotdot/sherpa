import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Disable performance tracing — we only want error monitoring
  tracesSampleRate: 0,
});
