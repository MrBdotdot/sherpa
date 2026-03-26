import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntryById, GALLERY_ENTRIES } from "@/app/_lib/gallery-data";

export async function generateStaticParams() {
  return GALLERY_ENTRIES.map((e) => ({ id: e.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = getEntryById(id);
  if (!entry) return {};
  return {
    title: `${entry.title} — Sherpa Gallery`,
    description: entry.tagline,
  };
}

export default async function GalleryEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = getEntryById(id);
  if (!entry) notFound();

  const complexityColor =
    entry.complexity === "Light"
      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
      : entry.complexity === "Medium"
      ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
      : "text-rose-400 bg-rose-400/10 border-rose-400/20";

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Nav */}
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <Link href="/" className="text-base font-semibold tracking-tight hover:opacity-80">
          Sherpa
        </Link>
        <Link href="/gallery" className="text-sm text-white/50 hover:text-white transition-colors">
          ← Gallery
        </Link>
      </header>

      {/* Hero */}
      <div className="relative h-72 w-full overflow-hidden bg-neutral-800 sm:h-96">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.heroImage}
          alt=""
          className="h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
        {/* Accent stripe */}
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: entry.accentColor }}
        />
      </div>

      <main className="mx-auto max-w-2xl px-6 pb-20">
        {/* Tags + complexity */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${complexityColor}`}>
            {entry.complexity}
          </span>
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50"
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="mt-4 text-4xl font-bold tracking-tight">{entry.title}</h1>
        <p className="mt-1 text-base text-white/40">by {entry.designer}</p>

        <p className="mt-5 text-lg font-medium leading-snug" style={{ color: entry.accentColor }}>
          {entry.tagline}
        </p>

        <p className="mt-4 text-base leading-relaxed text-white/60">
          {entry.description}
        </p>

        {/* Metadata grid */}
        <div className="mt-8 grid grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Players</p>
            <p className="mt-1.5 text-sm font-semibold">{entry.playerCount}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Play time</p>
            <p className="mt-1.5 text-sm font-semibold">{entry.playTime}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Published</p>
            <p className="mt-1.5 text-sm font-semibold">
              {new Date(entry.publishedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Interactive viewer placeholder */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.cardImage}
            alt=""
            className="h-48 w-full object-cover opacity-40"
          />
          <div className="border-t border-white/10 px-6 py-6 text-center">
            <div
              className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border"
              style={{ borderColor: `${entry.accentColor}40`, backgroundColor: `${entry.accentColor}15` }}
            >
              <span style={{ color: entry.accentColor }}>▶</span>
            </div>
            <p className="text-sm font-semibold text-white/70">Interactive rules viewer</p>
            <p className="mt-1 text-sm text-white/30">
              The hotspot-driven experience will be playable here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
