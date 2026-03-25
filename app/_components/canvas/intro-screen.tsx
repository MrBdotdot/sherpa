"use client";

import { useEffect, useState } from "react";
import { PageItem } from "@/app/_lib/authoring-types";

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0] || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return u.pathname.slice(7).split("?")[0] || null;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.slice(8).split("?")[0] || null;
      return u.searchParams.get("v");
    }
  } catch {}
  return null;
}

function collectPreloadUrls(pages: PageItem[]): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const page of pages) {
    if (page.heroImage && !page.heroImage.startsWith("color:")) {
      if (!seen.has(page.heroImage)) { seen.add(page.heroImage); urls.push(page.heroImage); }
    }
    for (const block of page.blocks) {
      if ((block.type === "image" || block.type === "video") && block.value) {
        if (!seen.has(block.value)) { seen.add(block.value); urls.push(block.value); }
      }
    }
    for (const feature of page.canvasFeatures) {
      if (feature.imageUrl && !seen.has(feature.imageUrl)) {
        seen.add(feature.imageUrl); urls.push(feature.imageUrl);
      }
    }
  }
  return urls;
}

export function IntroScreen({
  youtubeUrl,
  pages,
  onStart,
}: {
  youtubeUrl: string;
  pages: PageItem[];
  onStart: () => void;
}) {
  const videoId = getYouTubeVideoId(youtubeUrl);
  const [coverOpacity, setCoverOpacity] = useState(1);

  useEffect(() => {
    // Fallback: the YouTube IFrame API only sends postMessage state events when
    // youtube.com/iframe_api is loaded on the page. Since we don't load it,
    // use a timeout as the primary trigger and postMessage as a fast-path.
    const timer = setTimeout(() => setCoverOpacity(0), 1500);

    const handleMessage = (event: MessageEvent) => {
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (
          (data?.event === "onStateChange" && data?.info === 1) ||
          (data?.event === "infoDelivery" && data?.info?.playerState === 1)
        ) {
          clearTimeout(timer);
          setCoverOpacity(0);
        }
      } catch {}
    };
    window.addEventListener("message", handleMessage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  if (!videoId) return null;

  const embedUrl =
    `https://www.youtube.com/embed/${videoId}` +
    `?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0` +
    `&playsinline=1&iv_load_policy=3&enablejsapi=1`;

  const preloadUrls = collectPreloadUrls(pages);

  return (
    <div
      className="absolute inset-0 z-50 cursor-pointer overflow-hidden"
      onClick={onStart}
    >
      {/* YouTube cover video — scaled to always fill the container */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          height: "100%",
          minWidth: "177.78vh",
          minHeight: "56.25vw",
        }}
      >
        <iframe
          src={embedUrl}
          allow="autoplay; encrypted-media"
          className="h-full w-full"
          style={{ border: "none" }}
          title="Intro video"
        />
      </div>

      {/* Black cover — hides YouTube's loading UI, fades out when video plays */}
      <div
        className="pointer-events-none absolute inset-0 bg-black transition-opacity duration-700"
        style={{ opacity: coverOpacity }}
      />

      {/* Hidden asset preloader — loads experience media during the intro */}
      <div className="hidden" aria-hidden="true">
        {preloadUrls.map((url, i) =>
          /\.(mp4|webm|ogg)(\?|$)/i.test(url) ? (
            <video key={i} src={url} preload="auto" muted />
          ) : (
            <img key={i} src={url} alt="" loading="eager" />
          )
        )}
      </div>

      {/* Tap to start CTA */}
      <div className="pointer-events-none absolute bottom-8 left-0 right-0 flex justify-center">
        <span className="rounded-full bg-black/50 px-5 py-2.5 text-sm font-semibold tracking-wide text-white backdrop-blur-sm">
          Tap anywhere to start
        </span>
      </div>
    </div>
  );
}
