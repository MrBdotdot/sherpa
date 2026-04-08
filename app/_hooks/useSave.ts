"use client";

import { useState } from "react";
import type { SaveState } from "@/app/_components/account/account-form-ui";

export function useSave(): [SaveState, (fn: () => Promise<void>) => void] {
  const [saveState, setSaveState] = useState<SaveState>("idle");

  function save(fn: () => Promise<void>) {
    setSaveState("saving");
    fn()
      .then(() => {
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2500);
      })
      .catch(() => setSaveState("error"));
  }

  return [saveState, save];
}
