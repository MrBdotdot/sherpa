// Workbox service worker for Sherpa player offline support
importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js");

workbox.setConfig({ debug: false });

const { registerRoute } = workbox.routing;
const { NetworkFirst, CacheFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { CacheableResponsePlugin } = workbox.cacheableResponse;

// Activate immediately — take control without waiting for reload
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  const CURRENT_CACHES = new Set([
    "sherpa-pages-v1",
    "sherpa-supabase-v1",
    "sherpa-images-v1",
    "sherpa-models-v1",
  ]);
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n.startsWith("sherpa-") && !CURRENT_CACHES.has(n))
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Play page HTML — Network-first, 7-day cache
registerRoute(
  ({ url }) => url.pathname.startsWith("/play/"),
  new NetworkFirst({
    cacheName: "sherpa-pages-v1",
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 7 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Supabase REST API (game + cards queries) — Network-first, 7-day cache
registerRoute(
  ({ url }) =>
    url.hostname.includes(".supabase.co") && url.pathname.startsWith("/rest/"),
  new NetworkFirst({
    cacheName: "sherpa-supabase-v1",
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 7 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Supabase Storage images — Cache-first, 30-day cache
// Safe: every new image upload gets a new URL (timestamp in filename)
registerRoute(
  ({ url }) =>
    url.hostname.includes(".supabase.co") &&
    url.pathname.startsWith("/storage/"),
  new CacheFirst({
    cacheName: "sherpa-images-v1",
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60,
        maxEntries: 500,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// 3D model files — Cache-first, 30-day cache (opt-in; warm-game-cache puts them here)
registerRoute(
  ({ url }) => /\.(glb|gltf)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: "sherpa-models-v1",
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60,
        maxEntries: 20,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);
