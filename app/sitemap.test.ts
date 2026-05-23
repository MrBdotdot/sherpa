import { describe, it, expect } from "vitest";
import { buildSitemapEntries } from "./sitemap";

describe("buildSitemapEntries", () => {
  it("includes the homepage as a static URL", () => {
    const out = buildSitemapEntries([], "https://sherpa.games", new Date("2026-05-21T00:00:00Z"));
    const home = out.find((e) => e.url === "https://sherpa.games/");
    expect(home).toBeDefined();
    expect(home?.priority).toBe(1.0);
    expect(home?.changeFrequency).toBe("weekly");
  });

  it("includes the gallery index as a static URL", () => {
    const out = buildSitemapEntries([], "https://sherpa.games", new Date("2026-05-21T00:00:00Z"));
    const gallery = out.find((e) => e.url === "https://sherpa.games/gallery");
    expect(gallery).toBeDefined();
    expect(gallery?.priority).toBe(0.8);
    expect(gallery?.changeFrequency).toBe("daily");
  });

  it("appends one entry per published game", () => {
    const out = buildSitemapEntries(
      [
        { id: "ironveil", createdAt: "2026-01-20T00:00:00Z" },
        { id: "cascade", createdAt: "2026-02-14T00:00:00Z" },
      ],
      "https://sherpa.games",
      new Date("2026-05-21T00:00:00Z")
    );
    expect(out.find((e) => e.url === "https://sherpa.games/gallery/ironveil")).toBeDefined();
    expect(out.find((e) => e.url === "https://sherpa.games/gallery/cascade")).toBeDefined();
  });

  it("uses the game's createdAt as lastModified when available", () => {
    const out = buildSitemapEntries(
      [{ id: "ironveil", createdAt: "2026-01-20T00:00:00Z" }],
      "https://sherpa.games",
      new Date("2026-05-21T00:00:00Z")
    );
    const entry = out.find((e) => e.url === "https://sherpa.games/gallery/ironveil");
    expect(entry?.lastModified).toEqual(new Date("2026-01-20T00:00:00Z"));
  });

  it("falls back to `now` when the game has no createdAt", () => {
    const now = new Date("2026-05-21T00:00:00Z");
    const out = buildSitemapEntries(
      [{ id: "x", createdAt: undefined }],
      "https://sherpa.games",
      now
    );
    const entry = out.find((e) => e.url === "https://sherpa.games/gallery/x");
    expect(entry?.lastModified).toEqual(now);
  });
});
