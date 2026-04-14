import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { getRequestUser } from "@/app/_lib/api-auth";
import type { DraftSection } from "@/app/_lib/import-types";

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

export async function POST(request: Request) {
  // 1. Auth
  const user = await getRequestUser(request);
  if (!user) {
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
    .select("id")
    .eq("id", gameId)
    .eq("user_id", user.id)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // 4. Truncate
  const truncated = text.slice(0, MAX_TEXT_CHARS);

  // 5. Call Claude
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let rawJson: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Rulebook text:\n\n${truncated}` }],
    });
    const firstBlock = message.content[0];
    if (firstBlock.type !== "text") throw new Error("Unexpected response type");
    rawJson = firstBlock.text;
  } catch (err) {
    console.error("[import/rulebook/parse] Claude error:", err);
    return NextResponse.json({ error: "Failed to read rulebook" }, { status: 500 });
  }

  // 6. Parse response
  let parsed: { cards: Array<{ title?: unknown; kind?: unknown; interactionType?: unknown; blocks?: unknown }> };
  try {
    const cleaned = rawJson.replace(/^```(?:json)?\n?/m, "").replace(/```$/m, "").trim();
    parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed.cards)) throw new Error("cards is not an array");
  } catch (err) {
    console.error("[import/rulebook/parse] JSON parse error:", err, rawJson.slice(0, 500));
    return NextResponse.json({ error: "Failed to read rulebook" }, { status: 500 });
  }

  if (parsed.cards.length === 0) {
    return NextResponse.json({ error: "No sections could be extracted" }, { status: 422 });
  }

  // 7. Normalize into DraftSection[]
  const sections: DraftSection[] = parsed.cards.map((card) => ({
    title: typeof card.title === "string" ? card.title : "Untitled",
    kind: card.kind === "hotspot" ? "hotspot" : "page",
    interactionType: card.interactionType === "full-page" ? "full-page" : "modal",
    blocks: Array.isArray(card.blocks)
      ? (card.blocks as Array<{ type?: unknown; value?: unknown }>)
          .filter((b) => typeof b.type === "string" && typeof b.value === "string")
          .map((b) => ({ type: b.type as string, value: b.value as string }))
      : [],
  }));

  return NextResponse.json({ sections });
}
