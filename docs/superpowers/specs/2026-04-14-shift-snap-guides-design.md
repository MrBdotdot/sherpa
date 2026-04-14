# Shift + Snap Guides

**Date:** 2026-04-14
**Status:** Spec approved, pending implementation

---

## Problem

Snap-to-guide lines currently activate automatically whenever a canvas feature is dragged near a snap line (33%, 50%, 66%). This is implicit and can interfere with precise freehand positioning. Hotspot pins have no snapping at all. Neither behavior is discoverable or controllable by the author.

## Design

Snapping is off by default. Holding **Shift** while dragging activates snap-to-guides. This applies to both canvas features and hotspot pins.

When Shift is held:
- All three guide lines (33.333%, 50%, 66.666%) become visible on both axes as blue overlays
- The dragged element snaps when within the existing threshold (2%)
- Guides disappear when Shift is released

When Shift is not held:
- No guides are visible
- No snapping occurs
- Drag behaves as pure freeform positioning

---

## In-App Hint

A one-time floating pill appears at the bottom-center of the canvas the **first time** an author drags any element. It reads:

> Hold **Shift** to snap to guides

**Style:** Sherpa blue (`rgba(46,91,170,0.9)`) rounded pill with backdrop blur, white text, `Shift` rendered in a slightly lighter inset badge.

**Dismissal:** The hint disappears immediately when the author holds Shift — this acts as a natural confirmation that they've discovered the feature. It also disappears when the drag ends. Once triggered, it is permanently dismissed via localStorage key `sherpa-snap-hint-dismissed` and never shown again.

---

## Tutorial

The tutorial lives as a published Sherpa game (`tutorial-sherpa-v1`) in the database — not in the codebase. After the feature ships, add a step to the tutorial game via the authoring interface demonstrating Shift+snapping. No code change required for this.

---

## Files to change

| File | Change |
|---|---|
| `app/_hooks/useFeatureDrag.ts` | Add `shiftActive` state; only call `getSnappedValue` when `event.shiftKey`; return `shiftActive` |
| `app/_hooks/useHotspotDrag.ts` | Add `SNAP_LINES`, `getSnappedValue`, `shiftActive` state; apply snapping when `event.shiftKey`; return `shiftActive` |
| `app/_components/canvas/preview-canvas-helpers.tsx` | Simplify `SnapGuides` — accepts `shiftActive: boolean`; shows all 6 guide lines when true, renders nothing when false |
| `app/_components/preview-canvas.tsx` | Combine `shiftActive` from both hooks; pass to `SnapGuides`; add hint logic + Sherpa blue pill component |

---

## Behaviour details

- `shiftActive` is a `useState<boolean>` in each drag hook, updated on every `pointermove` via `event.shiftKey`, reset to `false` on `pointerup`
- Canvas combines both: `const snapActive = featureShiftActive || hotspotShiftActive`
- `SnapGuides` renders unconditionally but returns `null` when `!shiftActive` — no conditional wrapping needed at the call site
- Hint visibility: `snapHintVisible = snapHintTriggered && isDragging && !snapActive`
  - `snapHintTriggered` is set true on first drag (and localStorage written at that moment)
  - Hint disappears when Shift pressed or drag ends; never re-appears
