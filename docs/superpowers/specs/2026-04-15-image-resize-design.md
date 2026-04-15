# Image Resize: Board Canvas Feature Elements

## Goal

Replace the slider-based size control for board canvas `image` elements with direct drag-to-resize in two places: on the board itself (WYSIWYG corner handle) and in the inspector panel (live-sized image preview with corner handle). Slider-based sizing is retained for image blocks inside cards — this spec covers board elements only.

## Context

Canvas features of type `"image"` are positioned on the board surface. Their size is controlled by `feature.logoSize` (height in px; width is `auto`, so the image scales proportionally). The current default is 48px, the inspector slider runs 24–160px. Authors report images are too small by default and the slider is disconnected from the visual result.

## Changes

### 1. Default and range

- Render fallback: `feature.logoSize ?? 48` → `feature.logoSize ?? 80` in `canvas-feature-card.tsx`
- Drag clamp: min 24px, max 400px (replaces the slider's 24–160 range)
- No data migration needed — stored `logoSize` values are untouched; only the fallback and upper bound change

### 2. Inspector panel (`canvas-feature-type-body.tsx`)

For the `image` feature type section:

- **Remove** the slider row (`<input type="range" ...>` and its label/legend)
- **Replace** the fixed `h-10` thumbnail with a live-sized image preview:
  - `style={{ height: logoSize }}` where `logoSize = feature.logoSize ?? 80`
  - `max-width: 100%` so it doesn't overflow the panel
  - `object-contain`, rounded corners matching the existing thumbnail style
- **Add** a corner grip at bottom-right of the preview (same visual as board handle — 14×14px, white fill, neutral-300 border, 3px radius, two-line diagonal icon)
- **Add** a pixel readout below the image: `{logoSize}px` in `text-xs text-neutral-400`
- Drag behaviour: `onPointerDown` → capture pointer, track `startY` + `startLogoSize`; `onPointerMove` → `newSize = clamp(startLogoSize + (clientY - startClientY), 24, 400)`, call `onCanvasFeatureChange(feature.id, "logoSize", String(newSize))`; `onPointerUp` → release capture
- `onCanvasFeatureChange` is already in scope at this component — no new prop threading required

### 3. Board handle (`preview-canvas-helpers.tsx` + `preview-canvas.tsx`)

**`FeaturePlacer`** gets one new optional prop:
```ts
onCanvasFeatureChange?: (featureId: string, field: CanvasFeatureField, value: string) => void;
```

For `feature.type === "image"` when `isLayoutEditMode === true`, render a corner grip as a **sibling** to the existing `pointer-events-none` wrapper (not inside it):

```tsx
{isLayoutEditMode && feature.type === "image" && onCanvasFeatureChange && (
  <ResizeHandle
    logoSize={feature.logoSize ?? 80}
    onResize={(newSize) => onCanvasFeatureChange(feature.id, "logoSize", String(newSize))}
  />
)}
```

`ResizeHandle` is a small local component (same file or inline) that encapsulates the pointer capture + drag logic. It positions itself at `absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2`.

Drag behaviour: identical to inspector (same startY / delta / clamp pattern).

**`preview-canvas.tsx`** adds `onCanvasFeatureChange` to `sharedFeaturePlacerProps`. It already receives `onCanvasFeatureChange` as a prop — just forward it.

**`player-view.tsx`** does not pass `onCanvasFeatureChange` to `FeaturePlacer` (prop is optional). Since `isLayoutEditMode` is always false in the player, the handle is never rendered anyway.

## Files

| File | Change |
|------|--------|
| `app/_components/canvas/canvas-feature-card.tsx` | `?? 48` → `?? 80` |
| `app/_components/editor/canvas-feature-type-body.tsx` | Remove slider; add live-sized preview + corner grip + pixel readout |
| `app/_components/canvas/preview-canvas-helpers.tsx` | Add optional `onCanvasFeatureChange` prop to `FeaturePlacer`; render corner grip for image features in layout edit mode |
| `app/_components/preview-canvas.tsx` | Forward `onCanvasFeatureChange` into `sharedFeaturePlacerProps` |
| `app/_lib/authoring-utils.ts` | Bump `APP_VERSION` to `v0.23.9` |
| `app/_lib/patch-notes.ts` | Add v0.23.9 entry |

## Out of scope

- Card image blocks (`imageSize` field, slider in `block-type-editors.tsx`) — unchanged
- QR element resize — `qrSize` field, separate concern
- Aspect-ratio locking — `logoSize` is height, width is always `auto`; no ratio logic needed
