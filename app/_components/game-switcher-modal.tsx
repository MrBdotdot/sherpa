"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/_lib/supabase";

type GameEntry = { id: string; title: string };

// ── Creation wizard ───────────────────────────────────────────────

function CreateWizard({
  userId,
  onBack,
  onDone,
}: {
  userId: string;
  onBack: () => void;
  onDone: (id: string, name: string) => void;
}) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    const id = crypto.randomUUID();
    const { error } = await supabase.from("games").insert({
      id,
      user_id: userId,
      title: trimmed,
      card_order: [],
      system_settings: {
        fontTheme: "modern",
        surfaceStyle: "glass",
        accentColor: "",
        hotspotSize: "medium",
        modelEnvironment: "studio",
      },
    });
    if (error) {
      setError(error.message);
      setCreating(false);
    } else {
      onDone(id, trimmed);
    }
  }

  return (
    <div>
      <div className="border-b border-neutral-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Back"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="text-sm font-semibold text-neutral-900">New board game rules</div>
        </div>
      </div>
      <div className="px-5 py-4">
        <label className="mb-1.5 block text-xs font-medium text-neutral-500">Rules experience name</label>
        <input
          type="text"
          placeholder="e.g. Catan — How to Play"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
          autoFocus
        />
        {error && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
        )}
      </div>
      <div className="flex justify-end border-t border-neutral-100 px-5 py-3">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim() || creating}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────

type GameSwitcherModalProps = {
  isOpen: boolean;
  currentGameId?: string;
  userId: string;
  onClose: () => void;
  onSelectGame: (gameId: string, gameName: string, studioName: string) => void;
};

export function GameSwitcherModal({
  isOpen,
  currentGameId,
  userId,
  onClose,
  onSelectGame,
}: GameSwitcherModalProps) {
  const router = useRouter();
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    supabase
      .from("games")
      .select("id, title")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setGames(data ?? []);
        setLoading(false);
      });
  }, [isOpen, userId]);

  if (!isOpen) return null;

  function reset() {
    setExpandedGameId(null);
    setQuery("");
    setShowWizard(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleEditRules(game: GameEntry) {
    onSelectGame(game.id, game.title, "");
    handleClose();
  }

  function handleViewAnalytics(game: GameEntry) {
    handleClose();
    router.push(`/analytics?game=${game.id}&name=${encodeURIComponent(game.title)}`);
  }

  const filteredGames = games.filter((g) =>
    g.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {showWizard ? (
          <CreateWizard
            userId={userId}
            onBack={() => setShowWizard(false)}
            onDone={(id, name) => {
              onSelectGame(id, name, "");
              handleClose();
            }}
          />
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-neutral-200 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-neutral-900">Switch game</div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="mt-3">
                <input
                  type="search"
                  placeholder="Search games…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto p-2">
              {loading ? (
                <div className="px-3 py-6 text-center text-sm text-neutral-400">Loading…</div>
              ) : filteredGames.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-neutral-400">
                  {query ? "No games match your search" : "No games yet — create one below"}
                </div>
              ) : (
                filteredGames.map((g) => {
                  const isCurrent = g.id === currentGameId;
                  const isExpanded = expandedGameId === g.id;
                  return (
                    <div key={g.id}>
                      {/* Game row */}
                      <button
                        type="button"
                        onClick={() => setExpandedGameId(isExpanded ? null : g.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                          isExpanded
                            ? "bg-neutral-900 text-white"
                            : isCurrent
                            ? "bg-neutral-50 ring-1 ring-neutral-200 hover:bg-neutral-100"
                            : "hover:bg-neutral-50"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                            isExpanded ? "bg-white/15 text-white" : "bg-neutral-900 text-white"
                          }`}
                        >
                          {g.title[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`truncate text-sm font-medium ${
                                isExpanded ? "text-white" : "text-neutral-900"
                              }`}
                            >
                              {g.title}
                            </span>
                            {isCurrent && !isExpanded && (
                              <span className="shrink-0 rounded-full bg-neutral-900 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                                Current
                              </span>
                            )}
                          </div>
                        </div>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          className={`shrink-0 transition-transform ${
                            isExpanded ? "rotate-180 text-white/60" : "text-neutral-300"
                          }`}
                        >
                          <path
                            d="M2 4l4 4 4-4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>

                      {/* Expanded action panel */}
                      {isExpanded && (
                        <div className="mx-1 mb-1 overflow-hidden rounded-b-xl border border-t-0 border-neutral-200 bg-neutral-50">
                          <button
                            type="button"
                            onClick={() => handleEditRules(g)}
                            className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 group-hover:border-neutral-300">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M2 10.5V12h1.5l6-6L8 4.5l-6 6zM12.5 3.5a1 1 0 000-1.414l-.586-.586a1 1 0 00-1.414 0L9.086 2.914 11.5 5.328 12.5 4.5z" fill="currentColor" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-neutral-900">Edit rules</div>
                              <div className="text-xs text-neutral-400">Open the authoring studio</div>
                            </div>
                          </button>
                          <div className="mx-4 border-t border-neutral-200" />
                          <button
                            type="button"
                            onClick={() => handleViewAnalytics(g)}
                            className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 group-hover:border-neutral-300">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <rect x="1" y="8" width="2.5" height="4" rx="0.75" fill="currentColor" />
                                <rect x="5.25" y="5" width="2.5" height="7" rx="0.75" fill="currentColor" />
                                <rect x="9.5" y="2" width="2.5" height="10" rx="0.75" fill="currentColor" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-neutral-900">View analytics</div>
                              <div className="text-xs text-neutral-400">Sessions, hotspot performance, devices</div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-neutral-200 px-5 py-3">
              <button
                type="button"
                onClick={() => setShowWizard(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                Create new board game rules
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
