'use server';

import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ResponseData } from "@/app/types";
import { Capability, can } from "@/lib/roles";
import { getMyAdminRole } from "./admin";
import {
    CrmInteraction,
    CrmMemberRow,
    CrmNote,
    CrmProfile,
    CrmTask,
    InteractionChannel,
    SegmentId,
    inSegment,
    isValidTag,
    normaliseTag,
} from "@/lib/crm";

const USERS = "users";
const PROFILES = "crmProfiles";
const NOTES = "crmNotes";
const INTERACTIONS = "crmInteractions";
const TASKS = "crmTasks";
const ROLES = "adminRoles";

const MAX_TAGS = 12;
const MAX_BODY = 4_000;

async function requireCap(capability: Capability) {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) throw new Error("Unauthorized");
    const role = await getMyAdminRole();
    if (!can(role, capability)) throw new Error("You don't have permission to do that.");
    return { tokens, uid: tokens.decodedToken.uid };
}

/** The acting admin's display name, so entries read as people not uids. */
async function actorName(uid: string): Promise<string> {
    const snap = await db.collection(USERS).doc(uid).get();
    return (snap.data()?.name as string) || "Admin";
}

const iso = () => new Date().toISOString();

/* ── Member list ───────────────────────────────────────────────────────── */

/**
 * Every member with the activity the CRM cares about.
 *
 * Reads users, items, requests and tasks once each and joins in memory. The
 * per-member alternative is four reads a row, and several segments need counts
 * that no single Firestore index can answer. At this platform's size one pass
 * is both cheaper and simpler than maintaining denormalised counters that can
 * drift.
 */
export async function listCrmMembers({
    search = "",
    segment = "all",
    tag = "",
}: { search?: string; segment?: SegmentId; tag?: string } = {}): Promise<ResponseData<CrmMemberRow[]>> {
    try {
        await requireCap("crm.view");

        const [users, items, requests, profiles, tasks, roles] = await Promise.all([
            db.collection(USERS).get(),
            db.collection("items").get(),
            db.collection("requests").get(),
            db.collection(PROFILES).get(),
            db.collection(TASKS).where("status", "==", "open").get(),
            db.collection(ROLES).get(),
        ]);

        const listings = new Map<string, number>();
        const rehomed = new Map<string, number>();
        for (const d of items.docs) {
            const v = d.data();
            const owner = v.createdBy;
            if (!owner) continue;
            listings.set(owner, (listings.get(owner) ?? 0) + 1);
            if (v.donatedTo) rehomed.set(owner, (rehomed.get(owner) ?? 0) + 1);
        }

        const requested = new Map<string, number>();
        for (const d of requests.docs) {
            const by = d.data().createdBy;
            if (by) requested.set(by, (requested.get(by) ?? 0) + 1);
        }

        const tagsByMember = new Map<string, string[]>();
        for (const d of profiles.docs) {
            const v = d.data() as CrmProfile;
            if (Array.isArray(v.tags)) tagsByMember.set(d.id, v.tags);
        }

        const openTasks = new Map<string, number>();
        for (const d of tasks.docs) {
            const m = d.data().memberId;
            if (m) openTasks.set(m, (openTasks.get(m) ?? 0) + 1);
        }

        const roleByUid = new Map<string, string>();
        for (const d of roles.docs) roleByUid.set(d.id, d.data().role);

        let rows: CrmMemberRow[] = users.docs.map((d) => {
            const v = d.data();
            return {
                id: d.id,
                name: v.name ?? "",
                email: v.email ?? "",
                verified: v.verified === true,
                suspended: v.suspended === true,
                role: roleByUid.get(d.id) ?? null,
                tags: tagsByMember.get(d.id) ?? [],
                listingsCount: listings.get(d.id) ?? 0,
                rehomedCount: rehomed.get(d.id) ?? 0,
                requestsCount: requested.get(d.id) ?? 0,
                createdAt: v.createdAt,
                lastLogin: v.lastLogin,
                openTasks: openTasks.get(d.id) ?? 0,
            };
        });

        const now = Date.now();
        rows = rows.filter((r) => inSegment(r, segment, now));

        if (tag) {
            const t = normaliseTag(tag);
            rows = rows.filter((r) => r.tags.includes(t));
        }

        const q = search.trim().toLowerCase();
        if (q) {
            rows = rows.filter(
                (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
            );
        }

        rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
        return { success: true, message: "ok", data: rows };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

/** Counts for every segment, for the sidebar. One read pass, not one per segment. */
export async function getSegmentCounts(): Promise<ResponseData<Record<string, number>>> {
    try {
        await requireCap("crm.view");
        const all = await listCrmMembers({ segment: "all" });
        const now = Date.now();
        const counts: Record<string, number> = {};
        for (const s of [
            "all",
            "verified_never_listed",
            "unverified_active",
            "inactive_30",
            "top_rehomers",
            "new_this_month",
            "suspended",
        ] as SegmentId[]) {
            counts[s] = all.data.filter((m) => inSegment(m, s, now)).length;
        }
        return { success: true, message: "ok", data: counts };
    } catch (error: any) {
        return { success: false, message: error.message, data: {} };
    }
}

/* ── Member 360 ────────────────────────────────────────────────────────── */

export interface CrmMemberDetail {
    member: CrmMemberRow | null;
    profileUrl?: string;
    locationName?: string;
    verifiedAt?: string;
    notes: CrmNote[];
    interactions: CrmInteraction[];
    tasks: CrmTask[];
    listings: { id: string; name: string; createdAt?: string; rehomed: boolean }[];
    requests: { id: string; itemName: string; status: string; createdAt?: string }[];
}

export async function getCrmMember(uid: string): Promise<ResponseData<CrmMemberDetail | null>> {
    try {
        await requireCap("crm.view");

        const [userSnap, notesSnap, interactionsSnap, tasksSnap, itemsSnap, requestsSnap, profileSnap, roleSnap] =
            await Promise.all([
                db.collection(USERS).doc(uid).get(),
                db.collection(NOTES).where("memberId", "==", uid).get(),
                db.collection(INTERACTIONS).where("memberId", "==", uid).get(),
                db.collection(TASKS).where("memberId", "==", uid).get(),
                db.collection("items").where("createdBy", "==", uid).get(),
                db.collection("requests").where("createdBy", "==", uid).get(),
                db.collection(PROFILES).doc(uid).get(),
                db.collection(ROLES).doc(uid).get(),
            ]);

        if (!userSnap.exists) return { success: false, message: "No such member", data: null };
        const u = userSnap.data() ?? {};

        const listings = itemsSnap.docs.map((d) => ({
            id: d.id,
            name: d.data().name ?? "Untitled",
            createdAt: d.data().createdAt,
            rehomed: !!d.data().donatedTo,
        }));
        listings.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

        // Request rows are useless without the item's name, and there are few
        // enough per member to resolve directly.
        const requests = await Promise.all(
            requestsSnap.docs.map(async (d) => {
                const v = d.data();
                let itemName = "Unknown item";
                if (v.itemId) {
                    const it = await db.collection("items").doc(v.itemId).get();
                    itemName = (it.data()?.name as string) ?? itemName;
                }
                return { id: d.id, itemName, status: v.status ?? "pending", createdAt: v.createdAt };
            })
        );
        requests.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

        const notes = notesSnap.docs
            .map((d) => ({ ...(d.data() as CrmNote), id: d.id }))
            .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt.localeCompare(a.createdAt));

        const interactions = interactionsSnap.docs
            .map((d) => ({ ...(d.data() as CrmInteraction), id: d.id }))
            .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

        const tasks = tasksSnap.docs
            .map((d) => ({ ...(d.data() as CrmTask), id: d.id }))
            .sort(
                (a, b) =>
                    Number(a.status === "done") - Number(b.status === "done") ||
                    a.dueOn.localeCompare(b.dueOn)
            );

        const member: CrmMemberRow = {
            id: uid,
            name: u.name ?? "",
            email: u.email ?? "",
            verified: u.verified === true,
            suspended: u.suspended === true,
            role: roleSnap.data()?.role ?? null,
            tags: (profileSnap.data() as CrmProfile | undefined)?.tags ?? [],
            listingsCount: listings.length,
            rehomedCount: listings.filter((l) => l.rehomed).length,
            requestsCount: requests.length,
            createdAt: u.createdAt,
            lastLogin: u.lastLogin,
            openTasks: tasks.filter((t) => t.status === "open").length,
        };

        return {
            success: true,
            message: "ok",
            data: {
                member,
                profileUrl: u.profileUrl,
                locationName: u.preferedLocation,
                verifiedAt: u.verifiedAt,
                notes,
                interactions,
                tasks,
                listings,
                requests,
            },
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/* ── Tags ──────────────────────────────────────────────────────────────── */

export async function setMemberTags(uid: string, tags: string[]): Promise<ResponseData<string[]>> {
    try {
        const { uid: actor } = await requireCap("crm.manage");

        const cleaned = Array.from(
            new Set(tags.map(normaliseTag).filter((t) => isValidTag(t)))
        ).slice(0, MAX_TAGS);

        await db.collection(PROFILES).doc(uid).set(
            { memberId: uid, tags: cleaned, updatedAt: iso(), updatedBy: actor },
            { merge: true }
        );

        revalidatePath(`/app/admin/crm/${uid}`);
        return { success: true, message: "Tags updated", data: cleaned };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

/** Every tag in use, for the filter dropdown. */
export async function listAllTags(): Promise<ResponseData<string[]>> {
    try {
        await requireCap("crm.view");
        const snap = await db.collection(PROFILES).get();
        const set = new Set<string>();
        snap.docs.forEach((d) => (d.data().tags ?? []).forEach((t: string) => set.add(t)));
        // Array.from rather than spread: this project's target predates
        // downlevel Set iteration.
        return { success: true, message: "ok", data: Array.from(set).sort() };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

/* ── Notes ─────────────────────────────────────────────────────────────── */

export async function addNote({
    memberId,
    body,
    pinned,
}: { memberId: string; body: string; pinned?: boolean }): Promise<ResponseData<null>> {
    try {
        const { uid } = await requireCap("crm.manage");
        const text = body.trim();
        if (!text) throw new Error("Write something first.");
        if (text.length > MAX_BODY) throw new Error("That note is too long.");

        await db.collection(NOTES).add({
            memberId,
            body: text,
            pinned: pinned === true,
            authorId: uid,
            authorName: await actorName(uid),
            createdAt: iso(),
        });

        revalidatePath(`/app/admin/crm/${memberId}`);
        return { success: true, message: "Note added", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function deleteNote(noteId: string, memberId: string): Promise<ResponseData<null>> {
    try {
        await requireCap("crm.manage");
        await db.collection(NOTES).doc(noteId).delete();
        revalidatePath(`/app/admin/crm/${memberId}`);
        return { success: true, message: "Note deleted", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function toggleNotePin(noteId: string, memberId: string, pinned: boolean): Promise<ResponseData<null>> {
    try {
        await requireCap("crm.manage");
        await db.collection(NOTES).doc(noteId).update({ pinned });
        revalidatePath(`/app/admin/crm/${memberId}`);
        return { success: true, message: pinned ? "Note pinned" : "Note unpinned", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/* ── Interactions ──────────────────────────────────────────────────────── */

export async function logInteraction({
    memberId,
    channel,
    direction,
    summary,
    occurredAt,
}: {
    memberId: string;
    channel: InteractionChannel;
    direction: "inbound" | "outbound";
    summary: string;
    occurredAt?: string;
}): Promise<ResponseData<null>> {
    try {
        const { uid } = await requireCap("crm.manage");
        const text = summary.trim();
        if (!text) throw new Error("Add a short summary.");
        if (text.length > MAX_BODY) throw new Error("That summary is too long.");

        // A conversation can be logged after the fact, but not before it happened.
        const when = occurredAt ? new Date(occurredAt).toISOString() : iso();
        if (Number.isNaN(Date.parse(when))) throw new Error("That date isn't valid.");
        if (Date.parse(when) > Date.now() + 60_000) throw new Error("That date is in the future.");

        await db.collection(INTERACTIONS).add({
            memberId,
            channel,
            direction,
            summary: text,
            occurredAt: when,
            loggedBy: uid,
            loggedByName: await actorName(uid),
            createdAt: iso(),
        });

        revalidatePath(`/app/admin/crm/${memberId}`);
        return { success: true, message: "Interaction logged", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function deleteInteraction(id: string, memberId: string): Promise<ResponseData<null>> {
    try {
        await requireCap("crm.manage");
        await db.collection(INTERACTIONS).doc(id).delete();
        revalidatePath(`/app/admin/crm/${memberId}`);
        return { success: true, message: "Entry removed", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/* ── Tasks ─────────────────────────────────────────────────────────────── */

export async function createTask({
    memberId,
    title,
    dueOn,
    assigneeId,
}: { memberId: string; title: string; dueOn: string; assigneeId?: string }): Promise<ResponseData<null>> {
    try {
        const { uid } = await requireCap("crm.manage");
        const text = title.trim();
        if (!text) throw new Error("Give the task a title.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) throw new Error("Pick a due date.");

        const owner = assigneeId || uid;
        const [memberSnap, ownerName] = await Promise.all([
            db.collection(USERS).doc(memberId).get(),
            actorName(owner),
        ]);

        await db.collection(TASKS).add({
            memberId,
            memberName: memberSnap.data()?.name ?? "",
            title: text,
            dueOn,
            assigneeId: owner,
            assigneeName: ownerName,
            status: "open",
            createdBy: uid,
            createdAt: iso(),
        });

        revalidatePath(`/app/admin/crm/${memberId}`);
        revalidatePath("/app/admin/crm");
        return { success: true, message: "Task created", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function setTaskStatus(
    id: string,
    status: "open" | "done",
    memberId?: string
): Promise<ResponseData<null>> {
    try {
        const { uid } = await requireCap("crm.manage");
        await db.collection(TASKS).doc(id).update(
            status === "done"
                ? { status, completedAt: iso(), completedBy: uid }
                : { status, completedAt: null, completedBy: null }
        );
        if (memberId) revalidatePath(`/app/admin/crm/${memberId}`);
        revalidatePath("/app/admin/crm");
        return { success: true, message: status === "done" ? "Task closed" : "Task reopened", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function deleteTask(id: string, memberId?: string): Promise<ResponseData<null>> {
    try {
        await requireCap("crm.manage");
        await db.collection(TASKS).doc(id).delete();
        if (memberId) revalidatePath(`/app/admin/crm/${memberId}`);
        revalidatePath("/app/admin/crm");
        return { success: true, message: "Task deleted", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/** Open tasks across all members, soonest first — the CRM landing queue. */
export async function listOpenTasks(): Promise<ResponseData<CrmTask[]>> {
    try {
        await requireCap("crm.view");
        const snap = await db.collection(TASKS).where("status", "==", "open").get();
        const rows = snap.docs
            .map((d) => ({ ...(d.data() as CrmTask), id: d.id }))
            .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
        return { success: true, message: "ok", data: rows };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

/** Admins available as task assignees. */
export async function listAssignees(): Promise<ResponseData<{ id: string; name: string }[]>> {
    try {
        await requireCap("crm.view");
        const snap = await db.collection(ROLES).get();
        const rows = await Promise.all(
            snap.docs.map(async (d) => ({
                id: d.id,
                name: (d.data().name as string) || (await actorName(d.id)),
            }))
        );
        return { success: true, message: "ok", data: rows };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}
