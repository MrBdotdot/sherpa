# Button Color Customization

## Goal

Let authors choose a background color for each board canvas button element. Text color is automatically determined by WCAG contrast — no second picker needed.

## Context

Canvas features of type `"button"` already have three variants (primary, secondary, tertiary) selectable in the inspector. All three currently derive their color from the game's global `accentColor`. Secondary buttons render as `bg-white/92` which is invisible on white boards. Authors need per-button color control.

## Data model

### `CanvasFeature` (authoring-types.ts)

Add one optional field:
```ts
buttonBgColor?: string;  // hex string; undefined = accent-based defaults
```

### `CanvasFeatureField` (authoring-types.ts)

Add `"buttonBgColor"` to the union so `onCanvasFeatureChange` can write it.

## Color logic per variant

| Variant | `buttonBgColor` set | `buttonBgColor` undefined |
|---------|---------------------|--------------------------|
| Primary | bg = `buttonBgColor`, text = autoContrast(bg) | bg = accent, text = white (existing) |
| Secondary | bg = `buttonBgColor`, text = autoContrast(bg) | bg = `#ffffff`, text = accent (existing) |
| Tertiary | text/underline color = `buttonBgColor` | text/underline color = accent (existing) |

`autoContrast(hex)` returns `"#ffffff"` or `"#000000"` based on WCAG relative luminance — whichever gives the higher contrast ratio against the background.

```ts
function autoContrast(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.179 ? "#000000" : "#ffffff";
}
```

## Inspector UI (`canvas-feature-type-body.tsx`)

Below the variant toggle, add a **"Button color"** row:

- `<input type="color">` swatch showing `buttonBgColor ?? resolvedDefault` where `resolvedDefault` is the current effective color (accent for primary/tertiary, `#ffffff` for secondary). This ensures the swatch always shows the actual rendered color even before a custom value is set.
- On change: `onCanvasFeatureChange(feature.id, "buttonBgColor", value)`
- "Use accent" reset link (text-xs, neutral-400): clears `buttonBgColor` by calling `onCanvasFeatureChange(feature.id, "buttonBgColor", "")`. An empty string is treated as undefined in the render layer.

## Rendering (`canvas-feature-card.tsx`)

Replace the existing color block with:

```ts
const bg = feature.buttonBgColor || (variant === "secondary" ? "#ffffff" : accent);
const textColor = autoContrast(bg);

if (variant === "primary") {
  style = { backgroundColor: bg, color: textColor };
} else if (variant === "tertiary") {
  style = { color: feature.buttonBgColor || accent };
} else {
  // secondary
  style = { backgroundColor: bg, color: textColor };
}
```

`autoContrast` lives in a shared utility — either `app/_lib/color-utils.ts` (new small file) or inline in `canvas-feature-card.tsx`.

## Files

| File | Change |
|------|--------|
| `app/_lib/authoring-types.ts` | Add `buttonBgColor?: string` to `CanvasFeature`; add `"buttonBgColor"` to `CanvasFeatureField` |
| `app/_components/canvas/canvas-feature-card.tsx` | Replace color logic with `buttonBgColor`-aware version + `autoContrast` |
| `app/_components/editor/canvas-feature-type-body.tsx` | Add "Button color" picker + "Use accent" reset below variant toggle |
| `app/_lib/authoring-utils.ts` | Bump `APP_VERSION` to `v0.24.0` |
| `app/_lib/patch-notes.ts` | Add v0.24.0 entry |

## Out of scope

- Page-button elements (separate feature type, separate concern)
- Global per-variant color settings (per-instance is sufficient)
- Text color override (auto-contrast handles this)
