'use server';

import { cache } from "react";
import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { FirebaseErrors } from "@/firebase/errors";
import { ItemType, ResponseData, UserType } from "@/app/types";
import { AdminRole, AdminRoleRecord, Capability, can, isAdminRole } from "@/lib/roles";
import { recordAudit } from "./audit";

const ROLES = "adminRoles";

/**
 * The current viewer's admin role, or null.
 *
 * Memoised per request: a single admin page may check permissions several times
 * while rendering, and each check would otherwise be its own Firestore read.
 */
const readMyRole = cache(async (): Promise<AdminRole | null> => {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) return null;
        const snap = await db.collection(ROLES).doc(tokens.decodedToken.uid).get();
        const role = snap.data()?.role;
        return isAdminRole(role) ? role : null;
    } catch {
        return null;
    }
});

/**
 * Exported as a plain async function: a "use server" module may only export
 * async functions, and a `cache()`-wrapped value is not one. The memoisation
 * still applies — this just delegates to it.
 */
export async function getMyAdminRole(): Promise<AdminRole | null> {
    return readMyRole();
}

/** Throws unless the viewer holds `capability`. Every admin action starts here. */
async function requireCapability(capability: Capability) {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) throw new Error("Unauthorized");
    const role = await getMyAdminRole();
    if (!can(role, capability)) throw new Error("You don't have permission to do that.");
    return { tokens, role: role as AdminRole };
}

/* ── Roles ─────────────────────────────────────────────────────────────── */

export async function listAdmins(): Promise<ResponseData<AdminRoleRecord[]>> {
    try {
        await requireCapability("users.view");
        const snap = await db.collection(ROLES).get();
        const rows = snap.docs.map((d) => ({ ...d.data(), uid: d.id } as AdminRoleRecord));
        rows.sort((a, b) => a.role.localeCompare(b.role) || (a.email ?? "").localeCompare(b.email ?? ""));
        return { success: true, message: "ok", data: rows };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

export async function grantRole({
    uid,
    role,
}: {
    uid: string;
    role: AdminRole;
}): Promise<ResponseData<null>> {
    try {
        const { tokens } = await requireCapability("roles.manage");
        if (!isAdminRole(role)) throw new Error("Unknown role.");

        const userSnap = await db.collection("users").doc(uid).get();
        if (!userSnap.exists) throw new Error("No such member.");
        const user = userSnap.data() as UserType;

        await db.collection(ROLES).doc(uid).set({
            uid,
            role,
            email: user.email ?? "",
            name: user.name ?? "",
            grantedBy: tokens.decodedToken.uid,
            grantedAt: new Date().toISOString(),
        } satisfies AdminRoleRecord);

        await recordAudit({
            action: "role.grant",
            targetId: uid,
            targetLabel: user.name || user.email || uid,
            detail: role.replace("_", " "),
        });

        return { success: true, message: `${user.name || "Member"} is now ${role.replace("_", " ")}`, data: null };
    } catch (error: any) {
        return { success: false, message: FirebaseErrors[error.code] || error.message, data: null };
    }
}

export async function revokeRole(uid: string): Promise<ResponseData<null>> {
    try {
        const { tokens } = await requireCapability("roles.manage");

        // Losing every super admin would leave the project unadministrable, and
        // nothing in the UI could grant the role back.
        const target = await db.collection(ROLES).doc(uid).get();
        if (target.data()?.role === "super_admin") {
            const supers = await db.collection(ROLES).where("role", "==", "super_admin").get();
            if (supers.size <= 1) throw new Error("You can't remove the last super admin.");
            if (uid === tokens.decodedToken.uid) throw new Error("Ask another super admin to remove your own access.");
        }

        const revoked = await db.collection(ROLES).doc(uid).get();
        await db.collection(ROLES).doc(uid).delete();
        await recordAudit({
            action: "role.revoke",
            targetId: uid,
            targetLabel: (revoked.data()?.name as string) || uid,
            detail: (revoked.data()?.role as string) || "",
        });
        return { success: true, message: "Access removed", data: null };
    } catch (error: any) {
        return { success: false, message: FirebaseErrors[error.code] || error.message, data: null };
    }
}

/* ── Members ───────────────────────────────────────────────────────────── */

export interface AdminUserRow extends UserType {
    role?: AdminRole | null;
    listingsCount: number;
    rehomedCount: number;
}

export async function listMembers({
    search = "",
    limit = 200,
}: { search?: string; limit?: number } = {}): Promise<ResponseData<AdminUserRow[]>> {
    try {
        await requireCapability("users.view");

        const [usersSnap, itemsSnap, requestsSnap, rolesSnap] = await Promise.all([
            db.collection("users").limit(limit).get(),
            db.collection("items").get(),
            db.collection("requests").where("status", "==", "completed").get(),
            db.collection(ROLES).get(),
        ]);

        const listings: Record<string, number> = {};
        itemsSnap.docs.forEach((d) => {
            const uid = d.data().createdBy;
            if (uid) listings[uid] = (listings[uid] ?? 0) + 1;
        });

        const rehomed: Record<string, number> = {};
        requestsSnap.docs.forEach((d) => {
            const uid = d.data().donorId;
            if (uid) rehomed[uid] = (rehomed[uid] ?? 0) + 1;
        });

        const roles: Record<string, AdminRole> = {};
        rolesSnap.docs.forEach((d) => {
            const r = d.data().role;
            if (isAdminRole(r)) roles[d.id] = r;
        });

        const needle = search.trim().toLowerCase();
        const rows = usersSnap.docs
            .map((d) => {
                const u = { ...d.data(), id: d.id } as UserType;
                return {
                    ...u,
                    role: roles[d.id] ?? null,
                    listingsCount: listings[d.id] ?? 0,
                    rehomedCount: rehomed[d.id] ?? 0,
                } as AdminUserRow;
            })
            .filter((u) =>
                !needle ||
                u.name?.toLowerCase().includes(needle) ||
                u.email?.toLowerCase().includes(needle)
            )
            .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

        return { success: true, message: "ok", data: rows };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

export async function setMemberSuspended({
    uid,
    suspended,
}: {
    uid: string;
    suspended: boolean;
}): Promise<ResponseData<null>> {
    try {
        await requireCapability("users.suspend");

        // Suspending an admin would be a way around the role checks.
        const roleSnap = await db.collection(ROLES).doc(uid).get();
        if (roleSnap.exists) throw new Error("Remove their admin access first.");

        await db.collection("users").doc(uid).set({ suspended }, { merge: true });

        const target = await db.collection("users").doc(uid).get();
        await recordAudit({
            action: suspended ? "member.suspend" : "member.reinstate",
            targetId: uid,
            targetLabel: (target.data()?.name as string) || (target.data()?.email as string) || uid,
        });

        return { success: true, message: suspended ? "Member suspended" : "Member reinstated", data: null };
    } catch (error: any) {
        return { success: false, message: FirebaseErrors[error.code] || error.message, data: null };
    }
}

/* ── Listings ──────────────────────────────────────────────────────────── */

export interface AdminListingRow extends ItemType {
    ownerName?: string;
    ownerEmail?: string;
}

export async function listAllListings({
    search = "",
    status = "all",
}: { search?: string; status?: "all" | "available" | "rehomed" } = {}): Promise<ResponseData<AdminListingRow[]>> {
    try {
        await requireCapability("listings.view");

        const [itemsSnap, usersSnap] = await Promise.all([
            db.collection("items").get(),
            db.collection("users").get(),
        ]);

        const owners: Record<string, UserType> = {};
        usersSnap.docs.forEach((d) => (owners[d.id] = d.data() as UserType));

        const needle = search.trim().toLowerCase();
        const rows = itemsSnap.docs
            .map((d) => {
                const item = { ...d.data(), id: d.id } as ItemType;
                const owner = item.createdBy ? owners[item.createdBy] : undefined;
                return { ...item, ownerName: owner?.name, ownerEmail: owner?.email } as AdminListingRow;
            })
            .filter((i) => {
                if (status === "available" && i.donatedTo) return false;
                if (status === "rehomed" && !i.donatedTo) return false;
                if (!needle) return true;
                return (
                    i.name?.toLowerCase().includes(needle) ||
                    i.ownerName?.toLowerCase().includes(needle) ||
                    i.ownerEmail?.toLowerCase().includes(needle)
                );
            })
            .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

        return { success: true, message: "ok", data: rows };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

/** Removes a listing and the records that point at it, so nothing is orphaned. */
export async function removeListing(itemId: string): Promise<ResponseData<null>> {
    try {
        await requireCapability("listings.remove");

        // Read the name first: after the batch there is nothing left to name.
        const itemSnap = await db.collection("items").doc(itemId).get();
        const itemName = (itemSnap.data()?.name as string) || itemId;

        const dependants = await Promise.all(
            ["requests", "wishlist", "views"].map((c) =>
                db.collection(c).where("itemId", "==", itemId).get()
            )
        );

        const batch = db.batch();
        dependants.forEach((snap) => snap.docs.forEach((d) => batch.delete(d.ref)));
        batch.delete(db.collection("items").doc(itemId));
        await batch.commit();

        await recordAudit({ action: "listing.remove", targetId: itemId, targetLabel: itemName });

        return { success: true, message: "Listing removed", data: null };
    } catch (error: any) {
        return { success: false, message: FirebaseErrors[error.code] || error.message, data: null };
    }
}
