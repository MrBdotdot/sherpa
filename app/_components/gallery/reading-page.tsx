import Link from "next/link";
import { BlockRenderer } from "./block-renderer";
import type { GalleryGame, GalleryCard } from "@/app/_lib/gallery-queries";

const COMPLEXITY_DOT: Record<string, string> = {
  Light: "#22c55e",
  Medium: "#f59e0b",
  Heavy: "#ef4444",
};

function tocAnchor(cardId: string) {
  return `card-${cardId}`;
}

export function ReadingPage({ game, cards }: { game: GalleryGame; cards: GalleryCard[] }) {
  const heroSrc = game.cardImage || game.homeHeroImage || "";
  const designerLine = game.designer ? `Rulebook by ${game.designer}` : "Rulebook";

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-neutral-950/80 px-6 py-4 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sherpa-icon.svg" alt="" width={20} height={20} />
          Sherpa
        </Link>
        <Link
          href="/login"
          className="rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-neutral-950 hover:opacity-90"
        >
          Create your rulebook →
        </Link>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="relative h-72 w-full overflow-hidden bg-neutral-900 sm:h-96">
          {heroSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroSrc} alt="" className="h-full w-full object-cover opacity-70" />
          ) : (
            <div className="h-full w-full" style={{ background: "#293B9C" }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
        </div>
        <div className="mx-auto max-w-5xl px-6 -mt-20 relative z-10">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{game.title}</h1>
          {game.tagline ? (
            <p className="mt-2 text-lg text-white/70">{game.tagline}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
            {game.playerCount ? <Chip>{game.playerCount} players</Chip> : null}
            {game.playTime ? <Chip>{game.playTime}</Chip> : null}
            {game.complexity ? (
              <Chip>
                <span
                  className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                  style={{ background: COMPLEXITY_DOT[game.complexity] }}
                />
                {game.complexity}
              </Chip>
            ) : null}
            {game.ageRange ? <Chip>Age {game.ageRange}</Chip> : null}
          </div>
        </div>
      </section>

      {/* Open interactive board CTA */}
      <div className="mx-auto mt-8 max-w-5xl px-6">
        <Link
          href={`/play/${game.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10"
        >
          Open interactive board →
        </Link>
      </div>

      {/* Two-column body */}
      <main className="mx-auto mt-12 grid max-w-5xl grid-cols-[200px_1fr] gap-12 px-6 pb-20">
        <aside className="sticky top-16 self-start">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Contents</p>
          <nav>
            <ul className="space-y-1.5">
              {cards.map((c) => (
                <li key={c.id}>
                  <a
                    href={`#${tocAnchor(c.id)}`}
                    className="block text-sm text-white/60 hover:text-white"
                  >
                    {c.title || "Untitled"}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0">
          {cards.map((c, i) => (
            <article key={c.id} id={tocAnchor(c.id)} className="mb-12 scroll-mt-20">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Chapter {String(i + 1).padStart(2, "0")}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">{c.title || "Untitled"}</h2>
              {c.summary ? <p className="mt-2 text-base text-white/60">{c.summary}</p> : null}
              <div className="mt-5">
                <BlockRenderer blocks={c.blocks} />
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-10 text-center">
        <p className="text-sm text-white/50">
          {game.title} · {designerLine} · Published with Sherpa
        </p>
        <Link
          href="/login"
          className="mt-3 inline-block text-sm font-medium text-white hover:opacity-80"
        >
          Create your own interactive rulebook →
        </Link>
      </footer>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/80">
      {children}
    </span>
  );
}
