"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/app/_lib/supabase";

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function CheckCircle() {
  return (
    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue-200 bg-blue-50">
      <svg className="h-7 w-7 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

function LeftPanel() {
  return (
    <div className="hidden lg:flex w-[420px] shrink-0 flex-col bg-[#1e3a8a] relative overflow-hidden">
      {/* Background decoration — subtle dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Bottom blob */}
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-500 opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-8 right-8 h-48 w-48 rounded-full bg-indigo-400 opacity-10 blur-2xl" />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-2.5 p-10">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
          <span className="text-sm font-bold text-white">S</span>
        </div>
        <span className="text-base font-semibold tracking-tight text-white">Sherpa</span>
      </div>

      {/* Marketing copy */}
      <div className="relative z-10 mt-auto p-10 pb-16">
        <h2 className="mb-3 text-[1.6rem] font-bold leading-tight text-white">
          Board game rules,<br />beautifully interactive.
        </h2>
        <p className="text-sm leading-relaxed text-blue-200">
          Build tap-to-reveal rule cards your whole table can explore. No app required.
        </p>
      </div>
    </div>
  );
}

export function LoginScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "forgot") {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        redirectTo ? { redirectTo } : undefined
      );

      if (error) setError(error.message);
      else setResetSent(true);
      setLoading(false);
      return;
    }

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        const returnUrl = searchParams.get("returnUrl");
        if (returnUrl) router.push(returnUrl);
      }
    } else {
      const returnUrl = searchParams.get("returnUrl");
      const emailRedirectTo =
        typeof window !== "undefined"
          ? window.location.origin + (returnUrl ?? "")
          : undefined;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      });
      if (error) {
        setError(error.message);
      } else {
        setConfirm(true);
        // Fire-and-forget welcome email — do not await so sign-up flow is not blocked
        void fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template: "welcome",
            to: email,
            props: {},
          }),
        }).catch(() => {
          // Intentionally ignored — welcome email failure must not affect sign-up UX
        });
      }
    }

    setLoading(false);
  };

  const switchMode = (next: "signin" | "signup") => {
    setMode(next);
    setError(null);
  };

  return (
    <div className="flex min-h-screen">
      <LeftPanel />

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#f4f5f8] p-8">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo — only visible when left panel is hidden */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1e3a8a]">
              <span className="text-xs font-bold text-white">S</span>
            </div>
            <span className="text-base font-semibold text-neutral-900">Sherpa</span>
          </div>

          {confirm ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <CheckCircle />
              <h2 className="mb-2 text-xl font-bold text-neutral-900">Check your email</h2>
              <p className="text-sm text-neutral-500">
                We sent a confirmation link to{" "}
                <span className="font-medium text-neutral-700">{email}</span>.
                Click it to activate your account, then sign in.
              </p>
              <button
                type="button"
                onClick={() => { setConfirm(false); setMode("signin"); }}
                className="mt-6 text-xs font-medium text-neutral-500 underline hover:text-neutral-600"
              >
                Back to sign in
              </button>
            </div>

          ) : resetSent ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <CheckCircle />
              <h2 className="mb-2 text-xl font-bold text-neutral-900">Reset link sent</h2>
              <p className="text-sm text-neutral-500">
                If{" "}
                <span className="font-medium text-neutral-700">{email}</span>{" "}
                is a Sherpa account, a reset link is on its way.
              </p>
              <button
                type="button"
                onClick={() => { setResetSent(false); setMode("signin"); }}
                className="mt-6 text-xs font-medium text-neutral-500 underline hover:text-neutral-600"
              >
                Back to sign in
              </button>
            </div>

          ) : (
            <>
              <h1 className="mb-1 text-2xl font-bold text-neutral-900">
                {mode === "forgot" ? "Reset your password" : mode === "signin" ? "Welcome back." : "Create your account."}
              </h1>
              <p className="mb-8 text-sm text-neutral-500">
                {mode === "forgot"
                  ? "Enter your email and we will send you a reset link."
                  : mode === "signin"
                  ? "Sign in to open your Sherpa workspace."
                  : "Set up your free account to start building."}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
                    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 6.5a.875.875 0 110-1.75.875.875 0 010 1.75z" />
                    </svg>
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-neutral-600">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-500 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25"
                  />
                </div>

                {mode !== "forgot" && (
                  <div>
                    <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-neutral-600">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "signup" ? "8+ characters" : "Your password"}
                      required
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      minLength={8}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-500 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#3B82F6] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#2563EB] disabled:opacity-60"
                >
                  {loading && <Spinner />}
                  {mode === "forgot" ? "Send reset link" : mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>

              <div className="mt-5 text-center text-sm text-neutral-500">
                {mode === "signin" && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setError(null); }}
                      className="underline hover:text-neutral-600"
                    >
                      Forgot password?
                    </button>
                    <span className="mx-2">·</span>
                    <button type="button" onClick={() => switchMode("signup")} className="underline hover:text-neutral-600">
                      Create an account
                    </button>
                  </>
                )}
                {mode === "signup" && (
                  <button type="button" onClick={() => switchMode("signin")} className="underline hover:text-neutral-600">
                    Already have an account? Sign in
                  </button>
                )}
                {mode === "forgot" && (
                  <button type="button" onClick={() => { setMode("signin"); setError(null); }} className="underline hover:text-neutral-600">
                    Back to sign in
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
