const CACHE_NAME = "limitless-edge-sim-ui-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",

  // ICONS 🔥
  "./assets/favicon.ico",
  "./assets/icon-16.png",
  "./assets/icon-32.png",
  "./assets/icon-180.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",

  // JS
  "./js/app.js",
  "./js/state.js",
  "./js/scenarios.js",
  "./js/marketData.js",
  "./js/indicators.js",
  "./js/simulator.js",
  "./js/strategyEngine.js",
  "./js/achievements.js",
  "./js/aiCoach.js",
  "./js/challenges.js",
  "./js/objectives.js",
  "./js/profiles.js",
  "./js/sound.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});