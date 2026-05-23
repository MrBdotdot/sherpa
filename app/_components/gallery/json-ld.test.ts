import { describe, it, expect } from "vitest";
import { buildGameJsonLd, buildBreadcrumbListLd } from "./json-ld";
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

describe("buildGameJsonLd with richer HowToStep", () => {
  it("uses card.summary when the card has no text blocks", () => {
    const cards: GalleryCard[] = [
      { id: "c1", kind: "page", title: "Setup", summary: "Lay out tiles.", heroImage: "", blocks: [], cardSize: "medium" },
    ];
    const ld = buildGameJsonLd(baseGame, cards);
    const step = (ld.mainEntity.step as Array<{ text: string }>)[0];
    expect(step.text).toBe("Lay out tiles.");
  });

  it("joins summary + extracted block text with blank lines", () => {
    const cards: GalleryCard[] = [
      {
        id: "c1", kind: "page", title: "Setup", summary: "Lay out tiles.", heroImage: "", cardSize: "medium",
        blocks: [
          { id: "b1", type: "text", value: "Place the board in the center.", blockFormat: "prose" },
          { id: "b2", type: "text", value: "Each player picks a color.", blockFormat: "prose" },
        ],
      },
    ];
    const ld = buildGameJsonLd(baseGame, cards);
    const step = (ld.mainEntity.step as Array<{ text: string }>)[0];
    expect(step.text).toBe(
      "Lay out tiles.\n\nPlace the board in the center.\n\nEach player picks a color."
    );
  });

  it("truncates composed text exceeding 1500 chars at a sentence boundary with …", () => {
    const long = "A".repeat(800) + ". " + "B".repeat(800);
    const cards: GalleryCard[] = [
      {
        id: "c1", kind: "page", title: "Setup", summary: "Short.", heroImage: "", cardSize: "medium",
        blocks: [{ id: "b1", type: "text", value: long, blockFormat: "prose" }],
      },
    ];
    const ld = buildGameJsonLd(baseGame, cards);
    const step = (ld.mainEntity.step as Array<{ text: string }>)[0];
    expect(step.text.length).toBeLessThanOrEqual(1501);
    expect(step.text.endsWith("…")).toBe(true);
  });
});

describe("buildBreadcrumbListLd", () => {
  it("emits Home → Gallery → Game with positions 1/2/3 and full URLs", () => {
    const ld = buildBreadcrumbListLd(baseGame, "https://sherpa.games");
    expect(ld["@type"]).toBe("BreadcrumbList");
    const items = ld.itemListElement as Array<{ position: number; name: string; item: string }>;
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ position: 1, name: "Home", item: "https://sherpa.games/" });
    expect(items[1]).toMatchObject({ position: 2, name: "Gallery", item: "https://sherpa.games/gallery" });
    expect(items[2]).toMatchObject({ position: 3, name: "Ironveil", item: "https://sherpa.games/gallery/ironveil" });
  });

  it("uses the game title verbatim (no truncation)", () => {
    const longTitle = { ...baseGame, title: "A Very Long Game Title That Should Survive Verbatim" };
    const ld = buildBreadcrumbListLd(longTitle, "https://sherpa.games");
    const items = ld.itemListElement as Array<{ name: string }>;
    expect(items[2].name).toBe("A Very Long Game Title That Should Survive Verbatim");
  });
});
