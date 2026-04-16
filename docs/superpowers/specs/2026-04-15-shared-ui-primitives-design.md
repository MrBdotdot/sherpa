# Shared UI Primitives — Sub-project A

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task.

**Goal:** Eliminate 100+ copy-pasted Tailwind chains by extracting `InputField`, `TextareaField`, `FieldLabel`, and `MonoInput` into `editor-ui.tsx`, then replacing all callsites.

**Architecture:** Expand the existing `app/_components/editor/editor-ui.tsx` with four new exports. No new files, no new import paths. All callsites import from the same place they already import `SelectField` and `EditorSection`.

**Tech Stack:** React, TypeScript, Tailwind v4

---

## The four new primitives

### 1. `FieldLabel`

Replaces 63 inline ALL-CAPS label divs of the pattern:
```tsx
<div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
  Label text
</div>
```

New component:
```tsx
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
      {children}
    </div>
  );
}
```

Usage: `<FieldLabel>Button label</FieldLabel>`

---

### 2. `InputField`

Replaces ~35 inline `<input>` instances. Accepts an optional `label`, a `size` variant, and spreads all native input props.

**Size variants** (derived from frequency analysis of existing callsites):

| size | classes | instances |
|------|---------|-----------|
| `"md"` (default) | `px-3 py-2.5 text-sm` | 19 |
| `"sm"` | `px-3 py-2 text-sm` | 10 |
| `"xs"` | `px-3 py-2 text-xs` | 9 |
| `"lg"` | `px-4 py-3 text-sm` | 5 |

**Base classes** (shared across all sizes):
```
w-full rounded-lg border border-neutral-200 bg-white text-neutral-900
outline-none transition placeholder:text-neutral-500
focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25
disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed
```

**Interface:**
```tsx
type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
};

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  function InputField({ label, size = "md", className, ...props }, ref) { ... }
);
```

When `label` is provided, wraps in `<label>` with `<FieldLabel>` above the input.
When `label` is absent, renders just the `<input>` (for cases already inside a `<label>`).

---

### 3. `TextareaField`

Replaces ~18 inline `<textarea>` instances. Same shape as `InputField` plus `resize`.

**Interface:**
```tsx
type TextareaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
  resize?: "none" | "y" | "both";  // default: "none"
};

export const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  function TextareaField({ label, size = "md", resize = "none", className, ...props }, ref) { ... }
);
```

`resize="none"` → `resize-none`, `resize="y"` → `resize-y`, `resize="both"` → omit resize class.

---

### 4. `MonoInput`

Replaces 11 mono-font code-entry fields. Thin wrapper: `InputField` with `font-mono` forced.

```tsx
export const MonoInput = React.forwardRef<HTMLInputElement, InputFieldProps>(
  function MonoInput({ className, ...props }, ref) {
    return <InputField ref={ref} className={cn("font-mono", className)} {...props} />;
  }
);
```

---

## Callsite replacement rules

**FieldLabel** — replace any bare div matching this signature:
```tsx
// Before
<div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
  {label}
</div>
// After
<FieldLabel>{label}</FieldLabel>
```
Note: some label divs use `text-[10px]` instead of `text-xs`. Normalise to `text-xs` (= `0.75rem` = 12px) when replacing — these are all at the same visual size after the audit.

**InputField** — replace any `<input>` carrying the full base class chain. Keep `className` overrides by passing them via the `className` prop (they merge with base classes).

Fields that use `focus:ring-neutral-300` instead of the primary blue (found in `account-sections.tsx`) are **out of scope** — they're in a different visual context (account settings search/filter) and should stay inline.

**TextareaField** — same rules. Watch for `leading-6` on some instances — pass as `className="leading-6"`.

**MonoInput** — replace any `<input>` with `font-mono` in the class chain.

---

## Out of scope

- `<select>` elements — already handled by `SelectField`
- Button, badge, modal, and overlay patterns — separate sub-project
- Fields with non-standard focus rings (`focus:ring-neutral-300`) — keep inline
- `account-sections.tsx` read-only display fields (`cursor-not-allowed` already set, no focus styles) — keep inline

---

## File structure

**Only one file changes for the primitive definitions:**
- Modify: `app/_components/editor/editor-ui.tsx` — add 4 exports

**Callsite files (replace inline patterns with component imports):**
All files in `app/_components/` that use the inline input/label patterns. Roughly 25 files. See the plan for exact list.

---

## Success criteria

1. `editor-ui.tsx` exports `FieldLabel`, `InputField`, `TextareaField`, `MonoInput` in addition to the existing three
2. No inline instance of the base input class chain remains in `app/_components/editor/`
3. No inline ALL-CAPS label pattern remains in `app/_components/editor/`
4. TypeScript compiles clean (`tsc --noEmit`)
5. Visual appearance is pixel-identical before and after (no style changes, only extraction)
