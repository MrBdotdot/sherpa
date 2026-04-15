export function dispatchSectionHighlight(id: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sherpa:section-highlight", { detail: { id } }));
  }
}
