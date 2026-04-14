import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    proxyClientMaxBodySize: "50mb",
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress the Sentry CLI output during builds
  silent: true,

  // Upload source maps to Sentry for readable stack traces in production.
  // Requires SENTRY_AUTH_TOKEN to be set in the environment.
  sourcemaps: {
    // Delete source maps from the public build output after uploading to Sentry
    deleteSourcemapsAfterUpload: true,
  },

  // Automatically annotate React components for better error attribution
  reactComponentAnnotation: {
    enabled: true,
  },
});
