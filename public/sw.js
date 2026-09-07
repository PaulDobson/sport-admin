// Versioned service worker for the PWA app shell. Bump SW_VERSION on any change to force an update.
const SW_VERSION = "v3";
const SHELL_CACHE_NAME = `sport-admin-shell-${SW_VERSION}`;
const CURRENT_SESSION_CACHE_NAME = `sport-admin-current-session-${SW_VERSION}`;

const APP_SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];
const CURRENT_SESSION_PATH = /^\/dashboard\/sessions\/[^/]+\/attendance$/;
const STATIC_DESTINATIONS = new Set(["style", "script", "font", "image"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                ![SHELL_CACHE_NAME, CURRENT_SESSION_CACHE_NAME].includes(key),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "PRECACHE_CURRENT_SESSION") return;

  const url = new URL(event.data.url, self.location.origin);
  if (
    url.origin !== self.location.origin ||
    !CURRENT_SESSION_PATH.test(url.pathname)
  )
    return;

  event.waitUntil(
    caches.delete(CURRENT_SESSION_CACHE_NAME).then(async () => {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) return;
      const cache = await caches.open(CURRENT_SESSION_CACHE_NAME);
      await cache.put(url, response);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        if (CURRENT_SESSION_PATH.test(url.pathname)) {
          const sessionCache = await caches.open(CURRENT_SESSION_CACHE_NAME);
          const session = await sessionCache.match(url);
          if (session) return session;
        }
        return caches.match("/");
      }),
    );
    return;
  }

  if (STATIC_DESTINATIONS.has(event.request.destination)) {
    event.respondWith(
      caches.open(SHELL_CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(event.request);
          if (response.ok) await cache.put(event.request, response.clone());
          return response;
        } catch {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          throw new Error("Static asset unavailable");
        }
      }),
    );
    return;
  }

  event.respondWith(
    caches.open(SHELL_CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      return fetch(event.request);
    }),
  );
});
