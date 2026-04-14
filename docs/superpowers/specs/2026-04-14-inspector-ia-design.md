# Inspector IA Redesign

**Date:** 2026-04-14  
**Version:** v0.22.6  
**Status:** Implemented

---

## Problem

The Sherpa authoring inspector accumulated structural problems as features were added over time:

1. **Tab 1 identity crisis** — labelled "Board" on the home page and "Card" on content pages, breaking the author's ability to build a consistent mental map of where things live.
2. **Settings as junk drawer** — fonts, BGG import, custom CSS, auto-open card, intro screen, and responsive settings shared a tab with no organizing principle; they ended up together by accident, not by design.
3. **Responsive settings split** — global portrait config (split/full, strip height, content zone background) sat at the bottom of Settings, while per-element portrait zone (image strip vs. content zone per element) lived inline in Elements. Same concept, two locations, no obvious reason.

---

## IA Audit Findings

A content audit catalogued every control in the inspector and mapped it to its current location. The audit identified ~60 controls across three tabs, with the following structure:

**Tab 1 (Overview/Board/Card):** Page title, hero image, display style, content tint, content blocks  
**Tab 2 (Elements):** Canvas feature list, per-element type editors, portrait zone toggle  
**Tab 3 (Settings):** Languages, Game (font/colors/icon/etc), Responsive, Auto-open, Intro screen, BGG, Custom CSS

### Mental model research

Authors use an **object-based mental model**: "I'm working on the board / this card / this element." This is their primary frame, followed by phase-based ("set up → write → polish") and scope-based (global vs. specific) for experienced users.

"The board" encompasses: background image + all elements on it. Responsive settings affect a distinct user segment (mobile players) with a different authoring cadence — they're configured once and rarely revisited, unlike board setup which is continuous.

The Settings tab is acknowledged as a junk drawer: things ended up there because they didn't fit elsewhere, not because they belong together.

---

## Design Decision

**Approach A — Reorganize in place:** Keep the three-tab structure and names but fix the interior.

This was chosen over:
- **Approach B (4 tabs: Content / Elements / Style / Settings)** — cleaner separation but adds cognitive load
- **Approach C (object-based restructure)** — more ambitious, higher implementation risk, better as a future evolution

---

## Implemented Changes

### Tab naming

| Before | After |
|---|---|
| "Board" (home page) / "Card" (content pages) | **"Content"** — always, regardless of context |
| "Elements" | "Elements" — unchanged |
| "Settings" | "Settings" — unchanged |

The context (home vs. card) is already communicated by which page is selected in the left rail. The tab label doesn't need to carry it.

### Settings tab — section order and names

| Before | After |
|---|---|
| Languages | **Appearance** — font, modal treatment, hotspot size, brand color, brand palette, game icon, dark mode |
| Game | **Mobile** — portrait layout (split/full), image strip height, content zone background |
| Responsive | **Behavior** — auto-open card, intro screen (merged from two separate sections) |
| Auto-open card | **Languages** — language list, open spreadsheet |
| Intro screen | **Advanced** — BoardGameGeek import, custom CSS (merged from two separate sections) |
| BoardGameGeek | |
| Custom CSS | |

**Key moves:**
- "Game" → **Appearance** (same controls, clearer name)
- "Responsive" → **Mobile**, elevated to second position (first-class concern for a specific audience)
- Auto-open + Intro screen merged into **Behavior** (same cadence: player experience at load time)
- BGG + Custom CSS merged into **Advanced** (infrequent, power-user tools)
- Languages moved to fourth (content unchanged, sits with other content-level config)

### Settings tab badge

The language count badge was removed from the Settings tab. With "Languages" now a named section, the badge no longer adds wayfinding value.

### Per-element portrait zone toggle

No change — correctly stays inline in the Elements tab, per element. The distinction:
- **Global** portrait settings (how the board behaves on mobile) → Settings → Mobile
- **Element-specific** portrait zone (where this element lives on mobile) → Elements, inline

These are different questions and belong in different places.

### Language switcher empty state copy

Updated from "Add a language switcher in the Board tab…" to "…in the Elements tab…" to match the renamed tab.

---

## Files Modified

- `app/_components/page-editor-modal.tsx` — `getTabLabel`, `settingsBadge`
- `app/_components/editor/experience-tab.tsx` — section reorder and rename
- `app/_lib/authoring-utils.ts` — version bump to v0.22.6
- `app/_lib/patch-notes.ts` — v0.22.6 entry
