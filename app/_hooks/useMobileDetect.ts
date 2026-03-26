"use client";
import { useEffect, useState } from "react";

/** Returns true if the visitor is on a mobile-sized viewport, null before first render. */
export function useMobileDetect(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  return isMobile;
}
