import Link from "next/link";
import { GALLERY_ENTRIES } from "@/app/_lib/gallery-data";

export const metadata = {
  title: "Gallery — Sherpa",
  description: "Interactive rules experiences built with Sherpa.",
};

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Nav */}
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <Link href="/" className="text-base font-semibold tracking-tight hover:opacity-80">
          Sherpa
        </Link>
        <span className="text-sm text-white/40">Rules Gallery</span>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Rules Gallery</h1>
        <p className="mt-2 text-base text-white/50">
          Interactive rulebook experiences built with Sherpa.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY_ENTRIES.map((entry) => (
            <Link
              key={entry.id}
              href={`/gallery/${entry.id}`}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all hover:bg-white/8 hover:border-white/20"
            >
              {/* Hero thumbnail */}
              <div className="relative h-44 w-full overflow-hidden bg-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.cardImage}
                  alt=""
                  className="h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-90"
                />
                {/* Accent bottom bar */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 opacity-70 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: entry.accentColor }}
                />
              </div>

              {/* Card body */}
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="text-base font-semibold leading-snug">{entry.title}</h2>
                <p className="mt-0.5 text-xs text-white/40">by {entry.designer}</p>
                <p className="mt-2 text-sm leading-snug text-white/55">{entry.tagline}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-white/35">
                  <span>{entry.playerCount} players</span>
                  <span>·</span>
                  <span>{entry.playTime}</span>
                  <span>·</span>
                  <span>{entry.complexity}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
