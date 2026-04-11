import { describe, it, expect, beforeEach } from "vitest";
import { injectInlineLinks } from "./inject-links";
import type { PageItem, ContentBlock } from "@/app/_lib/authoring-types";

let seq = 0;
function id() { return `id-${++seq}`; }

function block(type: ContentBlock["type"], value: string): ContentBlock {
  return { id: id(), type, value };
}

function page(title: string, blocks: ContentBlock[], extra?: Partial<PageItem>): PageItem {
  return {
    id: id(),
    title,
    kind: "page",
    summary: "",
    heroImage: "",
    x: 0, y: 0,
    contentX: 50, contentY: 50,
    blocks,
    socialLinks: [],
    canvasFeatures: [],
    publicUrl: "",
    showQrCode: false,
    interactionType: "modal",
    pageButtonPlacement: "bottom",
    templateId: "blank",
    cardSize: "medium",
    contentTintColor: "",
    contentTintOpacity: 85,
    ...extra,
  };
}

describe("injectInlineLinks", () => {
  beforeEach(() => { seq = 0; });

  it("returns pages unchanged when there is only one card", () => {
    const pages = [page("Setup", [block("text", "Place the board.")])];
    const result = injectInlineLinks(pages);
    expect(result[0].blocks[0].value).toBe("Place the board.");
  });

  it("links a card title found in another card's text block", () => {
    const scoring = page("Scoring", [block("text", "Add one point.")]);
    const setup = page("Setup", [block("text", "Refer to Scoring for points.")]);
    const result = injectInlineLinks([scoring, setup]);
    expect(result[1].blocks[0].value).toContain(`((Scoring|${scoring.id})`);
  });

  it("does not link a card to itself", () => {
    const setup = page("Setup", [block("text", "Setup begins here.")]);
    const scoring = page("Scoring", [block("text", "After Setup, score.")]);
    const result = injectInlineLinks([setup, scoring]);
    expect(result[0].blocks[0].value).toBe("Setup begins here.");
    expect(result[1].blocks[0].value).toContain(`((Setup|${setup.id})`);
  });

  it("links only the first occurrence per section", () => {
    const setup = page("Setup", [block("text", "Placeholder.")]);
    const scoring = page("Scoring", [block("text", "Setup is first. Setup again.")]);
    const result = injectInlineLinks([setup, scoring]);
    const val = result[1].blocks[0].value;
    const count = (val.match(/\(\(Setup\|/g) ?? []).length;
    expect(count).toBe(1);
  });

  it("resets seen set at section blocks so the title can be re-linked in a new section", () => {
    const setup = page("Setup", [block("text", "Placeholder.")]);
    const scoring = page("Scoring", [
      block("text", "Begin with Setup."),
      block("section", "Advanced"),
      block("text", "Return to Setup now."),
    ]);
    const result = injectInlineLinks([setup, scoring]);
    expect(result[1].blocks[0].value).toContain(`((Setup|${setup.id})`);
    expect(result[1].blocks[2].value).toContain(`((Setup|${setup.id})`);
  });

  it("does not scan section blocks — their text is left unchanged", () => {
    const setup = page("Setup", [block("text", "Placeholder.")]);
    const scoring = page("Scoring", [block("section", "Setup Overview")]);
    const result = injectInlineLinks([setup, scoring]);
    expect(result[1].blocks[0].value).toBe("Setup Overview");
  });

  it("does not double-wrap text already inside ((...)) markup", () => {
    const setup = page("Setup", [block("text", "Placeholder.")]);
    const scoring = page("Scoring", [
      block("text", "See ((Setup|existing-id)) for details."),
    ]);
    const result = injectInlineLinks([setup, scoring]);
    expect(result[1].blocks[0].value).not.toContain("((((");
    expect(result[1].blocks[0].value).toContain("((Setup|existing-id))");
  });

  it("skips titles shorter than 4 characters", () => {
    const go = page("Go", [block("text", "Placeholder.")]);
    const scoring = page("Scoring", [block("text", "Go score now.")]);
    const result = injectInlineLinks([go, scoring]);
    expect(result[1].blocks[0].value).toBe("Go score now.");
  });

  it("matches are case-insensitive and the link label preserves the original casing", () => {
    const setup = page("Setup", [block("text", "Placeholder.")]);
    const scoring = page("Scoring", [block("text", "During setup add points.")]);
    const result = injectInlineLinks([setup, scoring]);
    expect(result[1].blocks[0].value).toContain(`((setup|${setup.id})`);
  });

  it("matches longest title first to prevent a short title shadowing a longer one", () => {
    const setupId = "fixed-setup-id";
    const setupPhaseId = "fixed-setup-phase-id";
    const s1 = page("Setup", [], { id: setupId });
    const s2 = page("Setup Phase", [], { id: setupPhaseId });
    const scoring = page("Scoring", [block("text", "Begin Setup Phase now.")]);
    const result = injectInlineLinks([s1, s2, scoring]);
    const val = result[2].blocks[0].value;
    expect(val).toContain(`((Setup Phase|${setupPhaseId})`);
    expect(val).not.toContain(`((Setup|${setupId})`);
  });

  it("links titles in steps and callout blocks", () => {
    const scoring = page("Scoring", [block("text", "Placeholder.")]);
    const setup = page("Setup", [
      block("steps", "Place the Scoring token.\nDraw cards."),
      block("callout", "Note: See Scoring for details."),
    ]);
    const result = injectInlineLinks([scoring, setup]);
    expect(result[1].blocks[0].value).toContain(`((Scoring|${scoring.id})`);
    expect(result[1].blocks[1].value).toContain(`((Scoring|${scoring.id})`);
  });

  it("links titles in the summary field", () => {
    const scoring = page("Scoring", [block("text", "Placeholder.")]);
    const setup = { ...page("Setup", []), summary: "Begin with Scoring rules." };
    const result = injectInlineLinks([scoring, setup]);
    expect(result[1].summary).toContain(`((Scoring|${scoring.id})`);
  });

  it("no-op for a page with no text blocks", () => {
    const setup = page("Setup", []);
    const scoring = page("Scoring", []);
    const result = injectInlineLinks([setup, scoring]);
    expect(result[0].blocks).toEqual([]);
    expect(result[1].blocks).toEqual([]);
  });
});
