# Hotspot Creation via Palette (v0.25.0)

## Overview

Hotspots are currently created by clicking the board canvas. This change removes that behaviour and makes hotspots creatable from the "Add board element" picker and the command palette — consistent with how all other board elements are added. Anchor pin is also added to both surfaces since it was missing from both.

## What Changes

### 1. Remove canvas-click hotspot creation

`useDrag.ts` — `handleCanvasClick` currently creates a new hotspot `PageItem` at the clicked coordinates. That creation logic is removed. Empty canvas clicks clear the current selection. No new behaviour replaces the click.

### 2. New `handleAddHotspot` handler

`useContentHandlers.ts` — new `handleAddHotspot()` function:
- Calls `pushPagesHistory()`
- Creates a new hotspot `PageItem` with `x: 50, y: 50` as default position
- Appends it to `pages`
- Sets the selected page to the new hotspot so the inspector opens immediately

`authoring-studio.tsx` — wires `handleAddHotspot` into both the surface-tab props and command-palette props.

### 3. Surface tab picker

`surface-tab.tsx` — new `onAddHotspot: () => void` prop. The "Add board element" modal gains a **Hotspot** entry at the top of the list (primary board element). Uses the existing map-pin SVG icon.

### 4. Command palette

`command-palette.tsx` — "Add to board" group gains two entries:

| Entry | Action | Position |
|---|---|---|
| Hotspot | `onAddHotspot()` | First in group |
| Anchor Pin | `onAddCanvasFeature("anchor-pin")` | After Hotspot |

### 5. Icon updates — Anchor Pin

The anchor pin icon is updated to a nautical anchor symbol everywhere it appears:
- `sidebar-item-icon.tsx` — existing `"anchor-pin"` case
- Command palette inline icon
- Surface tab picker inline icon

The hotspot map-pin icon is unchanged.

## Data Model

No data model changes. Hotspots remain `PageItem` with `kind: "hotspot"`. The only change is the creation entry point: coordinates come from a fixed default (`x: 50, y: 50`) instead of a canvas click event.

## Scope

- Does not change how existing hotspots behave or are displayed
- Does not change drag/reposition behaviour (hotspots remain draggable on the canvas after creation)
- Does not change hotspot editing, section mode, or card mode
