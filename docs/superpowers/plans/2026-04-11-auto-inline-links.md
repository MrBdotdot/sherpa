# Auto Inline Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the rulebook importer generates cards, automatically inject `((label|pageId))` inline links wherever a card title appears in another card's text content.

**Architecture:** A pure function `injectInlineLinks` is extracted to its own file (`inject-links.ts`) alongside the route. It runs one post-processing pass over all generated `PageItem`s before they are persisted. It uses word-boundary regex matching with a Wikipedia-style per-section linking strategy (seen set resets at each `section` block). No new API calls, no schema changes.

**Tech Stack:** TypeScript, Vitest (to be installed), Node.js regex

---

### Task 1: Install Vitest and configure path alias

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Add test script to package.json**

In `package.json`, add to the `"scripts"` object:

```json
"test": "vitest run"
```

- [ ] **Step 3: Create vitest.config.ts**

Create `vitest.config.ts` at the project root:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: Verify setup**

```bash
npm test
```

Expected output: `No test files found` (not an error — no tests yet).

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.ts
git commit -m "chore: add vitest test runner"
```

---

### Task 2: Write failing tests for `injectInlineLinks`

**Files:**
- Create: `app/api/import/rulebook/inject-links.test.ts`

- [ ] **Step 1: Write the test file**

Create `app/api/import/rulebook/inject-links.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
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
```

- [ ] **Step 2: Run tests — verify they all fail**

```bash
npm test app/api/import/rulebook/inject-links.test.ts
```

Expected: All 12 tests FAIL with `Cannot find module './inject-links'`.

---

### Task 3: Implement `injectInlineLinks`

**Files:**
- Create: `app/api/import/rulebook/inject-links.ts`

- [ ] **Step 1: Create the implementation file**

Create `app/api/import/rulebook/inject-links.ts`:

```typescript
import type { PageItem, ContentBlock } from "@/app/_lib/authoring-types";

const SCANNABLE_TYPES = new Set<ContentBlock["type"]>(["text", "steps", "callout"]);
const MIN_TITLE_LENGTH = 4;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function injectLinksIntoText(
  text: string,
  candidates: Array<{ title: string; pageId: string }>,
  excludePageId: string,
  seen: Set<string>
): string {
  let result = text;
  for (const { title, pageId } of candidates) {
    if (pageId === excludePageId) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    const regex = new RegExp(`\\b(${escapeRegex(title)})\\b`, "i");
    const match = regex.exec(result);
    if (!match) continue;
    // Guard: skip if the match falls inside existing ((..)) markup
    const before = result.slice(0, match.index);
    const opens = (before.match(/\(\(/g) ?? []).length;
    const closes = (before.match(/\)\)/g) ?? []).length;
    if (opens > closes) continue;
    result =
      result.slice(0, match.index) +
      `((${match[1]}|${pageId}))` +
      result.slice(match.index + match[0].length);
    seen.add(key);
  }
  return result;
}

export function injectInlineLinks(pages: PageItem[]): PageItem[] {
  if (pages.length <= 1) return pages;

  // Sort longest title first so "Setup Phase" matches before "Setup"
  const candidates = pages
    .filter((p) => p.title.length >= MIN_TITLE_LENGTH)
    .map((p) => ({ title: p.title, pageId: p.id }))
    .sort((a, b) => b.title.length - a.title.length);

  return pages.map((page) => {
    // Summary is its own section
    let seen = new Set<string>();
    const newSummary = page.summary.trim()
      ? injectLinksIntoText(page.summary, candidates, page.id, seen)
      : page.summary;

    // Blocks: reset seen at each section block
    seen = new Set<string>();
    const newBlocks = page.blocks.map((block) => {
      if (block.type === "section") {
        seen = new Set<string>();
        return block;
      }
      if (!SCANNABLE_TYPES.has(block.type)) return block;
      return { ...block, value: injectLinksIntoText(block.value, candidates, page.id, seen) };
    });

    return { ...page, summary: newSummary, blocks: newBlocks };
  });
}
```

- [ ] **Step 2: Run tests — verify they all pass**

```bash
npm test app/api/import/rulebook/inject-links.test.ts
```

Expected: All 12 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add app/api/import/rulebook/inject-links.ts app/api/import/rulebook/inject-links.test.ts
git commit -m "feat: add injectInlineLinks — auto-link card titles on import"
```

---

### Task 4: Wire `injectInlineLinks` into the import route

**Files:**
- Modify: `app/api/import/rulebook/route.ts`

- [ ] **Step 1: Add the import**

At the top of `app/api/import/rulebook/route.ts`, add after the existing imports:

```typescript
import { injectInlineLinks } from "./inject-links";
```

- [ ] **Step 2: Call `injectInlineLinks` before the Supabase upsert**

Find the block that reads:

```typescript
  if (newPages.length === 0) {
    return NextResponse.json({ error: "No cards could be extracted" }, { status: 422 });
  }

  // 8. Persist: upsert new cards + append to card_order
  const cardRows = newPages.map((page) => ({
```

Replace it with:

```typescript
  if (newPages.length === 0) {
    return NextResponse.json({ error: "No cards could be extracted" }, { status: 422 });
  }

  // 8a. Inject cross-card inline links
  const linkedPages = injectInlineLinks(newPages);

  // 8b. Persist: upsert new cards + append to card_order
  const cardRows = linkedPages.map((page) => ({
```

- [ ] **Step 3: Update the card_order line to use `linkedPages`**

Find:

```typescript
  const newOrder = [...existingOrder, ...newPages.map((p) => p.id)];
```

Replace with:

```typescript
  const newOrder = [...existingOrder, ...linkedPages.map((p) => p.id)];
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Run the full test suite**

```bash
npm test
```

Expected: All 12 tests PASS.

- [ ] **Step 6: Manual verification**

Start the dev server (`npm run dev`) and do a test import with this short rulebook text:

```
Setup
Place the board in the center of the table. Each player takes 5 tokens and places them near their starting area.

Taking a Turn
On your turn, move your piece and collect resources. After taking a turn, draw one card. Refer to Setup if you need to review starting positions.

Scoring
After each round, count your tokens. The player with the most tokens wins. See Taking a Turn for how tokens are collected.

Victory Conditions
The first player to reach 20 points wins. Points are calculated during Scoring at the end of each round.
```

Open the imported cards in the authoring studio canvas. Verify:
- "Taking a Turn" card: "Refer to ((Setup|…)) if you need to review" — linked
- "Scoring" card: "See ((Taking a Turn|…)) for how tokens" — linked
- "Victory Conditions" card: "calculated during ((Scoring|…))" — linked
- "Setup" card: no links to itself

- [ ] **Step 7: Commit**

```bash
git add app/api/import/rulebook/route.ts
git commit -m "feat: wire injectInlineLinks into rulebook import route"
```
