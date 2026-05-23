import type { MetadataRoute } from "next";
import { SITE_URL } from "@/app/_lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/gallery"],
        disallow: [
          "/studio",
          "/analytics",
          "/play",
          "/login",
          "/invite",
          "/reset-password",
          "/api",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
