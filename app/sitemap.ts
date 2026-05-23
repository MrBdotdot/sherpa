import type { MetadataRoute } from "next";
import { SITE_URL } from "@/app/_lib/site-config";
import { fetchPublishedGames } from "@/app/_lib/gallery-queries";

export const dynamic = "force-dynamic";

type GameSeed = { id: string; createdAt?: string };

/**
 * Pure helper: builds the sitemap entry list from a list of published games,
 * the site URL, and a "now" reference date used as the lastModified fallback.
 * Extracted from the default export for testability (no Supabase mocking needed).
 */
export function buildSitemapEntries(
  games: GameSeed[],
  siteUrl: string,
  now: Date
): MetadataRoute.Sitemap {
  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/gallery`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  const gameUrls: MetadataRoute.Sitemap = games.map((g) => ({
    url: `${siteUrl}/gallery/${g.id}`,
    lastModified: g.createdAt ? new Date(g.createdAt) : now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticUrls, ...gameUrls];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const games = await fetchPublishedGames({ page: 0 });
  return buildSitemapEntries(games, SITE_URL, new Date());
}
