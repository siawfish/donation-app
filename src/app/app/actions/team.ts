"use server";

/**
 * The team page, editable from the admin backend.
 *
 * Reads are public and unauthenticated — this is a public page — but they go
 * through a server action rather than the client SDK so an unpublished member
 * is genuinely absent from the response rather than merely not rendered.
 */

import { cookies } from "next/headers";
import { getTokens } from "next-firebase-auth-edge";
import { revalidatePath } from "next/cache";
import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { ResponseData } from "@/app/types";
import { can } from "@/lib/roles";
import { getMyAdminRole } from "./admin";
import { recordAudit } from "./audit";
import { BIO_MAX, TeamMember, sortTeam, validateTeamMember } from "@/lib/team";

const TEAM = "teamMembers";

const iso = () => new Date().toISOString();

async function requireTeamAdmin(): Promise<string> {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) throw new Error("Unauthorized");
    const role = await getMyAdminRole();
    if (!can(role, "team.manage")) throw new Error("You don't have permission to edit the team page.");
    return tokens.decodedToken.uid;
}

function clean(input: Partial<TeamMember>) {
    return {
        name: (input.name ?? "").trim(),
        role: (input.role ?? "").trim(),
        bio: (input.bio ?? "").trim().slice(0, BIO_MAX),
        photoUrl: (input.photoUrl ?? "").trim(),
        linkedin: (input.linkedin ?? "").trim(),
        published: input.published !== false,
    };
}

/** Published members, in order. Used by the public team page. */
export async function listPublicTeam(): Promise<TeamMember[]> {
    try {
        const snap = await db.collection(TEAM).where("published", "==", true).get();
        return sortTeam(snap.docs.map((d) => ({ ...(d.data() as TeamMember), id: d.id })));
    } catch {
        return [];
    }
}

export async function listTeamAdmin(): Promise<ResponseData<TeamMember[]>> {
    try {
        await requireTeamAdmin();
        const snap = await db.collection(TEAM).get();
        return {
            success: true,
            message: "ok",
            data: sortTeam(snap.docs.map((d) => ({ ...(d.data() as TeamMember), id: d.id }))),
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

export async function saveTeamMember(
    id: string | null,
    input: Partial<TeamMember>
): Promise<ResponseData<string | null>> {
    try {
        await requireTeamAdmin();

        const problem = validateTeamMember(input);
        if (problem) throw new Error(problem);

        const data = clean(input);
        const now = iso();

        if (id) {
            await db.collection(TEAM).doc(id).update({ ...data, updatedAt: now });
            await recordAudit({ action: "team.update", targetId: id, targetLabel: data.name });
        } else {
            // New members go to the end rather than the top, so adding somebody
            // never quietly reorders the people already there.
            const existing = await db.collection(TEAM).get();
            const order = existing.empty
                ? 0
                : Math.max(...existing.docs.map((d) => (d.data().order as number) ?? 0)) + 1;

            const ref = await db.collection(TEAM).add({ ...data, order, createdAt: now, updatedAt: now });
            await recordAudit({ action: "team.update", targetId: ref.id, targetLabel: data.name, detail: "added" });
            id = ref.id;
        }

        revalidatePath("/team");
        revalidatePath("/app/admin/team");
        return { success: true, message: "Saved", data: id };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function removeTeamMemberRecord(id: string): Promise<ResponseData<null>> {
    try {
        await requireTeamAdmin();
        const snap = await db.collection(TEAM).doc(id).get();
        if (!snap.exists) throw new Error("Not found");

        await snap.ref.delete();
        await recordAudit({
            action: "team.remove",
            targetId: id,
            targetLabel: (snap.data() as TeamMember).name,
        });

        revalidatePath("/team");
        revalidatePath("/app/admin/team");
        return { success: true, message: "Removed", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/**
 * Move one member up or down.
 *
 * Renumbers the whole list from zero on every move. Nudging a single value
 * eventually produces ties and duplicated positions, and the list is small
 * enough that rewriting it is cheaper than reasoning about that.
 */
export async function reorderTeamMember(id: string, direction: "up" | "down"): Promise<ResponseData<null>> {
    try {
        await requireTeamAdmin();

        const snap = await db.collection(TEAM).get();
        const members = sortTeam(snap.docs.map((d) => ({ ...(d.data() as TeamMember), id: d.id })));

        const index = members.findIndex((m) => m.id === id);
        if (index === -1) throw new Error("Not found");

        const swapWith = direction === "up" ? index - 1 : index + 1;
        if (swapWith < 0 || swapWith >= members.length) {
            return { success: true, message: "Already there", data: null };
        }

        [members[index], members[swapWith]] = [members[swapWith], members[index]];

        const batch = db.batch();
        members.forEach((m, i) => batch.update(db.collection(TEAM).doc(m.id!), { order: i }));
        await batch.commit();

        revalidatePath("/team");
        revalidatePath("/app/admin/team");
        return { success: true, message: "Reordered", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}
