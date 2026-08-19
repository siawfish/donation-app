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
    ActivityKind, Ambassador, AmbassadorActivity, AmbassadorKpis, AmbassadorStatus,
    AmbassadorTargets, AmbassadorType, DEFAULT_TARGETS, EMPTY_KPIS,
} from "@/lib/ambassadors";

const AMB = "ambassadors";
const ACT = "ambassadorActivities";
const USERS = "users";

const iso = () => new Date().toISOString();
const DAY = 86_400_000;

async function requireAdmin(capability: Capability = "ambassadors.manage") {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) throw new Error("Unauthorized");
    const role = await getMyAdminRole();
    if (!can(role, capability)) throw new Error("You don't have permission to do that.");
    return { uid: tokens.decodedToken.uid };
}

async function requireSignedIn() {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) throw new Error("Unauthorized");
    return { uid: tokens.decodedToken.uid };
}

/* ── KPI computation ───────────────────────────────────────────────────── */

/**
 * Compute KPIs for every ambassador in one pass.
 *
 * Reads users, items and requests once and buckets by `referredBy`. Doing it
 * per ambassador would be three reads each; one pass is far cheaper at
 * programme scale, and every figure comes from the same snapshot so the roster
 * can never show two ambassadors measured against different moments.
 */
async function computeAllKpis(): Promise<Map<string, AmbassadorKpis>> {
    const [usersSnap, itemsSnap, requestsSnap, actsSnap] = await Promise.all([
        db.collection(USERS).get(),
        db.collection("items").get(),
        db.collection("requests").get(),
        db.collection(ACT).get(),
    ]);

    // Who did anything at all, and who saw a handover through.
    const activated = new Set<string>();
    const handedOver = new Set<string>();
    itemsSnap.docs.forEach((d) => {
        const v = d.data();
        if (v.createdBy) activated.add(v.createdBy);
        if (v.createdBy && v.donatedTo) handedOver.add(v.createdBy);
    });
    requestsSnap.docs.forEach((d) => {
        const v = d.data();
        if (v.createdBy) activated.add(v.createdBy);
        if (v.createdBy && v.status === "completed") handedOver.add(v.createdBy);
    });

    const now = Date.now();
    const out = new Map<string, AmbassadorKpis>();
    const bucket = (id: string): AmbassadorKpis => {
        if (!out.has(id)) out.set(id, { ...EMPTY_KPIS });
        return out.get(id)!;
    };

    usersSnap.docs.forEach((d) => {
        const v = d.data();
        const ref = v.referredBy as string | undefined;
        if (!ref) return;

        const k = bucket(ref);
        const joined = Date.parse(v.createdAt ?? "");
        const recent = !Number.isNaN(joined) && now - joined <= 30 * DAY;

        k.signups += 1;
        if (recent) k.signups30d += 1;

        if (activated.has(d.id)) {
            k.activations += 1;
            if (recent) k.activations30d += 1;
        }
        if (handedOver.has(d.id)) {
            k.handovers += 1;
            if (recent) k.handovers30d += 1;
        }
    });

    actsSnap.docs.forEach((d) => {
        const v = d.data() as AmbassadorActivity;
        const k = bucket(v.ambassadorId);
        k.loggedActivities += 1;
        if (!k.lastActivityAt || v.createdAt > k.lastActivityAt) k.lastActivityAt = v.createdAt;
    });

    out.forEach((k) => {
        k.activationRate = k.signups ? Math.round((k.activations / k.signups) * 100) : 0;
    });

    return out;
}

/* ── Admin: roster ─────────────────────────────────────────────────────── */

export interface AmbassadorRow extends Ambassador {
    kpis: AmbassadorKpis;
}

export async function listAmbassadors(): Promise<ResponseData<AmbassadorRow[]>> {
    try {
        await requireAdmin("ambassadors.view");
        const [snap, kpis] = await Promise.all([db.collection(AMB).get(), computeAllKpis()]);
        const rows = snap.docs.map((d) => ({
            ...(d.data() as Ambassador),
            uid: d.id,
            kpis: kpis.get(d.id) ?? { ...EMPTY_KPIS },
        }));
        rows.sort(
            (a, b) => b.kpis.signups30d - a.kpis.signups30d || (a.name ?? "").localeCompare(b.name ?? "")
        );
        return { success: true, message: "ok", data: rows };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

export interface AmbassadorDetail {
    ambassador: Ambassador;
    kpis: AmbassadorKpis;
    activities: AmbassadorActivity[];
    /** The people they brought in, so the headline number is inspectable. */
    referred: { id: string; name: string; email: string; joinedAt?: string; activated: boolean }[];
}

async function buildDetail(uid: string): Promise<ResponseData<AmbassadorDetail | null>> {
    const [snap, kpisAll, actsSnap, referredSnap, itemsSnap, requestsSnap] = await Promise.all([
        db.collection(AMB).doc(uid).get(),
        computeAllKpis(),
        db.collection(ACT).where("ambassadorId", "==", uid).get(),
        db.collection(USERS).where("referredBy", "==", uid).get(),
        db.collection("items").get(),
        db.collection("requests").get(),
    ]);
    if (!snap.exists) return { success: false, message: "Not an ambassador", data: null };

    const activated = new Set<string>();
    itemsSnap.docs.forEach((d) => d.data().createdBy && activated.add(d.data().createdBy));
    requestsSnap.docs.forEach((d) => d.data().createdBy && activated.add(d.data().createdBy));

    const activities = actsSnap.docs
        .map((d) => ({ ...(d.data() as AmbassadorActivity), id: d.id }))
        .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));

    const referred = referredSnap.docs
        .map((d) => ({
            id: d.id,
            name: d.data().name ?? "",
            email: d.data().email ?? "",
            joinedAt: d.data().createdAt,
            activated: activated.has(d.id),
        }))
        .sort((a, b) => (b.joinedAt ?? "").localeCompare(a.joinedAt ?? ""));

    return {
        success: true,
        message: "ok",
        data: {
            ambassador: { ...(snap.data() as Ambassador), uid: snap.id },
            kpis: kpisAll.get(uid) ?? { ...EMPTY_KPIS },
            activities,
            referred,
        },
    };
}

export async function getAmbassador(uid: string): Promise<ResponseData<AmbassadorDetail | null>> {
    try {
        await requireAdmin("ambassadors.view");
        return await buildDetail(uid);
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/* ── Admin: manage ─────────────────────────────────────────────────────── */

export async function addAmbassador(input: {
    uid: string;
    type: AmbassadorType;
    territory: string;
    targets?: AmbassadorTargets;
    stipend?: number;
}): Promise<ResponseData<null>> {
    try {
        const { uid: actor } = await requireAdmin();
        const territory = input.territory?.trim();
        if (!territory) throw new Error("Give them a campus or town.");

        const userSnap = await db.collection(USERS).doc(input.uid).get();
        if (!userSnap.exists) throw new Error("That member doesn't exist.");

        const existing = await db.collection(AMB).doc(input.uid).get();
        if (existing.exists) throw new Error("They're already an ambassador.");

        const now = iso();
        await db.collection(AMB).doc(input.uid).set({
            uid: input.uid,
            name: userSnap.data()?.name ?? "",
            email: userSnap.data()?.email ?? "",
            type: input.type,
            territory,
            status: "active",
            targets: input.targets ?? DEFAULT_TARGETS,
            stipend: input.stipend ?? 0,
            startedAt: now,
            createdAt: now,
            updatedAt: now,
            createdBy: actor,
        });

        revalidatePath("/app/admin/ambassadors");
        return { success: true, message: "Ambassador added", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function updateAmbassador(
    uid: string,
    patch: {
        type?: AmbassadorType;
        territory?: string;
        status?: AmbassadorStatus;
        targets?: AmbassadorTargets;
        stipend?: number;
    }
): Promise<ResponseData<null>> {
    try {
        await requireAdmin();
        const update: Record<string, unknown> = { updatedAt: iso() };

        if (patch.type) update.type = patch.type;
        if (patch.territory !== undefined) {
            const t = patch.territory.trim();
            if (!t) throw new Error("Territory can't be empty.");
            update.territory = t;
        }
        if (patch.status) {
            update.status = patch.status;
            // Stamp the end, so a roster shows when someone actually stopped.
            if (patch.status === "ended") update.endedAt = iso();
        }
        if (patch.targets) {
            const clamp = (n: number) => Math.max(0, Math.min(9999, Math.round(n || 0)));
            update.targets = {
                signups: clamp(patch.targets.signups),
                activations: clamp(patch.targets.activations),
                handovers: clamp(patch.targets.handovers),
            };
        }
        if (patch.stipend !== undefined) update.stipend = Math.max(0, Math.round(patch.stipend || 0));

        await db.collection(AMB).doc(uid).update(update);
        revalidatePath("/app/admin/ambassadors");
        revalidatePath(`/app/admin/ambassadors/${uid}`);
        return { success: true, message: "Saved", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function removeAmbassador(uid: string): Promise<ResponseData<null>> {
    try {
        await requireAdmin();
        // Activities survive on purpose: they record work that was done, and
        // ending someone's term should not erase it.
        await db.collection(AMB).doc(uid).delete();
        revalidatePath("/app/admin/ambassadors");
        return { success: true, message: "Removed from the programme", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function reviewActivity(id: string): Promise<ResponseData<null>> {
    try {
        const { uid } = await requireAdmin();
        await db.collection(ACT).doc(id).update({ reviewedBy: uid, reviewedAt: iso() });
        revalidatePath("/app/admin/ambassadors");
        return { success: true, message: "Marked as seen", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/** Recent work across the whole programme, for the admin overview. */
export async function listRecentActivity(limit = 20): Promise<ResponseData<AmbassadorActivity[]>> {
    try {
        await requireAdmin("ambassadors.view");
        const snap = await db.collection(ACT).get();
        const rows = snap.docs
            .map((d) => ({ ...(d.data() as AmbassadorActivity), id: d.id }))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, limit);
        return { success: true, message: "ok", data: rows };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

/* ── Ambassador self-service ───────────────────────────────────────────── */

/**
 * The signed-in member's own record, or null.
 *
 * Separate from the admin reads on purpose: an ambassador is not an admin, and
 * this only ever resolves the caller's own uid — there is no parameter to
 * tamper with.
 */
export async function getMyAmbassadorship(): Promise<ResponseData<AmbassadorDetail | null>> {
    try {
        const { uid } = await requireSignedIn();
        const snap = await db.collection(AMB).doc(uid).get();
        if (!snap.exists) return { success: false, message: "Not an ambassador", data: null };
        return await buildDetail(uid);
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function logActivity(input: {
    kind: ActivityKind;
    title: string;
    detail?: string;
    reach?: number;
    occurredOn: string;
}): Promise<ResponseData<null>> {
    try {
        const { uid } = await requireSignedIn();
        const snap = await db.collection(AMB).doc(uid).get();
        if (!snap.exists) throw new Error("You're not on the ambassador programme.");
        if ((snap.data() as Ambassador).status !== "active") {
            throw new Error("Your ambassadorship isn't active.");
        }

        const title = input.title?.trim();
        if (!title) throw new Error("Give it a short title.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn)) throw new Error("Pick a date.");
        // Work can be logged after the fact, never before it happened.
        if (Date.parse(`${input.occurredOn}T00:00:00`) > Date.now() + DAY) {
            throw new Error("That date is in the future.");
        }

        await db.collection(ACT).add({
            ambassadorId: uid,
            ambassadorName: (snap.data() as Ambassador).name ?? "",
            kind: input.kind,
            title: title.slice(0, 120),
            detail: (input.detail ?? "").trim().slice(0, 2000),
            reach: Math.max(0, Math.min(100000, Math.round(input.reach || 0))),
            occurredOn: input.occurredOn,
            createdAt: iso(),
        });

        revalidatePath("/app/ambassador");
        revalidatePath("/app/admin/ambassadors");
        return { success: true, message: "Logged", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function deleteMyActivity(id: string): Promise<ResponseData<null>> {
    try {
        const { uid } = await requireSignedIn();
        const snap = await db.collection(ACT).doc(id).get();
        if (!snap.exists) throw new Error("Not found");
        if ((snap.data() as AmbassadorActivity).ambassadorId !== uid) {
            throw new Error("That isn't yours to delete.");
        }
        await snap.ref.delete();
        revalidatePath("/app/ambassador");
        return { success: true, message: "Removed", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/**
 * Standings across active ambassadors.
 *
 * Names are shown deliberately: the point is friendly competition between
 * people who already know they are on a programme together.
 */
export async function ambassadorStandings(): Promise<
    ResponseData<{ uid: string; name: string; territory: string; signups30d: number; activations30d: number }[]>
> {
    try {
        await requireSignedIn();
        const [snap, kpis] = await Promise.all([
            db.collection(AMB).where("status", "==", "active").get(),
            computeAllKpis(),
        ]);
        const rows = snap.docs.map((d) => {
            const v = d.data() as Ambassador;
            const k = kpis.get(d.id) ?? EMPTY_KPIS;
            return {
                uid: d.id,
                name: v.name ?? "Ambassador",
                territory: v.territory,
                signups30d: k.signups30d,
                activations30d: k.activations30d,
            };
        });
        rows.sort((a, b) => b.signups30d - a.signups30d || b.activations30d - a.activations30d);
        return { success: true, message: "ok", data: rows };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}
