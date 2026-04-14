"use client";
import { useEffect, useState } from "react";

/**
 * Returns true when the viewport width is at or below the given breakpoint (px).
 * Defaults to 639px (one below Tailwind's sm breakpoint).
 * SSR-safe: initialises to false on the server.
 */
export function useMobile(breakpoint = 639): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}
