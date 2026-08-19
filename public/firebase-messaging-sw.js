/*
 * Firebase Cloud Messaging service worker.
 *
 * Separate from sw.js on purpose. The FCM SDK looks for this exact filename at
 * the origin root and registers it itself, so it cannot be folded into the
 * caching worker. Both can coexist — a page may control several workers as long
 * as their scopes differ, and FCM registers this one at /firebase-cloud-messaging-push-scope.
 *
 * This file cannot read process.env: it is served as a static asset, not built
 * by Next. The config below is public client config — the same values already
 * shipped in the JS bundle — and is safe to expose. Firebase security comes
 * from rules and App Check, never from hiding these.
 */

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyDSlzCpxw4Gfm0VQVlkbQCosKNsR_gwqIA",
    authDomain: "givny-57a1d.firebaseapp.com",
    projectId: "givny-57a1d",
    storageBucket: "givny-57a1d.firebasestorage.app",
    messagingSenderId: "849858056992",
    appId: "1:849858056992:web:400a329765a601cb077d45",
});

const messaging = firebase.messaging();

/**
 * Background messages.
 *
 * Sends are data-only (no `notification` block) so this handler runs on every
 * platform and the notification is drawn once. Include a `notification` block
 * and the browser draws its own as well, which is how apps end up showing
 * everything twice.
 */
messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = data.title || "Givny";

    self.registration.showNotification(title, {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.tag || "givny",
        // Replace rather than stack: three requests on one item should not mean
        // three separate lock-screen entries.
        renotify: true,
        data: { url: data.url || "/app" },
    });
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const target = event.notification.data?.url || "/app";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
            // Reuse an open tab if there is one; opening a second copy of the
            // app is disorienting and loses whatever the person was doing.
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && "focus" in client) {
                    client.navigate(target);
                    return client.focus();
                }
            }
            return clients.openWindow(target);
        })
    );
});
