'use server';

import { createHash } from "crypto";
import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { ActivityAction, ResponseData } from "@/app/types";
import { isPushWorthy, pushCopyFor } from "@/lib/push";
import { WebPushSubscription, sendWebPush, vapidConfigured } from "@/lib/webpush";

const SUBS = "pushSubscriptions";

/**
 * Push subscriptions, delivered over the Web Push protocol.
 *
 * These used to be Firebase Cloud Messaging tokens. A native PushSubscription
 * is a different thing — an endpoint chosen by the browser plus the two keys
 * its payloads are encrypted to — so the collection changed with it. Nothing
 * needed migrating: FCM was never configured in any environment, so there were
 * no registrations to carry over.
 */

/**
 * A stable document id for an endpoint.
 *
 * The endpoint cannot be the id: it is a URL, and a Firestore document id may
 * not contain a slash. Hashing also keeps ids a fixed length, which endpoints
 * are emphatically not.
 */
function endpointId(endpoint: string): string {
    return createHash("sha256").update(endpoint).digest("hex");
}

function isValidSubscription(sub: unknown): sub is WebPushSubscription {
    const s = sub as WebPushSubscription | null;
    return !!s && typeof s.endpoint === "string"
        && /^https:\/\//.test(s.endpoint)
        && typeof s.keys?.p256dh === "string" && s.keys.p256dh.length > 20
        && typeof s.keys?.auth === "string" && s.keys.auth.length > 10;
}

/**
 * Register this browser for push.
 *
 * Keyed by the endpoint rather than by user: one person may have the app on a
 * phone and a laptop, and the same device may be shared. Re-registering an
 * endpoint refreshes `lastSeenAt` and, importantly, its owner — a shared device
 * where somebody else signs in should notify the person actually signed in.
 */
export async function registerPushSubscription(
    subscription: WebPushSubscription,
    platform?: string
): Promise<ResponseData<null>> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) throw new Error("Unauthorized");
        if (!isValidSubscription(subscription)) throw new Error("That subscription doesn't look right.");

        const now = new Date().toISOString();
        await db.collection(SUBS).doc(endpointId(subscription.endpoint)).set(
            {
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                uid: tokens.decodedToken.uid,
                platform: (platform ?? "").slice(0, 60),
                lastSeenAt: now,
                createdAt: now,
            },
            { merge: true }
        );

        return { success: true, message: "Notifications are on", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function unregisterPushSubscription(endpoint: string): Promise<ResponseData<null>> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) throw new Error("Unauthorized");

        const snap = await db.collection(SUBS).doc(endpointId(endpoint)).get();
        // Only remove your own registration.
        if (snap.exists && snap.data()?.uid === tokens.decodedToken.uid) {
            await snap.ref.delete();
        }
        return { success: true, message: "Notifications are off", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/** Whether this browser's subscription is still registered, so the UI can be honest. */
export async function isPushRegistered(endpoint: string): Promise<boolean> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens || !endpoint) return false;
        const snap = await db.collection(SUBS).doc(endpointId(endpoint)).get();
        return snap.exists && snap.data()?.uid === tokens.decodedToken.uid;
    } catch {
        return false;
    }
}

/**
 * Send a push for an activity.
 *
 * Not exported to the client — it is called from recordActivity, so every
 * in-app notification gets the same treatment without each caller remembering.
 * Failure is swallowed: a push that doesn't send must never break the action
 * that triggered it.
 */
export async function sendActivityPush({
    recipientId,
    action,
    url,
}: {
    recipientId: string;
    action: ActivityAction;
    url?: string;
}): Promise<void> {
    try {
        if (!recipientId || !isPushWorthy(action) || !vapidConfigured()) return;

        const copy = pushCopyFor(action);
        if (!copy) return;

        const snap = await db.collection(SUBS).where("uid", "==", recipientId).get();
        if (snap.empty) return;

        // The service worker draws the notification from this payload. It is
        // encrypted end-to-end: the push service forwarding it cannot read it.
        const payload = JSON.stringify({
            title: copy.title,
            body: copy.body,
            url: url || copy.url,
            tag: action,
        });

        // One person's devices are independent — a phone that has been wiped
        // must not stop the laptop being notified — so every send is settled
        // separately and a failure only affects its own record.
        const results = await Promise.allSettled(
            snap.docs.map(async (doc) => {
                const data = doc.data() as WebPushSubscription;
                const result = await sendWebPush(
                    { endpoint: data.endpoint, keys: data.keys },
                    payload,
                    { urgency: "high" }
                );
                return { id: doc.id, gone: result.gone };
            })
        );

        // Subscriptions die when an app is uninstalled or site data is cleared.
        // Left in place they turn every later send into a wasted request.
        const dead = results
            .filter((r): r is PromiseFulfilledResult<{ id: string; gone: boolean }> =>
                r.status === "fulfilled" && r.value.gone)
            .map((r) => r.value.id);

        await Promise.all(dead.map((id) => db.collection(SUBS).doc(id).delete().catch(() => {})));
    } catch {
        // Deliberately silent — see the note above.
    }
}
