"use client";
import { useEffect, useState } from "react";

/** Returns true if the visitor is on a mobile-sized viewport, null before first render. */
export function useMobileDetect(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}
