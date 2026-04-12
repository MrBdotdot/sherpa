"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadGame } from "@/app/_lib/supabase-game";
import { PlayerView } from "@/app/_components/player-view";
import { PageItem, SystemSettings } from "@/app/_lib/authoring-types";
import { warmGameCache } from "@/app/_lib/warm-game-cache";
import { OfflineBadge } from "./_components/OfflineBadge";
import { InstallPrompt } from "./_components/InstallPrompt";

export default function PlayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [pages, setPages] = useState<PageItem[] | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [hasBranding, setHasBranding] = useState(true);
  const [cacheStatus, setCacheStatus] = useState<
    "idle" | "already-cached" | "success" | "error"
  >("idle");

  useEffect(() => {
    if (!gameId) return;
    loadGame(gameId)
      .then((data) => {
        if (data && data.pages.some((p) => p.kind === "home")) {
          setPages(data.pages);
          setSystemSettings(data.systemSettings);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true));
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;

    // Apply stored entitlement immediately for offline use
    const stored = localStorage.getItem(`sherpa-entitlement-${gameId}`);
    if (stored !== null) setHasBranding(stored === "true");

    fetch("/api/stripe/entitlement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    })
      .then((r) => r.json())
      .then((data: { hasBranding?: boolean }) => {
        const value = data.hasBranding ?? true;
        setHasBranding(value);
        localStorage.setItem(`sherpa-entitlement-${gameId}`, String(value));
      })
      .catch(() => {
        // Offline: use stored value if available, otherwise conservative default (show branding)
        if (stored === null) setHasBranding(true);
      });
  }, [gameId]);

  // Warm the SW cache after game data is loaded
  useEffect(() => {
    if (!gameId || !pages || !systemSettings) return;
    warmGameCache(gameId, pages, systemSettings).then((status) => {
      console.log("[warmGameCache] result:", status);
      setCacheStatus(status);
    });
  }, [gameId, pages, systemSettings]);

  if (notFound) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-6 text-center">
        <div>
          <div className="text-xl font-semibold text-white">Experience not found</div>
          <div className="mt-2 text-sm text-neutral-400">
            This link may be invalid or the experience is not published.
          </div>
        </div>
        <a
          href="/gallery"
          className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
        >
          Browse the gallery
        </a>
      </div>
    );
  }

  if (!pages || !systemSettings) {
    return (
      <div
        className="flex h-screen items-center justify-center bg-neutral-950"
        role="status"
        aria-label="Loading experience"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  return (
    <>
      <PlayerView pages={pages} systemSettings={systemSettings} hasBranding={hasBranding} />
      <OfflineBadge status={cacheStatus} />
      <InstallPrompt />
    </>
  );
}
