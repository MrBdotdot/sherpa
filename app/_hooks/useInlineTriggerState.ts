"use client";

import { useState } from "react";

export type TriggerState = { active: boolean; start: number; query: string; index: number };

const TRIGGER_CLOSED: TriggerState = { active: false, start: 0, query: "", index: 0 };

export function useInlineTriggerState() {
  const [trigger, setTrigger] = useState<TriggerState>(TRIGGER_CLOSED);

  function closeTrigger() {
    setTrigger(TRIGGER_CLOSED);
  }

  return { trigger, setTrigger, closeTrigger };
}
