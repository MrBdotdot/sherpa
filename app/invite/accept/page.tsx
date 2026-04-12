"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/app/_lib/supabase";
import { apiFetch } from "@/app/_lib/api-fetch";

type Status = "loading" | "success" | "expired" | "invalid" | "mismatch" | "not_logged_in";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [gameId, setGameId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    async function accept() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Redirect to login, then back here
        const returnUrl = encodeURIComponent("/invite/accept?token=" + token);
        router.push("/login?returnUrl=" + returnUrl);
        return;
      }

      const res = await apiFetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        const data: { gameId?: string } = await res.json();
        setGameId(data.gameId ?? null);
        setStatus("success");
        // Redirect to studio after a brief moment
        setTimeout(() => {
          router.push("/");
        }, 2500);
      } else {
        const data: { error?: string } = await res.json();
        if (data.error === "expired_token") setStatus("expired");
        else if (data.error === "email_mismatch") setStatus("mismatch");
        else setStatus("invalid");
      }
    }

    accept();
  }, [token, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-6 text-center">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1e3a8a] text-lg font-bold text-white">
        S
      </div>

      {status === "loading" && (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white mb-4" />
          <p className="text-neutral-400 text-sm">Accepting invitation…</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="text-xl font-semibold text-white mb-2">You&apos;re in!</div>
          <p className="text-neutral-400 text-sm">
            You now have access to the game. Redirecting to the studio…
          </p>
        </>
      )}

      {status === "expired" && (
        <>
          <div className="text-xl font-semibold text-white mb-2">Invitation expired</div>
          <p className="text-neutral-400 text-sm">
            This invite link expired after 7 days. Ask the game owner to send a new invitation.
          </p>
        </>
      )}

      {status === "mismatch" && (
        <>
          <div className="text-xl font-semibold text-white mb-2">Wrong account</div>
          <p className="text-neutral-400 text-sm">
            This invitation was sent to a different email address. Sign in with the correct account and try again.
          </p>
          <button
            className="mt-4 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10"
            onClick={() => {
              const returnUrl = encodeURIComponent("/invite/accept?token=" + token);
              supabase.auth.signOut().then(() => router.push("/login?returnUrl=" + returnUrl));
            }}
          >
            Sign in with a different account
          </button>
        </>
      )}

      {status === "invalid" && (
        <>
          <div className="text-xl font-semibold text-white mb-2">Invalid invitation</div>
          <p className="text-neutral-400 text-sm">
            This invitation link is invalid or has already been used.
          </p>
          <a
            href="/"
            className="mt-4 inline-block rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10"
          >
            Go to studio
          </a>
        </>
      )}
    </div>
  );
}
