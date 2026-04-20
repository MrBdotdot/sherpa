import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/_lib/api-auth";
import type { DraftSection } from "@/app/_lib/import-types";

function parseFigmaUrl(url: string): { fileKey: string; nodeId: string | null } | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/(?:design|file)\/([A-Za-z0-9_-]+)/);
    if (!m) return null;
    const rawNodeId = u.searchParams.get("node-id");
    return {
      fileKey: m[1],
      nodeId: rawNodeId ? rawNodeId.replace(/-/g, ":") : null,
    };
  } catch {
    return null;
  }
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  characters?: string;
}

function extractText(node: FigmaNode): string {
  if (node.type === "TEXT") return node.characters ?? "";
  return (node.children ?? []).map(extractText).filter(Boolean).join("\n");
}

function collectFrames(root: FigmaNode, targetId: string | null): FigmaNode[] {
  const frames: FigmaNode[] = [];

  function walk(n: FigmaNode, depth: number) {
    const isFrame = n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE";

    if (targetId) {
      if (n.id === targetId) {
        if (isFrame) {
          frames.push(n);
        } else {
          for (const child of n.children ?? []) {
            if (child.type === "FRAME" || child.type === "COMPONENT") frames.push(child);
          }
        }
        return;
      }
    } else if (n.type === "CANVAS" && depth === 1) {
      for (const child of n.children ?? []) {
        if (child.type === "FRAME" || child.type === "COMPONENT") frames.push(child);
      }
      return;
    }

    for (const child of n.children ?? []) walk(child, depth + 1);
  }

  walk(root, 0);
  return frames;
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { figmaUrl?: unknown; figmaToken?: unknown; gameId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { figmaUrl, figmaToken, gameId } = body;
  if (typeof figmaUrl !== "string" || !figmaUrl.trim()) {
    return NextResponse.json({ error: "Missing figmaUrl" }, { status: 400 });
  }
  if (typeof gameId !== "string") {
    return NextResponse.json({ error: "Missing gameId" }, { status: 400 });
  }

  const token =
    (typeof figmaToken === "string" && figmaToken.trim()) || process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "No Figma access token. Add one in the import form or set FIGMA_ACCESS_TOKEN." },
      { status: 400 }
    );
  }

  const parsed = parseFigmaUrl(figmaUrl.trim());
  if (!parsed) {
    return NextResponse.json({ error: "Invalid Figma URL" }, { status: 400 });
  }

  const { fileKey, nodeId } = parsed;

  const figmaRes = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
    headers: { "X-Figma-Token": token },
  });

  if (!figmaRes.ok) {
    let msg = "Figma API error";
    try {
      const b = await figmaRes.json();
      if (typeof b?.err === "string") msg = b.err;
      else if (typeof b?.message === "string") msg = b.message;
    } catch { /* ignore */ }
    return NextResponse.json({ error: msg }, { status: figmaRes.status >= 400 ? figmaRes.status : 502 });
  }

  const figmaDoc = await figmaRes.json();
  const document = figmaDoc.document as FigmaNode;
  const frames = collectFrames(document, nodeId);

  if (frames.length === 0) {
    return NextResponse.json(
      { error: "No frames found. Share a Figma URL pointing to a page or a frame." },
      { status: 422 }
    );
  }

  // Render each frame as a PNG image URL via Figma's image export endpoint
  const frameIds = frames.map((f) => f.id).join(",");
  let imageMap: Record<string, string> = {};
  try {
    const imgRes = await fetch(
      `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(frameIds)}&format=png&scale=2`,
      { headers: { "X-Figma-Token": token } }
    );
    if (imgRes.ok) {
      const imgData = await imgRes.json();
      imageMap = (imgData.images as Record<string, string>) ?? {};
    }
  } catch { /* images are optional — sections still import without them */ }

  const sections: DraftSection[] = frames.map((frame) => {
    const rawText = extractText(frame).trim();
    const blocks: DraftSection["blocks"] = rawText
      ? rawText
          .split(/\n{2,}/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => ({ type: "text", value: p }))
      : [];

    return {
      title: frame.name,
      kind: "page" as const,
      interactionType: "modal",
      blocks,
      heroImage: imageMap[frame.id] ?? undefined,
    };
  });

  return NextResponse.json({ sections });
}
