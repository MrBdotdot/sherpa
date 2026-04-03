import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return Response.json({ error: "Invalid BGG ID" }, { status: 400 });
  }

  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${id}&stats=1`;
  let xmlText: string;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Sherpa/1.0" } });
    if (!res.ok) return Response.json({ error: "BGG request failed" }, { status: 502 });
    xmlText = await res.text();
  } catch {
    return Response.json({ error: "Could not reach BGG" }, { status: 502 });
  }

  // Simple regex extraction — avoids a full XML parser dependency
  const name = xmlText.match(/type="primary"[^>]*value="([^"]+)"/)?.[1] ?? "";
  const description = xmlText.match(/<description>([^<]*)<\/description>/)?.[1]
    ?.replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#10;/g, "\n")
    .trim() ?? "";
  const thumbnail = xmlText.match(/<thumbnail>([^<]+)<\/thumbnail>/)?.[1]?.trim() ?? "";
  const complexity = parseFloat(
    xmlText.match(/<averageweight value="([^"]+)"/)?.[1] ?? "0"
  );

  if (!name) {
    return Response.json({ error: "Game not found" }, { status: 404 });
  }

  return Response.json({ name, description, thumbnail, complexity, bggId: id });
}
