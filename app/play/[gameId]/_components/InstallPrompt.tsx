"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "sherpa-install-dismissed";

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true); // hidden by default until prompt fires

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function handleInstall() {
    if (!prompt) return;
    prompt.prompt();
    prompt.userChoice.then(() => {
      setPrompt(null);
      setDismissed(true);
      localStorage.setItem(DISMISSED_KEY, "1");
    });
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, "1");
  }

  if (dismissed || !prompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-4 border-t border-white/10 bg-neutral-900/95 px-4 py-3 text-sm text-white backdrop-blur-sm">
      <span>Add to home screen for offline access</span>
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={handleInstall}
          className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-100"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="text-lg leading-none text-neutral-500 transition hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}
