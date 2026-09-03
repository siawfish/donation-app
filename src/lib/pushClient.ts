"use client";

/**
 * Subscribing this browser to push, through the browser's own API.
 *
 * Replaces the Firebase Cloud Messaging SDK. FCM wrapped exactly these calls
 * and handed back an opaque token; going direct means the app's own service
 * worker handles push, no vendor script is fetched from a CDN at runtime, and
 * Safari and Firefox work by the same path as Chrome instead of through a
 * Google service.
 */

import type { WebPushSubscription } from "./webpush.types";

/**
 * `applicationServerKey` wants raw bytes, not the base64url string the key is
 * stored and shipped as.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function vapidConfigured(): boolean {
    return !!PUBLIC_KEY && PUBLIC_KEY.length > 20;
}

/**
 * A PushSubscription in the shape the server needs.
 *
 * `toJSON()` gives exactly this, but its type is loose enough that a missing
 * key would only show up when a notification silently failed to arrive.
 */
function serialise(sub: PushSubscription): WebPushSubscription | null {
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
    return {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    };
}

/**
 * The app's service worker, registered and ready.
 *
 * Push and caching now share one worker. FCM required its own because the SDK
 * insisted on a fixed filename at the origin root; nothing does any more.
 */
async function readyWorker(): Promise<ServiceWorkerRegistration> {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing) return navigator.serviceWorker.ready;
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return navigator.serviceWorker.ready;
}

/**
 * Ask for permission and subscribe.
 *
 * Must be called from a user gesture: browsers ignore a permission request that
 * isn't tied to one, and a denial is permanent until the person changes it in
 * site settings — so this is only ever called from a button.
 */
export async function subscribeToPush(): Promise<
    { ok: true; subscription: WebPushSubscription } | { ok: false; reason: string }
> {
    if (!vapidConfigured()) {
        return { ok: false, reason: "Push isn't configured yet — NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing." };
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return { ok: false, reason: "This browser can't receive notifications." };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        return {
            ok: false,
            reason:
                permission === "denied"
                    ? "Notifications are blocked. You'll need to allow them in your browser settings."
                    : "Notifications weren't enabled.",
        };
    }

    const registration = await readyWorker();

    // An existing subscription is reused unless it was made with a different
    // key — which happens if the VAPID keypair is ever rotated. Subscribing
    // again without unsubscribing first throws in that case.
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
        const same =
            existing.options?.applicationServerKey &&
            new Uint8Array(existing.options.applicationServerKey).toString() ===
                urlBase64ToUint8Array(PUBLIC_KEY!).toString();
        if (same) {
            const serialised = serialise(existing);
            if (serialised) return { ok: true, subscription: serialised };
        }
        await existing.unsubscribe();
    }

    try {
        const sub = await registration.pushManager.subscribe({
            // Required by every browser: a push must always show something.
            // Silent pushes are not permitted on the web.
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY!),
        });
        const serialised = serialise(sub);
        if (!serialised) return { ok: false, reason: "The browser returned an incomplete subscription." };
        return { ok: true, subscription: serialised };
    } catch (error: any) {
        return { ok: false, reason: error?.message || "Couldn't subscribe to notifications." };
    }
}

/** The existing subscription, without prompting. Null if not yet permitted. */
export async function getExistingSubscription(): Promise<WebPushSubscription | null> {
    try {
        if (!vapidConfigured()) return null;
        if (typeof Notification === "undefined" || Notification.permission !== "granted") return null;
        if (!("serviceWorker" in navigator)) return null;

        const registration = await navigator.serviceWorker.getRegistration("/");
        const sub = await registration?.pushManager.getSubscription();
        return sub ? serialise(sub) : null;
    } catch {
        return null;
    }
}

/** Unsubscribe in the browser. The server record is removed separately. */
export async function unsubscribeFromPush(): Promise<void> {
    try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const sub = await registration?.pushManager.getSubscription();
        await sub?.unsubscribe();
    } catch {
        /* Already gone, which is the state we wanted. */
    }
}
