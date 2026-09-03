/*
 * Givny service worker.
 *
 * Deliberately conservative. This app is a live marketplace backed by Firestore,
 * so caching HTML or API responses would show people listings that are already
 * gone. Only immutable build assets are cached, plus a hand-written offline page
 * so a dropped connection doesn't land on the browser's error screen.
 *
 * Also handles push. There used to be a second worker for that, because the
 * Firebase Cloud Messaging SDK demanded a fixed filename at the origin root and
 * pulled its own copy of Firebase off a CDN at runtime. Native push has no such
 * requirement, so it lives here with everything else.
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

/**
 * Only content-hashed production output is safe to cache first. The dev server
 * reuses chunk filenames, so caching them pins the first build the browser ever
 * saw and it will keep running stale JavaScript indefinitely.
 */
const IS_LOCAL = ["localhost", "127.0.0.1", "[::1]"].includes(self.location.hostname);

function isImmutableAsset(url) {
    if (IS_LOCAL) return false;
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

/* ── Push ──────────────────────────────────────────────────────────────── */

/**
 * A push has arrived.
 *
 * `userVisibleOnly` is mandatory on the web, so a notification must be shown
 * for every push received — a browser that sees this handler finish without one
 * will show its own "this site has been updated in the background" instead, and
 * repeated offences cost the site its permission.
 *
 * Hence the fallback copy: an unreadable payload still produces something
 * honest rather than nothing.
 */
self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        // A payload that is not JSON is a bug on our side, not the browser's.
    }

    const title = data.title || "Givny";

    event.waitUntil(
        self.registration.showNotification(title, {
            body: data.body || "Something happened on Givny.",
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            // Replace rather than stack: three requests on one item should not
            // mean three separate lock-screen entries.
            tag: data.tag || "givny",
            renotify: true,
            data: { url: data.url || "/app" },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const target = event.notification.data?.url || "/app";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
            // Reuse an open tab if there is one; opening a second copy of the
            // app is disorienting and loses whatever the person was doing.
            for (const client of windowClients) {
                if (client.url.startsWith(self.location.origin) && "focus" in client) {
                    client.navigate(target);
                    return client.focus();
                }
            }
            return clients.openWindow(target);
        })
    );
});

/**
 * The push service can retire a subscription on its own — key rotation, or a
 * browser deciding the old one is stale. Without this the member silently stops
 * receiving anything, so tell the app to register the replacement.
 */
self.addEventListener("pushsubscriptionchange", (event) => {
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) client.postMessage({ type: "push-subscription-changed" });
        })
    );
});
