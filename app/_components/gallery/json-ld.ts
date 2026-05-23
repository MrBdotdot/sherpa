import { parsePlayerCountRange } from "@/app/_lib/gallery-queries";
import type { GalleryGame, GalleryCard } from "@/app/_lib/gallery-queries";
import { extractBlockText } from "./block-renderer";

type QuantitativeValue = { "@type": "QuantitativeValue"; minValue: number; maxValue: number };
type HowToStep = { "@type": "HowToStep"; name: string; text: string };
type HowTo = { "@type": "HowTo"; name: string; step: HowToStep[] };
type Person = { "@type": "Person"; name: string };

const MAX_STEP_LENGTH = 1500;

function composeStepText(card: GalleryCard): string {
  const blockTexts = (card.blocks ?? [])
    .map(extractBlockText)
    .filter(Boolean);

  if (blockTexts.length === 0) {
    return card.summary;
  }

  const composed = [card.summary, ...blockTexts]
    .filter(Boolean)
    .join("\n\n");

  if (composed.length <= MAX_STEP_LENGTH) {
    return composed;
  }

  const truncated = composed.slice(0, MAX_STEP_LENGTH);
  const lastSentence = truncated.lastIndexOf(". ");
  if (lastSentence > MAX_STEP_LENGTH * 0.5) {
    return truncated.slice(0, lastSentence + 1) + "…";
  }
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "…";
}

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
      step: cards.map((c) => ({ "@type": "HowToStep", name: c.title, text: composeStepText(c) })),
    },
  };

  if (range) ld.numberOfPlayers = { "@type": "QuantitativeValue", minValue: range.min, maxValue: range.max };
  if (game.ageRange) ld.typicalAgeRange = game.ageRange;
  if (game.designer) ld.author = { "@type": "Person", name: game.designer };

  return ld;
}
