"use client";

import Link from "next/link";

type ErrorRecoveryShellProps = {
  title: string;
  message: string;
  digest?: string;
  onRetry: () => void;
};

export function ErrorRecoveryShell({
  title,
  message,
  digest,
  onRetry,
}: ErrorRecoveryShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_35%),linear-gradient(180deg,_#f7f7f5_0%,_#efede8_100%)] px-6 py-12 text-neutral-950">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-xl rounded-[28px] border border-neutral-200 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Sherpa Recovery
          </div>

          <h1 className="mt-5 font-space text-3xl font-semibold tracking-tight text-neutral-950">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            {message}
          </p>

          {digest && (
            <div className="mt-5 rounded-2xl bg-neutral-950 px-4 py-3 font-mono text-xs text-neutral-200">
              Reference: {digest}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Back to Sherpa
            </Link>
          </div>

          <p className="mt-6 text-xs leading-5 text-neutral-400">
            If this keeps happening, reload the page or send the reference code to support so we can trace the failure quickly.
          </p>
        </div>
      </div>
    </div>
  );
}
