"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/_lib/api-fetch";

// ── Types ─────────────────────────────────────────────────────────

type OverviewData = {
  sessions: number;
  avgDurationSeconds: number;
  sessionsDelta: number | null;
  avgDurationDelta: number | null;
};

type SessionsData = { date: string; sessions: number }[];

type HotspotData = {
  title: string;
  clicks: number;
  avgDurationSeconds: number;
  pct: number;
}[];

type DeviceData = { device: string; label: string; sessions: number; pct: number; color: string }[];

type PathData = { path: string; sessions: number; pct: number }[];

type BoardData = {
  heroImage: string;
  hotspots: { id: string; title: string; x: number; y: number }[];
};

// ── Utilities ─────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getRangeParams(from: Date, to: Date): { from: string; to: string; compareFrom: string; compareTo: string } {
  const days = Math.round((to.getTime() - from.getTime()) / 86400000);
  const compareFrom = addDays(from, -days);
  const compareTo = from;
  return {
    from: formatDate(from),
    to: formatDate(addDays(to, 1)), // exclusive upper bound — include all events on the `to` day
    compareFrom: formatDate(compareFrom),
    compareTo: formatDate(compareTo),
  };
}

// ── Charts ────────────────────────────────────────────────────────

function LineChart({ data, color = "#0ea5e9" }: { data: number[]; color?: string }) {
  const W = 600;
  const H = 80;
  const pad = { top: 8, bottom: 4, left: 0, right: 0 };
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = pad.left + (i / Math.max(data.length - 1, 1)) * (W - pad.left - pad.right);
    const y = pad.top + (1 - v / max) * (H - pad.top - pad.bottom);
    return [x, y] as [number, number];
  });
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area =
    pts.length > 0
      ? `M${pts[0][0]},${H} ` + pts.map(([x, y]) => `L${x},${y}`).join(" ") + ` L${pts[pts.length - 1][0]},${H} Z`
      : "";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={area} fill="url(#chartGrad)" />}
      {pts.length > 1 && (
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )}
    </svg>
  );
}

function DonutChart({ segments }: { segments: { label: string; pct: number; color: string }[] }) {
  const R = 36;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="h-20 w-20" aria-hidden="true">
      {segments.map((s) => {
        const dash = (s.pct / 100) * C;
        const gap = C - dash;
        const el = (
          <circle key={s.label} cx="50" cy="50" r={R} fill="none" stroke={s.color} strokeWidth="18"
            strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset} transform="rotate(-90 50 50)" />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

// ── Stat card ─────────────────────────────────────────────────────

function StatCard({
  label, value, delta, sub,
}: {
  label: string;
  value: string;
  delta?: number | null;
  sub?: string;
}) {
  const trendColor = !delta ? "text-neutral-500" : delta > 0 ? "text-emerald-600" : "text-red-500";
  const trendIcon = !delta ? null : delta > 0 ? "↑" : "↓";
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <div className="text-2xl font-bold text-neutral-900">{value}</div>
        {trendIcon && delta != null && (
          <span className={`text-sm font-semibold ${trendColor}`}>
            {trendIcon} {Math.abs(delta as number)}%
          </span>
        )}
      </div>
      {sub && <div className="mt-0.5 text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 animate-pulse">
      <div className="h-3 w-24 rounded bg-neutral-200" />
      <div className="mt-3 h-7 w-20 rounded bg-neutral-200" />
    </div>
  );
}

// ── Date range picker ─────────────────────────────────────────────

type Preset = "7d" | "30d" | "90d" | "custom";

function DateRangePicker({
  from, to, onChange,
}: {
  from: Date;
  to: Date;
  onChange: (from: Date, to: Date) => void;
}) {
  const [preset, setPreset] = useState<Preset>("30d");
  const [customFrom, setCustomFrom] = useState(formatDate(from));
  const [customTo, setCustomTo] = useState(formatDate(to));

  function applyPreset(p: "7d" | "30d" | "90d") {
    const today = new Date();
    const days = p === "7d" ? 7 : p === "30d" ? 30 : 90;
    const newFrom = addDays(today, -days);
    setPreset(p);
    onChange(newFrom, today);
  }

  function applyCustom() {
    // Parse as local noon to avoid timezone-offset shifting the date to the previous day
    const f = new Date(`${customFrom}T12:00:00`);
    const t = new Date(`${customTo}T12:00:00`);
    if (!isNaN(f.getTime()) && !isNaN(t.getTime()) && f < t) {
      setPreset("custom");
      onChange(f, t);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center rounded-xl border border-neutral-200 bg-neutral-100 p-0.5">
        {(["7d", "30d", "90d"] as const).map((p) => (
          <button key={p} type="button" onClick={() => applyPreset(p)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${preset === p ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}>
            {p}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={customFrom}
          onChange={(e) => setCustomFrom(e.target.value)}
          className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs text-neutral-700 outline-none focus:border-sky-400"
        />
        <span className="text-xs text-neutral-500">→</span>
        <input
          type="date"
          value={customTo}
          onChange={(e) => setCustomTo(e.target.value)}
          className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs text-neutral-700 outline-none focus:border-sky-400"
        />
        <button
          type="button"
          onClick={applyCustom}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

// ── Heatmap ───────────────────────────────────────────────────────

function dotColor(pctOfMax: number): string {
  if (pctOfMax < 34) return "#3b82f6";
  if (pctOfMax < 67) return "#eab308";
  return "#ef4444";
}

function HeatmapOverlay({
  boardData,
  hotspots,
}: {
  boardData: BoardData | null;
  hotspots: HotspotData | null;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!boardData) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="aspect-video w-full animate-pulse bg-neutral-100" />
          <div className="h-12 border-t border-neutral-100" />
        </div>
      </div>
    );
  }

  const analyticsRows = hotspots ?? [];
  const totalClicks = analyticsRows.reduce((sum, h) => sum + h.clicks, 0);
  const maxClicks = analyticsRows.reduce((m, h) => Math.max(m, h.clicks), 1);

  // Join by title — PostHog captures hotspotTitle from page.title, so they always match
  const joined = (boardData.hotspots ?? []).map((bh) => {
    const analytics = analyticsRows.find((h) => h.title === bh.title);
    const clicks = analytics?.clicks ?? 0;
    const avgDurationSeconds = analytics?.avgDurationSeconds ?? 0;
    const pctOfTotal = totalClicks > 0 ? Math.round((clicks / totalClicks) * 100) : 0;
    const pctOfMax = Math.round((clicks / maxClicks) * 100);
    return { ...bh, clicks, avgDurationSeconds, pctOfTotal, pctOfMax };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {/* Board */}
        <div className="relative aspect-video w-full bg-neutral-900">
          {boardData.heroImage && (
            <img
              src={boardData.heroImage}
              alt="Board"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {joined.map((h) => {
            const isZero = h.clicks === 0;
            const diameter = isZero ? 14 : Math.round(14 + (h.pctOfMax / 100) * 42);
            const color = isZero ? "rgba(156,163,175,0.5)" : dotColor(h.pctOfMax);
            const isHovered = hoveredId === h.id;
            return (
              <div
                key={h.id}
                className="absolute"
                style={{ left: `${h.x}%`, top: `${h.y}%`, transform: "translate(-50%, -50%)" }}
                onMouseEnter={() => setHoveredId(h.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div
                  className="rounded-full transition-all"
                  style={{
                    width: diameter,
                    height: diameter,
                    background: color,
                    border: isZero ? "1.5px solid rgba(156,163,175,0.6)" : "none",
                    boxShadow: !isZero && isHovered ? `0 0 0 3px ${color}40` : "none",
                    opacity: isZero ? 1 : 0.85,
                  }}
                />
                {isHovered && (
                  <div
                    className="pointer-events-none absolute z-20 whitespace-nowrap rounded-xl border border-neutral-100 bg-white px-3 py-2 shadow-xl"
                    style={
                      h.y < 20
                        ? { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
                        : { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
                    }
                  >
                    <div className="text-xs font-semibold text-neutral-900">{h.title}</div>
                    <div className="mt-0.5 text-xs text-neutral-500">
                      {h.clicks.toLocaleString()} clicks
                      {totalClicks > 0 && ` · ${h.pctOfTotal}% of total`}
                      {h.avgDurationSeconds > 0 && ` · ${formatDuration(h.avgDurationSeconds)} avg`}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 border-t border-neutral-100 px-5 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-neutral-500">
            Click density
          </span>
          {([
            { color: "#3b82f6", label: "Low" },
            { color: "#eab308", label: "Medium" },
            { color: "#ef4444", label: "High" },
          ] as const).map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, opacity: 0.85 }} />
              <span className="text-[10px] text-neutral-500">{label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: "rgba(156,163,175,0.5)", border: "1px solid rgba(156,163,175,0.6)" }}
            />
            <span className="text-[10px] text-neutral-500">No clicks</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────

function AnalyticsDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const gameId = searchParams.get("game") ?? "";
  const gameName = searchParams.get("name") ?? "Untitled";
  const studio = searchParams.get("studio") ?? "";

  const today = new Date();
  const [from, setFrom] = useState(() => addDays(today, -30));
  const [to, setTo] = useState(() => today);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [sessions, setSessions] = useState<SessionsData | null>(null);
  const [hotspots, setHotspots] = useState<HotspotData | null>(null);
  const [devices, setDevices] = useState<DeviceData | null>(null);
  const [paths, setPaths] = useState<PathData | null>(null);
  const [exitCards, setExitCards] = useState<{ title: string; exits: number }[] | null>(null);
  const [searchTerms, setSearchTerms] = useState<{ query: string; count: number }[] | null>(null);
  const [peakUsage, setPeakUsage] = useState<{ hour: number; sessions: number }[] | null>(null);
  const [languages, setLanguages] = useState<{ code: string; switches: number }[] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "heatmap">("overview");
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const boardFetchedRef = useRef(false);

  // Reset board cache when the game changes
  useEffect(() => {
    boardFetchedRef.current = false;
    setBoardData(null);
    setActiveTab("overview");
  }, [gameId]);

  const fetchAll = useCallback(async () => {
    if (!gameId) return;
    const { from: f, to: t, compareFrom, compareTo } = getRangeParams(from, to);
    const base = `/api/analytics`;
    const qs = `gameId=${gameId}&from=${f}&to=${t}`;
    const overviewQs = `${qs}&compareFrom=${compareFrom}&compareTo=${compareTo}`;

    setOverview(null);
    setSessions(null);
    setHotspots(null);
    setDevices(null);
    setPaths(null);
    setExitCards(null);
    setSearchTerms(null);
    setPeakUsage(null);
    setLanguages(null);

    const [ov, sess, hot, dev, path, exit, search, peak, lang] = await Promise.allSettled([
      apiFetch(`${base}/overview?${overviewQs}`).then((r) => r.json()),
      apiFetch(`${base}/sessions?${qs}`).then((r) => r.json()),
      apiFetch(`${base}/hotspots?${qs}`).then((r) => r.json()),
      apiFetch(`${base}/devices?${qs}`).then((r) => r.json()),
      apiFetch(`${base}/paths?${qs}`).then((r) => r.json()),
      apiFetch(`${base}/exit-cards?${qs}`).then((r) => r.json()),
      apiFetch(`${base}/search-terms?${qs}`).then((r) => r.json()),
      apiFetch(`${base}/peak-usage?${qs}`).then((r) => r.json()),
      apiFetch(`${base}/languages?${qs}`).then((r) => r.json()),
    ]);

    if (ov.status === "fulfilled") setOverview(ov.value);
    if (sess.status === "fulfilled") setSessions(sess.value);
    if (hot.status === "fulfilled") setHotspots(hot.value);
    if (dev.status === "fulfilled") setDevices(dev.value);
    if (path.status === "fulfilled") setPaths(path.value);
    if (exit.status === "fulfilled") setExitCards(exit.value);
    if (search.status === "fulfilled") setSearchTerms(search.value);
    if (peak.status === "fulfilled") setPeakUsage(peak.value);
    if (lang.status === "fulfilled") setLanguages(lang.value);
  }, [gameId, from, to]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleExport() {
    setExporting(true);
    try {
      const f = formatDate(from);
      const t = formatDate(to);
      const res = await apiFetch(`/api/analytics/export?gameId=${gameId}&from=${f}&to=${t}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sherpa-analytics-${gameId}-${f}-${t}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function handleTabChange(tab: "overview" | "heatmap") {
    setActiveTab(tab);
    if (tab === "heatmap" && !boardFetchedRef.current && gameId) {
      boardFetchedRef.current = true;
      apiFetch(`/api/analytics/board?gameId=${gameId}`)
        .then((r) => r.json())
        .then(setBoardData)
        .catch(() => {
          boardFetchedRef.current = false; // allow retry on next tab switch
        });
    }
  }

  const sessionCounts = sessions?.map((s) => s.sessions) ?? [];
  const totalSessions = sessionCounts.reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-white transition"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M8 2L3 6.5 8 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Editor
            </button>
            <div className="h-5 w-px bg-neutral-200" />
            <div>
              {studio && <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">{studio}</div>}
              <div className="text-base font-semibold text-neutral-900">{gameName}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-50"
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex" role="tablist" aria-label="Analytics views">
            {(["overview", "heatmap"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => handleTabChange(tab)}
                className={`px-4 py-3 text-sm capitalize transition border-b-2 ${
                  activeTab === tab
                    ? "border-neutral-900 text-neutral-900 font-semibold"
                    : "border-transparent text-neutral-500 font-medium hover:text-neutral-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {overview ? (
            <>
              <StatCard
                label="Sessions"
                value={overview.sessions.toLocaleString()}
                delta={overview.sessionsDelta}
                sub="vs prev period"
              />
              <StatCard
                label="Unique sessions"
                value={overview.sessions.toLocaleString()}
                sub="distinct page loads"
              />
              <StatCard
                label="Avg session"
                value={formatDuration(overview.avgDurationSeconds)}
                delta={overview.avgDurationDelta}
                sub="per visit"
              />
            </>
          ) : (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}
        </div>

        {/* Sessions over time */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-1 text-sm font-semibold text-neutral-900">Sessions over time</div>
          <div className="mb-4 text-xs text-neutral-500">
            {sessions ? `${totalSessions.toLocaleString()} total in range` : "Loading…"}
          </div>
          {sessions ? (
            <>
              <LineChart data={sessionCounts} color="#0ea5e9" />
              <div className="mt-2 flex justify-between text-[10px] text-neutral-300">
                <span>{sessions[0]?.date ?? ""}</span>
                <span>{sessions[sessions.length - 1]?.date ?? ""}</span>
              </div>
            </>
          ) : (
            <div className="h-20 animate-pulse rounded-xl bg-neutral-100" />
          )}
        </div>

        {/* Hotspot performance + Device breakdown */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="mb-1 text-sm font-semibold text-neutral-900">Hotspot performance</div>
            <div className="mb-4 text-xs text-neutral-500">Ranked by total clicks</div>
            {hotspots ? (
              <div className="space-y-3">
                {hotspots.map((h, i) => (
                  <div key={h.title}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 text-xs font-semibold text-neutral-300">#{i + 1}</span>
                        <span className="truncate text-sm font-medium text-neutral-800">{h.title}</span>
                      </div>
                      <div className="shrink-0 flex items-center gap-3 text-xs text-neutral-500">
                        <span className="font-semibold text-neutral-700">{h.clicks.toLocaleString()}</span>
                        <span>{formatDuration(h.avgDurationSeconds)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-neutral-100">
                      <div className="h-1.5 rounded-full bg-sky-400 transition-all" style={{ width: `${h.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 animate-pulse rounded-xl bg-neutral-100" />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="mb-1 text-sm font-semibold text-neutral-900">Device breakdown</div>
              <div className="mb-3 text-xs text-neutral-500">How players access the experience</div>
              {devices ? (
                <div className="flex items-center gap-5">
                  <DonutChart segments={devices} />
                  <div className="space-y-2">
                    {devices.map((d) => (
                      <div key={d.device} className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-neutral-600">{d.label}</span>
                        <span className="ml-auto pl-3 text-xs font-semibold text-neutral-800">{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-20 animate-pulse rounded-xl bg-neutral-100" />
              )}
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="mb-1 text-sm font-semibold text-neutral-900">Top navigation paths</div>
              <div className="mb-3 text-xs text-neutral-500">Most common 2-step journeys</div>
              {paths ? (
                <div className="space-y-2">
                  {paths.map((p) => (
                    <div key={p.path} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs text-neutral-700">{p.path}</div>
                        <div className="mt-1 h-1 w-full rounded-full bg-neutral-100">
                          <div className="h-1 rounded-full bg-violet-400" style={{ width: `${p.pct}%` }} />
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-neutral-500">{p.pct}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-6 animate-pulse rounded-lg bg-neutral-100" />)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Exit cards + Search terms */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="mb-1 text-sm font-semibold text-neutral-900">Exit cards</div>
            <div className="mb-4 text-xs text-neutral-500">
              Last card players viewed before leaving — high exits with short dwell time may indicate confusion
            </div>
            {exitCards ? (
              exitCards.length > 0 ? (
                <div className="space-y-3">
                  {exitCards.map((c, i) => (
                    <div key={c.title} className="flex items-center gap-3">
                      <span className="shrink-0 text-xs font-semibold text-neutral-300">#{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-neutral-800">{c.title}</span>
                      <span className="shrink-0 text-sm font-semibold text-neutral-700">{c.exits.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500">No data yet for this range.</p>
              )
            ) : (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-6 animate-pulse rounded-lg bg-neutral-100" />)}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="mb-1 text-sm font-semibold text-neutral-900">Search terms</div>
            <div className="mb-4 text-xs text-neutral-500">
              What players are searching for — high-frequency terms that don't match a hotspot name suggest a labelling gap
            </div>
            {searchTerms ? (
              searchTerms.length > 0 ? (
                <div className="space-y-2">
                  {searchTerms.map((s) => (
                    <div key={s.query} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate text-sm text-neutral-700">{s.query}</span>
                      <span className="shrink-0 text-xs font-semibold text-neutral-500">{s.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500">No search events recorded yet.</p>
              )
            ) : (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-6 animate-pulse rounded-lg bg-neutral-100" />)}
              </div>
            )}
          </div>
        </div>

        {/* Peak usage + Language distribution */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="mb-1 text-sm font-semibold text-neutral-900">Peak usage</div>
            <div className="mb-4 text-xs text-neutral-500">Sessions by hour of day (UTC)</div>
            {peakUsage ? (
              <div className="flex items-end gap-0.5 h-20">
                {peakUsage.map(({ hour, sessions: s }) => {
                  const max = Math.max(...peakUsage.map((p) => p.sessions), 1);
                  const height = Math.round((s / max) * 100);
                  return (
                    <div key={hour} className="group relative flex-1 flex flex-col items-center justify-end h-full">
                      <div
                        className="w-full rounded-sm bg-sky-400 transition-all"
                        style={{ height: `${height}%` }}
                      />
                      {hour % 6 === 0 && (
                        <div className="absolute -bottom-4 text-[10px] text-neutral-500">{hour}:00</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-20 animate-pulse rounded-xl bg-neutral-100" />
            )}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="mb-1 text-sm font-semibold text-neutral-900">Language distribution</div>
            <div className="mb-4 text-xs text-neutral-500">Language switches by players</div>
            {languages ? (
              languages.length > 0 ? (
                <div className="space-y-2">
                  {languages.map((l) => (
                    <div key={l.code} className="flex items-center gap-3">
                      <span className="w-10 shrink-0 text-xs font-semibold text-neutral-500 uppercase">{l.code}</span>
                      <div className="min-w-0 flex-1 h-2 rounded-full bg-neutral-100">
                        <div
                          className="h-2 rounded-full bg-indigo-400"
                          style={{
                            width: `${Math.round((l.switches / (languages[0]?.switches || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="shrink-0 text-xs text-neutral-500">{l.switches.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500">No language switches recorded yet.</p>
              )
            ) : (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-6 animate-pulse rounded-lg bg-neutral-100" />)}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
      {activeTab === "heatmap" && (
        <HeatmapOverlay boardData={boardData} hotspots={hotspots} />
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense>
      <AnalyticsDashboard />
    </Suspense>
  );
}
