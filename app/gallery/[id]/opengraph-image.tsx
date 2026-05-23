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
          {game.playerCount} players
        </div>
      ) : null}
      {game.playTime ? (
        <div style={{ display: "flex", alignItems: "center" }}>
          {game.playTime}
        </div>
      ) : null}
    </div>
  );
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

  if (!heroImage) {
    // Branded-only layout (no photo).
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
              {game.title}
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
                {game.tagline}
              </div>
            ) : null}
          </div>
          <MetaRow game={game} />
        </div>
      ),
      size
    );
  }

  // Split layout (photo left, branded right).
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <div
          style={{
            width: "50%",
            height: "100%",
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div
          style={{
            width: "50%",
            height: "100%",
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
              {game.title}
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
                {game.tagline}
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
