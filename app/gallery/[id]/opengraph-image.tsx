import { ImageResponse } from "next/og";
import { fetchPublishedGame } from "@/app/_lib/gallery-queries";

export const alt = "Sherpa game cover";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const BRAND_BLUE = "#293B9C";
const TEXT_PRIMARY = "#ffffff";
const TEXT_DIM = "rgba(255,255,255,0.85)";
const TEXT_MUTED = "rgba(255,255,255,0.65)";

const COMPLEXITY_DOT: Record<string, string> = {
  Light: "#22c55e",
  Medium: "#f59e0b",
  Heavy: "#ef4444",
};

type MetaGame = {
  complexity?: string;
  playerCount?: string;
  playTime?: string;
};

type ImageGame = {
  title: string;
  tagline?: string;
  complexity?: string;
  playerCount?: string;
  playTime?: string;
};

/**
 * Replace en-dash (U+2013) and em-dash (U+2014) with ASCII hyphen-minus.
 * satori's default font doesn't include extended Unicode glyphs; rendering text
 * with unsupported glyphs causes the response to fail. Replace before render.
 * Long-term fix: load a Google Font with broader Unicode coverage (task #27).
 */
function ascii(s: string | undefined): string | undefined {
  return s?.replace(/[–—]/g, "-");
}

function MetaRow({
  game,
  compact = false,
}: {
  game: MetaGame;
  compact?: boolean;
}) {
  const fontSize = compact ? 22 : 26;
  const gap = compact ? 20 : 32;

  return (
    <div style={{ display: "flex", gap, fontSize, color: TEXT_DIM }}>
      {game.complexity ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: COMPLEXITY_DOT[game.complexity] ?? "#9ca3af",
              display: "inline-block",
            }}
          />
          <span>{game.complexity}</span>
        </div>
      ) : null}
      {game.playerCount ? (
        <div style={{ display: "flex", alignItems: "center" }}>
          {ascii(game.playerCount)} players
        </div>
      ) : null}
      {game.playTime ? (
        <div style={{ display: "flex", alignItems: "center" }}>
          {ascii(game.playTime)}
        </div>
      ) : null}
    </div>
  );
}

function brandedLayoutResponse(game: ImageGame): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BRAND_BLUE,
          color: TEXT_PRIMARY,
          padding: "80px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, color: TEXT_MUTED, letterSpacing: "0.1em" }}>
          SHERPA
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>
            {ascii(game.title)}
          </div>
          {game.tagline ? (
            <div
              style={{
                fontSize: 32,
                marginTop: 32,
                color: TEXT_DIM,
                lineHeight: 1.3,
                maxWidth: 980,
              }}
            >
              {ascii(game.tagline)}
            </div>
          ) : null}
        </div>
        <MetaRow game={game} />
      </div>
    ),
    size
  );
}

function splitLayoutResponse(game: ImageGame, heroImage: string): ImageResponse {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <img
          src={heroImage}
          alt=""
          width={600}
          height={630}
          style={{
            width: 600,
            height: 630,
            objectFit: "cover",
          }}
        />
        <div
          style={{
            width: 600,
            height: 630,
            background: BRAND_BLUE,
            color: TEXT_PRIMARY,
            padding: "60px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div style={{ fontSize: 24, color: TEXT_MUTED, letterSpacing: "0.1em" }}>
            SHERPA
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05 }}>
              {ascii(game.title)}
            </div>
            {game.tagline ? (
              <div
                style={{
                  fontSize: 26,
                  marginTop: 24,
                  color: TEXT_DIM,
                  lineHeight: 1.3,
                }}
              >
                {ascii(game.tagline)}
              </div>
            ) : null}
          </div>
          <MetaRow game={game} compact />
        </div>
      </div>
    ),
    size
  );
}

/**
 * Fetch a remote image and return it as a base64 data URL. Returns null on any
 * failure (network error, non-OK response, non-image content type, timeout).
 *
 * Why: satori (next/og's renderer) does its own image fetching internally, and
 * intermittently fails on remote URLs even when the URL is reachable — different
 * User-Agent, no redirect handling, format negotiation surprises. Pre-fetching
 * the bytes ourselves and embedding via data URL bypasses satori's fetcher
 * entirely; satori just decodes the bytes we hand it.
 */
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchPublishedGame(id);

  if (!result) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: BRAND_BLUE,
            color: TEXT_PRIMARY,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 56,
            fontWeight: 600,
          }}
        >
          Sherpa
        </div>
      ),
      size
    );
  }

  const { game } = result;
  const heroImage = game.cardImage || game.homeHeroImage;

  // Pre-fetch the image as a base64 data URL so satori never has to do a
  // network fetch itself (which was 500ing intermittently). If our fetch fails,
  // fall back to the branded layout — which is always reachable.
  const heroDataUrl = heroImage ? await fetchImageAsDataUrl(heroImage) : null;
  if (!heroDataUrl) {
    return brandedLayoutResponse(game);
  }

  return splitLayoutResponse(game, heroDataUrl);
}
