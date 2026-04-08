import type { SystemSettings } from "@/app/_lib/authoring-types";

export function getFontThemeClass(fontTheme?: SystemSettings["fontTheme"]): string {
  switch (fontTheme) {
    case "editorial":
      return "font-serif";
    case "friendly":
      return "font-sans tracking-[0.01em]";
    case "mono":
      return "font-mono";
    case "geometric":
      return "font-space";
    case "display":
      return "font-display";
    default:
      return "font-sans";
  }
}
