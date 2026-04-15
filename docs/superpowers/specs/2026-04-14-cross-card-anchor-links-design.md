# Cross-Card Anchor Links — Design Spec

**Feature:** Heading and section anchor targets expand from same-card only to all cards. Clicking a cross-card heading link navigates to that card then scrolls to the heading.

**Version target:** v0.23.4

---

## What it does

Authors using the `((` link picker now see headings and section labels from every card, not just the one they are editing. The picker groups them by card. In the player, clicking a same-card heading link scrolls as before; clicking a cross-card heading link navigates to that card then scrolls to the heading.

---

## New type: `AnchorTarget`

**File:** `app/_lib/authoring-types.ts`

```ts
export type AnchorTarget = {
  id: string;        // block.id — the DOM element id to scroll to
  label: string;     // block.value — display text in picker and inserted link
  pageId: string;    // which card this heading lives on
  pageTitle: string; // card title — shown as group header in picker for cross-card entries
};
```

This type replaces `anchorBlocks?: ContentBlock[]` at every call site. The five files modified in v0.23.3 all swap to `anchorTargets?: AnchorTarget[]`.

---

## Editor: `AnchorTarget` derivation

### `content-tab.tsx`

Replace the current-page-only filter with a flatMap across all pages:

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
    }))
);
```

Pass `anchorTargets={anchorTargets}` to each `BlockEditor` (replacing `anchorBlocks`).

### `block-editor.tsx`

Change prop from `anchorBlocks?: ContentBlock[]` to `anchorTargets?: AnchorTarget[]`.

Build the flat trigger list from all anchor targets (the picker handles same/cross-card grouping internally):

```ts
type TriggerResult = { id: string; label: string };

const triggerAnchorResults = trigger.query
  ? (anchorTargets ?? []).filter((t) => t.label.toLowerCase().includes(trigger.query.toLowerCase()))
  : (anchorTargets ?? []);

const triggerResults: TriggerResult[] = [
  ...triggerPageResults.map((p) => ({ id: p.id, label: p.title || "Untitled" })),
  ...triggerAnchorResults.map((t) => ({ id: t.id, label: t.label })),
];
```

`commitTrigger` is unchanged — it inserts `((label|id))` regardless of whether the target is same-card or cross-card.

Pass to picker:

```tsx
<PageLinkPicker
  pages={triggerPageResults}
  anchorTargets={triggerAnchorResults}
  currentPageId={selectedPageId}
  activeIndex={trigger.index}
  onMouseDownSelect={commitTrigger}
/>
```

The link-button picker also receives `anchorTargets` and `currentPageId`.

---

## `PageLinkPicker` changes

**File:** `app/_components/editor/page-link-picker.tsx`

New props: `anchorTargets?: AnchorTarget[]`, `currentPageId?: string`. Remove `anchorBlocks`.

Split targets into same-card and cross-card groups inside the component:

```ts
const sameCard = (anchorTargets ?? []).filter((t) => t.pageId === currentPageId);
const crossCard = (anchorTargets ?? []).filter((t) => t.pageId !== currentPageId);
```

Group cross-card targets by `pageId` for display. Render order:

```
┌─────────────────────────────────┐
│ Pages                            │  ← only when heading groups also present
│  The Kitchen             hotspot │
│  How to Play             page    │
│ On this card                     │  ← sameCard targets
│  Setup                   H2      │
│  Round structure         H3      │
│ Test                             │  ← each cross-card card gets its own label
│  Money                   H2      │
│  Funny                   H3      │
│  Bunny                   Section │
└─────────────────────────────────┘
```

`activeIndex` is flat across all groups:
- `0 .. pages.length - 1` → page entries
- `pages.length .. pages.length + sameCard.length - 1` → same-card heading entries
- `pages.length + sameCard.length .. total - 1` → cross-card heading entries (in card-order)

Kind labels (H2 / H3 / Section) are derived from `AnchorTarget` — add `blockFormat?: string` and `blockType?: string` to `AnchorTarget`, or derive kind in the picker from `label` context. Simplest: add an optional `kind: "h2" | "h3" | "section"` field to `AnchorTarget`.

Updated `AnchorTarget`:

```ts
export type AnchorTarget = {
  id: string;
  label: string;
  pageId: string;
  pageTitle: string;
  kind: "h2" | "h3" | "section";
};
```

Kind derivation in `content-tab.tsx` and `preview-blocks.tsx`:

```ts
const kind: "h2" | "h3" | "section" =
  b.blockFormat === "h2" ? "h2" :
  b.blockFormat === "h3" ? "h3" :
  "section";
```

---

## Player: `InlineWithLinks` changes

**File:** `app/_components/canvas/inline-markup.tsx`

Replace `anchorBlocks?: ContentBlock[]` with `anchorTargets?: AnchorTarget[]`. Add `currentPageId?: string`.

Resolution order for `((label|target))`:

1. `pages.some(p => p.id === target)` → page nav, `onNavigate(target)`
2. `anchorTargets.find(t => t.id === target && t.pageId === currentPageId)` → same-card scroll, `scrollIntoView`
3. `anchorTargets.find(t => t.id === target && t.pageId !== currentPageId)` → cross-card: `onNavigate(t.pageId)` then scroll after 150 ms
4. None → plain `<span>` (broken link)

Cross-card click handler:

```tsx
onClick={(e) => {
  e.stopPropagation();
  onNavigate(t.pageId);
  setTimeout(() => {
    document.getElementById(t.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 150);
}}
```

150 ms is sufficient because card navigation is a synchronous React state update with no network round-trip.

---

## Player: `PreviewBlocks` changes

**File:** `app/_components/canvas/preview-blocks.tsx`

Replace the `anchorBlocks` `useMemo` (which only filtered `displayPage.blocks`) with a derivation across all pages:

```ts
const anchorTargets = useMemo(
  () =>
    (pages ?? []).flatMap((page) =>
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
          kind: b.blockFormat === "h2" ? "h2" : b.blockFormat === "h3" ? "h3" : "section" as const,
        }))
    ),
  [pages]
);
```

Pass to all `InlineWithLinks` calls:

```tsx
<InlineWithLinks
  text={...}
  pages={pages!}
  onNavigate={onNavigate!}
  accentColor={accentColor}
  anchorTargets={anchorTargets}
  currentPageId={displayPage.id}
/>
```

Same change for the ReactMarkdown `<a>` handler — replace `anchorBlocks.some(...)` with `anchorTargets.find(...)` using the same three-way resolution logic.

---

## Versioning

- `APP_VERSION` → `"v0.23.4"` in `app/_lib/authoring-utils.ts`
- Patch note: `"Heading and section links now work across cards — type (( to link to a heading on any card, clicking navigates there and scrolls to the heading"`

---

## Out of scope

- Temporal animation or highlight of the target heading after scroll
- URL fragment / deep-link support (cross-card anchor links only work in-session)
- Visual distinction between same-card and cross-card anchor links in the player
- Headings inside tabs or carousel sub-blocks (consistent with v0.23.3 scope)
