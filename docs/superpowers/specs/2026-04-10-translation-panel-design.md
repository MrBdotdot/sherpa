# Translation Panel — Design Spec

**Date:** 2026-04-10  
**Status:** Approved for implementation

---

## Overview

The translation spreadsheet already exists and is fully functional — it lives inside the locale canvas feature inspector. This change makes it more discoverable and adds per-language completion status so authors know at a glance how much translation work remains.

---

## Entry Point

No change to the entry point location — it stays in the locale feature inspector (the panel shown when you click the locale/language-switcher canvas element). The existing small bordered "Open spreadsheet" button is replaced with a prominent full-width primary button.

---

## Inspector UI Changes

The `LocaleFeatureEditor` component (`app/_components/editor/locale-feature-editor.tsx`) is the only file that changes.

**Layout (top to bottom):**

1. **Field count line** — existing "N translatable fields" text, unchanged
2. **Language completion cards** — one card per configured language, stacked vertically:
   - **Default (source) language:** name + code on the left, green "Source" badge on the right
   - **Other languages:** name + code on the left, completion badge on the right:
     - Format: "N / total" (e.g. "24 / 30")
     - Blue badge when ≥ 50% of fields have a non-empty translation
     - Red badge when < 50%
3. **Primary CTA button** — full-width, blue, "Open translation spreadsheet →"

**Completion calculation:**

Completion is derived on the fly — no new state, no API calls:
- `totalFields` = `collectTranslationRows(pages).length`
- For each non-default language: count how many rows have a non-empty translation via `getTranslationText(translations, row.key, language.code, "")`
- Both helpers already exist in `localization.ts` and are already imported by `locale-feature-editor.tsx`

---

## Data Model

No changes. Translations are stored in `systemSettings.translations: TranslationMap` (a `Record<string, Record<string, string>>`). The completion count is computed from this map on render.

---

## Scope

- **One file modified:** `app/_components/editor/locale-feature-editor.tsx`
- No new components, no new API routes, no schema changes
- The spreadsheet modal (`SpreadsheetModal`) is unchanged

---

## Out of scope

- Moving the entry point to the sidebar or a global toolbar
- Export/import of translations (CSV, etc.)
- Auto-translation via AI
- Completion tracking in the database
