import type { GalleryGame } from "@/app/_lib/gallery-queries";

export function buildCollectionPageLd(games: GalleryGame[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Sherpa Gallery — Interactive Rulebooks",
    description: "Interactive rulebooks for board games published with Sherpa.",
    url: `${siteUrl}/gallery`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: games.length,
      itemListElement: games.map((g, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteUrl}/gallery/${g.id}`,
        name: g.title,
      })),
    },
  };
}
