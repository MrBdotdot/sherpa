# Image Upload Size Limits — Design Spec

**Date:** 2026-04-08
**Status:** Approved

## Context

Publishers can currently upload images of any size with no validation or feedback. A raw DSLR photo at 50MB uploads silently, inflating storage costs and degrading player experience. This spec adds per-context size validation before upload — blocking oversized files and warning on large-but-acceptable ones — with plain-language feedback at each upload point.

## Scope

- `validateImageSize()` utility in `supabase-storage.ts`
- Per-context soft warn and hard block thresholds
- Warn and block handling in all four upload hooks
- Plain-language error and warning messages

**Out of scope:** Server-side enforcement, per-tier limits (deferred to plan gating spec), existing uploaded images (unaffected).

## Thresholds

Defined as named constants at the top of `supabase-storage.ts`. Changeable via one-line edit and redeploy — no impact on already-uploaded images.

```ts
const SIZE_LIMITS: Record<UploadContext, { warn: number; block: number }> = {
  hero:    { warn: 5 * MB,      block: 10 * MB },
  block:   { warn: 2 * MB,      block: 5 * MB  },
  feature: { warn: 1 * MB,      block: 3 * MB  },
  avatar:  { warn: 0.5 * MB,    block: 1 * MB  },
};

const MB = 1024 * 1024;
type UploadContext = "hero" | "block" | "feature" | "avatar";
```

## Validation function

```ts
type SizeValidationResult =
  | { status: "ok" }
  | { status: "warn"; message: string }
  | { status: "block"; message: string };

function validateImageSize(file: File, context: UploadContext): SizeValidationResult
```

Called inside `uploadImage()` before compression runs — validates against the raw file size the publisher selected.

Logic:
1. If `file.size >= limits.block` → return `{ status: "block", message: ... }`
2. If `file.size >= limits.warn` → return `{ status: "warn", message: ... }`
3. Otherwise → return `{ status: "ok" }`

## Upload flow

Each hook calls `uploadImage(file, path, context)`. The context is a new parameter added to `uploadImage()`.

```
Publisher selects file
  → validateImageSize(file, context)
    → "block": show error inline, abort upload
    → "warn": show confirmation dialog
      → Cancel: abort upload
      → Confirm: proceed to compression + upload
    → "ok": proceed to compression + upload
```

## Context mapping

| Hook | Context |
|------|---------|
| `usePageHandlers` — hero image | `"hero"` |
| `useContentHandlers` — block image | `"block"` |
| `useCanvasFeatureHandlers` — logo/icon | `"feature"` |
| `useProfileSection` — avatar | `"avatar"` |

## Messages

### Block messages (upload rejected)
| Context | Message |
|---------|---------|
| hero | "This file is too large. Background images must be under 10MB." |
| block | "This file is too large. Content images must be under 5MB." |
| feature | "This file is too large. Logo and icon images must be under 3MB." |
| avatar | "This file is too large. Profile photos must be under 1MB." |

### Warn message (confirmation dialog)
Single message for all contexts:
> "This is a large file ([X]MB). It may load slowly for players. Continue anyway?"

With **Continue** (primary) and **Cancel** (secondary) actions.

## Files changed

| File | Change |
|------|--------|
| `app/_lib/supabase-storage.ts` | Add `SIZE_LIMITS`, `UploadContext` type, `validateImageSize()`, add `context` param to `uploadImage()` |
| `app/_hooks/usePageHandlers.ts` | Pass `"hero"` context, handle warn/block results |
| `app/_hooks/useContentHandlers.ts` | Pass `"block"` context, handle warn/block results |
| `app/_hooks/useCanvasFeatureHandlers.ts` | Pass `"feature"` context, handle warn/block results |
| `app/_hooks/useProfileSection.ts` | Pass `"avatar"` context, handle warn/block results |

## Edge cases

| Case | Handling |
|------|---------|
| Publisher dismisses warn and re-selects a smaller file | Warn clears, normal flow resumes |
| GIF or SVG over the block limit | Block applies — format doesn't exempt from size limit |
| File size exactly at warn threshold | Warn shown (>= comparison) |
| File size exactly at block threshold | Block shown (>= comparison) |
| Non-image file type slips through | `uploadImage()` already returns early for non-image types — size check not reached |

## Verification

1. Upload a hero image over 10MB — confirm upload is blocked with correct message
2. Upload a hero image between 5MB and 10MB — confirm warn dialog appears, Cancel aborts, Continue uploads successfully
3. Upload a hero image under 5MB — confirm no warn, uploads directly
4. Repeat for block image (5MB block, 2MB warn), canvas feature (3MB block, 1MB warn), and avatar (1MB block, 500KB warn)
5. Confirm warn message shows correct file size in MB
6. Confirm existing uploaded images are unaffected
