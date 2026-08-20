"use server";

/**
 * Following an organisation, and telling followers when it lists something.
 *
 * The point of a follow is the notification. Without it a follow is a vanity
 * counter, and someone who liked a school's furniture clear-out has no way to
 * hear about the next one — they have to keep checking, which nobody does.
 *
 * Reads and writes both go through server actions rather than the client SDK.
 * A follow is cheap to forge from a browser (it inflates an organisation's
 * standing), and the follower list is a list of people, which is not something
 * to expose to the page that would most like to have it.
 */

import { cookies } from "next/headers";
import { getTokens } from "next-firebase-auth-edge";
import { revalidatePath } from "next/cache";
import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { ActivityAction, ResponseData } from "@/app/types";
import { sendActivityPush } from "./push";

const FOLLOWS = "orgFollowers";
const ORGS = "organisations";

const iso = () => new Date().toISOString();

/** Deterministic id, so following twice is the same row rather than two. */
const followId = (orgId: string, uid: string) => `${orgId}_${uid}`;

async function currentUid(): Promise<string | null> {
    const tokens = await getTokens(await cookies(), authConfig);
    return tokens?.decodedToken.uid ?? null;
}

export interface FollowState {
    following: boolean;
    followers: number;
}

/** Follower count for a storefront. Public — it appears on the page. */
export async function countFollowers(orgId: string): Promise<number> {
    try {
        const snap = await db.collection(FOLLOWS).where("orgId", "==", orgId).count().get();
        return snap.data().count ?? 0;
    } catch {
        return 0;
    }
}

/** Whether the signed-in person follows this organisation, plus the count. */
export async function getFollowState(orgId: string): Promise<FollowState> {
    const uid = await currentUid();
    const followers = await countFollowers(orgId);
    if (!uid) return { following: false, followers };

    try {
        const doc = await db.collection(FOLLOWS).doc(followId(orgId, uid)).get();
        return { following: doc.exists, followers };
    } catch {
        return { following: false, followers };
    }
}

export async function followOrg(orgId: string): Promise<ResponseData<FollowState | null>> {
    try {
        const uid = await currentUid();
        if (!uid) throw new Error("Sign in to follow an organisation.");

        const org = await db.collection(ORGS).doc(orgId).get();
        if (!org.exists || org.data()?.status !== "active") {
            throw new Error("That organisation isn't taking followers.");
        }

        await db.collection(FOLLOWS).doc(followId(orgId, uid)).set({
            orgId,
            uid,
            createdAt: iso(),
        });

        revalidatePath(`/o/${org.data()?.slug}`);
        return { success: true, message: "Following", data: await getFollowState(orgId) };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function unfollowOrg(orgId: string): Promise<ResponseData<FollowState | null>> {
    try {
        const uid = await currentUid();
        if (!uid) throw new Error("Sign in first.");

        await db.collection(FOLLOWS).doc(followId(orgId, uid)).delete();

        const org = await db.collection(ORGS).doc(orgId).get();
        if (org.exists) revalidatePath(`/o/${org.data()?.slug}`);

        return { success: true, message: "Unfollowed", data: await getFollowState(orgId) };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/** Organisations the signed-in person follows, for their own feed and settings. */
export async function listFollowedOrgs(): Promise<
    { id: string; name: string; slug: string; logoUrl?: string; available: number }[]
> {
    try {
        const uid = await currentUid();
        if (!uid) return [];

        const snap = await db.collection(FOLLOWS).where("uid", "==", uid).get();
        const orgIds = snap.docs.map((d) => d.data().orgId as string);
        if (!orgIds.length) return [];

        // `in` takes 30 values at a time, so ask in chunks rather than one read
        // per organisation.
        const chunks: string[][] = [];
        for (let i = 0; i < orgIds.length; i += 30) chunks.push(orgIds.slice(i, i + 30));

        const results = await Promise.all(
            chunks.map((ids) =>
                db.collection(ORGS).where("__name__", "in", ids).get()
            )
        );

        const orgs = results.flatMap((r) => r.docs)
            .filter((d) => d.data().status === "active");

        // How much each has up right now — the reason to open the list at all.
        const counts = await Promise.all(
            orgs.map(async (d) => {
                const items = await db.collection("items")
                    .where("orgId", "==", d.id)
                    .where("donatedTo", "==", null)
                    .count().get();
                return items.data().count ?? 0;
            })
        );

        return orgs.map((d, i) => ({
            id: d.id,
            name: d.data().name,
            slug: d.data().slug,
            logoUrl: d.data().logoUrl || undefined,
            available: counts[i],
        }));
    } catch {
        return [];
    }
}

/**
 * Tell an organisation's followers that it has listed something.
 *
 * Called from the listing action and deliberately never awaited by it: a slow
 * or failing fan-out must not stop someone posting an item. Writes go in
 * batches because a popular organisation can have more followers than a single
 * batch allows.
 */
export async function notifyFollowersOfListing({
    orgId,
    itemId,
    listedBy,
}: {
    orgId: string;
    itemId: string;
    listedBy: string;
}): Promise<void> {
    try {
        const snap = await db.collection(FOLLOWS).where("orgId", "==", orgId).get();
        if (snap.empty) return;

        const followers = snap.docs
            .map((d) => d.data().uid as string)
            // Somebody on the team following their own organisation should not
            // be told about their own listing.
            .filter((uid) => uid && uid !== listedBy);
        if (!followers.length) return;

        const now = iso();
        for (let i = 0; i < followers.length; i += 400) {
            const batch = db.batch();
            for (const uid of followers.slice(i, i + 400)) {
                batch.set(db.collection("activities").doc(), {
                    action: ActivityAction.ORG_LISTED_ITEM,
                    recipientId: uid,
                    itemId,
                    orgId,
                    createdBy: listedBy,
                    read: false,
                    createdAt: now,
                    updatedAt: now,
                });
            }
            await batch.commit();
        }

        // Push is best-effort and per-person, so one dead device cannot stop
        // the rest of the list being told.
        await Promise.all(
            followers.map((uid) =>
                sendActivityPush({
                    recipientId: uid,
                    action: ActivityAction.ORG_LISTED_ITEM,
                    url: `/explore?id=${itemId}`,
                }).catch(() => {})
            )
        );
    } catch {
        // Silent by design — see the note above.
    }
}
