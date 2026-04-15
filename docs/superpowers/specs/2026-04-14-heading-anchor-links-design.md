# Heading Anchor Links — Design Spec

**Feature:** h2, h3, and section blocks become valid `((label|target))` inline link targets, scrolling within the current card.

**Version target:** v0.23.3

---

## What it does

Authors can type `((` in any text block to open the link picker. The picker now shows two groups: "Pages" (existing) and "On this card" (new) — listing every h2, h3, and section block on the current card that has non-empty content. Selecting a heading inserts `((headingText|blockId))`, identical in format to page links.

In the player, clicking such a link scrolls smoothly to that heading within the same card instead of navigating to a page.

---

## Anchor rendering

**File:** `app/_components/canvas/preview-blocks.tsx`

The outer wrapper `<div>` for h2 and h3 format blocks gains `id={block.id}`:

```tsx
// h2
<div key={block.id} id={block.id} data-a11y-id={block.id} data-a11y-type="block" className={...}>
  <h2 ...>...</h2>
</div>

// h3
<div key={block.id} id={block.id} data-a11y-id={block.id} data-a11y-type="block" className={...}>
  <h3 ...>...</h3>
</div>
```

Section blocks already render `id={block.id}` via `SectionBlock` — no change needed there.

---

## `anchorBlocks` derivation

**File:** `app/_components/canvas/preview-blocks.tsx`

Inside `PreviewBlocks`, computed from `displayPage.blocks` (the page already in scope):

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

No new prop — `PreviewBlocks` derives `anchorBlocks` itself. This avoids threading the data through every caller.

---

## `InlineWithLinks` changes

**File:** `app/_components/canvas/inline-markup.tsx`

New optional prop `anchorBlocks?: ContentBlock[]`. Resolution order when rendering `((label|target))`:

1. `pages.some(p => p.id === target)` → render page nav button, call `onNavigate(target)`
2. `anchorBlocks?.some(b => b.id === target)` → render scroll button, call `document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" })`
3. Neither → render as plain `<span>` (broken link — same behaviour as today)

Scroll button styling is identical to page nav button: same accent color, `font-bold underline underline-offset-2`.

```tsx
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
  // ...
  if (match[1] !== undefined) {
    const label = match[1];
    const target = match[2];
    const color = accentColor || "#2563eb";

    const isPage = pages.some((p) => p.id === target);
    const isAnchor = !isPage && anchorBlocks?.some((b) => b.id === target);

    if (isPage && onNavigate) {
      parts.push(
        <button key={k} type="button"
          onClick={(e) => { e.stopPropagation(); onNavigate(target); }}
          className="inline cursor-pointer font-bold underline underline-offset-2"
          style={{ color }}
        >{label}</button>
      );
    } else if (isAnchor) {
      parts.push(
        <button key={k} type="button"
          onClick={(e) => {
            e.stopPropagation();
            document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="inline cursor-pointer font-bold underline underline-offset-2"
          style={{ color }}
        >{label}</button>
      );
    } else {
      parts.push(<span key={k}>{label}</span>);
    }
  }
}
```

All four existing `InlineWithLinks` call sites in `preview-blocks.tsx` gain `anchorBlocks={anchorBlocks}`.

---

## ReactMarkdown link handler changes

**File:** `app/_components/canvas/preview-blocks.tsx`

The custom `<a>` renderer for prose blocks already handles `sherpa-link:`. Extend it to check `anchorBlocks` when the target is not a page:

```tsx
if (href?.startsWith("sherpa-link:")) {
  const target = href.slice("sherpa-link:".length);
  const isPage = pages?.some((p) => p.id === target);
  const isAnchor = !isPage && anchorBlocks.some((b) => b.id === target);

  if (isPage && onNavigate) {
    return (
      <button type="button"
        onClick={(e) => { e.stopPropagation(); onNavigate(target); }}
        className="cursor-pointer font-bold underline underline-offset-2"
        style={{ color: accentColor || "#2563eb" }}
      >{children}</button>
    );
  }
  if (isAnchor) {
    return (
      <button type="button"
        onClick={(e) => {
          e.stopPropagation();
          document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        className="cursor-pointer font-bold underline underline-offset-2"
        style={{ color: accentColor || "#2563eb" }}
      >{children}</button>
    );
  }
  return <span>{children}</span>;
}
```

---

## Editor: `anchorBlocks` threading

### `content-tab.tsx`

Compute `anchorBlocks` from `selectedPage.blocks` and pass to each `BlockEditor`:

```ts
const anchorBlocks = selectedPage.blocks.filter(
  (b) =>
    (b.blockFormat === "h2" || b.blockFormat === "h3" || b.type === "section") &&
    b.value.trim() !== ""
);
```

```tsx
<BlockEditor
  block={block}
  // ...existing props...
  anchorBlocks={anchorBlocks}
/>
```

### `block-editor.tsx`

New prop `anchorBlocks?: ContentBlock[]`.

The `((`-trigger autocomplete (`triggerResults`) becomes a combined list of pages and anchor blocks, unified for keyboard navigation:

```ts
type TriggerResult = { id: string; label: string };

const pageResults: TriggerResult[] = linkablePages
  .filter((p) => !trigger.query || (p.title || "").toLowerCase().includes(trigger.query.toLowerCase()))
  .map((p) => ({ id: p.id, label: p.title || "Untitled" }));

const anchorResults: TriggerResult[] = (anchorBlocks ?? [])
  .filter((b) => !trigger.query || b.value.toLowerCase().includes(trigger.query.toLowerCase()))
  .map((b) => ({ id: b.id, label: b.value }));

const triggerResults: TriggerResult[] = [...pageResults, ...anchorResults];
```

`commitTrigger` is unchanged — it already takes `(id, label)` and inserts `((label|id))`.

Keyboard navigation (`ArrowUp/Down/Enter`) operates on the flat `triggerResults` array, spanning both groups.

Pass to picker:

```tsx
<PageLinkPicker
  pages={linkablePages.filter(p => ...)}
  anchorBlocks={anchorBlocks}
  activeIndex={trigger.index}
  onMouseDownSelect={commitTrigger}
/>
```

The "link button" picker (non-trigger, cursor-position insertion) also passes `anchorBlocks` and calls `insertLink`.

---

## `PageLinkPicker` changes

**File:** `app/_components/editor/page-link-picker.tsx`

New optional prop `anchorBlocks?: ContentBlock[]`.

When `anchorBlocks` has entries, the picker renders two labelled groups. The "Pages" label only appears when both groups are present:

```
┌─────────────────────────────┐
│ Pages                        │  ← only shown when both groups present
│  How to Play         page    │
│  Chapter 1           page    │
│ On this card                 │
│  Setup               H2      │
│  Round structure     H3      │
│  Advanced rules      Section │
└─────────────────────────────┘
```

`activeIndex` is flat across the combined list: indices `0..pages.length-1` for pages, `pages.length..pages.length+anchorBlocks.length-1` for headings.

```tsx
<ul className="max-h-48 overflow-y-auto p-1">
  {anchorBlocks && anchorBlocks.length > 0 && pages.length > 0 && (
    <li className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Pages</li>
  )}
  {pages.map((p, i) => (
    <li key={p.id}>
      <button
        className={`... ${activeIndex === i ? "bg-neutral-100" : "hover:bg-neutral-50"}`}
        // ...
      >
        <div className="truncate font-medium text-neutral-800">{p.title || "Untitled"}</div>
        <div className="text-[11px] capitalize text-neutral-400">{p.kind}</div>
      </button>
    </li>
  ))}
  {anchorBlocks && anchorBlocks.length > 0 && (
    <>
      <li className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mt-1">On this card</li>
      {anchorBlocks.map((b, i) => {
        const idx = pages.length + i;
        const kindLabel = b.blockFormat === "h2" ? "H2" : b.blockFormat === "h3" ? "H3" : "Section";
        return (
          <li key={b.id}>
            <button
              className={`... ${activeIndex === idx ? "bg-neutral-100" : "hover:bg-neutral-50"}`}
              onClick={onSelect ? () => onSelect(b.id, b.value) : undefined}
              onMouseDown={onMouseDownSelect ? (e) => { e.preventDefault(); onMouseDownSelect(b.id, b.value); } : undefined}
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
```

---

## Versioning

- `APP_VERSION` → `"v0.23.3"` in `app/_lib/authoring-utils.ts`
- Patch note: `"Headings and section labels can now be inline link targets — type (( to link directly to a heading on the same card"`

---

## Out of scope

- Cross-card heading links (linking from one card's text to a heading on a different card)
- Temporal animation or smooth highlight of the target heading after scroll
- URL fragment / deep link support (the link only works in-session, not as a shareable URL)
- Visual distinction between page links and scroll links in player UI
