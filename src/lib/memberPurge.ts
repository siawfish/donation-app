import "server-only";
import type { Firestore, Query } from "firebase-admin/firestore";

/**
 * Every place a member's identity is written, and how to find it.
 *
 * Kept as data rather than as a long function so that adding a collection to
 * the app means adding one line here. A member deleted while some collection
 * quietly still holds their email is the failure this file exists to prevent,
 * and that failure is invisible — nothing breaks, the data is simply still
 * there.
 *
 * If you add a collection that stores a uid, add it here.
 */
export const PURGE_BY_UID: { collection: string; field: string }[] = [
    { collection: "items", field: "createdBy" },
    { collection: "requests", field: "createdBy" },
    { collection: "requests", field: "donorId" },
    { collection: "wishlist", field: "createdBy" },
    { collection: "messages", field: "senderId" },
    { collection: "messages", field: "recipientId" },
    { collection: "activities", field: "recipientId" },
    { collection: "activities", field: "createdBy" },
    { collection: "orgFollowers", field: "uid" },
    { collection: "orgMembers", field: "uid" },
    { collection: "campaignSends", field: "uid" },
    { collection: "crmNotes", field: "memberId" },
    { collection: "crmInteractions", field: "memberId" },
    { collection: "crmTasks", field: "memberId" },
];

/** Collections keyed by the uid itself rather than queried by a field. */
export const PURGE_BY_DOC_ID = ["users", "crmProfiles", "verifications", "emailOptOuts"];

/**
 * Anything hanging off a listing, which goes when the listing goes.
 *
 * `views` is carried over from `removeListing` and is empty today — view counts
 * live as a number on the item itself. It costs one query against an empty
 * collection and covers us if a per-view document ever comes back.
 */
export const LISTING_DEPENDANTS = ["requests", "wishlist", "views"];

/**
 * Delete every document a query matches, in batches.
 *
 * Firestore caps a batch at 500 writes, and a prolific member can easily be on
 * the wrong side of that across views and activities.
 */
export async function deleteQuery(db: Firestore, query: Query): Promise<number> {
    const snap = await query.get();
    if (snap.empty) return 0;

    for (let i = 0; i < snap.docs.length; i += 400) {
        const batch = db.batch();
        snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
    }
    return snap.size;
}

/** Firestore's `in` filter takes at most 30 values. */
export function chunk<T>(list: T[], size = 30): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
}
