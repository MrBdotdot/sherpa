export interface DraftSection {
  title: string;
  kind: "page" | "hotspot";
  interactionType: string;
  blocks: { type: string; value: string }[];
  heroImage?: string;
}
