"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/_lib/supabase";

function urlLooksLikeRecoveryLink() {
  if (typeof window === "undefined") return false;

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return (
    searchParams.get("type") === "recovery" ||
    hashParams.get("type") === "recovery" ||
    searchParams.has("code") ||
    hashParams.has("access_token")
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const expectsRecoveryLink = useMemo(() => urlLooksLikeRecoveryLink(), []);

  const [checkingSession, setCheckingSession] = useState(true);
  const [readyForReset, setReadyForReset] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const syncSession = (session: Session | null) => {
      if (!active || !session?.user) return false;
      setEmail(session.user.email ?? "");
      setReadyForReset(true);
      setCheckingSession(false);
      return true;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        syncSession(session);
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (syncSession(session)) return;
      if (!expectsRecoveryLink && active) {
        setCheckingSession(false);
      }
    });

    const timeout = window.setTimeout(() => {
      if (active) setCheckingSession(false);
    }, expectsRecoveryLink ? 3000 : 1200);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [expectsRecoveryLink]);

  const handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccess(true);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex w-[420px] shrink-0 flex-col bg-[#1e3a8a] relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-500 opacity-20 blur-3xl" />
        <div className="relative z-10 flex items-center gap-2.5 p-10">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <span className="text-base font-semibold tracking-tight text-white">Sherpa</span>
        </div>
        <div className="relative z-10 mt-auto p-10 pb-16">
          <h2 className="mb-3 text-[1.6rem] font-bold leading-tight text-white">
            Board game rules,<br />beautifully interactive.
          </h2>
          <p className="text-sm leading-relaxed text-blue-200">
            Build tap-to-reveal rule cards your whole table can explore. No app required.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#f4f5f8] p-8">
        <div className="w-full max-w-[400px]">

          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1e3a8a]">
              <span className="text-xs font-bold text-white">S</span>
            </div>
            <span className="text-base font-semibold text-neutral-900">Sherpa</span>
          </div>

          {checkingSession ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-[#3B82F6]" />
              <p className="text-sm text-neutral-500">Checking your reset link...</p>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue-200 bg-blue-50">
                <svg className="h-7 w-7 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-bold text-neutral-900">Password updated</h2>
              <p className="mb-6 text-sm text-neutral-500">Your password has been changed successfully.</p>
              <button
                type="button"
                onClick={() => router.replace("/")}
                className="flex w-full items-center justify-center rounded-full bg-[#3B82F6] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#2563EB]"
              >
                Open Sherpa
              </button>
            </div>
          ) : readyForReset ? (
            <>
              <h1 className="mb-1 text-2xl font-bold text-neutral-900">Choose a new password</h1>
              <p className="mb-8 text-sm text-neutral-500">
                {email ? `Updating password for ${email}.` : "Enter a new password to finish resetting your account."}
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
                  <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-neutral-600">New password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-medium text-neutral-600">Confirm new password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter your new password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#3B82F6] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#2563EB] disabled:opacity-60"
                >
                  {saving && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {saving ? "Updating..." : "Update password"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <h2 className="mb-2 text-xl font-bold text-neutral-900">Reset link unavailable</h2>
              <p className="mb-6 text-sm text-neutral-500">
                This link is invalid, expired, or has already been used.
              </p>
              <Link
                href="/"
                className="text-xs font-medium text-neutral-400 underline hover:text-neutral-600"
              >
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
