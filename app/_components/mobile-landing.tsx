"use client";

import Link from "next/link";

export function MobileLanding() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5">
        <span className="text-base font-semibold tracking-tight">Sherpa</span>
        <Link
          href="/gallery"
          className="rounded-full border border-white/20 px-4 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10"
        >
          Gallery
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col justify-center px-6 pb-16 pt-8">
        <div className="mb-3 inline-flex w-fit items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          Authoring tool
        </div>

        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
          Build interactive rules for board games.
        </h1>

        <p className="mt-4 text-base leading-relaxed text-white/60">
          Sherpa turns your rulebook into a hotspot-driven digital experience — linked pages, visual references, and contextual explanations players can explore mid-game.
        </p>

        {/* Desktop CTA */}
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-medium text-white/90">
            The authoring tool is designed for desktop.
          </p>
          <p className="mt-1 text-sm text-white/50">
            Open Sherpa on a laptop or desktop computer to start building your rules experience.
          </p>
        </div>

        {/* Gallery CTA */}
        <div className="mt-6">
          <Link
            href="/gallery"
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/10"
          >
            <div>
              <p className="text-sm font-medium text-white/90">Browse the gallery</p>
              <p className="mt-0.5 text-sm text-white/50">
                Explore rules experiences built with Sherpa.
              </p>
            </div>
            <span className="ml-4 shrink-0 text-white/40" aria-hidden="true">→</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 pb-8 text-center text-xs text-white/30">
        &copy; {new Date().getFullYear()} Sherpa
      </footer>
    </div>
  );
}
