"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

  const handleSubmit = async (event: FormEvent) => {
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
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-2xl font-bold tracking-tight text-neutral-900">Sherpa</div>
          <div className="text-sm text-neutral-500">Reset your password and get back to your rules workspace.</div>
        </div>

        {checkingSession ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
            <div className="mt-4 text-sm text-neutral-500">Checking your reset link...</div>
          </div>
        ) : success ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
            <div className="mb-2 text-base font-semibold text-neutral-900">Password updated</div>
            <div className="text-sm text-neutral-500">
              Your password has been changed successfully.
            </div>
            <button
              type="button"
              onClick={() => router.replace("/")}
              className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700"
            >
              Open Sherpa
            </button>
          </div>
        ) : readyForReset ? (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <div className="text-base font-semibold text-neutral-900">Choose a new password</div>
              <p className="mt-1 text-sm text-neutral-500">
                {email ? `Updating password for ${email}.` : "Enter a new password to finish resetting your account."}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-neutral-700">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-black"
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-medium text-neutral-700">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-black"
                />
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
            >
              {saving ? "Updating..." : "Update password"}
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
            <div className="mb-2 text-base font-semibold text-neutral-900">Reset link unavailable</div>
            <div className="text-sm text-neutral-500">
              This password reset link is invalid, expired, or has already been used.
            </div>
            <Link
              href="/"
              className="mt-4 inline-flex text-xs font-medium text-neutral-500 underline hover:text-neutral-700"
            >
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
