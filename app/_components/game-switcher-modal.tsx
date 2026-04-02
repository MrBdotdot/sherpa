"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "admin" | "editor" | "viewer";

type GameEntry = {
  id: string;
  name: string;
  status: "live" | "draft" | "archived";
  role: Role;
  studio: string;
};

type StudioEntry = {
  id: string;
  name: string;
  games: GameEntry[];
};

const MOCK_STUDIOS: StudioEntry[] = [
  {
    id: "studio-1",
    name: "Bee Studio",
    games: [
      { id: "game-1", name: "Ugly Pickle", status: "live", role: "admin", studio: "Bee Studio" },
      { id: "game-2", name: "War Draft", status: "draft", role: "admin", studio: "Bee Studio" },
      { id: "game-3", name: "Food Frenzy", status: "draft", role: "admin", studio: "Bee Studio" },
    ],
  },
  {
    id: "studio-2",
    name: "Infinite Doors",
    games: [
      { id: "game-4", name: "DeSync", status: "live", role: "editor", studio: "Infinite Doors" },
    ],
  },
];

const STATUS_CLASSES: Record<GameEntry["status"], string> = {
  live: "bg-emerald-100 text-emerald-800",
  draft: "bg-amber-100 text-amber-800",
  archived: "bg-neutral-100 text-neutral-500",
};

const ROLE_CLASSES: Record<Role, string> = {
  admin: "bg-violet-100 text-violet-700",
  editor: "bg-sky-100 text-sky-700",
  viewer: "bg-neutral-100 text-neutral-500",
};

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Can invite, edit, and publish" },
  { value: "editor", label: "Editor", description: "Can create and edit content" },
  { value: "viewer", label: "Viewer", description: "Can review but not edit" },
];

// ── Creation wizard ───────────────────────────────────────────────

type WizardStep = "publisher" | "permissions";
type NewGameDraft = {
  name: string;
  publisherId: string;
  publisherName: string;
  collaborators: { email: string; role: Role }[];
};

function CreateWizard({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [wizardStep, setWizardStep] = useState<WizardStep>("publisher");
  const [draft, setDraft] = useState<NewGameDraft>({ name: "", publisherId: "", publisherName: "", collaborators: [] });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("editor");

  function selectPublisher(studio: StudioEntry) {
    setDraft((d) => ({ ...d, publisherId: studio.id, publisherName: studio.name }));
    setWizardStep("permissions");
  }

  function addCollaborator() {
    if (!inviteEmail.trim()) return;
    setDraft((d) => ({ ...d, collaborators: [...d.collaborators, { email: inviteEmail.trim(), role: inviteRole }] }));
    setInviteEmail("");
    setInviteRole("editor");
  }

  function removeCollaborator(email: string) {
    setDraft((d) => ({ ...d, collaborators: d.collaborators.filter((c) => c.email !== email) }));
  }

  const canFinish = draft.name.trim().length > 0 && draft.publisherId !== "";

  return (
    <div>
      <div className="border-b border-neutral-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onBack} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600" aria-label="Back">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="text-sm font-semibold text-neutral-900">New board game rules</div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {(["publisher", "permissions"] as WizardStep[]).map((s, i) => {
            const done = i < (wizardStep === "permissions" ? 1 : 0);
            const active = wizardStep === s;
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="h-px w-6 bg-neutral-200" />}
                <div className={`flex items-center gap-1.5 text-xs font-medium ${active ? "text-neutral-900" : done ? "text-neutral-400" : "text-neutral-300"}`}>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${active ? "bg-neutral-900 text-white" : done ? "bg-emerald-500 text-white" : "bg-neutral-100 text-neutral-400"}`}>
                    {done ? <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2.5 2.5L7 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> : i + 1}
                  </span>
                  {s === "publisher" ? "Publisher" : "Permissions"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {wizardStep === "publisher" && (
        <div>
          <div className="px-5 pt-4 pb-2">
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">Rules experience name</label>
            <input type="text" placeholder="e.g. Catan — How to Play" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white" autoFocus />
          </div>
          <div className="px-5 pb-2"><div className="mb-2 text-xs font-medium text-neutral-500">Select publisher</div></div>
          <div className="max-h-52 overflow-y-auto px-2 pb-2">
            {MOCK_STUDIOS.map((studio) => (
              <button key={studio.id} type="button" onClick={() => draft.name.trim() && selectPublisher(studio)} disabled={!draft.name.trim()}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${draft.name.trim() ? draft.publisherId === studio.id ? "bg-neutral-900 text-white" : "hover:bg-neutral-50" : "cursor-not-allowed opacity-40"}`}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${draft.publisherId === studio.id ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-500"}`}>{studio.name[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${draft.publisherId === studio.id ? "text-white" : "text-neutral-900"}`}>{studio.name}</div>
                  <div className={`text-xs ${draft.publisherId === studio.id ? "text-white/60" : "text-neutral-400"}`}>{studio.games.length} game{studio.games.length !== 1 ? "s" : ""}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-neutral-100 px-5 py-3">
            <p className="text-xs text-neutral-400">Enter a name above to enable publisher selection.</p>
          </div>
        </div>
      )}

      {wizardStep === "permissions" && (
        <div>
          <div className="border-b border-neutral-100 px-5 py-3">
            <div className="text-xs text-neutral-500">Creating <span className="font-semibold text-neutral-800">{draft.name}</span> under <span className="font-semibold text-neutral-800">{draft.publisherName}</span></div>
          </div>
          <div className="px-5 pt-4 pb-2">
            <div className="mb-3 text-xs font-medium text-neutral-500">Invite collaborators <span className="font-normal text-neutral-400">(optional)</span></div>
            <div className="flex gap-2">
              <input type="email" placeholder="Email address" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCollaborator(); }}
                className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white" autoFocus />
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)} className="rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm text-neutral-700 outline-none focus:border-neutral-400">
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button type="button" onClick={addCollaborator} disabled={!inviteEmail.trim()} className="shrink-0 rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40">Add</button>
            </div>
            <div className="mt-2 space-y-1">
              {ROLE_OPTIONS.map((r) => (
                <div key={r.value} className="flex items-center gap-2 text-[11px] text-neutral-400">
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${ROLE_CLASSES[r.value]}`}>{r.label}</span>
                  {r.description}
                </div>
              ))}
            </div>
          </div>
          {draft.collaborators.length > 0 && (
            <div className="px-5 pb-3">
              <div className="space-y-1.5 rounded-xl border border-neutral-200 p-2">
                {draft.collaborators.map((c) => (
                  <div key={c.email} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                    <div className="min-w-0 flex-1 truncate text-sm text-neutral-700">{c.email}</div>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${ROLE_CLASSES[c.role]}`}>{c.role}</span>
                    <button type="button" onClick={() => removeCollaborator(c.email)} className="shrink-0 text-neutral-300 hover:text-red-400">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="border-t border-neutral-100 px-5 py-3 flex items-center justify-between">
            <button type="button" onClick={() => setWizardStep("publisher")} className="text-sm text-neutral-400 hover:text-neutral-600">Back</button>
            <button type="button" onClick={onDone} disabled={!canFinish} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40">Create experience</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────

type GameSwitcherModalProps = {
  isOpen: boolean;
  currentGameId?: string;
  onClose: () => void;
  onSelectGame: (gameId: string, gameName: string, studioName: string) => void;
};

export function GameSwitcherModal({ isOpen, currentGameId, onClose, onSelectGame }: GameSwitcherModalProps) {
  const router = useRouter();
  const [selectedStudio, setSelectedStudio] = useState<StudioEntry | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showWizard, setShowWizard] = useState(false);

  if (!isOpen) return null;

  function reset() {
    setSelectedStudio(null);
    setExpandedGameId(null);
    setQuery("");
    setShowWizard(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function selectStudio(s: StudioEntry) {
    setSelectedStudio(s);
    setExpandedGameId(null);
    setQuery("");
  }

  function handleEditRules(game: GameEntry) {
    onSelectGame(game.id, game.name, game.studio);
    handleClose();
  }

  function handleViewAnalytics(game: GameEntry) {
    handleClose();
    router.push(`/analytics?game=${game.id}&name=${encodeURIComponent(game.name)}&studio=${encodeURIComponent(game.studio)}`);
  }

  const step = selectedStudio ? "game" : "studio";

  const breadcrumbs = [
    { label: "All studios", active: step === "studio", onClick: () => { setSelectedStudio(null); setExpandedGameId(null); setQuery(""); } },
    ...(selectedStudio ? [{ label: selectedStudio.name, active: step === "game", onClick: () => {} }] : []),
  ];

  const filteredStudios = MOCK_STUDIOS.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));
  const filteredGames = (selectedStudio?.games ?? []).filter((g) => g.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {showWizard ? (
          <CreateWizard onBack={() => setShowWizard(false)} onDone={handleClose} />
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-neutral-200 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-neutral-900">Switch workspace</div>
                <button type="button" onClick={handleClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600" aria-label="Close">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-neutral-500">
                {breadcrumbs.map((crumb, i) => (
                  <span key={crumb.label} className="flex items-center gap-1">
                    {i > 0 && <span className="text-neutral-300">/</span>}
                    <button type="button" onClick={crumb.onClick} className={`rounded px-1 py-0.5 transition ${crumb.active ? "font-semibold text-neutral-900" : "hover:text-neutral-700"}`}>{crumb.label}</button>
                  </span>
                ))}
              </div>
              <div className="mt-3">
                <input type="search" placeholder={step === "game" ? "Search games…" : "Search studios…"} value={query} onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white" autoFocus />
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto p-2">
              {step === "studio" && (
                filteredStudios.length === 0
                  ? <div className="px-3 py-6 text-center text-sm text-neutral-400">No studios found</div>
                  : filteredStudios.map((s) => (
                    <button key={s.id} type="button" onClick={() => selectStudio(s)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-neutral-50">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-500">{s.name[0]}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-neutral-900">{s.name}</div>
                        <div className="text-xs text-neutral-400">{s.games.length} game{s.games.length !== 1 ? "s" : ""}</div>
                      </div>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 text-neutral-300">
                        <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  ))
              )}

              {step === "game" && (
                filteredGames.length === 0
                  ? <div className="px-3 py-6 text-center text-sm text-neutral-400">No games found</div>
                  : filteredGames.map((g) => {
                    const isCurrent = g.id === currentGameId;
                    const isExpanded = expandedGameId === g.id;
                    return (
                      <div key={g.id}>
                        {/* Game row */}
                        <button type="button" onClick={() => setExpandedGameId(isExpanded ? null : g.id)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${isExpanded ? "bg-neutral-900 text-white" : isCurrent ? "bg-neutral-50 ring-1 ring-neutral-200 hover:bg-neutral-100" : "hover:bg-neutral-50"}`}>
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${isExpanded ? "bg-white/15 text-white" : "bg-neutral-900 text-white"}`}>{g.name[0]}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`truncate text-sm font-medium ${isExpanded ? "text-white" : "text-neutral-900"}`}>{g.name}</span>
                              {isCurrent && !isExpanded && (
                                <span className="shrink-0 rounded-full bg-neutral-900 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">Current</span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${isExpanded ? "bg-white/20 text-white" : STATUS_CLASSES[g.status]}`}>{g.status}</span>
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${isExpanded ? "bg-white/20 text-white" : ROLE_CLASSES[g.role]}`}>{g.role}</span>
                            </div>
                          </div>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 transition-transform ${isExpanded ? "rotate-180 text-white/60" : "text-neutral-300"}`}>
                            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        {/* Expanded action panel */}
                        {isExpanded && (
                          <div className="mx-1 mb-1 overflow-hidden rounded-b-xl border border-t-0 border-neutral-200 bg-neutral-50">
                            <button type="button" onClick={() => handleEditRules(g)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white transition group">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 group-hover:border-neutral-300">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 10.5V12h1.5l6-6L8 4.5l-6 6zM12.5 3.5a1 1 0 000-1.414l-.586-.586a1 1 0 00-1.414 0L9.086 2.914 11.5 5.328 12.5 4.5z" fill="currentColor" /></svg>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-neutral-900">Edit rules</div>
                                <div className="text-xs text-neutral-400">Open the authoring studio</div>
                              </div>
                            </button>
                            <div className="mx-4 border-t border-neutral-200" />
                            <button type="button" onClick={() => handleViewAnalytics(g)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white transition group">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 group-hover:border-neutral-300">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="8" width="2.5" height="4" rx="0.75" fill="currentColor" /><rect x="5.25" y="5" width="2.5" height="7" rx="0.75" fill="currentColor" /><rect x="9.5" y="2" width="2.5" height="10" rx="0.75" fill="currentColor" /></svg>
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
              <button type="button" onClick={() => setShowWizard(true)} className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                Create new board game rules
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
