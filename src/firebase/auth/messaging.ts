"use client";

import { getMessaging, getToken, isSupported, onMessage, type Messaging } from "firebase/messaging";
import { getFirebaseApp } from "./firebase";

/**
 * The VAPID public key, from Firebase Console → Project settings → Cloud
 * Messaging → Web Push certificates.
 *
 * Web push cannot work without it, and there is no way to derive it — so its
 * absence is reported plainly rather than failing at the moment someone taps
 * "turn on notifications".
 */
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function vapidConfigured(): boolean {
    return !!VAPID_KEY && VAPID_KEY.length > 20;
}

let cached: Messaging | null = null;

async function getMessagingIfSupported(): Promise<Messaging | null> {
    if (cached) return cached;
    if (!(await isSupported())) return null;
    cached = getMessaging(getFirebaseApp());
    return cached;
}

/**
 * Ask for permission and return this browser's FCM token.
 *
 * Must be called from a user gesture: browsers ignore a permission request that
 * isn't tied to one, and a denial is permanent until the person changes it in
 * site settings — so this is only ever called from a button.
 */
export async function requestPushToken(): Promise<
    { ok: true; token: string } | { ok: false; reason: string }
> {
    if (!vapidConfigured()) {
        return {
            ok: false,
            reason: "Push isn't configured yet — NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing.",
        };
    }

    const messaging = await getMessagingIfSupported();
    if (!messaging) return { ok: false, reason: "This browser can't receive notifications." };

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

    // FCM registers its own worker, but registering it explicitly means the
    // scope is predictable and a failure surfaces here rather than inside the SDK.
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/firebase-cloud-messaging-push-scope",
    });

    const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
    });

    if (!token) return { ok: false, reason: "Couldn't get a notification token." };
    return { ok: true, token };
}

/** The existing token, without prompting. Null if not yet permitted. */
export async function getExistingPushToken(): Promise<string | null> {
    try {
        if (!vapidConfigured()) return null;
        if (typeof Notification === "undefined" || Notification.permission !== "granted") return null;
        const messaging = await getMessagingIfSupported();
        if (!messaging) return null;
        const registration = await navigator.serviceWorker.getRegistration(
            "/firebase-cloud-messaging-push-scope"
        );
        return await getToken(messaging, {
            vapidKey: VAPID_KEY,
            ...(registration ? { serviceWorkerRegistration: registration } : {}),
        });
    } catch {
        return null;
    }
}

/**
 * Messages that arrive while the app is open.
 *
 * The service worker only handles background messages, so without this a
 * notification sent while someone is looking at the app is silently dropped.
 */
export async function onForegroundMessage(
    handler: (payload: { title?: string; body?: string; url?: string }) => void
): Promise<() => void> {
    const messaging = await getMessagingIfSupported();
    if (!messaging) return () => {};
    return onMessage(messaging, (payload) => {
        const d = payload.data ?? {};
        handler({ title: d.title, body: d.body, url: d.url });
    });
}
