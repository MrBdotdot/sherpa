import { describe, it, expect } from "vitest";
import { extractGameImageUrls } from "./warm-game-cache";
import type { PageItem, SystemSettings, ContentBlock, CanvasFeature } from "@/app/_lib/authoring-types";

let seq = 0;
function id() { return `id-${++seq}`; }

function makeBlock(type: ContentBlock["type"], value: string): ContentBlock {
  return { id: id(), type, value };
}

function makeFeature(imageUrl: string): CanvasFeature {
  return {
    id: id(), type: "image", label: "", description: "",
    linkUrl: "", imageUrl, optionsText: "", x: 0, y: 0,
  };
}

function makePage(heroImage: string, blocks: ContentBlock[], features: CanvasFeature[]): PageItem {
  return {
    id: id(), kind: "page", title: "Test", summary: "", heroImage,
    x: 0, y: 0, contentX: 50, contentY: 50, blocks,
    socialLinks: [], canvasFeatures: features, publicUrl: "",
    showQrCode: false, interactionType: "modal",
    pageButtonPlacement: "bottom", templateId: "blank",
    cardSize: "medium", contentTintColor: "", contentTintOpacity: 85,
  };
}

const baseSettings: SystemSettings = {
  fontTheme: "modern", surfaceStyle: "glass", accentColor: "#000",
  hotspotSize: "medium",
};

describe("extractGameImageUrls", () => {
  it("extracts hero image URLs", () => {
    const page = makePage("https://example.com/hero.jpg", [], []);
    const result = extractGameImageUrls([page], baseSettings);
    expect(result).toContain("https://example.com/hero.jpg");
  });

  it("skips color: hero images", () => {
    const page = makePage("color:#ff0000", [], []);
    const result = extractGameImageUrls([page], baseSettings);
    expect(result).not.toContain("color:#ff0000");
  });

  it("skips empty hero images", () => {
    const page = makePage("", [], []);
    const result = extractGameImageUrls([page], baseSettings);
    expect(result).toHaveLength(0);
  });

  it("extracts image block values", () => {
    const page = makePage("", [makeBlock("image", "https://example.com/block.jpg")], []);
    const result = extractGameImageUrls([page], baseSettings);
    expect(result).toContain("https://example.com/block.jpg");
  });

  it("skips non-image blocks", () => {
    const page = makePage("", [makeBlock("text", "Hello world")], []);
    const result = extractGameImageUrls([page], baseSettings);
    expect(result).not.toContain("Hello world");
  });

  it("extracts canvas feature imageUrls", () => {
    const page = makePage("", [], [makeFeature("https://example.com/logo.png")]);
    const result = extractGameImageUrls([page], baseSettings);
    expect(result).toContain("https://example.com/logo.png");
  });

  it("skips empty canvas feature imageUrls", () => {
    const page = makePage("", [], [makeFeature("")]);
    const result = extractGameImageUrls([page], baseSettings);
    expect(result).toHaveLength(0);
  });

  it("deduplicates URLs", () => {
    const url = "https://example.com/shared.jpg";
    const p1 = makePage(url, [], []);
    const p2 = makePage(url, [], []);
    const result = extractGameImageUrls([p1, p2], baseSettings);
    expect(result.filter((u) => u === url)).toHaveLength(1);
  });

  it("includes modelUrl when cache3dModels is true", () => {
    const settings: SystemSettings = {
      ...baseSettings,
      backgroundType: "model-3d",
      modelUrl: "https://example.com/model.glb",
      cache3dModels: true,
    };
    const result = extractGameImageUrls([], settings);
    expect(result).toContain("https://example.com/model.glb");
  });

  it("excludes modelUrl when cache3dModels is false", () => {
    const settings: SystemSettings = {
      ...baseSettings,
      backgroundType: "model-3d",
      modelUrl: "https://example.com/model.glb",
      cache3dModels: false,
    };
    const result = extractGameImageUrls([], settings);
    expect(result).not.toContain("https://example.com/model.glb");
  });

  it("excludes modelUrl when cache3dModels is undefined", () => {
    const settings: SystemSettings = {
      ...baseSettings,
      backgroundType: "model-3d",
      modelUrl: "https://example.com/model.glb",
    };
    const result = extractGameImageUrls([], settings);
    expect(result).not.toContain("https://example.com/model.glb");
  });
});
