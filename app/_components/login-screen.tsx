"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/app/_lib/supabase";

export function LoginScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setConfirm(true);
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-2xl font-bold tracking-tight text-neutral-900">Sherpa</div>
          <div className="text-sm text-neutral-500">Board game rules, beautifully interactive.</div>
        </div>

        {confirm ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
            <div className="mb-2 text-base font-semibold text-neutral-900">Check your email</div>
            <div className="text-sm text-neutral-500">
              We sent a confirmation link to <span className="font-medium text-neutral-700">{email}</span>.
              Click it to activate your account, then sign in.
            </div>
            <button
              type="button"
              onClick={() => { setConfirm(false); setMode("signin"); }}
              className="mt-4 text-xs font-medium text-neutral-500 underline hover:text-neutral-700"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex rounded-xl border border-neutral-200 bg-neutral-100 p-0.5">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(null); }}
                  className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-all ${
                    mode === m ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-black"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={8}
                className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
            >
              {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>

            {mode === "signup" && (
              <p className="mt-3 text-center text-[11px] leading-5 text-neutral-400">
                You&apos;ll receive a confirmation email. Make sure to verify before signing in.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
