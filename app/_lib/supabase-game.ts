import { supabase } from "@/app/_lib/supabase";
import { ExperienceStatus, PageItem, SystemSettings } from "@/app/_lib/authoring-types";

// ---------- save ----------

export async function saveGame(
  gameId: string,
  userId: string,
  gameTitle: string,
  pages: PageItem[],
  systemSettings: SystemSettings,
  publishStatus: ExperienceStatus,
): Promise<void> {
  const cardOrder = pages.map((p) => p.id);

  const { error: gameError } = await supabase.from("games").upsert({
    id: gameId,
    user_id: userId,
    title: gameTitle,
    system_settings: systemSettings,
    card_order: cardOrder,
    publish_status: publishStatus,
  });
  if (gameError) throw gameError;

  const cardRows = pages.map((page) => ({
    id: page.id,
    game_id: gameId,
    kind: page.kind,
    title: page.title,
    summary: page.summary,
    hero_image: page.heroImage,
    x: page.x,
    y: page.y,
    mobile_x: page.mobileX ?? null,
    mobile_y: page.mobileY ?? null,
    content_x: page.contentX,
    content_y: page.contentY,
    mobile_content_x: page.mobileContentX ?? null,
    mobile_content_y: page.mobileContentY ?? null,
    blocks: page.blocks,
    social_links: page.socialLinks,
    canvas_features: page.canvasFeatures,
    public_url: page.publicUrl,
    show_qr_code: page.showQrCode,
    interaction_type: page.interactionType,
    page_button_placement: page.pageButtonPlacement,
    template_id: page.templateId,
    card_size: page.cardSize,
    content_tint_color: page.contentTintColor,
    content_tint_opacity: page.contentTintOpacity,
    world_position: page.worldPosition ?? null,
    world_normal: page.worldNormal ?? null,
  }));

  const { error: cardsError } = await supabase.from("cards").upsert(cardRows);
  if (cardsError) throw cardsError;

  // Remove cards that no longer exist in pages
  const { error: deleteError } = await supabase
    .from("cards")
    .delete()
    .eq("game_id", gameId)
    .not("id", "in", `(${cardOrder.map((id) => `"${id}"`).join(",")})`);
  if (deleteError) throw deleteError;
}

// ---------- load ----------

export async function loadGame(
  gameId: string,
): Promise<{ pages: PageItem[]; systemSettings: SystemSettings; gameTitle: string; publishStatus: ExperienceStatus } | null> {
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (gameError || !game) return null;

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("*")
    .eq("game_id", gameId);

  if (cardsError || !cards) return null;

  const cardOrder: string[] = game.card_order ?? [];
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const ordered = [
    ...cardOrder.map((id) => cardMap.get(id)).filter(Boolean),
    ...cards.filter((c) => !cardOrder.includes(c.id)),
  ] as ReturnType<typeof cardMap.get>[];

  const publishStatus: ExperienceStatus =
    game.publish_status === "published" ? "published" : "draft";

  const pages: PageItem[] = ordered.map((card) => ({
    id: card!.id,
    kind: card!.kind,
    title: card!.title,
    summary: card!.summary,
    heroImage: card!.hero_image,
    x: card!.x,
    y: card!.y,
    mobileX: card!.mobile_x,
    mobileY: card!.mobile_y,
    contentX: card!.content_x,
    contentY: card!.content_y,
    mobileContentX: card!.mobile_content_x,
    mobileContentY: card!.mobile_content_y,
    blocks: card!.blocks ?? [],
    socialLinks: card!.social_links ?? [],
    canvasFeatures: card!.canvas_features ?? [],
    publicUrl: card!.public_url,
    showQrCode: card!.show_qr_code,
    interactionType: card!.interaction_type,
    pageButtonPlacement: card!.page_button_placement,
    templateId: card!.template_id,
    cardSize: card!.card_size,
    contentTintColor: card!.content_tint_color,
    contentTintOpacity: card!.content_tint_opacity,
    worldPosition: card!.world_position,
    worldNormal: card!.world_normal,
  }));

  return { pages, systemSettings: game.system_settings, gameTitle: game.title ?? "", publishStatus };
}

export async function deleteGame(gameId: string): Promise<void> {
  const { error } = await supabase
    .from("games")
    .delete()
    .eq("id", gameId);

  if (error) throw error;
}
