"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";

// ── Mock data generation ──────────────────────────────────────────

function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return Math.abs(s) / 0xffffffff; };
}

function generateSessions(days: number, baseSeed: number): number[] {
  const rand = seeded(baseSeed);
  const base = 40 + rand() * 30;
  return Array.from({ length: days }, (_, i) => {
    const trend = 1 + i * 0.004;
    const weekend = [0, 6].includes(i % 7) ? 1.4 : 1;
    const noise = 0.7 + rand() * 0.6;
    return Math.round(base * trend * weekend * noise);
  });
}

type GameData = {
  totalSessions: number;
  avgDuration: string;
  uniquePlayers: number;
  returnRate: number;
  hotspots: { name: string; clicks: number; avgTime: string; pct: number }[];
  devices: { label: string; pct: number; color: string }[];
  paths: { path: string; pct: number }[];
  heatmap: { label: string; x: number; y: number; intensity: number }[];
};

const GAME_DATA: Record<string, GameData> = {
  "game-1": {
    totalSessions: 1284, avgDuration: "4m 32s", uniquePlayers: 891, returnRate: 31,
    hotspots: [
      { name: "Combat Phase", clicks: 487, avgTime: "3m 12s", pct: 100 },
      { name: "Setup", clicks: 391, avgTime: "2m 45s", pct: 80 },
      { name: "Scoring", clicks: 298, avgTime: "1m 58s", pct: 61 },
      { name: "Special Abilities", clicks: 201, avgTime: "4m 01s", pct: 41 },
      { name: "FAQ", clicks: 143, avgTime: "0m 45s", pct: 29 },
    ],
    devices: [
      { label: "Desktop", pct: 58, color: "#0ea5e9" },
      { label: "Mobile Landscape", pct: 24, color: "#8b5cf6" },
      { label: "Mobile Portrait", pct: 18, color: "#f59e0b" },
    ],
    paths: [
      { path: "Home → Combat → Scoring", pct: 28 },
      { path: "Home → Setup → FAQ", pct: 19 },
      { path: "Home → Special Abilities", pct: 15 },
      { path: "Direct: FAQ", pct: 12 },
      { path: "Home → Combat → Abilities", pct: 9 },
    ],
    heatmap: [
      { label: "Combat Phase", x: 38, y: 42, intensity: 1.0 },
      { label: "Setup", x: 62, y: 28, intensity: 0.8 },
      { label: "Scoring", x: 22, y: 68, intensity: 0.61 },
      { label: "Abilities", x: 74, y: 65, intensity: 0.41 },
      { label: "FAQ", x: 50, y: 18, intensity: 0.29 },
    ],
  },
  "game-2": {
    totalSessions: 312, avgDuration: "2m 18s", uniquePlayers: 248, returnRate: 12,
    hotspots: [
      { name: "Draft Rules", clicks: 198, avgTime: "2m 55s", pct: 100 },
      { name: "Card Types", clicks: 134, avgTime: "1m 42s", pct: 68 },
      { name: "Scoring", clicks: 87, avgTime: "1m 12s", pct: 44 },
    ],
    devices: [{ label: "Desktop", pct: 71, color: "#0ea5e9" }, { label: "Mobile Landscape", pct: 18, color: "#8b5cf6" }, { label: "Mobile Portrait", pct: 11, color: "#f59e0b" }],
    paths: [{ path: "Home → Draft Rules → Scoring", pct: 42 }, { path: "Home → Card Types", pct: 31 }, { path: "Home → Scoring", pct: 18 }],
    heatmap: [{ label: "Draft Rules", x: 45, y: 35, intensity: 1.0 }, { label: "Card Types", x: 65, y: 60, intensity: 0.68 }, { label: "Scoring", x: 28, y: 72, intensity: 0.44 }],
  },
  "game-3": {
    totalSessions: 89, avgDuration: "1m 44s", uniquePlayers: 76, returnRate: 8,
    hotspots: [
      { name: "Food Cards", clicks: 71, avgTime: "2m 01s", pct: 100 },
      { name: "Turn Order", clicks: 43, avgTime: "0m 58s", pct: 61 },
    ],
    devices: [{ label: "Desktop", pct: 44, color: "#0ea5e9" }, { label: "Mobile Landscape", pct: 31, color: "#8b5cf6" }, { label: "Mobile Portrait", pct: 25, color: "#f59e0b" }],
    paths: [{ path: "Home → Food Cards → Turn Order", pct: 55 }, { path: "Home → Food Cards", pct: 32 }],
    heatmap: [{ label: "Food Cards", x: 50, y: 40, intensity: 1.0 }, { label: "Turn Order", x: 30, y: 65, intensity: 0.61 }],
  },
  "game-4": {
    totalSessions: 2841, avgDuration: "6m 14s", uniquePlayers: 1932, returnRate: 44,
    hotspots: [
      { name: "Sync Mechanics", clicks: 1204, avgTime: "5m 32s", pct: 100 },
      { name: "Desynced State", clicks: 987, avgTime: "7m 18s", pct: 82 },
      { name: "Recovery", clicks: 634, avgTime: "3m 44s", pct: 53 },
      { name: "Scoring", clicks: 421, avgTime: "2m 01s", pct: 35 },
      { name: "Setup", clicks: 318, avgTime: "1m 28s", pct: 26 },
      { name: "FAQ", clicks: 201, avgTime: "0m 52s", pct: 17 },
    ],
    devices: [{ label: "Desktop", pct: 49, color: "#0ea5e9" }, { label: "Mobile Landscape", pct: 33, color: "#8b5cf6" }, { label: "Mobile Portrait", pct: 18, color: "#f59e0b" }],
    paths: [{ path: "Home → Sync → Desynced", pct: 34 }, { path: "Home → Setup → Sync", pct: 22 }, { path: "Home → Desynced → Recovery", pct: 18 }, { path: "Direct: FAQ", pct: 11 }],
    heatmap: [
      { label: "Sync", x: 42, y: 38, intensity: 1.0 },
      { label: "Desynced", x: 68, y: 55, intensity: 0.82 },
      { label: "Recovery", x: 25, y: 62, intensity: 0.53 },
      { label: "Scoring", x: 72, y: 28, intensity: 0.35 },
      { label: "Setup", x: 55, y: 75, intensity: 0.26 },
      { label: "FAQ", x: 18, y: 32, intensity: 0.17 },
    ],
  },
};

const FALLBACK_DATA = GAME_DATA["game-1"];

// ── Line chart ────────────────────────────────────────────────────

function LineChart({ data, color = "#0ea5e9" }: { data: number[]; color?: string }) {
  const W = 600;
  const H = 80;
  const pad = { top: 8, bottom: 4, left: 0, right: 0 };
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = pad.left + (i / (data.length - 1)) * (W - pad.left - pad.right);
    const y = pad.top + (1 - v / max) * (H - pad.top - pad.bottom);
    return [x, y] as [number, number];
  });
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `M${pts[0][0]},${H} ` + pts.map(([x, y]) => `L${x},${y}`).join(" ") + ` L${pts[pts.length - 1][0]},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#chartGrad)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Donut chart ───────────────────────────────────────────────────

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

// ── Heatmap ───────────────────────────────────────────────────────

function HeatmapCanvas({ points }: { points: { label: string; x: number; y: number; intensity: number }[] }) {
  function heatColor(intensity: number) {
    if (intensity > 0.8) return { bg: "bg-red-500", ring: "ring-red-300", text: "text-white" };
    if (intensity > 0.6) return { bg: "bg-orange-400", ring: "ring-orange-200", text: "text-white" };
    if (intensity > 0.4) return { bg: "bg-amber-400", ring: "ring-amber-200", text: "text-neutral-900" };
    if (intensity > 0.2) return { bg: "bg-sky-400", ring: "ring-sky-200", text: "text-white" };
    return { bg: "bg-sky-200", ring: "ring-sky-100", text: "text-sky-900" };
  }

  const size = (intensity: number) => intensity > 0.8 ? "h-10 w-10 text-xs" : intensity > 0.5 ? "h-8 w-8 text-[10px]" : "h-6 w-6 text-[9px]";

  return (
    <div className="relative h-52 w-full overflow-hidden rounded-2xl bg-neutral-900">
      {/* Grid lines */}
      <div className="absolute inset-0 opacity-10">
        {[25, 50, 75].map((v) => (
          <div key={`v${v}`} className="absolute top-0 bottom-0 w-px bg-white" style={{ left: `${v}%` }} />
        ))}
        {[33, 66].map((v) => (
          <div key={`h${v}`} className="absolute left-0 right-0 h-px bg-white" style={{ top: `${v}%` }} />
        ))}
      </div>
      {/* Placeholder board label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/10">Game board surface</span>
      </div>
      {/* Heat points */}
      {points.map((p) => {
        const colors = heatColor(p.intensity);
        const sz = size(p.intensity);
        return (
          <div key={p.label} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -50%)" }}>
            {/* Pulse ring */}
            <div className={`absolute inset-0 rounded-full ${colors.bg} opacity-20 scale-150`} />
            <div className={`relative flex ${sz} items-center justify-center rounded-full ${colors.bg} ring-2 ${colors.ring} font-bold ${colors.text} shadow-lg`}>
              {Math.round(p.intensity * 100)}
            </div>
            <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white">
              {p.label}
            </div>
          </div>
        );
      })}
      {/* Legend */}
      <div className="absolute bottom-2 right-3 flex items-center gap-2">
        {[{ label: "Low", color: "bg-sky-300" }, { label: "Mid", color: "bg-amber-400" }, { label: "High", color: "bg-red-500" }].map((l) => (
          <div key={l.label} className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-full ${l.color}`} />
            <span className="text-[9px] text-white/50">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────

function StatCard({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: "up" | "down" | "neutral" }) {
  const trendColor = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-neutral-400";
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : null;
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <div className="text-2xl font-bold text-neutral-900">{value}</div>
        {trendIcon && <span className={`text-sm font-semibold ${trendColor}`}>{trendIcon} {sub}</span>}
      </div>
      {sub && !trend && <div className="mt-0.5 text-xs text-neutral-400">{sub}</div>}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────

type Range = "7d" | "30d" | "90d";

function AnalyticsDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const gameId = searchParams.get("game") ?? "game-1";
  const gameName = searchParams.get("name") ?? "Ugly Pickle";
  const studio = searchParams.get("studio") ?? "Bee Studio";

  const [range, setRange] = useState<Range>("30d");

  const data = GAME_DATA[gameId] ?? FALLBACK_DATA;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const sessions = generateSessions(days, gameId.charCodeAt(gameId.length - 1));
  const totalInRange = sessions.reduce((a, b) => a + b, 0);

  const rangeLabels: Range[] = ["7d", "30d", "90d"];

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
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
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{studio}</div>
              <div className="text-base font-semibold text-neutral-900">{gameName}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-neutral-200 bg-neutral-100 p-0.5">
              {rangeLabels.map((r) => (
                <button key={r} type="button" onClick={() => setRange(r)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${range === r ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}>
                  {r}
                </button>
              ))}
            </div>
            <div className="text-xs text-neutral-400">
              Live data requires PostHog integration
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Sessions" value={totalInRange.toLocaleString()} sub="vs prev period" trend="up" />
          <StatCard label="Unique players" value={data.uniquePlayers.toLocaleString()} sub="across all time" />
          <StatCard label="Avg session" value={data.avgDuration} sub="per visit" />
          <StatCard label="Return rate" value={`${data.returnRate}%`} sub="came back a 2nd time" trend={data.returnRate > 25 ? "up" : "neutral"} />
        </div>

        {/* Sessions over time */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-1 text-sm font-semibold text-neutral-900">Sessions over time</div>
          <div className="mb-4 text-xs text-neutral-400">{totalInRange.toLocaleString()} total in the last {days} days</div>
          <LineChart data={sessions} color="#0ea5e9" />
          <div className="mt-2 flex justify-between text-[10px] text-neutral-300">
            <span>{days}d ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Hotspot performance + Device breakdown */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Hotspot ranking */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="mb-1 text-sm font-semibold text-neutral-900">Hotspot performance</div>
            <div className="mb-4 text-xs text-neutral-400">Ranked by total clicks — avg time shown per visit</div>
            <div className="space-y-3">
              {data.hotspots.map((h, i) => (
                <div key={h.name}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 text-[11px] font-semibold text-neutral-300">#{i + 1}</span>
                      <span className="truncate text-sm font-medium text-neutral-800">{h.name}</span>
                    </div>
                    <div className="shrink-0 flex items-center gap-3 text-xs text-neutral-400">
                      <span className="font-semibold text-neutral-700">{h.clicks.toLocaleString()}</span>
                      <span>{h.avgTime}</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-neutral-100">
                    <div className="h-1.5 rounded-full bg-sky-400 transition-all" style={{ width: `${h.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Device + paths */}
          <div className="space-y-4">
            {/* Device breakdown */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="mb-1 text-sm font-semibold text-neutral-900">Device breakdown</div>
              <div className="mb-3 text-xs text-neutral-400">How players access the experience</div>
              <div className="flex items-center gap-5">
                <DonutChart segments={data.devices} />
                <div className="space-y-2">
                  {data.devices.map((d) => (
                    <div key={d.label} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-neutral-600">{d.label}</span>
                      <span className="ml-auto pl-3 text-xs font-semibold text-neutral-800">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top paths */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="mb-1 text-sm font-semibold text-neutral-900">Top navigation paths</div>
              <div className="mb-3 text-xs text-neutral-400">Most common journeys through the experience</div>
              <div className="space-y-2">
                {data.paths.map((p) => (
                  <div key={p.path} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs text-neutral-700">{p.path}</div>
                      <div className="mt-1 h-1 w-full rounded-full bg-neutral-100">
                        <div className="h-1 rounded-full bg-violet-400" style={{ width: `${p.pct * 3}%` }} />
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-neutral-500">{p.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-1 text-sm font-semibold text-neutral-900">Interaction heatmap</div>
          <div className="mb-4 text-xs text-neutral-400">
            Hotspot engagement relative to one another — intensity reflects click volume. Overlay will map to the actual board image once connected to PostHog.
          </div>
          <HeatmapCanvas points={data.heatmap} />
        </div>

        {/* Data note */}
        <div className="rounded-2xl border border-dashed border-neutral-200 px-5 py-4 text-sm text-neutral-400 leading-6">
          <span className="font-medium text-neutral-600">This is placeholder data for demo purposes.</span> Live analytics requires instrumenting the player-facing experience with PostHog (or equivalent) and connecting it to this dashboard. The data model, charts, and heatmap are production-ready — only the data pipeline needs wiring.
        </div>
      </div>
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
