/**
 * Web push.
 *
 * Delivered through Firebase Cloud Messaging, which the project already depends
 * on. Two things about the platform shape everything here:
 *
 * 1. iOS only delivers web push to a PWA *installed to the home screen*, from
 *    16.4 onward. In Safari's normal browser tab there is no API at all, so the
 *    honest answer to "enable notifications" on iOS is "install the app first".
 * 2. Permission can only be requested from a user gesture, and a denial is
 *    sticky — the browser will not ask again. So the prompt has to be earned
 *    rather than fired on load.
 */

import { ActivityAction } from "@/app/types";

export interface PushToken {
    token: string;
    uid: string;
    /** Coarse platform label, only so a stale token can be explained to a user. */
    platform?: string;
    createdAt: string;
    lastSeenAt: string;
}

export type PushPermission = "granted" | "denied" | "default" | "unsupported";

/**
 * What each event says on a lock screen.
 *
 * Notifications the person themselves caused are excluded: nobody needs a push
 * telling them they just saved an item. Only things another person did, or
 * something that changes what they can do next.
 */
const COPY: Partial<Record<ActivityAction, { title: string; body: string; url: string }>> = {
    [ActivityAction.ITEM_REQUESTED]: {
        title: "Someone wants your item",
        body: "A neighbour asked for something you listed.",
        url: "/app/pending-requests",
    },
    [ActivityAction.REQUEST_ACCEPTED]: {
        title: "It's yours",
        body: "Your request was accepted — message them to arrange a pickup.",
        url: "/app/messages",
    },
    [ActivityAction.REQUEST_REJECTED]: {
        title: "Not this time",
        body: "That one went to someone else. Plenty more nearby.",
        url: "/explore",
    },
    [ActivityAction.REQUEST_COMPLETED]: {
        title: "Handover confirmed",
        body: "Nice one — that item has a new home.",
        url: "/app",
    },
    [ActivityAction.REQUEST_CANCELLED]: {
        title: "Request cancelled",
        body: "A request on your item was cancelled.",
        url: "/app/pending-requests",
    },
    [ActivityAction.ORG_LISTED_ITEM]: {
        title: "New from an organisation you follow",
        body: "They have just listed something. First come, first served.",
        url: "/explore",
    },
    [ActivityAction.ACCOUNT_VERIFIED]: {
        title: "You're verified",
        body: "Your Ghana Card check passed. The badge is on your profile.",
        url: "/app/settings",
    },
};

export function pushCopyFor(action: ActivityAction) {
    return COPY[action] ?? null;
}

/** Whether this event is worth interrupting someone for. */
export function isPushWorthy(action: ActivityAction): boolean {
    return COPY[action] !== undefined;
}

/* ── Client-side capability checks ─────────────────────────────────────── */

export function isStandalone(): boolean {
    if (typeof window === "undefined") return false;
    return (
        window.matchMedia?.("(display-mode: standalone)").matches ||
        // iOS predates the standard media query.
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
}

export function isIos(): boolean {
    if (typeof navigator === "undefined") return false;
    return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        // iPadOS reports as a Mac; the touch points give it away.
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
}

export function pushSupported(): boolean {
    if (typeof window === "undefined") return false;
    return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * Why push isn't available, in words a member can act on. Returns null when it
 * is available.
 */
export function pushBlockedReason(): string | null {
    if (typeof window === "undefined") return null;
    if (isIos() && !isStandalone()) {
        return "On iPhone, notifications work once Givny is added to your home screen. Tap Share, then Add to Home Screen, and open it from there.";
    }
    if (!pushSupported()) {
        return "This browser doesn't support notifications.";
    }
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        return "Notifications are blocked for this site. You'll need to allow them in your browser settings.";
    }
    return null;
}

export function currentPermission(): PushPermission {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission as PushPermission;
}
