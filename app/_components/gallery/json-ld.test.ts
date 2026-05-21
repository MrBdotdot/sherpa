import { describe, it, expect } from "vitest";
import { buildGameJsonLd } from "./json-ld";
import type { GalleryGame, GalleryCard } from "@/app/_lib/gallery-queries";

const baseGame: GalleryGame = {
  id: "ironveil",
  title: "Ironveil",
  featured: true,
  createdAt: "2026-01-20T00:00:00Z",
  tagline: "Hidden movement thriller",
  designer: "Marcus Drenn",
  playerCount: "3–6",
  playTime: "90–120 min",
  complexity: "Heavy",
  ageRange: "17+",
  tags: ["thematic", "hidden-movement"],
};

const cards: GalleryCard[] = [
  { id: "c1", kind: "page", title: "Setup", summary: "Lay out tiles.", heroImage: "", blocks: [], cardSize: "medium" },
  { id: "c2", kind: "page", title: "Turn order", summary: "Resistance acts first.", heroImage: "", blocks: [], cardSize: "medium" },
];

describe("buildGameJsonLd", () => {
  it("emits a Game @type with title and description", () => {
    const ld = buildGameJsonLd(baseGame, cards);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Game");
    expect(ld.name).toBe("Ironveil");
    expect(ld.description).toBe("Hidden movement thriller");
  });
  it("emits a QuantitativeValue for player count when parseable", () => {
    const ld = buildGameJsonLd(baseGame, cards);
    expect(ld.numberOfPlayers).toEqual({ "@type": "QuantitativeValue", minValue: 3, maxValue: 6 });
  });
  it("omits numberOfPlayers when player count is blank", () => {
    const ld = buildGameJsonLd({ ...baseGame, playerCount: undefined }, cards);
    expect(ld.numberOfPlayers).toBeUndefined();
  });
  it("emits typicalAgeRange and Person author when present", () => {
    const ld = buildGameJsonLd(baseGame, cards);
    expect(ld.typicalAgeRange).toBe("17+");
    expect(ld.author).toEqual({ "@type": "Person", name: "Marcus Drenn" });
  });
  it("omits author when designer is blank", () => {
    const ld = buildGameJsonLd({ ...baseGame, designer: undefined }, cards);
    expect(ld.author).toBeUndefined();
  });
  it("emits a HowTo mainEntity with one step per card", () => {
    const ld = buildGameJsonLd(baseGame, cards);
    expect(ld.mainEntity).toEqual({
      "@type": "HowTo",
      name: "How to play Ironveil",
      step: [
        { "@type": "HowToStep", name: "Setup", text: "Lay out tiles." },
        { "@type": "HowToStep", name: "Turn order", text: "Resistance acts first." },
      ],
    });
  });
  it("falls back to a generic description when tagline is blank", () => {
    const ld = buildGameJsonLd({ ...baseGame, tagline: undefined }, cards);
    expect(ld.description).toBe("Interactive rulebook for Ironveil.");
  });
});
