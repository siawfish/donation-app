'use server';

import { cache } from "react";
import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ItemType, ResponseData } from "@/app/types";
import { can } from "@/lib/roles";
import { getMyAdminRole } from "./admin";
import { recordAudit } from "./audit";
import {
    EMPTY_IMPACT, OnboardingStep, OrgImpact, OrgMember, OrgRole, OrgStatus, OrgType,
    Organisation, estimateKg, isValidOrgSlug, onboardingSteps, orgCan, slugifyOrg,
} from "@/lib/organisations";

const ORGS = "organisations";
const MEMBERS = "orgMembers";
const ITEMS = "items";
const USERS = "users";

const iso = () => new Date().toISOString();

async function signedInUid(): Promise<string> {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) throw new Error("Unauthorized");
    return tokens.decodedToken.uid;
}

async function requireOrgAdmin() {
    const uid = await signedInUid();
    const role = await getMyAdminRole();
    if (!can(role, "organisations.manage")) throw new Error("You don't have permission to do that.");
    return uid;
}

/* ── Impact ────────────────────────────────────────────────────────────── */

/**
 * Impact for one organisation, computed from its listings.
 *
 * Derived rather than stored: a counter that drifts is worse than no counter,
 * and an organisation putting these numbers in a report needs them to match
 * what an auditor would find by counting the listings themselves.
 */
async function computeImpact(orgId: string): Promise<OrgImpact> {
    const snap = await db.collection(ITEMS).where("orgId", "==", orgId).get();
    if (snap.empty) return { ...EMPTY_IMPACT };

    const items = snap.docs.map((d) => d.data() as ItemType & { donatedTo?: string });
    const rehomed = items.filter((i) => i.donatedTo);
    const recipients = new Set(rehomed.map((i) => i.donatedTo).filter(Boolean) as string[]);
    const dates = items.map((i) => i.createdAt).filter(Boolean).sort();

    return {
        listed: items.length,
        rehomed: rehomed.length,
        available: items.length - rehomed.length,
        // Only rehomed items count as diverted. Something still sitting on the
        // platform has not been diverted from anything yet.
        kgDiverted: estimateKg(rehomed),
        householdsReached: recipients.size,
        rehomingRate: items.length ? Math.round((rehomed.length / items.length) * 100) : 0,
        firstListedAt: dates[0],
    };
}

/* ── Public ────────────────────────────────────────────────────────────── */

const readActiveOrgs = cache(async (): Promise<Organisation[]> => {
    try {
        const snap = await db.collection(ORGS).where("status", "==", "active").get();
        const rows = snap.docs.map((d) => ({ ...(d.data() as Organisation), id: d.id }));
        rows.sort((a, b) => a.name.localeCompare(b.name));
        return rows;
    } catch {
        return [];
    }
});

export async function listActiveOrgs(): Promise<Organisation[]> {
    return readActiveOrgs();
}

export interface Storefront {
    org: Organisation;
    impact: OrgImpact;
    items: ItemType[];
}

export async function getStorefront(slug: string): Promise<Storefront | null> {
    try {
        const snap = await db.collection(ORGS).where("slug", "==", slug).limit(1).get();
        if (snap.empty) return null;

        const org = { ...(snap.docs[0].data() as Organisation), id: snap.docs[0].id };
        if (org.status !== "active") return null;

        const [itemsSnap, impact] = await Promise.all([
            db.collection(ITEMS).where("orgId", "==", org.id).get(),
            computeImpact(org.id!),
        ]);

        const items = itemsSnap.docs
            .map((d) => ({ ...(d.data() as ItemType), id: d.id }))
            // Available first, then newest — a storefront leading with things
            // already gone reads as dead.
            .sort((a, b) =>
                Number(!!a.donatedTo) - Number(!!b.donatedTo) ||
                (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
            );

        return { org, impact, items };
    } catch {
        return null;
    }
}

/* ── Applying ──────────────────────────────────────────────────────────── */

export async function applyAsOrganisation(input: {
    name: string;
    type: OrgType;
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    registrationNumber?: string;
    website?: string;
    locationName?: string;
    motivation?: string;
}): Promise<ResponseData<null>> {
    try {
        const uid = await signedInUid();

        const name = input.name?.trim();
        if (!name || name.length < 2) throw new Error("What is the organisation called?");
        if (!input.contactName?.trim()) throw new Error("Who should we speak to?");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.contactEmail?.trim() ?? "")) {
            throw new Error("That email address doesn't look right.");
        }

        // One application per person keeps the queue clean; a second
        // organisation can be added by an admin.
        const existing = await db.collection(ORGS).where("createdBy", "==", uid).limit(1).get();
        if (!existing.empty) throw new Error("You've already applied. We'll be in touch.");

        let slug = slugifyOrg(name);
        if (!isValidOrgSlug(slug)) slug = `org-${Date.now().toString(36)}`;
        // Slugs are public URLs, so a clash has to be resolved at write time.
        const clash = await db.collection(ORGS).where("slug", "==", slug).limit(1).get();
        if (!clash.empty) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

        const now = iso();
        const ref = await db.collection(ORGS).add({
            name,
            slug,
            type: input.type,
            status: "applied" as OrgStatus,
            contactName: input.contactName.trim(),
            contactEmail: input.contactEmail.trim().toLowerCase(),
            contactPhone: input.contactPhone?.trim() ?? "",
            registrationNumber: input.registrationNumber?.trim() ?? "",
            website: input.website?.trim() ?? "",
            locationName: input.locationName?.trim() ?? "",
            motivation: (input.motivation ?? "").trim().slice(0, 2000),
            verified: false,
            createdBy: uid,
            createdAt: now,
            updatedAt: now,
        });

        // The applicant is the first owner, so approval doesn't need a second step.
        const userSnap = await db.collection(USERS).doc(uid).get();
        await db.collection(MEMBERS).doc(`${ref.id}_${uid}`).set({
            uid,
            orgId: ref.id,
            role: "owner" as OrgRole,
            name: userSnap.data()?.name ?? input.contactName,
            email: userSnap.data()?.email ?? input.contactEmail,
            addedAt: now,
        });

        revalidatePath("/app/admin/organisations");
        return { success: true, message: "Application received", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/* ── Membership ────────────────────────────────────────────────────────── */

export interface MyOrg {
    org: Organisation;
    role: OrgRole;
    impact: OrgImpact;
    steps: OnboardingStep[];
    team: OrgMember[];
    items: ItemType[];
}

/** The organisation the signed-in person belongs to, with everything it needs. */
export async function getMyOrg(): Promise<ResponseData<MyOrg | null>> {
    try {
        const uid = await signedInUid();

        const memberSnap = await db.collection(MEMBERS).where("uid", "==", uid).limit(1).get();
        if (memberSnap.empty) return { success: false, message: "Not in an organisation", data: null };

        const membership = memberSnap.docs[0].data() as OrgMember;
        const orgSnap = await db.collection(ORGS).doc(membership.orgId).get();
        if (!orgSnap.exists) return { success: false, message: "Organisation not found", data: null };

        const org = { ...(orgSnap.data() as Organisation), id: orgSnap.id };

        const [impact, teamSnap, itemsSnap] = await Promise.all([
            computeImpact(org.id!),
            db.collection(MEMBERS).where("orgId", "==", org.id).get(),
            db.collection(ITEMS).where("orgId", "==", org.id).get(),
        ]);

        const team = teamSnap.docs.map((d) => d.data() as OrgMember);
        const items = itemsSnap.docs
            .map((d) => ({ ...(d.data() as ItemType), id: d.id }))
            .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

        return {
            success: true,
            message: "ok",
            data: {
                org,
                role: membership.role,
                impact,
                steps: onboardingSteps(org, { listings: items.length, team: team.length }),
                team,
                items,
            },
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/** Membership only — cheap enough to call from the listing form. */
export async function getMyOrgLite(): Promise<{ orgId: string; name: string; role: OrgRole } | null> {
    try {
        const uid = await signedInUid();
        const snap = await db.collection(MEMBERS).where("uid", "==", uid).limit(1).get();
        if (snap.empty) return null;
        const m = snap.docs[0].data() as OrgMember;
        const org = await db.collection(ORGS).doc(m.orgId).get();
        if (!org.exists) return null;
        const data = org.data() as Organisation;
        // Only an active organisation can attach listings to itself.
        if (data.status !== "active") return null;
        return { orgId: m.orgId, name: data.name, role: m.role };
    } catch {
        return null;
    }
}

async function requireOrgCapability(capability: Parameters<typeof orgCan>[1]) {
    const uid = await signedInUid();
    const snap = await db.collection(MEMBERS).where("uid", "==", uid).limit(1).get();
    if (snap.empty) throw new Error("You're not in an organisation.");
    const m = snap.docs[0].data() as OrgMember;
    if (!orgCan(m.role, capability)) throw new Error("Your role doesn't allow that.");
    return { uid, orgId: m.orgId, role: m.role };
}

export async function updateStorefront(input: {
    tagline?: string;
    about?: string;
    logoUrl?: string;
    coverUrl?: string;
    website?: string;
    locationName?: string;
}): Promise<ResponseData<null>> {
    try {
        const { orgId } = await requireOrgCapability("storefront.edit");

        await db.collection(ORGS).doc(orgId).update({
            tagline: (input.tagline ?? "").trim().slice(0, 120),
            about: (input.about ?? "").slice(0, 8000),
            logoUrl: (input.logoUrl ?? "").trim(),
            coverUrl: (input.coverUrl ?? "").trim(),
            website: (input.website ?? "").trim(),
            locationName: (input.locationName ?? "").trim(),
            updatedAt: iso(),
        });

        const org = await db.collection(ORGS).doc(orgId).get();
        revalidatePath(`/o/${(org.data() as Organisation).slug}`);
        revalidatePath("/app/organisation");
        return { success: true, message: "Storefront updated", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function addTeamMember(email: string, role: OrgRole): Promise<ResponseData<null>> {
    try {
        const { uid: actor, orgId } = await requireOrgCapability("team.manage");

        const clean = email.trim().toLowerCase();
        const userSnap = await db.collection(USERS).where("email", "==", clean).limit(1).get();
        if (userSnap.empty) {
            throw new Error("Nobody with that email has a Givny account yet — ask them to sign up first.");
        }

        const member = userSnap.docs[0];
        const key = `${orgId}_${member.id}`;
        if ((await db.collection(MEMBERS).doc(key).get()).exists) {
            throw new Error("They're already on the team.");
        }
        // Somebody already acting for another organisation would make listing
        // ownership ambiguous.
        const elsewhere = await db.collection(MEMBERS).where("uid", "==", member.id).limit(1).get();
        if (!elsewhere.empty) throw new Error("They already belong to another organisation.");

        await db.collection(MEMBERS).doc(key).set({
            uid: member.id,
            orgId,
            role,
            name: member.data().name ?? "",
            email: clean,
            addedBy: actor,
            addedAt: iso(),
        });

        revalidatePath("/app/organisation/team");
        return { success: true, message: "Added to the team", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function removeTeamMember(uid: string): Promise<ResponseData<null>> {
    try {
        const { orgId } = await requireOrgCapability("team.manage");

        const teamSnap = await db.collection(MEMBERS).where("orgId", "==", orgId).get();
        const owners = teamSnap.docs.filter((d) => (d.data() as OrgMember).role === "owner");
        const target = teamSnap.docs.find((d) => (d.data() as OrgMember).uid === uid);
        if (!target) throw new Error("They're not on this team.");
        // Removing the last owner would leave the organisation unmanageable.
        if ((target.data() as OrgMember).role === "owner" && owners.length === 1) {
            throw new Error("Make someone else an owner first.");
        }

        await target.ref.delete();
        revalidatePath("/app/organisation/team");
        return { success: true, message: "Removed from the team", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/* ── Admin ─────────────────────────────────────────────────────────────── */

export interface OrgRow extends Organisation {
    impact: OrgImpact;
    teamSize: number;
}

export async function listOrganisations(status?: OrgStatus | "all"): Promise<ResponseData<OrgRow[]>> {
    try {
        await requireOrgAdmin();

        const [orgsSnap, itemsSnap, membersSnap] = await Promise.all([
            db.collection(ORGS).get(),
            db.collection(ITEMS).get(),
            db.collection(MEMBERS).get(),
        ]);

        // One pass, bucketed — not a query per organisation.
        const byOrg = new Map<string, (ItemType & { donatedTo?: string })[]>();
        itemsSnap.docs.forEach((d) => {
            const v = d.data() as ItemType & { orgId?: string; donatedTo?: string };
            if (!v.orgId) return;
            if (!byOrg.has(v.orgId)) byOrg.set(v.orgId, []);
            byOrg.get(v.orgId)!.push(v);
        });

        const teamCount = new Map<string, number>();
        membersSnap.docs.forEach((d) => {
            const m = d.data() as OrgMember;
            teamCount.set(m.orgId, (teamCount.get(m.orgId) ?? 0) + 1);
        });

        let rows: OrgRow[] = orgsSnap.docs.map((d) => {
            const org = { ...(d.data() as Organisation), id: d.id };
            const items = byOrg.get(d.id) ?? [];
            const rehomed = items.filter((i) => i.donatedTo);
            return {
                ...org,
                teamSize: teamCount.get(d.id) ?? 0,
                impact: {
                    listed: items.length,
                    rehomed: rehomed.length,
                    available: items.length - rehomed.length,
                    kgDiverted: estimateKg(rehomed),
                    householdsReached: new Set(rehomed.map((i) => i.donatedTo)).size,
                    rehomingRate: items.length ? Math.round((rehomed.length / items.length) * 100) : 0,
                },
            };
        });

        if (status && status !== "all") rows = rows.filter((r) => r.status === status);
        // Applications first — they are the only rows with somebody waiting.
        const order: Record<string, number> = { applied: 0, reviewing: 1, approved: 2, active: 3, paused: 4, rejected: 5 };
        rows.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.name.localeCompare(b.name));

        return { success: true, message: "ok", data: rows };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

export interface OrgAdminDetail {
    org: Organisation;
    impact: OrgImpact;
    team: OrgMember[];
    steps: OnboardingStep[];
    items: ItemType[];
}

export async function getOrganisation(id: string): Promise<ResponseData<OrgAdminDetail | null>> {
    try {
        await requireOrgAdmin();

        const snap = await db.collection(ORGS).doc(id).get();
        if (!snap.exists) return { success: false, message: "Not found", data: null };
        const org = { ...(snap.data() as Organisation), id: snap.id };

        const [impact, teamSnap, itemsSnap] = await Promise.all([
            computeImpact(id),
            db.collection(MEMBERS).where("orgId", "==", id).get(),
            db.collection(ITEMS).where("orgId", "==", id).get(),
        ]);

        const team = teamSnap.docs.map((d) => d.data() as OrgMember);
        const items = itemsSnap.docs.map((d) => ({ ...(d.data() as ItemType), id: d.id }));

        return {
            success: true,
            message: "ok",
            data: {
                org,
                impact,
                team,
                items,
                steps: onboardingSteps(org, { listings: items.length, team: team.length }),
            },
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function setOrgStatus(
    id: string,
    status: OrgStatus,
    reason?: string
): Promise<ResponseData<null>> {
    try {
        const actor = await requireOrgAdmin();

        const snap = await db.collection(ORGS).doc(id).get();
        if (!snap.exists) throw new Error("Not found");
        const org = snap.data() as Organisation;

        if (status === "rejected" && !reason?.trim()) {
            // Somebody applied and is waiting; "no" without a reason is not an answer.
            throw new Error("Give a reason — they'll be told.");
        }

        await db.collection(ORGS).doc(id).update({
            status,
            reviewedBy: actor,
            reviewedAt: iso(),
            updatedAt: iso(),
            ...(status === "rejected" ? { rejectionReason: reason!.trim().slice(0, 500) } : {}),
            ...(status === "active" && !org.activatedAt ? { activatedAt: iso() } : {}),
        });

        await recordAudit({
            action: "org.status",
            targetId: id,
            targetLabel: org.name,
            detail: `${org.status} → ${status}`,
        });

        revalidatePath("/app/admin/organisations");
        revalidatePath("/organisations");
        revalidatePath(`/o/${org.slug}`);
        return { success: true, message: `Marked ${status}`, data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function setOrgVerified(id: string, verified: boolean): Promise<ResponseData<null>> {
    try {
        await requireOrgAdmin();
        const snap = await db.collection(ORGS).doc(id).get();
        if (!snap.exists) throw new Error("Not found");

        await db.collection(ORGS).doc(id).update({
            verified,
            verifiedAt: verified ? iso() : "",
            updatedAt: iso(),
        });

        await recordAudit({
            action: verified ? "org.verify" : "org.unverify",
            targetId: id,
            targetLabel: (snap.data() as Organisation).name,
        });

        revalidatePath("/app/admin/organisations");
        revalidatePath(`/o/${(snap.data() as Organisation).slug}`);
        return { success: true, message: verified ? "Verified" : "Verification removed", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function saveOrgNotes(id: string, notes: string): Promise<ResponseData<null>> {
    try {
        await requireOrgAdmin();
        await db.collection(ORGS).doc(id).update({
            internalNotes: notes.slice(0, 4000),
            updatedAt: iso(),
        });
        revalidatePath(`/app/admin/organisations/${id}`);
        return { success: true, message: "Notes saved", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}
