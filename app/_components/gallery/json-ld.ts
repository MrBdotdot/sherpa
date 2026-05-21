import { parsePlayerCountRange } from "@/app/_lib/gallery-queries";
import type { GalleryGame, GalleryCard } from "@/app/_lib/gallery-queries";

type QuantitativeValue = { "@type": "QuantitativeValue"; minValue: number; maxValue: number };
type HowToStep = { "@type": "HowToStep"; name: string; text: string };
type HowTo = { "@type": "HowTo"; name: string; step: HowToStep[] };
type Person = { "@type": "Person"; name: string };

export type GameJsonLd = {
  "@context": "https://schema.org";
  "@type": "Game";
  name: string;
  description: string;
  numberOfPlayers?: QuantitativeValue;
  typicalAgeRange?: string;
  author?: Person;
  mainEntity: HowTo;
};

export function buildGameJsonLd(game: GalleryGame, cards: GalleryCard[]): GameJsonLd {
  const description = game.tagline?.trim() || `Interactive rulebook for ${game.title}.`;
  const range = parsePlayerCountRange(game.playerCount);

  const ld: GameJsonLd = {
    "@context": "https://schema.org",
    "@type": "Game",
    name: game.title,
    description,
    mainEntity: {
      "@type": "HowTo",
      name: `How to play ${game.title}`,
      step: cards.map((c) => ({ "@type": "HowToStep", name: c.title, text: c.summary })),
    },
  };

  if (range) ld.numberOfPlayers = { "@type": "QuantitativeValue", minValue: range.min, maxValue: range.max };
  if (game.ageRange) ld.typicalAgeRange = game.ageRange;
  if (game.designer) ld.author = { "@type": "Person", name: game.designer };

  return ld;
}
