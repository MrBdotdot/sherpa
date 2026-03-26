export type GalleryEntry = {
  id: string;
  title: string;
  designer: string;
  tagline: string;
  description: string;
  heroImage: string;
  cardImage: string;
  playerCount: string;
  playTime: string;
  complexity: "Light" | "Medium" | "Heavy";
  tags: string[];
  publishedAt: string;
  accentColor: string;
};

export const GALLERY_ENTRIES: GalleryEntry[] = [
  {
    id: "cascade",
    title: "Cascade",
    designer: "Elara Voss",
    tagline: "A river-routing game where every dam changes everything downstream.",
    description:
      "Cascade is a tile-placement strategy game for 2–4 players set in a network of interconnected watersheds. Each turn you lay river tiles, build dams, and divert flow — but what you gain upstream, you take from someone downstream. The board is alive: flooding, drought, and erosion events reshape the landscape mid-game. Victory goes to the designer who best reads the current.",
    heroImage: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1600&auto=format&fit=crop",
    cardImage: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop",
    playerCount: "2–4",
    playTime: "60–90 min",
    complexity: "Medium",
    tags: ["strategy", "tile-placement"],
    publishedAt: "2026-02-14",
    accentColor: "#0ea5e9",
  },
  {
    id: "ironveil",
    title: "Ironveil",
    designer: "Marcus Drenn",
    tagline: "A hidden-movement thriller set in a city under occupation.",
    description:
      "Ironveil drops players into a fog-of-war city map where one side controls the occupying force and the others run a resistance cell. The occupied players move secretly on a hidden board, leaving only traces — rumours, spent resources, contact burns. The occupier pieces together the picture from witnesses, patrol reports, and captured couriers. Every encounter could be a trap. Trust no one.",
    heroImage: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1600&auto=format&fit=crop",
    cardImage: "https://images.unsplash.com/photo-1514565131-fce0801e6785?q=80&w=800&auto=format&fit=crop",
    playerCount: "3–6",
    playTime: "90–120 min",
    complexity: "Heavy",
    tags: ["thematic", "hidden-movement", "asymmetric"],
    publishedAt: "2026-01-20",
    accentColor: "#f43f5e",
  },
  {
    id: "solaseed",
    title: "Solaseed",
    designer: "Priya Nath",
    tagline: "Grow a garden on a dying moon. Cooperate or perish.",
    description:
      "Solaseed is a fully cooperative engine-builder for 1–4 players. A collapsing moon's last ecosystem hangs in the balance — players share a dwindling resource pool and must sequence their planting, watering, and harvesting actions in concert. The moon's decay clock advances each round; fall behind on any one ecosystem metric and the cascading failures come fast. A meditative, tightly interlocking puzzle that rewards communication.",
    heroImage: "https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?q=80&w=1600&auto=format&fit=crop",
    cardImage: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=800&auto=format&fit=crop",
    playerCount: "1–4",
    playTime: "45–60 min",
    complexity: "Light",
    tags: ["cooperative", "engine-building"],
    publishedAt: "2026-03-05",
    accentColor: "#22c55e",
  },
];

export function getEntryById(id: string): GalleryEntry | undefined {
  return GALLERY_ENTRIES.find((e) => e.id === id);
}
