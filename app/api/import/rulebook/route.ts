import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { createImportedPage, createBlock } from "@/app/_lib/authoring-utils";
import { ContentBlockType, InteractionType, PageItem } from "@/app/_lib/authoring-types";

const SYSTEM_PROMPT = `You are a structural parser for board game rulebooks. Your job is to reorganize the publisher's own words into a set of Sherpa cards.

Rules:
- Do NOT invent, summarize, or paraphrase — use the original text.
- Identify logical sections (e.g. Setup, Taking a Turn, Scoring, Winning, FAQ).
- For each section, produce one card. Dense reference sections (full rules, glossary) use interactionType "full-page"; everything else uses "modal".
- kind is always "page" unless the content clearly describes a specific physical board element (then "hotspot").
- blocks: use "section" for subheadings, "steps" for numbered/bulleted lists (newline-separated steps), "callout" for tips/warnings/notes, "text" for everything else.
- Return ONLY valid JSON, no markdown, no explanation.

Response format:
{
  "cards": [
    {
      "title": "string",
      "kind": "page" | "hotspot",
      "interactionType": "modal" | "full-page",
      "blocks": [
        { "type": "text" | "section" | "steps" | "callout", "value": "string" }
      ]
    }
  ]
}`;

const MAX_TEXT_CHARS = 80000;

function cookiesFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return cookieHeader.split(";").map((c) => {
    const [name, ...rest] = c.trim().split("=");
    return { name: name.trim(), value: rest.join("=") };
  });
}

type ImportedBlock = { type: string; value: string };
type ImportedCard = {
  title: string;
  kind: string;
  interactionType: string;
  blocks: ImportedBlock[];
};

export async function POST(request: Request) {
  // 1. Auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll: () => cookiesFromRequest(request),
        setAll: () => {},
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: { text?: unknown; gameId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, gameId } = body;
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Missing or empty text" }, { status: 400 });
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

  // 4. Truncate text
  const truncated = text.slice(0, MAX_TEXT_CHARS);

  // 5. Call Claude
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let rawJson: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Rulebook text:\n\n${truncated}` }],
    });
    const firstBlock = message.content[0];
    if (firstBlock.type !== "text") throw new Error("Unexpected response type");
    rawJson = firstBlock.text;
  } catch (err) {
    console.error("[import/rulebook] Claude error:", err);
    return NextResponse.json({ error: "Failed to parse rulebook" }, { status: 500 });
  }

  // 6. Parse JSON response
  let parsed: { cards: ImportedCard[] };
  try {
    // Strip markdown code fences if Claude added them
    const cleaned = rawJson.replace(/^```(?:json)?\n?/m, "").replace(/```$/m, "").trim();
    parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed.cards)) throw new Error("cards is not an array");
  } catch (err) {
    console.error("[import/rulebook] JSON parse error:", err, rawJson.slice(0, 500));
    return NextResponse.json({ error: "Failed to parse rulebook" }, { status: 500 });
  }

  // 7. Map to PageItems
  const VALID_BLOCK_TYPES = new Set<ContentBlockType>(["text", "section", "steps", "callout"]);
  const VALID_KINDS: PageItem["kind"][] = ["page", "hotspot"];
  const VALID_INTERACTION_TYPES: InteractionType[] = ["modal", "full-page"];

  const newPages: PageItem[] = parsed.cards.map((card, i) => {
    const kind: PageItem["kind"] = VALID_KINDS.includes(card.kind as PageItem["kind"])
      ? (card.kind as PageItem["kind"])
      : "page";
    const interactionType: InteractionType = VALID_INTERACTION_TYPES.includes(card.interactionType as InteractionType)
      ? (card.interactionType as InteractionType)
      : "modal";
    const blocks = (card.blocks ?? [])
      .filter((b) => VALID_BLOCK_TYPES.has(b.type as ContentBlockType))
      .map((b) => createBlock(b.type as ContentBlockType, b.value ?? ""));

    return createImportedPage(card.title, kind, interactionType, blocks, i + 1);
  });

  if (newPages.length === 0) {
    return NextResponse.json({ error: "No cards could be extracted" }, { status: 422 });
  }

  // 8. Persist: upsert new cards + append to card_order
  const cardRows = newPages.map((page) => ({
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
    console.error("[import/rulebook] card upsert error:", upsertError);
    return NextResponse.json({ error: "Failed to save cards" }, { status: 500 });
  }

  const existingOrder: string[] = game.card_order ?? [];
  const newOrder = [...existingOrder, ...newPages.map((p) => p.id)];
  const { error: orderError } = await supabaseAdmin
    .from("games")
    .update({ card_order: newOrder })
    .eq("id", gameId);

  if (orderError) {
    console.error("[import/rulebook] card_order update error:", orderError);
    return NextResponse.json({ error: "Failed to update card order" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: newPages.length });
}
