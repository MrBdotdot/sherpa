"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/app/_lib/supabase";

function isInvalidRefreshTokenMessage(message: string | undefined) {
  const normalized = message?.toLowerCase() ?? "";
  return (
    normalized.includes("invalid refresh token") ||
    normalized.includes("refresh token not found")
  );
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const syncAutoRefresh = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "visible") {
        void supabase.auth.startAutoRefresh();
      } else {
        void supabase.auth.stopAutoRefresh();
      }
    };

    async function bootstrapAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error && isInvalidRefreshTokenMessage(error.message)) {
          // Clear only the local browser session so a revoked refresh token
          // doesn't keep throwing on every app load.
          await supabase.auth.signOut({ scope: "local" });
          if (!cancelled) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setUser(session?.user ?? null);
          setLoading(false);
          syncAutoRefresh();
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
          syncAutoRefresh();
        }
      }
    }

    void bootstrapAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const handleVisibilityChange = () => syncAutoRefresh();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.auth.stopAutoRefresh();
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
