import type { Metadata } from "next";
import { fetchPublishedGame } from "@/app/_lib/gallery-queries";
import { SITE_URL } from "@/app/_lib/site-config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await fetchPublishedGame(id);
  if (!result) return { title: "Not found · Sherpa" };

  const { game } = result;
  const description = game.tagline?.trim() || `Interactive rulebook for ${game.title}.`;
  const image = game.cardImage || game.homeHeroImage;

  return {
    title: `${game.title} — Interactive Rulebook · Sherpa`,
    description,
    alternates: { canonical: `${SITE_URL}/gallery/${id}` },
    openGraph: {
      title: game.title,
      description,
      images: image ? [{ url: image }] : [],
      type: "article",
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: game.title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default function GalleryEntryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
