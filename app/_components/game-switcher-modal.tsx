"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createInitialHomePage } from "@/app/_lib/authoring-utils";
import { KNOWN_LANGUAGES } from "@/app/_lib/localization";
import { getGameIconFallback, getGameIconUrl } from "@/app/_lib/game-icon";
import { SystemSettings } from "@/app/_lib/authoring-types";
import { supabase } from "@/app/_lib/supabase";
import { deleteGame, saveGame } from "@/app/_lib/supabase-game";
import { ConfirmGameDeleteModal } from "@/app/_components/confirm-game-delete-modal";
import { useFocusTrap } from "@/app/_hooks/useFocusTrap";

export type GameEntry = { id: string; title: string; gameIcon?: string };

type CreateWizardProps = {
  userId: string;
  onBack: () => void;
  onDone: (id: string, name: string) => void;
};

function CreateWizard({ userId, onBack, onDone }: CreateWizardProps) {
  const [name, setName] = useState("");
  const [defaultLanguageCode, setDefaultLanguageCode] = useState("EN");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedLanguage = useMemo(
    () => KNOWN_LANGUAGES.find((language) => language.code === defaultLanguageCode),
    [defaultLanguageCode]
  );

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setCreating(true);
    setError(null);

    const id = crypto.randomUUID();
    try {
      const systemSettings: SystemSettings = {
        fontTheme: "modern",
        surfaceStyle: "glass",
        accentColor: "",
        defaultLanguageCode,
        gameIcon: "",
        hotspotSize: "medium",
        modelEnvironment: "studio",
      };
      const homeOnlyPages = createInitialHomePage({
        defaultLanguageCode,
        gameName: trimmed,
      });

      await saveGame(id, userId, trimmed, homeOnlyPages, systemSettings, "draft");
    } catch (createError) {
      setError(getErrorMessage(createError));
      setCreating(false);
      return;
    }

    onDone(id, trimmed);
  }

  return (
    <div>
      <div className="border-b border-neutral-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-600"
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
        <label htmlFor="create-game-name" className="mb-1.5 block text-xs font-medium text-neutral-500">Game name</label>
        <input
          id="create-game-name"
          type="text"
          placeholder="e.g. Catan - How to Play"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-500 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 focus:bg-white"
        />
        <label htmlFor="create-default-language" className="mb-1.5 mt-4 block text-xs font-medium text-neutral-500">
          Default language
        </label>
        <select
          id="create-default-language"
          value={defaultLanguageCode}
          onChange={(event) => setDefaultLanguageCode(event.target.value)}
          className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 focus:bg-white"
          aria-describedby="create-default-language-help"
        >
          {KNOWN_LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label} ({language.code})
            </option>
          ))}
        </select>
        <p id="create-default-language-help" className="mt-2 text-xs leading-5 text-neutral-500">
          The first translation column will use {selectedLanguage?.label ?? "this language"} as the source text.
        </p>
        {error && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
        )}
      </div>

      <div className="flex justify-end border-t border-neutral-100 px-5 py-3">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim() || creating}
          className="rounded-full bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-40"
        >
          {creating ? "Creating..." : "Create"}
        </button>
      </div>
    </div>
  );
}

type GameSwitcherModalProps = {
  isOpen: boolean;
  currentGameId?: string;
  userId: string;
  onClose: () => void;
  onSelectGame: (gameId: string, gameName: string, studioName: string) => void;
  onDeleteCurrentGame: (nextGame: GameEntry | null) => void;
  onGameCreated?: () => void;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function GameSwitcherModal({
  isOpen,
  currentGameId,
  userId,
  onClose,
  onSelectGame,
  onDeleteCurrentGame,
  onGameCreated,
}: GameSwitcherModalProps) {
  const router = useRouter();
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);
  const [games, setGames] = useState<GameEntry[] | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [pendingDeleteGame, setPendingDeleteGame] = useState<GameEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    supabase
      .from("games")
      .select("id, title, system_settings")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        type GameRow = {
          id: string;
          title: string;
          system_settings: SystemSettings | null;
        };

        setGames(
          ((data ?? []) as GameRow[]).map((game) => ({
            id: game.id,
            title: game.title,
            gameIcon: game.system_settings?.gameIcon ?? "",
          }))
        );
      });
  }, [isOpen, userId]);

  if (!isOpen) return null;

  function reset() {
    setExpandedGameId(null);
    setQuery("");
    setShowWizard(false);
    setGames(null);
    setPendingDeleteGame(null);
    setDeleteError(null);
    setIsDeleting(false);
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

  async function handleConfirmDelete() {
    if (!pendingDeleteGame || isDeleting) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteGame(pendingDeleteGame.id);

      const remainingGames = (games ?? []).filter((game) => game.id !== pendingDeleteGame.id);
      setGames(remainingGames);
      setExpandedGameId((current) => current === pendingDeleteGame.id ? null : current);

      if (pendingDeleteGame.id === currentGameId) {
        onDeleteCurrentGame(remainingGames[0] ?? null);
        handleClose();
        return;
      }

      setPendingDeleteGame(null);
      setIsDeleting(false);
    } catch (error) {
      setDeleteError(getErrorMessage(error));
      setIsDeleting(false);
    }
  }

  const filteredGames = (games ?? []).filter((game) =>
    game.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      onKeyDown={(e) => {
        if (e.key === "Escape") handleClose();
      }}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-switcher-title"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {showWizard ? (
          <CreateWizard
            userId={userId}
            onBack={() => setShowWizard(false)}
            onDone={(id, name) => {
              onSelectGame(id, name, "");
              handleClose();
              onGameCreated?.();
            }}
          />
        ) : (
            <>
              <div className="border-b border-neutral-200 px-5 py-4">
                <div className="flex items-center justify-between">
                <div id="game-switcher-title" className="text-sm font-semibold text-neutral-900">Your games</div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-600"
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
                  placeholder="Search games..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 focus:bg-white"
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {games === null ? (
                <div className="px-3 py-6 text-center text-sm text-neutral-500">Loading...</div>
              ) : filteredGames.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-neutral-500">
                  {query ? "No games match your search" : "No games yet - create one below"}
                </div>
              ) : (
                filteredGames.map((game) => {
                  const isCurrent = game.id === currentGameId;
                  const isExpanded = expandedGameId === game.id;
                  const gameIconUrl = getGameIconUrl(game.gameIcon);
                  const gameIconFallback = getGameIconFallback(game.title);

                  return (
                    <div key={game.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setExpandedGameId(isExpanded ? null : game.id);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                          isExpanded
                            ? "bg-[#1e3a8a] text-white"
                            : isCurrent
                            ? "bg-neutral-50 ring-1 ring-neutral-200 hover:bg-neutral-100"
                            : "hover:bg-neutral-50"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold ${
                            isExpanded ? "bg-white/15 text-white" : "bg-[#1e3a8a] text-white"
                          }`}
                        >
                          {gameIconUrl ? (
                            <img
                              src={gameIconUrl}
                              alt={`${game.title} icon`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            gameIconFallback
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`truncate text-sm font-medium ${
                                isExpanded ? "text-white" : "text-neutral-900"
                              }`}
                            >
                              {game.title}
                            </span>
                            {isCurrent && !isExpanded && (
                              <span className="shrink-0 rounded-full bg-[#3B82F6] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
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

                      {isExpanded && (
                        <div className="mx-1 mb-1 overflow-hidden rounded-b-xl border border-t-0 border-neutral-200 bg-neutral-50">
                          <button
                            type="button"
                            onClick={() => handleEditRules(game)}
                            className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 group-hover:border-neutral-300">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M2 10.5V12h1.5l6-6L8 4.5l-6 6zM12.5 3.5a1 1 0 000-1.414l-.586-.586a1 1 0 00-1.414 0L9.086 2.914 11.5 5.328 12.5 4.5z" fill="currentColor" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-neutral-900">Edit rules</div>
                              <div className="text-xs text-neutral-500">Open this game in the editor</div>
                            </div>
                          </button>

                          <div className="mx-4 border-t border-neutral-200" />

                          <button
                            type="button"
                            onClick={() => handleViewAnalytics(game)}
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
                              <div className="text-xs text-neutral-500">Sessions, hotspot performance, devices</div>
                            </div>
                          </button>

                          <div className="mx-4 border-t border-neutral-200" />

                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setPendingDeleteGame(game);
                            }}
                            className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-500 group-hover:border-red-300">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M3 4h8M5.5 4V3a1 1 0 011-1h1a1 1 0 011 1v1M5 6.5v3M9 6.5v3M4 4l.5 6.25A1 1 0 005.5 11h3a1 1 0 001-.75L10 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-red-600">Delete game</div>
                              <div className="text-xs text-neutral-500">Delete all cards and content. This cannot be undone.</div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

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

      <ConfirmGameDeleteModal
        isOpen={!!pendingDeleteGame}
        gameTitle={pendingDeleteGame?.title ?? ""}
        isCurrentGame={pendingDeleteGame?.id === currentGameId}
        isDeleting={isDeleting}
        error={deleteError}
        onCancel={() => {
          if (isDeleting) return;
          setPendingDeleteGame(null);
          setDeleteError(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
