# Cross-Card Anchor Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend heading/section anchor links to work across cards — the `((` picker shows headings from all cards grouped by card name, and clicking a cross-card heading link navigates to that card then scrolls to the heading.

**Architecture:** Replace the `anchorBlocks?: ContentBlock[]` prop with `anchorTargets?: AnchorTarget[]` (a new type carrying `id`, `label`, `pageId`, `pageTitle`, `kind`) across 5 component files. The editor derives targets by flatMapping all pages instead of just the current page. The player resolves cross-card anchors by calling `onNavigate(pageId)` then `setTimeout(() => scrollIntoView, 150)`.

**Tech Stack:** Next.js (app router), React, TypeScript, Tailwind CSS. Tests via `npx vitest run`. Type-check via `npx tsc --noEmit`.

---

## Files modified

| File | Change |
|------|--------|
| `app/_lib/authoring-types.ts` | Add `AnchorTarget` type |
| `app/_components/canvas/inline-markup.tsx` | Swap `anchorBlocks` → `anchorTargets` + `currentPageId`, three-way resolution |
| `app/_components/canvas/preview-blocks.tsx` | Derive `anchorTargets` from all pages, pass `currentPageId` |
| `app/_components/editor/page-link-picker.tsx` | Swap `anchorBlocks` → `anchorTargets` + `currentPageId`, three-group UI |
| `app/_components/editor/block-editor.tsx` | Swap `anchorBlocks` → `anchorTargets`, pass `currentPageId` to pickers |
| `app/_components/editor/content-tab.tsx` | Derive `anchorTargets` from all pages |
| `app/_lib/authoring-utils.ts` | Bump `APP_VERSION` to `"v0.23.4"` |
| `app/_lib/patch-notes.ts` | Add v0.23.4 entry |

---

## Task 1: Add `AnchorTarget` type

**Files:**
- Modify: `app/_lib/authoring-types.ts`

- [ ] **Step 1: Add the type after the `ImageFit` type (line 46)**

Open `app/_lib/authoring-types.ts`. After the line:

```ts
export type ImageFit = "cover" | "contain" | "fill" | "center";
```

Insert:

```ts
export type AnchorTarget = {
  id: string;        // block.id — the DOM element id to scroll to
  label: string;     // block.value — display text in picker and inserted link
  pageId: string;    // which card this heading lives on
  pageTitle: string; // card title — shown as group header for cross-card entries
  kind: "h2" | "h3" | "section";
};
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_lib/authoring-types.ts
git commit -m "feat: add AnchorTarget type to authoring-types"
```

---

## Task 2: Update `InlineWithLinks`

**Files:**
- Modify: `app/_components/canvas/inline-markup.tsx`

**Context:** This file currently has `anchorBlocks?: ContentBlock[]` which is used to check if a link target is a same-card heading. Replace it with `anchorTargets?: AnchorTarget[]` + `currentPageId?: string`. Resolution becomes three-way: page nav → same-card scroll → cross-card navigate+scroll → broken span.

- [ ] **Step 1: Replace the file content**

Replace the entire file `app/_components/canvas/inline-markup.tsx` with:

```tsx
"use client";

import React from "react";
import { AnchorTarget, PageItem } from "@/app/_lib/authoring-types";

// Pre-process ((label|target)) and {text|color} for ReactMarkdown
export function processInlineMarkup(text: string): string {
  let result = text.replace(/\(\(([^|)]+)\|([^)]+)\)\)/g, "[$1](sherpa-link:$2)");
  result = result.replace(/\{([^|}]+)\|([^}]+)\}/g, "[$1](color:$2)");
  return result;
}

export function resolveColor(raw: string, accentColor: string): string {
  if (raw === "accent") return accentColor || "#2563eb";
  return raw;
}

// Render plain text with ((label|target)) and {text|color} inline markup.
// target may be a pageId (navigate), a same-card blockId (scroll),
// or a cross-card blockId (navigate to card then scroll).
export function InlineWithLinks({
  text,
  pages,
  onNavigate,
  accentColor,
  anchorTargets,
  currentPageId,
}: {
  text: string;
  pages: PageItem[];
  onNavigate: (pageId: string) => void;
  accentColor: string;
  anchorTargets?: AnchorTarget[];
  currentPageId?: string;
}) {
  const regex = /\(\(([^|)]+)\|([^)]+)\)\)|\{([^|}]+)\|([^}]+)\}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const k = match.index;
    if (match[1] !== undefined) {
      // ((label|target)) link
      const label = match[1];
      const target = match[2];
      const color = accentColor || "#2563eb";
      const isPage = pages.some((p) => p.id === target);
      const anchorTarget = !isPage ? anchorTargets?.find((t) => t.id === target) : undefined;
      const isSameCardAnchor = !!anchorTarget && anchorTarget.pageId === currentPageId;
      const isCrossCardAnchor = !!anchorTarget && anchorTarget.pageId !== currentPageId;

      if (isPage) {
        parts.push(
          <button
            key={k}
            type="button"
            onClick={(e) => { e.stopPropagation(); onNavigate(target); }}
            className="inline cursor-pointer font-bold underline underline-offset-2"
            style={{ color }}
          >
            {label}
          </button>
        );
      } else if (isSameCardAnchor) {
        parts.push(
          <button
            key={k}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="inline cursor-pointer font-bold underline underline-offset-2"
            style={{ color }}
          >
            {label}
          </button>
        );
      } else if (isCrossCardAnchor) {
        const pageId = anchorTarget.pageId;
        parts.push(
          <button
            key={k}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(pageId);
              setTimeout(() => {
                document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 150);
            }}
            className="inline cursor-pointer font-bold underline underline-offset-2"
            style={{ color }}
          >
            {label}
          </button>
        );
      } else {
        parts.push(<span key={k}>{label}</span>);
      }
    } else {
      // {text|color} span
      const label = match[3];
      const color = resolveColor(match[4], accentColor);
      parts.push(<span key={k} style={{ color }}>{label}</span>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <>{parts}</>;
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: errors in `preview-blocks.tsx`, `block-editor.tsx` — those still pass `anchorBlocks`. That's expected; they'll be fixed in Tasks 3 and 5.

- [ ] **Step 3: Commit**

```bash
git add app/_components/canvas/inline-markup.tsx
git commit -m "feat: InlineWithLinks supports cross-card AnchorTarget scroll"
```

---

## Task 3: Update `PreviewBlocks`

**Files:**
- Modify: `app/_components/canvas/preview-blocks.tsx`

**Context:** `PreviewBlocks` currently derives `anchorBlocks` from `displayPage.blocks` only. Change it to derive `anchorTargets` from all pages (using the existing `pages` prop). Pass `currentPageId={displayPage.id}` to all `InlineWithLinks` calls. Update the ReactMarkdown `<a>` handler with the same three-way resolution.

- [ ] **Step 1: Update the import line**

Find:
```ts
import { ContentBlock, PageItem } from "@/app/_lib/authoring-types";
```

Replace with:
```ts
import { AnchorTarget, PageItem } from "@/app/_lib/authoring-types";
```

- [ ] **Step 2: Replace the `anchorBlocks` useMemo**

Find:
```ts
  const anchorBlocks = useMemo(
    () =>
      displayPage.blocks.filter(
        (b) =>
          (b.blockFormat === "h2" || b.blockFormat === "h3" || b.type === "section") &&
          b.value.trim() !== ""
      ),
    [displayPage.blocks]
  );
```

Replace with:
```ts
  const anchorTargets = useMemo<AnchorTarget[]>(
    () => {
      const allPages = pages ?? [];
      const hasCurrentPage = allPages.some((p) => p.id === displayPage.id);
      const pagesForAnchors = hasCurrentPage ? allPages : [displayPage, ...allPages];
      return pagesForAnchors.flatMap((page) =>
        page.blocks
          .filter(
            (b) =>
              (b.blockFormat === "h2" || b.blockFormat === "h3" || b.type === "section") &&
              b.value.trim() !== ""
          )
          .map((b) => ({
            id: b.id,
            label: b.value,
            pageId: page.id,
            pageTitle: page.title || "Untitled",
            kind: (b.blockFormat === "h2" ? "h2" : b.blockFormat === "h3" ? "h3" : "section") as AnchorTarget["kind"],
          }))
      );
    },
    [pages, displayPage]
  );
```

- [ ] **Step 3: Update all four `InlineWithLinks` calls**

Each `InlineWithLinks` call currently has `anchorBlocks={anchorBlocks}`. Replace that prop with `anchorTargets={anchorTargets}` and add `currentPageId={displayPage.id}`.

There are four call sites. Find each one and update:

**Bullets call site** — find:
```tsx
<InlineWithLinks text={item} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} anchorBlocks={anchorBlocks} />
```
Replace with:
```tsx
<InlineWithLinks text={item} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} anchorTargets={anchorTargets} currentPageId={displayPage.id} />
```

**Steps call site** — same pattern, same replacement (there are two occurrences of this exact text — both get the same change):
```tsx
<InlineWithLinks text={item} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} anchorTargets={anchorTargets} currentPageId={displayPage.id} />
```

**Callout call site** — find:
```tsx
<InlineWithLinks
                    pages={pages!}
                    onNavigate={onNavigate!}
                    accentColor={accentColor}
                    anchorBlocks={anchorBlocks}
```
Replace with:
```tsx
<InlineWithLinks
                    pages={pages!}
                    onNavigate={onNavigate!}
                    accentColor={accentColor}
                    anchorTargets={anchorTargets}
                    currentPageId={displayPage.id}
```

**Summary call site** — find:
```tsx
<InlineWithLinks text={displayPage.summary} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} anchorBlocks={anchorBlocks} />
```
Replace with:
```tsx
<InlineWithLinks text={displayPage.summary} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} anchorTargets={anchorTargets} currentPageId={displayPage.id} />
```

- [ ] **Step 4: Update the ReactMarkdown `<a>` handler**

Find:
```tsx
                      if (href?.startsWith("sherpa-link:")) {
                        const target = href.slice("sherpa-link:".length);
                        const color = accentColor || "#2563eb";
                        const isPage = pages?.some((p) => p.id === target);
                        const isAnchor = !isPage && anchorBlocks.some((b) => b.id === target);
                        if (isPage && onNavigate) {
                          return (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onNavigate(target); }}
                              className="cursor-pointer font-bold underline underline-offset-2"
                              style={{ color }}
                            >
                              {children}
                            </button>
                          );
                        }
                        if (isAnchor) {
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }}
                              className="cursor-pointer font-bold underline underline-offset-2"
                              style={{ color }}
                            >
                              {children}
                            </button>
                          );
                        }
                        return <span>{children}</span>;
                      }
```

Replace with:
```tsx
                      if (href?.startsWith("sherpa-link:")) {
                        const target = href.slice("sherpa-link:".length);
                        const color = accentColor || "#2563eb";
                        const isPage = pages?.some((p) => p.id === target);
                        const anchorTarget = !isPage ? anchorTargets.find((t) => t.id === target) : undefined;
                        const isSameCardAnchor = !!anchorTarget && anchorTarget.pageId === displayPage.id;
                        const isCrossCardAnchor = !!anchorTarget && anchorTarget.pageId !== displayPage.id;
                        if (isPage && onNavigate) {
                          return (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onNavigate(target); }}
                              className="cursor-pointer font-bold underline underline-offset-2"
                              style={{ color }}
                            >
                              {children}
                            </button>
                          );
                        }
                        if (isSameCardAnchor) {
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }}
                              className="cursor-pointer font-bold underline underline-offset-2"
                              style={{ color }}
                            >
                              {children}
                            </button>
                          );
                        }
                        if (isCrossCardAnchor && onNavigate) {
                          const pageId = anchorTarget.pageId;
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigate(pageId);
                                setTimeout(() => {
                                  document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }, 150);
                              }}
                              className="cursor-pointer font-bold underline underline-offset-2"
                              style={{ color }}
                            >
                              {children}
                            </button>
                          );
                        }
                        return <span>{children}</span>;
                      }
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: errors in `block-editor.tsx` and `content-tab.tsx` (still use `anchorBlocks`). `preview-blocks.tsx` should be clean.

- [ ] **Step 6: Commit**

```bash
git add app/_components/canvas/preview-blocks.tsx
git commit -m "feat: PreviewBlocks derives anchorTargets from all pages for cross-card links"
```

---

## Task 4: Update `PageLinkPicker`

**Files:**
- Modify: `app/_components/editor/page-link-picker.tsx`

**Context:** Currently renders two groups (Pages + On this card) using `anchorBlocks?: ContentBlock[]`. Replace with `anchorTargets?: AnchorTarget[]` + `currentPageId?: string`, split targets into same-card and cross-card, render three groups where cross-card targets are grouped by card name.

- [ ] **Step 1: Replace the entire file**

```tsx
"use client";

import React from "react";
import { AnchorTarget, PageItem } from "@/app/_lib/authoring-types";

export function PageLinkPicker({
  pages,
  anchorTargets,
  currentPageId,
  activeIndex,
  onSelect,
  onMouseDownSelect,
}: {
  pages: PageItem[];
  anchorTargets?: AnchorTarget[];
  currentPageId?: string;
  activeIndex?: number;
  onSelect?: (id: string, label: string) => void;
  onMouseDownSelect?: (id: string, label: string) => void;
}) {
  const sameCard = (anchorTargets ?? []).filter((t) => t.pageId === currentPageId);
  const crossCard = (anchorTargets ?? []).filter((t) => t.pageId !== currentPageId);

  // Group cross-card targets by pageId, preserving first-seen order
  interface CrossCardGroup {
    pageId: string;
    pageTitle: string;
    items: Array<{ target: AnchorTarget; idx: number }>;
  }
  const crossCardGroupMap = new Map<string, CrossCardGroup>();
  let crossIdx = pages.length + sameCard.length;
  for (const t of crossCard) {
    if (!crossCardGroupMap.has(t.pageId)) {
      crossCardGroupMap.set(t.pageId, { pageId: t.pageId, pageTitle: t.pageTitle, items: [] });
    }
    crossCardGroupMap.get(t.pageId)!.items.push({ target: t, idx: crossIdx++ });
  }
  const crossCardGroups = [...crossCardGroupMap.values()];

  const hasAnchors = (anchorTargets ?? []).length > 0;

  return (
    <ul className="max-h-48 overflow-y-auto p-1">
      {hasAnchors && pages.length > 0 && (
        <li className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          Pages
        </li>
      )}
      {pages.map((p, i) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={onSelect ? () => onSelect(p.id, p.title || "link") : undefined}
            onMouseDown={onMouseDownSelect
              ? (e) => { e.preventDefault(); onMouseDownSelect(p.id, p.title || "link"); }
              : undefined
            }
            className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition ${
              activeIndex !== undefined && i === activeIndex
                ? "bg-neutral-100"
                : "hover:bg-neutral-50"
            }`}
          >
            <div className="truncate font-medium text-neutral-800">{p.title || "Untitled"}</div>
            <div className="text-[11px] capitalize text-neutral-400">{p.kind}</div>
          </button>
        </li>
      ))}
      {sameCard.length > 0 && (
        <>
          <li className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400${pages.length > 0 ? " mt-1" : ""}`}>
            On this card
          </li>
          {sameCard.map((t, i) => {
            const idx = pages.length + i;
            const kindLabel = t.kind === "h2" ? "H2" : t.kind === "h3" ? "H3" : "Section";
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={onSelect ? () => onSelect(t.id, t.label) : undefined}
                  onMouseDown={onMouseDownSelect
                    ? (e) => { e.preventDefault(); onMouseDownSelect(t.id, t.label); }
                    : undefined
                  }
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition ${
                    activeIndex !== undefined && idx === activeIndex
                      ? "bg-neutral-100"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  <div className="truncate font-medium text-neutral-800">{t.label}</div>
                  <div className="text-[11px] text-neutral-400">{kindLabel}</div>
                </button>
              </li>
            );
          })}
        </>
      )}
      {crossCardGroups.map((group) => (
        <React.Fragment key={group.pageId}>
          <li className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mt-1">
            {group.pageTitle}
          </li>
          {group.items.map(({ target: t, idx }) => {
            const kindLabel = t.kind === "h2" ? "H2" : t.kind === "h3" ? "H3" : "Section";
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={onSelect ? () => onSelect(t.id, t.label) : undefined}
                  onMouseDown={onMouseDownSelect
                    ? (e) => { e.preventDefault(); onMouseDownSelect(t.id, t.label); }
                    : undefined
                  }
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition ${
                    activeIndex !== undefined && idx === activeIndex
                      ? "bg-neutral-100"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  <div className="truncate font-medium text-neutral-800">{t.label}</div>
                  <div className="text-[11px] text-neutral-400">{kindLabel}</div>
                </button>
              </li>
            );
          })}
        </React.Fragment>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: errors in `block-editor.tsx` (still passes `anchorBlocks` to picker). That's expected.

- [ ] **Step 3: Commit**

```bash
git add app/_components/editor/page-link-picker.tsx
git commit -m "feat: PageLinkPicker shows cross-card heading groups by card name"
```

---

## Task 5: Update `BlockEditor`

**Files:**
- Modify: `app/_components/editor/block-editor.tsx`

**Context:** `BlockEditor` currently has `anchorBlocks?: ContentBlock[]` as a prop. Replace it with `anchorTargets?: AnchorTarget[]`. Update `triggerAnchorResults` to filter `anchorTargets` by `t.label`. Update both `PageLinkPicker` calls to pass `anchorTargets` and `currentPageId`.

- [ ] **Step 1: Update the import**

Find:
```ts
import { ContentBlock, ImageFit, PageItem } from "@/app/_lib/authoring-types";
```

Replace with:
```ts
import { AnchorTarget, ContentBlock, ImageFit, PageItem } from "@/app/_lib/authoring-types";
```

- [ ] **Step 2: Replace the prop declaration**

In the destructured props list, find:
```ts
  anchorBlocks,
```
Replace with:
```ts
  anchorTargets,
```

In the TypeScript prop type, find:
```ts
  anchorBlocks?: ContentBlock[];
```
Replace with:
```ts
  anchorTargets?: AnchorTarget[];
```

- [ ] **Step 3: Update `triggerAnchorResults`**

Find:
```ts
  const triggerAnchorResults = trigger.query
    ? (anchorBlocks ?? []).filter((b) => b.value.toLowerCase().includes(trigger.query.toLowerCase()))
    : (anchorBlocks ?? []);

  const triggerResults: TriggerResult[] = [
    ...triggerPageResults.map((p) => ({ id: p.id, label: p.title || "Untitled" })),
    ...triggerAnchorResults.map((b) => ({ id: b.id, label: b.value })),
  ];
```

Replace with:
```ts
  const triggerAnchorResults = trigger.query
    ? (anchorTargets ?? []).filter((t) => t.label.toLowerCase().includes(trigger.query.toLowerCase()))
    : (anchorTargets ?? []);

  const triggerResults: TriggerResult[] = [
    ...triggerPageResults.map((p) => ({ id: p.id, label: p.title || "Untitled" })),
    ...triggerAnchorResults.map((t) => ({ id: t.id, label: t.label })),
  ];
```

- [ ] **Step 4: Update the link-button `PageLinkPicker` call**

Find:
```tsx
                  <PageLinkPicker pages={linkablePages} anchorBlocks={anchorBlocks} onSelect={insertLink} />
```

Replace with:
```tsx
                  <PageLinkPicker pages={linkablePages} anchorTargets={anchorTargets} currentPageId={selectedPageId} onSelect={insertLink} />
```

- [ ] **Step 5: Update the trigger dropdown `PageLinkPicker` call**

Find:
```tsx
                <PageLinkPicker
                  pages={triggerPageResults}
                  anchorBlocks={triggerAnchorResults}
                  activeIndex={trigger.index}
                  onMouseDownSelect={commitTrigger}
                />
```

Replace with:
```tsx
                <PageLinkPicker
                  pages={triggerPageResults}
                  anchorTargets={triggerAnchorResults}
                  currentPageId={selectedPageId}
                  activeIndex={trigger.index}
                  onMouseDownSelect={commitTrigger}
                />
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: errors only in `content-tab.tsx` (still passes `anchorBlocks`).

- [ ] **Step 7: Commit**

```bash
git add app/_components/editor/block-editor.tsx
git commit -m "feat: BlockEditor wires anchorTargets for cross-card heading picker"
```

---

## Task 6: Update `ContentTab`

**Files:**
- Modify: `app/_components/editor/content-tab.tsx`

**Context:** `ContentTab` currently derives `anchorBlocks` from `selectedPage.blocks` only. Replace with `anchorTargets` flatMapped from all `pages`. Pass `anchorTargets` to `BlockEditor` instead of `anchorBlocks`.

- [ ] **Step 1: Update the import**

Find:
```ts
import { ContentBlock, ContentBlockType, DisplayStyleKey, ImageFit, PageItem, SocialLink } from "@/app/_lib/authoring-types";
```

Replace with:
```ts
import { AnchorTarget, ContentBlock, ContentBlockType, DisplayStyleKey, ImageFit, PageItem, SocialLink } from "@/app/_lib/authoring-types";
```

- [ ] **Step 2: Replace `anchorBlocks` derivation**

Find:
```ts
  const anchorBlocks = selectedPage.blocks.filter(
    (b) =>
      (b.blockFormat === "h2" || b.blockFormat === "h3" || b.type === "section") &&
      b.value.trim() !== ""
  );
```

Replace with:
```ts
  const anchorTargets: AnchorTarget[] = pages.flatMap((page) =>
    page.blocks
      .filter(
        (b) =>
          (b.blockFormat === "h2" || b.blockFormat === "h3" || b.type === "section") &&
          b.value.trim() !== ""
      )
      .map((b) => ({
        id: b.id,
        label: b.value,
        pageId: page.id,
        pageTitle: page.title || "Untitled",
        kind: (b.blockFormat === "h2" ? "h2" : b.blockFormat === "h3" ? "h3" : "section") as AnchorTarget["kind"],
      }))
  );
```

- [ ] **Step 3: Update the `BlockEditor` call**

Find:
```tsx
                  anchorBlocks={anchorBlocks}
```

Replace with:
```tsx
                  anchorTargets={anchorTargets}
```

- [ ] **Step 4: Type-check — expect clean**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run tests**

```bash
npx vitest run
```

Expected: same pass/fail as before this feature branch (the `usePlan.test.ts` suite fails due to missing Supabase env vars — that is pre-existing and unrelated).

- [ ] **Step 6: Commit**

```bash
git add app/_components/editor/content-tab.tsx
git commit -m "feat: ContentTab derives anchorTargets from all pages for cross-card linking"
```

---

## Task 7: Version bump and patch note

**Files:**
- Modify: `app/_lib/authoring-utils.ts`
- Modify: `app/_lib/patch-notes.ts`

- [ ] **Step 1: Bump version in `authoring-utils.ts`**

Find:
```ts
export const APP_VERSION = "v0.23.3";
```

Replace with:
```ts
export const APP_VERSION = "v0.23.4";
```

- [ ] **Step 2: Add patch note in `patch-notes.ts`**

At the top of the `PATCH_NOTES` array (before the `v0.23.3` entry), insert:

```ts
  {
    version: "v0.23.4",
    date: "2026-04-14",
    changes: [
      "Heading and section links now work across cards — type (( to link to a heading on any card, clicking navigates there and scrolls to the heading",
    ],
  },
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/_lib/authoring-utils.ts app/_lib/patch-notes.ts
git commit -m "feat: cross-card anchor links (v0.23.4)"
```

---

## Manual verification checklist

After all tasks complete, open the dev server (`npm run dev`) and verify:

1. **Editor — same-card picker:** On a card with h2/h3/section blocks, type `((`. "On this card" group appears with those headings.
2. **Editor — cross-card picker:** On a different card, type `((`. The first card's headings appear under their card name as a separate group.
3. **Editor — query filter:** Type `((money`. Results filter across all groups.
4. **Player — same-card scroll:** Click a same-card heading link. Scrolls within the card.
5. **Player — cross-card navigate+scroll:** Click a cross-card heading link. Navigates to that card and scrolls to the heading.
6. **Player — broken link:** A `((label|nonexistentId))` renders as plain text (no button).
7. **No regression:** Existing page nav links (`((label|pageId))`) still work.
