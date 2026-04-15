# Heading Anchor Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make h2, h3, and section blocks valid `((label|target))` inline link targets that scroll within the current card instead of navigating to a page.

**Architecture:** `InlineWithLinks` gains an `anchorBlocks` prop; when the target ID matches a block in that list, it scrolls instead of navigating. `PreviewBlocks` derives `anchorBlocks` itself from the current page's blocks. The editor's `((` link picker gains an "On this card" group showing these same blocks. No new syntax, no new routes, no data model changes.

**Tech Stack:** React, TypeScript, Next.js App Router (client components), Tailwind CSS

---

## Files modified

| File | What changes |
|------|-------------|
| `app/_components/canvas/inline-markup.tsx` | Add `anchorBlocks` prop; scroll instead of navigate when target is a heading block |
| `app/_components/canvas/preview-blocks.tsx` | Add `id` to h2/h3 wrappers; compute `anchorBlocks`; pass to all `InlineWithLinks` calls; extend ReactMarkdown link handler |
| `app/_components/editor/page-link-picker.tsx` | Add `anchorBlocks` prop; render "On this card" group; extend `activeIndex` to span both groups |
| `app/_components/editor/block-editor.tsx` | Add `anchorBlocks` prop; unify `triggerResults` across pages + anchors; pass `anchorBlocks` to both picker usages |
| `app/_components/editor/content-tab.tsx` | Compute `anchorBlocks` from `selectedPage.blocks`; pass to each `BlockEditor` |
| `app/_lib/authoring-utils.ts` | Bump `APP_VERSION` to `"v0.23.3"` |
| `app/_lib/patch-notes.ts` | Add v0.23.3 entry |

---

## Task 1: Add scroll support to `InlineWithLinks`

**File:** `app/_components/canvas/inline-markup.tsx`

- [ ] **Replace the entire file content with:**

```tsx
"use client";

import React from "react";
import { ContentBlock, PageItem } from "@/app/_lib/authoring-types";

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
// target may be a pageId (navigate) or a heading/section blockId (scroll).
export function InlineWithLinks({
  text,
  pages,
  onNavigate,
  accentColor,
  anchorBlocks,
}: {
  text: string;
  pages: PageItem[];
  onNavigate: (pageId: string) => void;
  accentColor: string;
  anchorBlocks?: ContentBlock[];
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
      const isAnchor = !isPage && (anchorBlocks?.some((b) => b.id === target) ?? false);

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
      } else if (isAnchor) {
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

- [ ] **Verify types pass:**

```bash
cd /c/Users/Bee/authoring-interface && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit:**

```bash
git add app/_components/canvas/inline-markup.tsx
git commit -m "feat: InlineWithLinks supports anchorBlocks scroll targets"
```

---

## Task 2: Anchor IDs + `anchorBlocks` in `PreviewBlocks`

**File:** `app/_components/canvas/preview-blocks.tsx`

**Context:** `PreviewBlocks` renders all blocks for a card in the player. It already has `displayPage.blocks` in scope and already imports `useMemo`. Four `InlineWithLinks` call sites need `anchorBlocks`. The ReactMarkdown `<a>` handler needs the same scroll logic. h2/h3 wrapper divs need `id={block.id}` for `scrollIntoView` to work.

- [ ] **Add `anchorBlocks` computation after the `canLink` line (~line 59):**

Find:
```ts
  const canLink = !!(onNavigate && pages);
```

Replace with:
```ts
  const canLink = !!(onNavigate && pages);

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

- [ ] **Add `id` to the h2 wrapper div:**

Find:
```tsx
          if (format === "h2") {
            return (
              <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`${alignClass(block)} ${blockClass}`}>
                <h2 className="text-base font-bold text-neutral-900 leading-tight">
```

Replace with:
```tsx
          if (format === "h2") {
            return (
              <div key={block.id} id={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`${alignClass(block)} ${blockClass}`}>
                <h2 className="text-base font-bold text-neutral-900 leading-tight">
```

- [ ] **Add `id` to the h3 wrapper div:**

Find:
```tsx
          if (format === "h3") {
            return (
              <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`${alignClass(block)} ${blockClass}`}>
                <h3 className="text-sm font-semibold text-neutral-800 leading-snug">
```

Replace with:
```tsx
          if (format === "h3") {
            return (
              <div key={block.id} id={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`${alignClass(block)} ${blockClass}`}>
                <h3 className="text-sm font-semibold text-neutral-800 leading-snug">
```

- [ ] **Add `anchorBlocks` to the bullets `InlineWithLinks` call:**

Find:
```tsx
                        <InlineWithLinks text={item} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} />
                      ) : item}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500 ${blockClass}`}>
                Empty list block
```

Replace with:
```tsx
                        <InlineWithLinks text={item} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} anchorBlocks={anchorBlocks} />
                      ) : item}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500 ${blockClass}`}>
                Empty list block
```

- [ ] **Add `anchorBlocks` to the steps `InlineWithLinks` call:**

Find:
```tsx
                        <InlineWithLinks text={item} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} />
                      ) : item}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500 ${blockClass}`}>
                Empty steps block
```

Replace with:
```tsx
                        <InlineWithLinks text={item} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} anchorBlocks={anchorBlocks} />
                      ) : item}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500 ${blockClass}`}>
                Empty steps block
```

- [ ] **Extend the ReactMarkdown `<a>` handler to support scroll links:**

Find:
```tsx
                      if (href?.startsWith("sherpa-link:")) {
                        const pageId = href.slice("sherpa-link:".length);
                        const exists = pages?.some((p) => p.id === pageId);
                        if (exists && onNavigate) {
                          const color = accentColor || "#2563eb";
                          return (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onNavigate(pageId); }}
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

- [ ] **Add `anchorBlocks` to the callout `InlineWithLinks` call:**

Find:
```tsx
                  <InlineWithLinks
                    text={block.value || "Empty callout block"}
                    pages={pages!}
                    onNavigate={onNavigate!}
                    accentColor={accentColor}
                  />
```

Replace with:
```tsx
                  <InlineWithLinks
                    text={block.value || "Empty callout block"}
                    pages={pages!}
                    onNavigate={onNavigate!}
                    accentColor={accentColor}
                    anchorBlocks={anchorBlocks}
                  />
```

- [ ] **Add `anchorBlocks` to the summary `InlineWithLinks` call (near end of file):**

Find:
```tsx
        <InlineWithLinks text={displayPage.summary} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} />
```

Replace with:
```tsx
        <InlineWithLinks text={displayPage.summary} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} anchorBlocks={anchorBlocks} />
```

- [ ] **Verify types pass:**

```bash
cd /c/Users/Bee/authoring-interface && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit:**

```bash
git add app/_components/canvas/preview-blocks.tsx
git commit -m "feat: h2/h3 blocks get anchor IDs; PreviewBlocks wires anchorBlocks"
```

---

## Task 3: Extend `PageLinkPicker` with "On this card" group

**File:** `app/_components/editor/page-link-picker.tsx`

**Context:** The picker currently shows a flat list of pages. It needs a second "On this card" group for h2, h3, and section blocks. `activeIndex` is flat across both groups: `0..pages.length-1` for pages, `pages.length..` for anchor blocks.

- [ ] **Replace the entire file content with:**

```tsx
"use client";

import { ContentBlock, PageItem } from "@/app/_lib/authoring-types";

export function PageLinkPicker({
  pages,
  anchorBlocks,
  activeIndex,
  onSelect,
  onMouseDownSelect,
}: {
  pages: PageItem[];
  anchorBlocks?: ContentBlock[];
  activeIndex?: number;
  onSelect?: (id: string, label: string) => void;
  onMouseDownSelect?: (id: string, label: string) => void;
}) {
  const hasAnchors = !!anchorBlocks && anchorBlocks.length > 0;

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
      {hasAnchors && (
        <>
          <li className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400${pages.length > 0 ? " mt-1" : ""}`}>
            On this card
          </li>
          {anchorBlocks!.map((b, i) => {
            const idx = pages.length + i;
            const kindLabel =
              b.blockFormat === "h2" ? "H2" :
              b.blockFormat === "h3" ? "H3" :
              "Section";
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={onSelect ? () => onSelect(b.id, b.value) : undefined}
                  onMouseDown={onMouseDownSelect
                    ? (e) => { e.preventDefault(); onMouseDownSelect(b.id, b.value); }
                    : undefined
                  }
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition ${
                    activeIndex !== undefined && idx === activeIndex
                      ? "bg-neutral-100"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  <div className="truncate font-medium text-neutral-800">{b.value}</div>
                  <div className="text-[11px] text-neutral-400">{kindLabel}</div>
                </button>
              </li>
            );
          })}
        </>
      )}
    </ul>
  );
}
```

- [ ] **Verify types pass:**

```bash
cd /c/Users/Bee/authoring-interface && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit:**

```bash
git add app/_components/editor/page-link-picker.tsx
git commit -m "feat: PageLinkPicker shows On this card heading group"
```

---

## Task 4: Wire `anchorBlocks` through `BlockEditor`

**File:** `app/_components/editor/block-editor.tsx`

**Context:** `BlockEditor` currently derives `triggerResults: PageItem[]` for the `((` autocomplete dropdown. It must become a unified flat list `{ id, label }[]` that includes both pages and anchor blocks. The keyboard handler and both picker usages (trigger dropdown + link button) need updating.

- [ ] **Add `anchorBlocks?: ContentBlock[]` to the `BlockEditor` props destructure and type:**

Find:
```ts
export function BlockEditor({
  block,
  index,
  isFirst,
  isLast,
  pages,
  selectedPageId,
```

Replace with:
```ts
export function BlockEditor({
  block,
  index,
  isFirst,
  isLast,
  pages,
  anchorBlocks,
  selectedPageId,
```

Find (in the type block):
```ts
  pages?: PageItem[];
  selectedPageId?: string;
```

Replace with:
```ts
  pages?: PageItem[];
  anchorBlocks?: ContentBlock[];
  selectedPageId?: string;
```

- [ ] **Replace the `triggerResults` derivation with a unified list:**

Find:
```ts
  const triggerResults = trigger.query
    ? linkablePages.filter((p) => (p.title || "").toLowerCase().includes(trigger.query.toLowerCase()))
    : linkablePages;
```

Replace with:
```ts
  type TriggerResult = { id: string; label: string };

  const triggerPageResults = trigger.query
    ? linkablePages.filter((p) => (p.title || "").toLowerCase().includes(trigger.query.toLowerCase()))
    : linkablePages;

  const triggerAnchorResults = trigger.query
    ? (anchorBlocks ?? []).filter((b) => b.value.toLowerCase().includes(trigger.query.toLowerCase()))
    : (anchorBlocks ?? []);

  const triggerResults: TriggerResult[] = [
    ...triggerPageResults.map((p) => ({ id: p.id, label: p.title || "Untitled" })),
    ...triggerAnchorResults.map((b) => ({ id: b.id, label: b.value })),
  ];
```

- [ ] **Update the keyboard `Enter` handler to use the unified result type:**

Find:
```ts
    } else if (event.key === "Enter") {
      event.preventDefault();
      const page = triggerResults[trigger.index];
      if (page) commitTrigger(page.id, page.title || "link");
```

Replace with:
```ts
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = triggerResults[trigger.index];
      if (item) commitTrigger(item.id, item.label);
```

- [ ] **Update the trigger dropdown `PageLinkPicker` usage:**

Find:
```tsx
              <div className="border-b border-neutral-100 px-3 py-1.5 text-[11px] font-semibold text-neutral-400">
                Link to page{trigger.query ? `: "${trigger.query}"` : ""}
              </div>
              {triggerResults.length > 0 ? (
                <PageLinkPicker pages={triggerResults} activeIndex={trigger.index} onMouseDownSelect={commitTrigger} />
              ) : (
                <div className="px-3 py-3 text-xs text-neutral-400">
                  No pages yet. Add a page first.
                </div>
              )}
```

Replace with:
```tsx
              <div className="border-b border-neutral-100 px-3 py-1.5 text-[11px] font-semibold text-neutral-400">
                Link to page or heading{trigger.query ? `: "${trigger.query}"` : ""}
              </div>
              {triggerResults.length > 0 ? (
                <PageLinkPicker
                  pages={triggerPageResults}
                  anchorBlocks={triggerAnchorResults}
                  activeIndex={trigger.index}
                  onMouseDownSelect={commitTrigger}
                />
              ) : (
                <div className="px-3 py-3 text-xs text-neutral-400">
                  No matches found.
                </div>
              )}
```

- [ ] **Update the link button `PageLinkPicker` usage:**

Find:
```tsx
                  <PageLinkPicker pages={linkablePages} onSelect={insertLink} />
```

Replace with:
```tsx
                  <PageLinkPicker pages={linkablePages} anchorBlocks={anchorBlocks} onSelect={insertLink} />
```

- [ ] **Verify types pass:**

```bash
cd /c/Users/Bee/authoring-interface && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit:**

```bash
git add app/_components/editor/block-editor.tsx
git commit -m "feat: BlockEditor trigger includes heading anchor blocks"
```

---

## Task 5: Thread `anchorBlocks` from `ContentTab` + version bump

**Files:** `app/_components/editor/content-tab.tsx`, `app/_lib/authoring-utils.ts`, `app/_lib/patch-notes.ts`

**Context:** `ContentTab` renders one `BlockEditor` per block in `selectedPage.blocks`. It must compute `anchorBlocks` (h2, h3, section blocks with non-empty values) and pass it to each `BlockEditor`. Version bumps to v0.23.3.

- [ ] **Add `anchorBlocks` computation in `ContentTab`'s function body, after the hooks.**

Find (this line is right after the final `useEffect` in `ContentTab`):
```ts
  const totalItems = selectedPage.blocks.length + selectedPage.socialLinks.length;
```

Replace with:
```ts
  const anchorBlocks = selectedPage.blocks.filter(
    (b) =>
      (b.blockFormat === "h2" || b.blockFormat === "h3" || b.type === "section") &&
      b.value.trim() !== ""
  );

  const totalItems = selectedPage.blocks.length + selectedPage.socialLinks.length;
```

- [ ] **Pass `anchorBlocks` to `BlockEditor` in the blocks render loop.**

Find:
```tsx
                  pages={pages}
                  selectedPageId={selectedPage.id}
```

Replace with:
```tsx
                  pages={pages}
                  anchorBlocks={anchorBlocks}
                  selectedPageId={selectedPage.id}
```

- [ ] **Bump `APP_VERSION` in `app/_lib/authoring-utils.ts`:**

Find:
```ts
export const APP_VERSION = "v0.23.2";
```

Replace with:
```ts
export const APP_VERSION = "v0.23.3";
```

- [ ] **Add patch note in `app/_lib/patch-notes.ts`:**

Find:
```ts
export const PATCH_NOTES: PatchNote[] = [
  {
    version: "v0.23.2",
```

Replace with:
```ts
export const PATCH_NOTES: PatchNote[] = [
  {
    version: "v0.23.3",
    date: "2026-04-14",
    changes: [
      "Headings and section labels can now be inline link targets — type (( in any text block to link directly to a heading on the same card",
    ],
  },
  {
    version: "v0.23.2",
```

- [ ] **Verify types pass:**

```bash
cd /c/Users/Bee/authoring-interface && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit:**

```bash
git add app/_components/editor/content-tab.tsx app/_lib/authoring-utils.ts app/_lib/patch-notes.ts
git commit -m "feat: heading anchor links (v0.23.3) — h2, h3, section blocks linkable via (("
```

---

## Manual verification checklist

1. Open the authoring editor on a card that has at least one h2/h3 block and one section block (step-rail anchor)
2. Add a prose text block and type `((` — the picker should show two groups: "Pages" and "On this card"
3. "On this card" should list your h2/h3/section blocks with the correct type badge (H2, H3, Section)
4. Select a heading — it inserts `((heading text|blockId))`
5. Switch to player preview — click the link — the card should scroll smoothly to the heading
6. Verify a broken link (manually delete a heading block, then try clicking the link it was targeting) — should render as plain text, not crash
7. Verify the link button toolbar (not the `((` trigger) also shows "On this card" in the picker
