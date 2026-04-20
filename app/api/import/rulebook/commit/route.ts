import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { getRequestUser } from "@/app/_lib/api-auth";
import { createImportedPage, createBlock } from "@/app/_lib/authoring-utils";
import { ContentBlockType, InteractionType, PageItem } from "@/app/_lib/authoring-types";
import { injectInlineLinks } from "../inject-links";
import type { DraftSection } from "@/app/_lib/import-types";

const VALID_BLOCK_TYPES = new Set<ContentBlockType>(["text", "section", "steps", "callout", "image"]);
const VALID_KINDS: PageItem["kind"][] = ["page", "hotspot"];
const VALID_INTERACTION_TYPES: InteractionType[] = ["modal", "full-page", "tooltip", "side-sheet", "bottom-sheet"];

export async function POST(request: Request) {
  // 1. Auth
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: { sections?: unknown; gameId?: unknown; mode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sections, gameId, mode } = body;
  const outputMode: "cards" | "single" = mode === "single" ? "single" : "cards";
  if (!Array.isArray(sections) || sections.length === 0) {
    return NextResponse.json({ error: "Missing or empty sections" }, { status: 400 });
  }
  if (typeof gameId !== "string") {
    return NextResponse.json({ error: "Missing gameId" }, { status: 400 });
  }

  // 3. Verify game ownership
  const { data: game, error: gameError } = await supabaseAdmin
    .from("games")
    .select("id, card_order")
    .eq("id", gameId)
    .eq("user_id", user.id)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // 4. Map DraftSection[] → PageItem[]
  const typedSections = sections as DraftSection[];
  let newPages: PageItem[];

  if (outputMode === "single") {
    // Flatten all sections into one card with section heading blocks as dividers
    const allBlocks = typedSections.flatMap((s, i) => {
      const heading = i > 0 ? [createBlock("section", s.title ?? "")] : [];
      const body = (s.blocks ?? [])
        .filter((b) => VALID_BLOCK_TYPES.has(b.type as ContentBlockType))
        .map((b) => createBlock(b.type as ContentBlockType, b.value ?? ""));
      return [...heading, ...body];
    });
    const title = (typedSections[0]?.title ?? "Rulebook").trim() || "Rulebook";
    newPages = [createImportedPage(title, "page", "full-page", allBlocks, 1)];
  } else {
    newPages = typedSections.map((s, i) => {
      const kind: PageItem["kind"] = VALID_KINDS.includes(s.kind as PageItem["kind"])
        ? (s.kind as PageItem["kind"])
        : "page";
      const interactionType: InteractionType = VALID_INTERACTION_TYPES.includes(s.interactionType as InteractionType)
        ? (s.interactionType as InteractionType)
        : kind === "hotspot"
        ? "tooltip"
        : "modal";
      const blocks = (s.blocks ?? [])
        .filter((b) => VALID_BLOCK_TYPES.has(b.type as ContentBlockType))
        .map((b) => createBlock(b.type as ContentBlockType, b.value ?? ""));

      const page = createImportedPage(s.title ?? "Untitled", kind, interactionType, blocks, i + 1);
      if (s.heroImage) page.heroImage = s.heroImage;
      return page;
    });
  }

  // 5. Inject cross-card inline links
  const linkedPages = injectInlineLinks(newPages);

  // 6. Persist: upsert cards + append to card_order
  const cardRows = linkedPages.map((page) => ({
    id: page.id,
    game_id: gameId,
    kind: page.kind,
    title: page.title,
    summary: page.summary,
    hero_image: page.heroImage,
    x: page.x,
    y: page.y,
    mobile_x: null,
    mobile_y: null,
    content_x: page.contentX,
    content_y: page.contentY,
    mobile_content_x: null,
    mobile_content_y: null,
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
    world_position: null,
    world_normal: null,
  }));

  const { error: upsertError } = await supabaseAdmin.from("cards").upsert(cardRows);
  if (upsertError) {
    console.error("[import/rulebook/commit] upsert error:", upsertError);
    return NextResponse.json({ error: "Failed to save sections" }, { status: 500 });
  }

  const existingOrder: string[] = game.card_order ?? [];
  const newOrder = [...existingOrder, ...linkedPages.map((p) => p.id)];
  const { error: orderError } = await supabaseAdmin
    .from("games")
    .update({ card_order: newOrder })
    .eq("id", gameId);

  if (orderError) {
    console.error("[import/rulebook/commit] card_order error:", orderError);
    return NextResponse.json({ error: "Failed to update card order" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: linkedPages.length });
}
