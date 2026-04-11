# Auto Inline Links — Design Spec

**Date:** 2026-04-11
**Status:** Approved for implementation

---

## Overview

After the rulebook importer generates cards, automatically inject `((label|pageId))` inline links wherever one card's title appears in another card's text. No user action required — links land with the imported cards, ready to use.

The linking convention mirrors Wikipedia: each term is linked on its first appearance within each section of a card, then can be re-linked when a new section begins.

---

## Scope

One new pure function `injectInlineLinks(pages: PageItem[]): PageItem[]` added to `app/api/import/rulebook/route.ts`. Called after `newPages` is built, before the Supabase upsert. No new files, no new API calls, no client changes.

---

## Algorithm

### 1. Build the candidate list

Collect `{ title: string; pageId: string }` for all generated cards. Sort **longest title first** so a long title like "Setup Phase" claims its match before a shorter overlapping title like "Setup" can.

Skip any title shorter than 4 characters to avoid noise from very short or degenerate titles.

### 2. For each card, scan section by section

A card's content is treated as a sequence of sections, delimited by `section`-type blocks:

- The **summary** field is its own section (processed first).
- Each stretch of blocks between `section` dividers is its own section.
- `section` blocks themselves are not scanned (linking inside a subheading is odd).

For each section, maintain a **seen set** — titles already linked within this section. At the start of each new section (including the summary), reset the seen set so terms can be re-linked.

### 3. Block types scanned

Scan the `value` field of blocks with type `text`, `steps`, and `callout`. Skip `section` blocks.

### 4. Match and replace

For each block value and each candidate title (in longest-first order):

- If the title is already in the seen set for this section, skip it.
- Search for the title using a **word-boundary, case-insensitive regex**: `/\b<escaped-title>\b/i`.
- If found, replace the **first occurrence only** with `((matchedText|pageId))`, preserving the original casing of the matched text as the link label.
- Add the title to the seen set.
- Never link a card to itself.
- Never replace text already inside `((...))` markup (guard against double-wrapping).

### 5. Return the updated pages

Return the full `PageItem[]` array with modified block values and summaries. The shape of the data is unchanged — the `((label|pageId))` markup is already rendered correctly by all existing block renderers.

---

## Edge cases

| Case | Handling |
|---|---|
| Title < 4 chars | Skipped entirely |
| Title contains regex special chars (`(`, `.`, `+`, etc.) | Escaped before building the regex |
| Multiple cards with overlapping titles | Longest title matched first; once a span is replaced it won't be matched again |
| Card with no text blocks | No-op for that card |
| Only one card generated | No-op — nothing to link to |
| Same title appears multiple times in one section | Only the first occurrence is linked |
| Same title appears in a later section | Linked again (first occurrence in that section) |

---

## What does not change

- The Claude prompt — no modifications to card generation.
- The client — `((label|pageId))` is already rendered everywhere blocks appear.
- The data model — imported cards are still standard `PageItem` rows.
- The loading time — pure string processing, negligible overhead.
