# Image Upload Size Limits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-context size validation to all four image upload paths, blocking oversized files and warning on large-but-acceptable ones before compression runs.
**Architecture:** A `validateImageSize(file, context)` utility in `supabase-storage.ts` returns a typed result; each of the four upload hooks calls it before invoking `uploadImage`, handling block with an inline error and warn with a `window.confirm` dialog (matching the pattern used elsewhere in the codebase); `uploadImage` gains a `context` parameter it passes through to the validator.
**Tech Stack:** TypeScript, React hooks, Next.js (app router), Supabase Storage.

---

### Task 1: Add types and validation utility to `supabase-storage.ts`

**Files:**
- Modify: `app/_lib/supabase-storage.ts`

- [ ] Step 1: Open `app/_lib/supabase-storage.ts` and replace its contents with the following:

```ts
import { supabase } from "@/app/_lib/supabase";

const BUCKET = "sherpa-images";

// ── Size limits ───────────────────────────────────────────────────────────────

const MB = 1024 * 1024;

export type UploadContext = "hero" | "block" | "feature" | "avatar";

const SIZE_LIMITS: Record<UploadContext, { warn: number; block: number }> = {
  hero:    { warn: 5 * MB,      block: 10 * MB },
  block:   { warn: 2 * MB,      block: 5 * MB  },
  feature: { warn: 1 * MB,      block: 3 * MB  },
  avatar:  { warn: 0.5 * MB,    block: 1 * MB  },
};

const BLOCK_MESSAGES: Record<UploadContext, string> = {
  hero:    "This file is too large. Background images must be under 10MB.",
  block:   "This file is too large. Content images must be under 5MB.",
  feature: "This file is too large. Logo and icon images must be under 3MB.",
  avatar:  "This file is too large. Profile photos must be under 1MB.",
};

export type SizeValidationResult =
  | { status: "ok" }
  | { status: "warn"; message: string }
  | { status: "block"; message: string };

export function validateImageSize(
  file: File,
  context: UploadContext
): SizeValidationResult {
  const limits = SIZE_LIMITS[context];
  if (file.size >= limits.block) {
    return { status: "block", message: BLOCK_MESSAGES[context] };
  }
  if (file.size >= limits.warn) {
    const mb = (file.size / MB).toFixed(1);
    return {
      status: "warn",
      message: `This is a large file (${mb}MB). It may load slowly for players. Continue anyway?`,
    };
  }
  return { status: "ok" };
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadImage(
  file: File,
  userId: string,
  gameId: string
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${gameId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] Step 2: Run: `npm run build` — Expected: clean build, no TypeScript errors.
- [ ] Step 3: Commit: `feat: add validateImageSize utility and UploadContext type to supabase-storage`

---

### Task 2: Wire size validation into `usePageHandlers` (hero context)

**Files:**
- Modify: `app/_hooks/usePageHandlers.ts`

- [ ] Step 1: Add `validateImageSize` to the import from `supabase-storage`:

```ts
import { uploadImage, validateImageSize } from "@/app/_lib/supabase-storage";
```

- [ ] Step 2: Replace the `handlePageHeroUpload` function body with size-aware logic. The function currently reads:

```ts
  const handlePageHeroUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    updateSelectedPage((page) => ({ ...page, heroImage: localUrl }));
    try {
      const remoteUrl = await uploadImage(file, userId, gameId);
      updateSelectedPage((page) => ({ ...page, heroImage: remoteUrl }));
    } catch {
      // local blob URL stays in place until next save — acceptable fallback
    }
  };
```

Replace it with:

```ts
  const handlePageHeroUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageSize(file, "hero");
    if (validation.status === "block") {
      alert(validation.message);
      return;
    }
    if (validation.status === "warn") {
      const confirmed = window.confirm(validation.message);
      if (!confirmed) return;
    }

    const localUrl = URL.createObjectURL(file);
    updateSelectedPage((page) => ({ ...page, heroImage: localUrl }));
    try {
      const remoteUrl = await uploadImage(file, userId, gameId);
      updateSelectedPage((page) => ({ ...page, heroImage: remoteUrl }));
    } catch {
      // local blob URL stays in place until next save — acceptable fallback
    }
  };
```

- [ ] Step 3: Run: `npm run build` — Expected: clean build.
- [ ] Step 4: Commit: `feat: validate hero image size before upload in usePageHandlers`

---

### Task 3: Wire size validation into `useContentHandlers` (block context)

**Files:**
- Modify: `app/_hooks/useContentHandlers.ts`

- [ ] Step 1: Add `validateImageSize` to the import from `supabase-storage`:

```ts
import { uploadImage, validateImageSize } from "@/app/_lib/supabase-storage";
```

- [ ] Step 2: Replace the `handleBlockImageUpload` function body. Currently:

```ts
  const handleBlockImageUpload = async (
    blockId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    handleBlockChange(blockId, localUrl);
    try {
      const remoteUrl = await uploadImage(file, userId, gameId);
      handleBlockChange(blockId, remoteUrl);
    } catch {
      // local blob URL stays in place — acceptable fallback
    }
  };
```

Replace with:

```ts
  const handleBlockImageUpload = async (
    blockId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageSize(file, "block");
    if (validation.status === "block") {
      alert(validation.message);
      return;
    }
    if (validation.status === "warn") {
      const confirmed = window.confirm(validation.message);
      if (!confirmed) return;
    }

    const localUrl = URL.createObjectURL(file);
    handleBlockChange(blockId, localUrl);
    try {
      const remoteUrl = await uploadImage(file, userId, gameId);
      handleBlockChange(blockId, remoteUrl);
    } catch {
      // local blob URL stays in place — acceptable fallback
    }
  };
```

- [ ] Step 3: Run: `npm run build` — Expected: clean build.
- [ ] Step 4: Commit: `feat: validate block image size before upload in useContentHandlers`

---

### Task 4: Wire size validation into `useCanvasFeatureHandlers` (feature context)

**Files:**
- Modify: `app/_hooks/useCanvasFeatureHandlers.ts`

- [ ] Step 1: Add `validateImageSize` to the import from `supabase-storage`:

```ts
import { uploadImage, validateImageSize } from "@/app/_lib/supabase-storage";
```

- [ ] Step 2: Replace `handleCanvasFeatureImageUpload`. Currently:

```ts
  const handleCanvasFeatureImageUpload = async (
    featureId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    handleCanvasFeatureChange(featureId, "imageUrl", localUrl);
    try {
      const remoteUrl = await uploadImage(file, userId, gameId);
      handleCanvasFeatureChange(featureId, "imageUrl", remoteUrl);
    } catch {
      // local blob URL stays in place — acceptable fallback
    }
  };
```

Replace with:

```ts
  const handleCanvasFeatureImageUpload = async (
    featureId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageSize(file, "feature");
    if (validation.status === "block") {
      alert(validation.message);
      return;
    }
    if (validation.status === "warn") {
      const confirmed = window.confirm(validation.message);
      if (!confirmed) return;
    }

    const localUrl = URL.createObjectURL(file);
    handleCanvasFeatureChange(featureId, "imageUrl", localUrl);
    try {
      const remoteUrl = await uploadImage(file, userId, gameId);
      handleCanvasFeatureChange(featureId, "imageUrl", remoteUrl);
    } catch {
      // local blob URL stays in place — acceptable fallback
    }
  };
```

- [ ] Step 3: Replace `handleGameIconUpload`. Currently:

```ts
  const handleGameIconUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setSystemSettings((prev) => ({ ...prev, gameIcon: localUrl }));

    try {
      const remoteUrl = await uploadImage(file, userId, gameId);
      setSystemSettings((prev) => ({ ...prev, gameIcon: remoteUrl }));
    } catch {
      // Local blob URL stays in place until refresh if upload fails.
    }
  };
```

Replace with:

```ts
  const handleGameIconUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageSize(file, "feature");
    if (validation.status === "block") {
      alert(validation.message);
      return;
    }
    if (validation.status === "warn") {
      const confirmed = window.confirm(validation.message);
      if (!confirmed) return;
    }

    const localUrl = URL.createObjectURL(file);
    setSystemSettings((prev) => ({ ...prev, gameIcon: localUrl }));

    try {
      const remoteUrl = await uploadImage(file, userId, gameId);
      setSystemSettings((prev) => ({ ...prev, gameIcon: remoteUrl }));
    } catch {
      // Local blob URL stays in place until refresh if upload fails.
    }
  };
```

- [ ] Step 4: Run: `npm run build` — Expected: clean build.
- [ ] Step 5: Commit: `feat: validate feature image size before upload in useCanvasFeatureHandlers`

---

### Task 5: Wire size validation into `useProfileSection` (avatar context)

**Files:**
- Modify: `app/_hooks/useProfileSection.ts`

The avatar differs from the other three: the file is stored in `avatarFile` state on select and only uploaded inside `handleSaveProfile`. Validation runs at the point of file selection in `handlePhotoChange`, so the publisher sees the error immediately rather than after clicking Save.

- [ ] Step 1: Add `validateImageSize` to the import from `supabase-storage`:

```ts
import { uploadImage, validateImageSize } from "@/app/_lib/supabase-storage";
```

- [ ] Step 2: Replace the `handlePhotoChange` function. Currently:

```ts
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  }
```

Replace with:

```ts
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageSize(file, "avatar");
    if (validation.status === "block") {
      alert(validation.message);
      return;
    }
    if (validation.status === "warn") {
      const confirmed = window.confirm(validation.message);
      if (!confirmed) return;
    }

    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  }
```

- [ ] Step 3: Run: `npm run build` — Expected: clean build.
- [ ] Step 4: Commit: `feat: validate avatar image size on selection in useProfileSection`

---

### Task 6: Manual verification checklist

No code changes. Run the app locally and verify each path:

- [ ] Step 1: Upload a hero image over 10MB — confirm upload is blocked with message "This file is too large. Background images must be under 10MB."
- [ ] Step 2: Upload a hero image between 5MB and 10MB — confirm warn dialog appears with correct MB figure, Cancel aborts, Continue proceeds.
- [ ] Step 3: Upload a hero image under 5MB — confirm no dialog, uploads directly.
- [ ] Step 4: Repeat steps 1–3 for a content block image (5MB block / 2MB warn).
- [ ] Step 5: Repeat steps 1–3 for a canvas feature image and a game icon (3MB block / 1MB warn).
- [ ] Step 6: Repeat steps 1–3 for a profile avatar (1MB block / 500KB warn).
- [ ] Step 7: Confirm existing uploaded images load normally and are unaffected.
- [ ] Step 8: Commit: `chore: verify image size validation across all four upload contexts`
