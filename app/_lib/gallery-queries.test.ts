import { describe, it, expect } from "vitest";
import { parsePlayerCountRange, mapGameRowToGalleryGame } from "./gallery-queries";
import type { GameMeta } from "@/app/_lib/authoring-types";

describe("parsePlayerCountRange", () => {
  it("parses an en-dash range", () => {
    expect(parsePlayerCountRange("2–4")).toEqual({ min: 2, max: 4 });
  });
  it("parses an ASCII hyphen range", () => {
    expect(parsePlayerCountRange("2-4")).toEqual({ min: 2, max: 4 });
  });
  it("parses a single number as min == max", () => {
    expect(parsePlayerCountRange("5")).toEqual({ min: 5, max: 5 });
  });
  it("trims whitespace and surrounding text", () => {
    expect(parsePlayerCountRange("  3 – 6 players ")).toEqual({ min: 3, max: 6 });
  });
  it("returns null for blank input", () => {
    expect(parsePlayerCountRange("")).toBeNull();
    expect(parsePlayerCountRange("   ")).toBeNull();
  });
  it("returns null when no digits are present", () => {
    expect(parsePlayerCountRange("any")).toBeNull();
  });
});

describe("mapGameRowToGalleryGame", () => {
  const meta: GameMeta = {
    tagline: "Hidden movement thriller",
    designer: "Marcus Drenn",
    playerCount: "3–6",
    playTime: "90–120 min",
    complexity: "Heavy",
    ageRange: "17+",
    tags: ["thematic", "hidden-movement"],
    cardImage: "https://example.com/iron.jpg",
  };

  it("flattens system_settings.gameMeta into top-level fields", () => {
    const row = {
      id: "ironveil",
      title: "Ironveil",
      system_settings: { gameMeta: meta },
      featured: true,
      created_at: "2026-01-20T00:00:00Z",
    };
    const out = mapGameRowToGalleryGame(row);
    expect(out.id).toBe("ironveil");
    expect(out.title).toBe("Ironveil");
    expect(out.featured).toBe(true);
    expect(out.tagline).toBe("Hidden movement thriller");
    expect(out.designer).toBe("Marcus Drenn");
    expect(out.tags).toEqual(["thematic", "hidden-movement"]);
    expect(out.cardImage).toBe("https://example.com/iron.jpg");
  });

  it("returns undefined gameMeta fields when system_settings is empty", () => {
    const row = {
      id: "blank",
      title: "Untitled",
      system_settings: {},
      featured: false,
      created_at: "2026-04-01T00:00:00Z",
    };
    const out = mapGameRowToGalleryGame(row);
    expect(out.tagline).toBeUndefined();
    expect(out.designer).toBeUndefined();
    expect(out.tags).toBeUndefined();
    expect(out.complexity).toBeUndefined();
  });

  it("tolerates a null system_settings", () => {
    const row = {
      id: "weird",
      title: "Weird",
      system_settings: null,
      featured: false,
      created_at: "2026-04-01T00:00:00Z",
    };
    const out = mapGameRowToGalleryGame(row);
    expect(out.tagline).toBeUndefined();
  });
});
