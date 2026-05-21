import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import type { GameMeta, GameComplexity, SystemSettings, ContentBlock } from "@/app/_lib/authoring-types";

export const PAGE_SIZE = 60;

export type GalleryGame = {
  id: string;
  title: string;
  featured: boolean;
  createdAt: string;
  // Flattened gameMeta fields:
  tagline?: string;
  designer?: string;
  playerCount?: string;
  playTime?: string;
  complexity?: GameComplexity;
  ageRange?: string;
  tags?: string[];
  cardImage?: string;
  /** Home card heroImage; populated by reading-page query for image fallback. */
  homeHeroImage?: string;
  /** user_id from games table; populated by reading-page query. */
  userId?: string;
};

export type GalleryCard = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  heroImage: string;
  blocks: ContentBlock[];
  cardSize: string;
};

type GameRow = {
  id: string;
  title: string;
  // Stored as JSONB; in practice many rows hold only a partial subset of
  // SystemSettings (e.g. just `{ gameMeta }`), so accept Partial here.
  system_settings: Partial<SystemSettings> | null;
  featured: boolean;
  created_at: string;
  user_id?: string | null;
};

type CardRow = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  hero_image: string;
  blocks: ContentBlock[] | null;
  card_size: string;
};

export function parsePlayerCountRange(raw: string | undefined | null): { min: number; max: number } | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Match digits separated by an en-dash, em-dash, or hyphen, OR a single number.
  const range = trimmed.match(/(\d+)\s*[–—-]\s*(\d+)/);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const single = trimmed.match(/(\d+)/);
  if (single) return { min: Number(single[1]), max: Number(single[1]) };
  return null;
}

export function mapGameRowToGalleryGame(row: GameRow): GalleryGame {
  const settings = (row.system_settings ?? {}) as Partial<SystemSettings>;
  const meta: GameMeta = settings.gameMeta ?? {};
  return {
    id: row.id,
    title: row.title,
    featured: row.featured,
    createdAt: row.created_at,
    userId: row.user_id ?? undefined,
    tagline: meta.tagline,
    designer: meta.designer,
    playerCount: meta.playerCount,
    playTime: meta.playTime,
    complexity: meta.complexity,
    ageRange: meta.ageRange,
    tags: meta.tags,
    cardImage: meta.cardImage,
  };
}

export type FetchPublishedGamesOpts = {
  tag?: string;
  complexity?: GameComplexity;
  page?: number;
};

export async function fetchPublishedGames(opts: FetchPublishedGamesOpts = {}): Promise<GalleryGame[]> {
  const page = Math.max(0, opts.page ?? 0);
  let query = supabaseAdmin
    .from("games")
    .select("id, title, system_settings, featured, created_at")
    .eq("publish_status", "published")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (opts.complexity) {
    query = query.eq("system_settings->gameMeta->>complexity", opts.complexity);
  }
  if (opts.tag) {
    query = query.contains("system_settings->gameMeta->tags", [opts.tag]);
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchPublishedGames failed", error);
    return [];
  }
  return (data ?? []).map((row) => mapGameRowToGalleryGame(row as GameRow));
}

export const fetchPublishedGame = cache(
  async (id: string): Promise<{ game: GalleryGame; cards: GalleryCard[] } | null> => {
    const { data: gameData, error: gameErr } = await supabaseAdmin
      .from("games")
      .select("id, title, system_settings, featured, created_at, user_id")
      .eq("id", id)
      .eq("publish_status", "published")
      .maybeSingle();

    if (gameErr) {
      console.error("fetchPublishedGame (game) failed", gameErr);
      return null;
    }
    if (!gameData) return null;

    const game = mapGameRowToGalleryGame(gameData as GameRow);

    // Home heroImage (for the gallery image fallback) and non-home cards are
    // independent reads against the same table — parallelize them.
    const [homeRes, cardRes] = await Promise.all([
      supabaseAdmin
        .from("cards")
        .select("hero_image")
        .eq("game_id", id)
        .eq("kind", "home")
        .maybeSingle(),
      supabaseAdmin
        .from("cards")
        .select("id, kind, title, summary, hero_image, blocks, card_size")
        .eq("game_id", id)
        .neq("kind", "home")
        .order("created_at", { ascending: true }),
    ]);

    if (homeRes.data?.hero_image) game.homeHeroImage = homeRes.data.hero_image as string;

    const { data: cardData, error: cardsErr } = cardRes;

    if (cardsErr) {
      console.error("fetchPublishedGame (cards) failed", cardsErr);
      return { game, cards: [] };
    }

    const cards: GalleryCard[] = (cardData ?? []).map((row: CardRow) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      summary: row.summary,
      heroImage: row.hero_image,
      blocks: Array.isArray(row.blocks) ? row.blocks : [],
      cardSize: row.card_size,
    }));

    return { game, cards };
  }
);
