# Shared UI Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract `FieldLabel`, `InputField`, `TextareaField`, and `MonoInput` into `editor-ui.tsx`, then replace every inline copy-paste of those patterns throughout `app/_components/editor/`.

**Architecture:** Expand the existing `app/_components/editor/editor-ui.tsx` with four new exports. No new files, no new import paths. All callsites import from the same module they already use. No class-merging library — concatenate with `[a, b, c].filter(Boolean).join(" ")`.

**Tech Stack:** React 19, TypeScript (strict), Tailwind v4, Next.js

---

## File map

| File | Role |
|------|------|
| `app/_components/editor/editor-ui.tsx` | **Add** 4 new exports |
| `app/_components/editor/block-type-editors.tsx` | Replace 5 labels + 5 fields |
| `app/_components/editor/block-editor.tsx` | Replace 1 label + 4 fields |
| `app/_components/editor/canvas-feature-type-body.tsx` | Replace ~20 labels + ~10 fields |
| `app/_components/editor/content-tab.tsx` | Replace labels + fields |
| `app/_components/editor/experience-tab.tsx` | Replace labels + fields (incl. mono) |
| `app/_components/editor/overview-tab.tsx` | Replace labels + fields (incl. mono) |
| `app/_components/editor/page-setup-section.tsx` | Replace labels + fields |
| `app/_components/editor/new-container-form.tsx` | Replace labels + fields |
| `app/_components/editor/dropdown-feature-editor.tsx` | Replace labels + fields |
| `app/_components/editor/image-hotspot-editor.tsx` | Replace fields |
| `app/_components/editor/locale-feature-editor.tsx` | Replace fields |

---

## Task 1: Add primitives to editor-ui.tsx

**Files:**
- Modify: `app/_components/editor/editor-ui.tsx`

- [ ] **Step 1: Replace the entire file with the new version**

```tsx
import React from "react";

// ── Shared class helpers ───────────────────────────────────────────────────

const FIELD_BASE =
  "w-full rounded-lg border border-neutral-200 bg-white text-neutral-900 " +
  "outline-none transition placeholder:text-neutral-500 " +
  "focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 " +
  "disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed";

const FIELD_SIZE: Record<string, string> = {
  xs: "px-3 py-2 text-xs",
  sm: "px-3 py-2 text-sm",
  md: "px-3 py-2.5 text-sm",
  lg: "px-4 py-3 text-sm",
};

function cx(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// ── Primitives ─────────────────────────────────────────────────────────────

export function FieldLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500", className)}>
      {children}
    </div>
  );
}

type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
};

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  function InputField({ label, size = "md", className, ...props }, ref) {
    const input = (
      <input
        ref={ref}
        className={cx(FIELD_BASE, FIELD_SIZE[size], className)}
        {...props}
      />
    );
    if (!label) return input;
    return (
      <label className="block">
        <FieldLabel>{label}</FieldLabel>
        {input}
      </label>
    );
  }
);

type TextareaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
  resize?: "none" | "y" | "both";
};

export const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  function TextareaField({ label, size = "md", resize = "none", className, ...props }, ref) {
    const resizeCls = resize === "none" ? "resize-none" : resize === "y" ? "resize-y" : undefined;
    const textarea = (
      <textarea
        ref={ref}
        className={cx(FIELD_BASE, FIELD_SIZE[size], resizeCls, className)}
        {...props}
      />
    );
    if (!label) return textarea;
    return (
      <label className="block">
        <FieldLabel>{label}</FieldLabel>
        {textarea}
      </label>
    );
  }
);

export const MonoInput = React.forwardRef<HTMLInputElement, InputFieldProps>(
  function MonoInput({ className, ...props }, ref) {
    return <InputField ref={ref} className={cx("font-mono", className)} {...props} />;
  }
);

// ── Existing components (unchanged) ────────────────────────────────────────

export function EditorSection({
  children,
  title,
  id,
}: {
  children: React.ReactNode;
  title: string;
  id?: string;
}) {
  return (
    <section id={id} className="border-b border-neutral-200 px-5 py-5 last:border-b-0">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
        {title}
      </div>
      {children}
    </section>
  );
}

export function EditorSubsection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-4">
        <div className="text-sm font-semibold text-neutral-900">{title}</div>
        {description ? (
          <div className="mt-1 text-sm leading-6 text-neutral-500">{description}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 font-sans text-sm text-neutral-900 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors in `editor-ui.tsx`. If you see "Exported variable 'InputField' has or is using name 'InputFieldProps' from external module" — the type is only used internally so this is not a real export issue. If tsc complains, add `export type { InputFieldProps, TextareaFieldProps }` at the bottom.

- [ ] **Step 3: Commit**

```bash
git add app/_components/editor/editor-ui.tsx
git commit -m "feat: add FieldLabel, InputField, TextareaField, MonoInput to editor-ui"
```

---

## Task 2: Update block-type-editors.tsx

**Files:**
- Modify: `app/_components/editor/block-type-editors.tsx`

The file has 5 ALL-CAPS label divs and 5 input/textarea fields with the base class chain.

- [ ] **Step 1: Add new imports**

Find the import line:
```tsx
import { FocalPointPicker } from "@/app/_components/editor/focal-point-picker";
```

Add after it:
```tsx
import { FieldLabel, InputField, TextareaField } from "@/app/_components/editor/editor-ui";
```

- [ ] **Step 2: Replace label divs**

Replace every occurrence of:
```tsx
<div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
```
with:
```tsx
<FieldLabel>
```
and the matching closing `</div>` with `</FieldLabel>`.

Also replace:
```tsx
<div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
```
with:
```tsx
<FieldLabel className="mb-1.5">
```
(pass `mb-1.5` via className to override the default `mb-2`).

- [ ] **Step 3: Replace textarea fields**

Replace:
```tsx
className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-3 text-sm leading-6 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 placeholder:text-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed"
```
with component:
```tsx
// <textarea ...existing props...
// becomes:
<TextareaField
  size="lg"
  className="leading-6"
  // ...same value/onChange/placeholder/disabled props
/>
```

Replace:
```tsx
className="w-full rounded-lg border border-neutral-200 px-3 py-3 text-sm outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 placeholder:text-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed"
```
with:
```tsx
<TextareaField size="lg" ...props />
```

- [ ] **Step 4: Replace input fields**

Replace:
```tsx
className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 placeholder:text-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed"
```
with:
```tsx
<InputField ...props />
```
(`size="md"` is the default so omit it.)

- [ ] **Step 5: Verify no raw pattern remains**

```bash
grep -c "rounded-lg border border-neutral-200.*focus:border-\[#3B82F6\]" app/_components/editor/block-type-editors.tsx
```

Expected: `0`

```bash
grep -c "font-semibold uppercase tracking-\[0.16em\]" app/_components/editor/block-type-editors.tsx
```

Expected: `0`

- [ ] **Step 6: Type-check and commit**

```bash
npx tsc --noEmit 2>&1 | grep "block-type-editors"
```

Expected: no output.

```bash
git add app/_components/editor/block-type-editors.tsx
git commit -m "refactor: use FieldLabel/InputField/TextareaField in block-type-editors"
```

---

## Task 3: Update block-editor.tsx

**Files:**
- Modify: `app/_components/editor/block-editor.tsx`

Has 1 label div, 3 textarea fields (lines 593, 669, 693), and 1 mono input (line 421).

- [ ] **Step 1: Add imports**

Find the existing import from `editor-ui` (check if one exists) or add:
```tsx
import { FieldLabel, InputField, TextareaField, MonoInput } from "@/app/_components/editor/editor-ui";
```

If an import from `editor-ui` already exists, add the new names to it.

- [ ] **Step 2: Replace the label div (line ~687)**

```tsx
// Before
<div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Section label</div>

// After
<FieldLabel className="mb-1.5">Section label</FieldLabel>
```

- [ ] **Step 3: Replace the mono input (line ~421)**

```tsx
// Before
<input
  ...props
  className="flex-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs font-mono outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25"
/>

// After
<MonoInput
  size="xs"
  className="flex-1 px-2 py-1"
  ...props
/>
```

Note: `MonoInput` base includes `w-full`. When you pass `className="flex-1 px-2 py-1"`, both `w-full` and `flex-1` are present in the class string. In a flex container this is harmless — `flex-1` controls the layout and `w-full` has no conflicting effect. The padding `px-2 py-1` in `className` is appended after the size-preset padding `px-3 py-2`, so in Tailwind v4 the later-appended class wins for conflicting properties.

- [ ] **Step 4: Replace the three textarea fields (lines ~593, ~669, ~693)**

All three use `px-3 py-3 text-sm` (= `size="lg"`) and `resize-none`. Replace with:
```tsx
// Line 593 (has leading-6)
<TextareaField
  size="lg"
  className="leading-6"
  value={...}
  onChange={...}
  placeholder={...}
  disabled={...}
/>

// Lines 669 and 693 (no leading-6)
<TextareaField
  size="lg"
  value={...}
  onChange={...}
  placeholder={...}
  disabled={...}
/>
```

- [ ] **Step 5: Verify and commit**

```bash
grep -c "rounded-lg border border-neutral-200.*focus:border-\[#3B82F6\]" app/_components/editor/block-editor.tsx
```
Expected: `0`

```bash
npx tsc --noEmit 2>&1 | grep "block-editor"
```
Expected: no output.

```bash
git add app/_components/editor/block-editor.tsx
git commit -m "refactor: use FieldLabel/InputField/TextareaField/MonoInput in block-editor"
```

---

## Task 4: Update canvas-feature-type-body.tsx

**Files:**
- Modify: `app/_components/editor/canvas-feature-type-body.tsx`

This is the largest callsite: ~20 label divs and ~10 input/textarea fields (including several mono fields).

- [ ] **Step 1: Add imports**

Find the existing import from `editor-ui` or add:
```tsx
import { FieldLabel, InputField, TextareaField, MonoInput } from "@/app/_components/editor/editor-ui";
```

- [ ] **Step 2: Replace all label divs**

There are two patterns. For each, note what spacing class to preserve via `className`:

Pattern A — default spacing (`mb-2` is already the FieldLabel default):
```tsx
// Before
<div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">...</div>
// After
<FieldLabel>...</FieldLabel>
```

Pattern B — no explicit `mb` (label sits next to something):
```tsx
// Before
<div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">...</div>
// After
<FieldLabel className="mb-0">...</FieldLabel>
```

Pattern C — `mb-1.5`:
```tsx
// Before
<div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">...</div>
// After
<FieldLabel className="mb-1.5">...</FieldLabel>
```

- [ ] **Step 3: Replace standard input fields (`px-3 py-2.5 text-sm`)**

```tsx
// Before
<input
  className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 placeholder:text-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed"
  ...props
/>
// After
<InputField ...props />
```

- [ ] **Step 4: Replace compact input fields (`px-3 py-2 text-sm`)**

```tsx
// Before
<input
  className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-xs outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 placeholder:text-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed"
  ...props
/>
// After (font-mono + xs size → MonoInput)
<MonoInput size="xs" ...props />
```

- [ ] **Step 5: Replace mono textarea fields**

```tsx
// Before (resize-none, font-mono, px-3 py-3 text-xs)
<textarea
  className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-3 font-mono text-xs outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 placeholder:text-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed"
  ...props
/>
// After
<TextareaField size="lg" className="font-mono" ...props />
```

- [ ] **Step 6: Replace standard textarea fields**

```tsx
// Before (resize-none, px-3 py-2.5 text-sm)
<textarea
  className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 placeholder:text-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed"
  ...props
/>
// After
<TextareaField ...props />
```

- [ ] **Step 7: Verify and commit**

```bash
grep -c "rounded-lg border border-neutral-200.*focus:border-\[#3B82F6\]" app/_components/editor/canvas-feature-type-body.tsx
```
Expected: `0`

```bash
grep -c "font-semibold uppercase tracking-\[0.16em\]" app/_components/editor/canvas-feature-type-body.tsx
```
Expected: `0`

```bash
npx tsc --noEmit 2>&1 | grep "canvas-feature-type-body"
```
Expected: no output.

```bash
git add app/_components/editor/canvas-feature-type-body.tsx
git commit -m "refactor: use FieldLabel/InputField/TextareaField/MonoInput in canvas-feature-type-body"
```

---

## Task 5: Update content-tab.tsx

**Files:**
- Modify: `app/_components/editor/content-tab.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { FieldLabel, InputField } from "@/app/_components/editor/editor-ui";
```

(If `EditorSection` is already imported from here, add to that import.)

- [ ] **Step 2: Replace labels**

```tsx
// Before
<div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
  Button label
</div>

// After
<FieldLabel>Button label</FieldLabel>
```

For divs with `mb-1.5` instead of `mb-2`:
```tsx
// Before
<div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">

// After
<FieldLabel className="mb-1.5">
```

- [ ] **Step 3: Replace input fields**

```tsx
// Before
<input
  value={value}
  onChange={onChange}
  placeholder="Enter text..."
  disabled={disabled}
  className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 placeholder:text-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed"
/>

// After
<InputField
  value={value}
  onChange={onChange}
  placeholder="Enter text..."
  disabled={disabled}
/>
```

- [ ] **Step 3: Verify and commit**

```bash
grep -c "rounded-lg border border-neutral-200.*focus:border-\[#3B82F6\]" app/_components/editor/content-tab.tsx
```
Expected: `0`

```bash
npx tsc --noEmit 2>&1 | grep "content-tab"
```
Expected: no output.

```bash
git add app/_components/editor/content-tab.tsx
git commit -m "refactor: use FieldLabel/InputField in content-tab"
```

---

## Task 6: Update experience-tab.tsx and overview-tab.tsx

**Files:**
- Modify: `app/_components/editor/experience-tab.tsx`
- Modify: `app/_components/editor/overview-tab.tsx`

`experience-tab.tsx` has several mono fields (URL inputs, `font-mono text-sm`) and one mono textarea. `overview-tab.tsx` has mono inputs and standard inputs.

- [ ] **Step 1: Add imports to both files**

```tsx
import { FieldLabel, InputField, TextareaField, MonoInput } from "@/app/_components/editor/editor-ui";
```

- [ ] **Step 2: Replace in experience-tab.tsx**

Mono `px-3 py-2.5 font-mono text-sm` fields → `<MonoInput ...props />` (size="md" is default).

**Exception — `bg-neutral-50` textarea (leave as raw `<textarea>`):** The code-input textarea uses `bg-neutral-50` as its background, which conflicts with `bg-white` in `FIELD_BASE`. Without `tailwind-merge`, passing `className="bg-neutral-50 ..."` will produce both classes in the string and the winner is CSS-order-dependent. Leave this specific field as an inline `<textarea>` and do not convert it. Grep for it: `grep -n "bg-neutral-50.*font-mono" app/_components/editor/experience-tab.tsx`

Standard `select` at line ~275 — already handled by `SelectField`, leave as-is.

`px-4 py-3 text-sm` (size="lg") standard fields → `<InputField size="lg" ...props />`.

- [ ] **Step 3: Replace in overview-tab.tsx**

Mono `px-4 py-3 font-mono text-sm` (size="lg") fields → `<MonoInput size="lg" ...props />`.

Standard `px-4 py-3 text-sm` fields → `<InputField size="lg" ...props />`.

- [ ] **Step 4: Verify and commit**

```bash
grep -c "rounded-lg border border-neutral-200.*focus:border-\[#3B82F6\]" app/_components/editor/experience-tab.tsx app/_components/editor/overview-tab.tsx
```
Expected: `0`

```bash
npx tsc --noEmit 2>&1 | grep -E "experience-tab|overview-tab"
```
Expected: no output.

```bash
git add app/_components/editor/experience-tab.tsx app/_components/editor/overview-tab.tsx
git commit -m "refactor: use FieldLabel/InputField/MonoInput in experience-tab and overview-tab"
```

---

## Task 7: Update page-setup-section.tsx, new-container-form.tsx, dropdown-feature-editor.tsx

**Files:**
- Modify: `app/_components/editor/page-setup-section.tsx`
- Modify: `app/_components/editor/new-container-form.tsx`
- Modify: `app/_components/editor/dropdown-feature-editor.tsx`

- [ ] **Step 1: Add imports to each file**

```tsx
import { FieldLabel, InputField, MonoInput } from "@/app/_components/editor/editor-ui";
```

- [ ] **Step 2: Replace in page-setup-section.tsx**

Two fields: one `font-mono text-sm px-3 py-2.5` → `<MonoInput ...props />`, one `text-sm px-3 py-2.5` → `<InputField ...props />`.

- [ ] **Step 3: Replace in new-container-form.tsx**

Two label divs (`text-[10px]` → normalise to `text-xs` via `<FieldLabel>`).

One `<input>` field → `<InputField ...props />`.

One `<select>` already rendered by `SelectField` or as a raw select — if raw, convert to `<SelectField>`.

- [ ] **Step 4: Replace in dropdown-feature-editor.tsx**

Two fields:
- `px-2.5 py-1.5 text-xs` — no exact size preset. Use `size="xs"` and override padding: `<InputField size="xs" className="px-2.5 py-1.5" ...props />`. (The `px-2.5` overrides the size preset's `px-3`.)
- `px-2.5 py-1.5 font-mono text-xs` → `<MonoInput size="xs" className="px-2.5 py-1.5" ...props />`.

- [ ] **Step 5: Verify and commit**

```bash
grep -c "rounded-lg border border-neutral-200.*focus:border-\[#3B82F6\]" \
  app/_components/editor/page-setup-section.tsx \
  app/_components/editor/new-container-form.tsx \
  app/_components/editor/dropdown-feature-editor.tsx
```
Expected: `0`

```bash
npx tsc --noEmit 2>&1 | grep -E "page-setup|new-container|dropdown-feature"
```
Expected: no output.

```bash
git add app/_components/editor/page-setup-section.tsx \
        app/_components/editor/new-container-form.tsx \
        app/_components/editor/dropdown-feature-editor.tsx
git commit -m "refactor: use FieldLabel/InputField/MonoInput in page-setup-section, new-container-form, dropdown-feature-editor"
```

---

## Task 8: Update image-hotspot-editor.tsx and locale-feature-editor.tsx

**Files:**
- Modify: `app/_components/editor/image-hotspot-editor.tsx`
- Modify: `app/_components/editor/locale-feature-editor.tsx`

- [ ] **Step 1: Add imports to each file**

```tsx
import { InputField, TextareaField } from "@/app/_components/editor/editor-ui";
```

- [ ] **Step 2: Replace in image-hotspot-editor.tsx**

Two fields:
- `<input className="w-full ...px-2.5 py-2 text-sm...">` → `<InputField size="sm" className="px-2.5" ...props />`
- `<textarea className="w-full ...px-2.5 py-2 text-sm...">` → `<TextareaField size="sm" className="px-2.5" ...props />`

- [ ] **Step 3: Replace in locale-feature-editor.tsx**

Three fields:
- `px-3 py-2 text-sm` → `<InputField size="sm" ...props />`
- `w-56 px-3 py-2 text-sm` (has explicit width) → `<InputField size="sm" className="w-56" ...props />`
- `resize-y px-3 py-2 text-sm` textarea → `<TextareaField size="sm" resize="y" ...props />`

- [ ] **Step 4: Verify and commit**

```bash
grep -c "rounded-lg border border-neutral-200.*focus:border-\[#3B82F6\]" \
  app/_components/editor/image-hotspot-editor.tsx \
  app/_components/editor/locale-feature-editor.tsx
```
Expected: `0`

```bash
npx tsc --noEmit 2>&1 | grep -E "image-hotspot|locale-feature"
```
Expected: no output.

```bash
git add app/_components/editor/image-hotspot-editor.tsx \
        app/_components/editor/locale-feature-editor.tsx
git commit -m "refactor: use InputField/TextareaField in image-hotspot-editor and locale-feature-editor"
```

---

## Task 9: Final verification

**Files:** None modified — verification only.

- [ ] **Step 1: Check no inline patterns remain in editor/**

```bash
grep -rn "rounded-lg border border-neutral-200.*focus:border-\[#3B82F6\]" app/_components/editor --include="*.tsx"
```
Expected: only the one inside `editor-ui.tsx` itself (the `SelectField` select element). If any other files appear, they were missed — go back and fix them.

```bash
grep -rn "text-xs font-semibold uppercase tracking-\[0\.16em\] text-neutral-500\|text-\[10px\] font-semibold uppercase tracking-\[0\.16em\]" app/_components/editor --include="*.tsx"
```
Expected: only the line inside `EditorSection` in `editor-ui.tsx`. If others appear, fix them.

- [ ] **Step 2: Full type-check**

```bash
npx tsc --noEmit 2>&1
```

Expected: zero errors. If you see errors, fix them — do not skip.

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: successful build with no new errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "refactor: shared UI primitives — editor/ callsites complete (v0.25.2)"
```
