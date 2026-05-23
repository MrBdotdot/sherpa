import { describe, it, expect } from "vitest";
import { buildCollectionPageLd } from "./collection-jsonld";
import type { GalleryGame } from "@/app/_lib/gallery-queries";

function game(id: string, title: string): GalleryGame {
  return { id, title, featured: false, createdAt: "2026-01-01T00:00:00Z" };
}

describe("buildCollectionPageLd", () => {
  it("emits a CollectionPage with the correct @context, @type, name, description, url", () => {
    const ld = buildCollectionPageLd([], "https://sherpa.games");
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("CollectionPage");
    expect(ld.name).toBeTruthy();
    expect(ld.description).toBeTruthy();
    expect(ld.url).toBe("https://sherpa.games/gallery");
  });

  it("includes a nested ItemList with numberOfItems matching the games length", () => {
    const games = [game("a", "Alpha"), game("b", "Beta"), game("c", "Cascade")];
    const ld = buildCollectionPageLd(games, "https://sherpa.games");
    const main = ld.mainEntity as { "@type": string; numberOfItems: number; itemListElement: unknown[] };
    expect(main["@type"]).toBe("ItemList");
    expect(main.numberOfItems).toBe(3);
    expect(main.itemListElement).toHaveLength(3);
  });

  it("emits one ListItem per game with sequential 1-based position, url, name", () => {
    const games = [game("ironveil", "Ironveil"), game("cascade", "Cascade")];
    const ld = buildCollectionPageLd(games, "https://sherpa.games");
    const items = (ld.mainEntity as { itemListElement: Array<{ position: number; url: string; name: string }> }).itemListElement;
    expect(items[0]).toMatchObject({ position: 1, url: "https://sherpa.games/gallery/ironveil", name: "Ironveil" });
    expect(items[1]).toMatchObject({ position: 2, url: "https://sherpa.games/gallery/cascade", name: "Cascade" });
  });
});
