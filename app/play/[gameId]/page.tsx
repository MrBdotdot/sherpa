"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadGame } from "@/app/_lib/supabase-game";
import { PlayerView } from "@/app/_components/player-view";
import { PageItem, SystemSettings } from "@/app/_lib/authoring-types";

export default function PlayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [pages, setPages] = useState<PageItem[] | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    loadGame(gameId, { publishedOnly: true })
      .then((data) => {
        if (data) {
          setPages(data.pages);
          setSystemSettings(data.systemSettings);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true));
  }, [gameId]);

  if (notFound) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="text-xl font-semibold text-white">Experience not found</div>
          <div className="mt-2 text-sm text-neutral-400">
            This link may be invalid or the experience is not published.
          </div>
        </div>
      </div>
    );
  }

  if (!pages || !systemSettings) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  return <PlayerView pages={pages} systemSettings={systemSettings} />;
}
