import Link from "next/link";
import { GALLERY_ENTRIES } from "@/app/_lib/gallery-data";

export const metadata = {
  title: "Gallery — Sherpa",
  description: "Interactive rules experiences built with Sherpa.",
};

const COMPLEXITY_STYLES = {
  Light:  { dot: "#2d6a4f", label: "#2d6a4f" },
  Medium: { dot: "#b07316", label: "#b07316" },
  Heavy:  { dot: "#9a3412", label: "#9a3412" },
};

function Dot() {
  return <span className="inline-block h-[2.5px] w-[2.5px] rounded-full" style={{ background: "#c4bdb0" }} />;
}

export default function GalleryPage() {
  const featured = GALLERY_ENTRIES.find((e) => e.featured);
  const rest = GALLERY_ENTRIES.filter((e) => !e.featured);

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
          Published · April 2026
        </p>
        <h1 className="mb-3.5 font-display font-normal leading-[1.05] tracking-[-0.025em] max-w-[820px]" style={{ fontSize: "52px", color: "#1a1815" }}>
          Rules you can{" "}
          <em className="not-italic font-light" style={{ color: "#293B9C" }}>tap into.</em>
        </h1>
        <p className="mb-5 max-w-[560px] text-[15px] leading-relaxed" style={{ color: "#4a443b" }}>
          Interactive rulebooks from the designer community — click any board to explore the hotspots, guides, and onboarding flows their authors shipped.
        </p>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          {(["All", "Strategy", "Cooperative", "Thematic", "Party"] as const).map((f, i) => (
            <button
              key={f}
              className="rounded-full border px-3.5 py-1.5 font-sans text-[12.5px] transition hover:opacity-80"
              style={i === 0
                ? { background: "#1a1815", color: "#fff", borderColor: "transparent" }
                : { background: "#fff", color: "#4a443b", borderColor: "#d7d0c5" }
              }
            >
              {f}
            </button>
          ))}
          <div className="mx-1 h-5 w-px" style={{ background: "#e8e4de" }} />
          {(["Light", "Medium", "Heavy"] as const).map((c) => (
            <button
              key={c}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-sans text-[12.5px] transition hover:opacity-80"
              style={{ background: "#fff", color: "#4a443b", borderColor: "#d7d0c5" }}
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: COMPLEXITY_STYLES[c].dot }} />
              {c}
            </button>
          ))}
          <span className="ml-auto font-mono text-[11px]" style={{ color: "#78746c" }}>Sorted by newest</span>
        </div>
      </section>

      {/* Card grid */}
      <section className="grid gap-7 px-10 pb-20 pt-8" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>

        {/* Featured card — spans 2 rows */}
        {featured && (() => {
          const cs = COMPLEXITY_STYLES[featured.complexity];
          return (
            <Link
              key={featured.id}
              href={`/gallery/${featured.id.replace("-feature", "")}`}
              className="group flex flex-col overflow-hidden rounded-2xl transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_18px_40px_-24px_rgba(26,24,21,0.25)]"
              style={{ gridRow: "span 2", background: "#fff", border: "1px solid #e8e4de" }}
            >
              <div className="relative flex-1 overflow-hidden" style={{ minHeight: 0, aspectRatio: "3/5" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featured.cardImage} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,0.6))" }} />

                <span
                  className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] backdrop-blur-sm"
                  style={{ background: "rgba(255,255,255,0.92)", color: "#1a1815" }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: cs.dot }} />
                  {featured.complexity} · {featured.tags[0]}
                </span>

                <div className="absolute bottom-3 left-3 right-12 z-10">
                  <div className="font-display font-normal leading-[1.05] tracking-[-0.01em] text-white" style={{ fontSize: "32px" }}>
                    {featured.title}
                  </div>
                  <div className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.82)" }}>
                    Featured
                  </div>
                </div>
                <span className="absolute bottom-3.5 right-3 z-10 font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {featured.designer}
                </span>
              </div>

              <div className="flex flex-col gap-2.5 p-4">
                <p className="text-[13.5px] leading-snug" style={{ color: "#4a443b" }}>{featured.tagline}</p>
                <div className="flex flex-wrap items-center gap-2.5 pt-2.5 font-mono text-[10.5px] tracking-[0.06em]" style={{ color: "#78746c", borderTop: "1px solid #f0ece6" }}>
                  <span>{featured.playerCount} players</span>
                  <Dot />
                  <span>{featured.playTime}</span>
                  <Dot />
                  <span className="font-semibold" style={{ color: cs.label }}>{featured.complexity}</span>
                </div>
              </div>
            </Link>
          );
        })()}

        {/* Regular cards */}
        {rest.map((entry) => {
          const cs = COMPLEXITY_STYLES[entry.complexity];
          return (
            <Link
              key={entry.id}
              href={`/gallery/${entry.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_18px_40px_-24px_rgba(26,24,21,0.25)]"
              style={{ background: "#fff", border: "1px solid #e8e4de" }}
            >
              <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.cardImage} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,0.55))" }} />

                <span
                  className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] backdrop-blur-sm"
                  style={{ background: "rgba(255,255,255,0.92)", color: "#1a1815" }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: cs.dot }} />
                  {entry.complexity} · {entry.tags[0]}
                </span>

                <h2 className="absolute bottom-3 left-3 z-10 font-display font-normal leading-[1.05] tracking-[-0.01em] text-white" style={{ fontSize: "22px" }}>
                  {entry.title}
                </h2>
                <span className="absolute bottom-3.5 right-3 z-10 font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {entry.designer}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2 px-4 py-4">
                <p className="text-[13.5px] leading-snug" style={{ color: "#4a443b" }}>{entry.tagline}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-2.5 font-mono text-[10.5px] tracking-[0.06em]" style={{ color: "#78746c", borderTop: "1px solid #f0ece6" }}>
                  <span>{entry.playerCount}</span>
                  <Dot />
                  <span>{entry.playTime}</span>
                  {entry.ageRange && <><Dot /><span>{entry.ageRange}</span></>}
                  <Dot />
                  <span className="font-semibold" style={{ color: cs.label }}>{entry.complexity}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
