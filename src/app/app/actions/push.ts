'use server';

import { db, getFirebaseAdminApp } from "@/firebase/init";
import { getMessaging } from "firebase-admin/messaging";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { ActivityAction, ResponseData } from "@/app/types";
import { isPushWorthy, pushCopyFor } from "@/lib/push";

const TOKENS = "pushTokens";

/**
 * Register this browser for push.
 *
 * Keyed by the token itself rather than by user: one person may have the app on
 * a phone and a laptop, and the same device may be shared. Re-registering an
 * existing token just refreshes `lastSeenAt`.
 */
export async function registerPushToken(token: string, platform?: string): Promise<ResponseData<null>> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) throw new Error("Unauthorized");
        if (!token || token.length < 20) throw new Error("Invalid token");

        const now = new Date().toISOString();
        await db.collection(TOKENS).doc(token).set(
            {
                token,
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

export async function unregisterPushToken(token: string): Promise<ResponseData<null>> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) throw new Error("Unauthorized");

        const snap = await db.collection(TOKENS).doc(token).get();
        // Only remove your own registration.
        if (snap.exists && snap.data()?.uid === tokens.decodedToken.uid) {
            await snap.ref.delete();
        }
        return { success: true, message: "Notifications are off", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/** Whether this browser's token is still registered, so the UI can be honest. */
export async function isPushRegistered(token: string): Promise<boolean> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens || !token) return false;
        const snap = await db.collection(TOKENS).doc(token).get();
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
        if (!recipientId || !isPushWorthy(action)) return;

        const copy = pushCopyFor(action);
        if (!copy) return;

        const snap = await db.collection(TOKENS).where("uid", "==", recipientId).get();
        if (snap.empty) return;

        const tokens = snap.docs.map((d) => d.id);

        // Data-only: the service worker draws the notification. Including a
        // `notification` block would make the browser draw a second one.
        const res = await getMessaging(getFirebaseAdminApp()).sendEachForMulticast({
            tokens,
            data: {
                title: copy.title,
                body: copy.body,
                url: url || copy.url,
                tag: action,
            },
            webpush: {
                fcmOptions: { link: url || copy.url },
                headers: { Urgency: "high", TTL: "86400" },
            },
        });

        // Tokens die when an app is uninstalled or storage is cleared. Left in
        // place they turn every later send into a wasted call.
        const dead: string[] = [];
        res.responses.forEach((r, i) => {
            const code = (r.error as { code?: string } | undefined)?.code;
            if (
                !r.success &&
                (code === "messaging/registration-token-not-registered" ||
                    code === "messaging/invalid-argument")
            ) {
                dead.push(tokens[i]);
            }
        });
        await Promise.all(dead.map((t) => db.collection(TOKENS).doc(t).delete().catch(() => {})));
    } catch {
        // Deliberately silent — see the note above.
    }
}
