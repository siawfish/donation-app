/*
 * Givny service worker.
 *
 * Deliberately conservative. This app is a live marketplace backed by Firestore,
 * so caching HTML or API responses would show people listings that are already
 * gone. Only immutable build assets are cached, plus a hand-written offline page
 * so a dropped connection doesn't land on the browser's error screen.
 */

const VERSION = "givny-v1";
const ASSET_CACHE = `${VERSION}-assets`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(ASSET_CACHE).then((cache) => cache.addAll([OFFLINE_URL])).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
            )
            .then(() => self.clients.claim())
    );
});

function isImmutableAsset(url) {
    return (
        url.pathname.startsWith("/_next/static/") ||
        url.pathname.startsWith("/icons/") ||
        url.pathname.startsWith("/fonts/")
    );
}

self.addEventListener("fetch", (event) => {
    const { request } = event;

    // Never interfere with anything that changes state.
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // Build output is content-hashed, so cache-first is safe and fast.
    if (isImmutableAsset(url)) {
        event.respondWith(
            caches.match(request).then(
                (hit) =>
                    hit ||
                    fetch(request).then((response) => {
                        if (response.ok) {
                            const copy = response.clone();
                            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
                        }
                        return response;
                    })
            )
        );
        return;
    }

    // Pages always come from the network; the cache only supplies the offline
    // fallback. Stale listings would be worse than an honest error.
    if (request.mode === "navigate") {
        event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    }
});
