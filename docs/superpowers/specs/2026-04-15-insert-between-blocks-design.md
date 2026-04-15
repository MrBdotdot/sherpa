# Insert Between Blocks

## Goal

Let authors insert a content block at any position in the block list — not just at the end. A hover-reveal insert zone appears between every pair of blocks (and before the first / after the last). Clicking it opens the existing block picker and places the new block at that exact position.

## Context

Currently `onAddBlock` always appends. To insert at the top authors must add a block then drag it up — a painful multi-step flow. This spec adds a zero-friction insert path without changing any existing block editing behaviour.

## UX

Between every pair of blocks, and bracketing the entire list (before block 0, after the last block), an `InsertZone` sits in the DOM. At rest it is invisible but occupies `h-4` of vertical space — enough to hover reliably. On hover it reveals:

- A full-width `h-px` line in Sherpa blue (`#3B82F6`)
- A `h-5 w-5` circular blue "+" button on the left end of the line

Clicking anywhere in the zone (line or button) sets `insertAtIndex` to that gap's index and opens the block picker. Selecting a block type inserts the new block at that index and closes the picker. `insertAtIndex` resets to null on close or after insertion.

The existing "Add content block" top button continues to append (insertAtIndex = null path).

## Data flow

```
InsertZone click (index N)
  → setInsertAtIndex(N), setPickerOpen(true)

BlockPickerModal onAddBlock(type)
  → insertAtIndex !== null
      ? onInsertBlock(type, insertAtIndex)   ← new
      : onAddBlock(type)                     ← existing
  → setPickerOpen(false), setInsertAtIndex(null)
```

## Files

### `app/_hooks/useContentHandlers.ts`

Add `handleInsertBlock`:

```ts
const handleInsertBlock = (type: ContentBlockType, atIndex: number) => {
  pushPagesHistory();
  updateSelectedPage((page) => {
    const blocks = [...page.blocks];
    blocks.splice(atIndex, 0, createBlock(type));
    return { ...page, blocks };
  });
};
```

Return it alongside the existing handlers.

Special case: `type === "step-rail"` needs the same linked-section setup as `handleAddBlock`. Extract the step-rail initialisation into a shared helper `createLinkedStepRail(): ContentBlock[]` that both handlers call — returns `[linkedSrBlock, s1, s2, s3]`. `handleInsertBlock` splices all four blocks starting at `atIndex`.

### `app/_lib/authoring-types.ts` (or wherever the prop types live)

No type changes needed — `onInsertBlock` is typed inline at each component boundary.

### `app/_components/authoring-studio.tsx`

Add `handleInsertBlock` to the destructure from `useContentHandlers`. Add to `sharedEditorProps`:

```ts
onInsertBlock: handleInsertBlock,
```

### `app/_components/page-editor-modal.tsx`

Add to props interface:
```ts
onInsertBlock: (type: ContentBlockType, atIndex: number) => void;
```

Destructure and pass to `ContentTab`:
```tsx
onInsertBlock={onInsertBlock}
```

### `app/_components/editor/content-tab.tsx`

**New state:**
```ts
const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
```

**New local component `InsertZone`:**
```tsx
function InsertZone({ index, onInsert }: { index: number; onInsert: (i: number) => void }) {
  return (
    <div
      className="group relative h-4 cursor-pointer"
      onClick={() => onInsert(index)}
    >
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative flex items-center w-full">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3B82F6] text-white text-xs font-bold shadow-sm">
            +
          </div>
          <div className="ml-1 h-px flex-1 bg-[#3B82F6]" />
        </div>
      </div>
    </div>
  );
}
```

**Updated picker open handler:**
```ts
function openPickerAt(index: number) {
  setInsertAtIndex(index);
  setPickerOpen(true);
}
```

**Updated block list render** — wrap the existing `selectedPage.blocks.map(...)` with `InsertZone` entries:

```tsx
<InsertZone index={0} onInsert={openPickerAt} />
{selectedPage.blocks.map((block, index) => (
  <React.Fragment key={block.id}>
    {/* existing block wrapper ... */}
    <InsertZone index={index + 1} onInsert={openPickerAt} />
  </React.Fragment>
))}
```

**Updated picker `onAddBlock`:**
```tsx
<BlockPickerModal
  onAddBlock={(type) => {
    if (insertAtIndex !== null) {
      onInsertBlock(type, insertAtIndex);
    } else {
      onAddBlock(type);
    }
    setInsertAtIndex(null);
  }}
  onAddSocialLink={onAddSocialLink}
  onClose={() => { setPickerOpen(false); setInsertAtIndex(null); }}
/>
```

**Props interface additions:**
```ts
onInsertBlock: (type: ContentBlockType, atIndex: number) => void;
```

## Version

- Bump `APP_VERSION` to `v0.24.1` in `authoring-utils.ts`
- Add patch note: "Insert a block anywhere in the list — hover between blocks to reveal the blue insert line, click to choose a block type"
