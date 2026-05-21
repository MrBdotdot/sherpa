import Link from "next/link";
import { fetchPublishedGames, PAGE_SIZE, type GalleryGame } from "@/app/_lib/gallery-queries";
import { GalleryFilters } from "@/app/_components/gallery/gallery-filters";

export const metadata = {
  title: "Gallery — Sherpa",
  description: "Interactive rules experiences built with Sherpa.",
};

export const dynamic = "force-dynamic";

const COMPLEXITY_STYLES = {
  Light:  { dot: "#2d6a4f", label: "#2d6a4f" },
  Medium: { dot: "#b07316", label: "#b07316" },
  Heavy:  { dot: "#9a3412", label: "#9a3412" },
} as const;

function Dot() {
  return <span className="inline-block h-[2.5px] w-[2.5px] rounded-full" style={{ background: "#c4bdb0" }} />;
}

function isComplexity(v: string | undefined): v is keyof typeof COMPLEXITY_STYLES {
  return v === "Light" || v === "Medium" || v === "Heavy";
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; complexity?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const complexity = isComplexity(sp.complexity) ? sp.complexity : undefined;
  const page = sp.page ? Math.max(0, Number(sp.page) || 0) : 0;
  const games = await fetchPublishedGames({ tag: sp.tag, complexity, page });

  const featured = games.find((g) => g.featured);
  const rest = featured ? games.filter((g) => g.id !== featured.id) : games;

  return (
    <div className="min-h-screen font-sans" style={{ background: "#fbf9f7", color: "#1a1815" }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-10 py-5"
        style={{ background: "#fbf9f7", borderBottom: "1px solid #e8e4de" }}
      >
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sherpa-icon.svg" alt="" width={22} height={22} />
          <span className="text-[15px] font-semibold" style={{ letterSpacing: "-0.005em" }}>Sherpa</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm" style={{ color: "#4a443b" }}>
          <Link href="/" style={{ color: "#4a443b", textDecoration: "none" }} className="hover:opacity-70 transition-opacity">Docs</Link>
          <Link href="/gallery" style={{ color: "#1a1815", fontWeight: 500, textDecoration: "none" }}>Gallery</Link>
          <Link href="/login" style={{ color: "#4a443b", textDecoration: "none" }} className="hover:opacity-70 transition-opacity">Sign in</Link>
        </nav>
        <Link
          href="/login"
          className="rounded-full px-4 py-2 text-[12.5px] font-semibold text-white transition hover:opacity-90"
          style={{ background: "#1a1815" }}
        >
          Start authoring
        </Link>
      </header>

      {/* Hero strip */}
      <section className="px-10 pb-7 pt-12" style={{ borderBottom: "1px solid #e8e4de" }}>
        <p className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#78746c" }}>
          Published rulebooks
        </p>
        <h1 className="mb-3.5 font-display font-normal leading-[1.05] tracking-[-0.025em] max-w-[820px]" style={{ fontSize: "52px", color: "#1a1815" }}>
          Rules you can{" "}
          <em className="not-italic font-light" style={{ color: "#293B9C" }}>tap into.</em>
        </h1>
        <p className="mb-5 max-w-[560px] text-[15px] leading-relaxed" style={{ color: "#4a443b" }}>
          Interactive rulebooks from the designer community — click any board to explore the hotspots, guides, and onboarding flows their authors shipped.
        </p>
        <GalleryFilters />
      </section>

      {/* Empty state */}
      {games.length === 0 ? (
        <section className="px-10 pb-20 pt-16 text-center">
          <p className="text-base" style={{ color: "#4a443b" }}>No published rulebooks match these filters yet.</p>
          <Link href="/gallery" className="mt-3 inline-block text-sm font-medium" style={{ color: "#293B9C" }}>
            Reset filters →
          </Link>
        </section>
      ) : (
        <>
          {/* Card grid */}
          <section className="grid grid-cols-1 gap-7 px-6 pb-12 pt-8 sm:px-8 md:grid-cols-2 md:px-10 lg:grid-cols-3">
            {featured ? <FeaturedCard game={featured} /> : null}
            {rest.map((g) => <GameCard key={g.id} game={g} />)}
          </section>

          {/* Pagination */}
          {games.length === PAGE_SIZE ? (
            <div className="px-10 pb-20 text-center">
              <Link
                href={{ pathname: "/gallery", query: { ...sp, page: page + 1 } }}
                className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[13px] font-medium hover:opacity-80"
                style={{ borderColor: "#d7d0c5", color: "#1a1815", background: "#fff" }}
              >
                Load more →
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function FeaturedCard({ game }: { game: GalleryGame }) {
  const cs = game.complexity && isComplexity(game.complexity) ? COMPLEXITY_STYLES[game.complexity] : null;
  const img = game.cardImage || game.homeHeroImage || "";
  return (
    <Link
      href={`/gallery/${game.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_18px_40px_-24px_rgba(26,24,21,0.25)] lg:row-span-2"
      style={{ background: "#fff", border: "1px solid #e8e4de" }}
    >
      <div className="relative flex-1 overflow-hidden" style={{ minHeight: 0, aspectRatio: "3/5" }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={game.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: "#293B9C" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,0.6))" }} />
        {cs && game.complexity && game.tags?.[0] ? (
          <span
            className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] backdrop-blur-sm"
            style={{ background: "rgba(255,255,255,0.92)", color: "#1a1815" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: cs.dot }} />
            {game.complexity} · {game.tags[0]}
          </span>
        ) : null}
        <div className="absolute bottom-3 left-3 right-12 z-10">
          <div className="font-display font-normal leading-[1.05] tracking-[-0.01em] text-white" style={{ fontSize: "32px" }}>
            {game.title}
          </div>
          <div className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.82)" }}>
            Featured
          </div>
        </div>
        {game.designer ? (
          <span className="absolute bottom-3.5 right-3 z-10 font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.85)" }}>
            {game.designer}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        {game.tagline ? <p className="text-[13.5px] leading-snug" style={{ color: "#4a443b" }}>{game.tagline}</p> : null}
        <div className="flex flex-wrap items-center gap-2.5 pt-2.5 font-mono text-[10.5px] tracking-[0.06em]" style={{ color: "#78746c", borderTop: "1px solid #f0ece6" }}>
          {game.playerCount ? <><span>{game.playerCount} players</span><Dot /></> : null}
          {game.playTime ? <><span>{game.playTime}</span>{cs ? <Dot /> : null}</> : null}
          {cs && game.complexity ? <span className="font-semibold" style={{ color: cs.label }}>{game.complexity}</span> : null}
        </div>
      </div>
    </Link>
  );
}

function GameCard({ game }: { game: GalleryGame }) {
  const cs = game.complexity && isComplexity(game.complexity) ? COMPLEXITY_STYLES[game.complexity] : null;
  const img = game.cardImage || game.homeHeroImage || "";
  return (
    <Link
      href={`/gallery/${game.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_18px_40px_-24px_rgba(26,24,21,0.25)]"
      style={{ background: "#fff", border: "1px solid #e8e4de" }}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={game.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: "#293B9C" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,0.55))" }} />
        {cs && game.complexity && game.tags?.[0] ? (
          <span
            className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] backdrop-blur-sm"
            style={{ background: "rgba(255,255,255,0.92)", color: "#1a1815" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: cs.dot }} />
            {game.complexity} · {game.tags[0]}
          </span>
        ) : null}
        <h2 className="absolute bottom-3 left-3 z-10 font-display font-normal leading-[1.05] tracking-[-0.01em] text-white" style={{ fontSize: "22px" }}>
          {game.title}
        </h2>
        {game.designer ? (
          <span className="absolute bottom-3.5 right-3 z-10 font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.85)" }}>
            {game.designer}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        {game.tagline ? <p className="text-[13.5px] leading-snug" style={{ color: "#4a443b" }}>{game.tagline}</p> : null}
        <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-2.5 font-mono text-[10.5px] tracking-[0.06em]" style={{ color: "#78746c", borderTop: "1px solid #f0ece6" }}>
          {game.playerCount ? <span>{game.playerCount}</span> : null}
          {game.playerCount && game.playTime ? <Dot /> : null}
          {game.playTime ? <span>{game.playTime}</span> : null}
          {(game.playerCount || game.playTime) && game.ageRange ? <Dot /> : null}
          {game.ageRange ? <span>{game.ageRange}</span> : null}
          {(game.playerCount || game.playTime || game.ageRange) && cs && game.complexity ? <Dot /> : null}
          {cs && game.complexity ? <span className="font-semibold" style={{ color: cs.label }}>{game.complexity}</span> : null}
        </div>
      </div>
    </Link>
  );
}
