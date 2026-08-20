'use server';

import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { ResponseData } from "@/app/types";
import { can } from "@/lib/roles";
import { getMyAdminRole } from "./admin";
import { AuditAction, AuditEntry } from "@/lib/audit";
import { AttentionCounts, EMPTY_ATTENTION } from "@/lib/adminNav";

const LOG = "auditLog";

/**
 * Record an admin action.
 *
 * Called from inside the actions that do the work, so a caller cannot forget.
 * Failure is swallowed on purpose: an audit write that fails must never prevent
 * the action itself, and a missing line is far less harmful than a member left
 * suspended because logging threw.
 */
export async function recordAudit(entry: {
    action: AuditAction;
    targetId?: string;
    targetLabel?: string;
    detail?: string;
}): Promise<void> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) return;
        const uid = tokens.decodedToken.uid;

        const actor = await db.collection("users").doc(uid).get();

        await db.collection(LOG).add({
            action: entry.action,
            actorId: uid,
            actorName: (actor.data()?.name as string) || "Admin",
            targetId: entry.targetId ?? "",
            // Captured now so the entry still reads sensibly after the target
            // is deleted — which is exactly when you need to read it.
            targetLabel: (entry.targetLabel ?? "").slice(0, 120),
            detail: (entry.detail ?? "").slice(0, 200),
            createdAt: new Date().toISOString(),
        });
    } catch {
        // Intentionally silent — see above.
    }
}

export async function listAudit({
    action = "",
    limit = 200,
}: { action?: string; limit?: number } = {}): Promise<ResponseData<AuditEntry[]>> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) throw new Error("Unauthorized");
        const role = await getMyAdminRole();
        // Anyone who can see members can read the log. Accountability works
        // only if the people being held accountable can also see it.
        if (!can(role, "users.view")) throw new Error("You don't have permission to view the audit log.");

        const snap = await db.collection(LOG).get();
        let rows = snap.docs.map((d) => ({ ...(d.data() as AuditEntry), id: d.id }));
        if (action) rows = rows.filter((r) => r.action === action);
        rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return { success: true, message: "ok", data: rows.slice(0, limit) };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

/**
 * Everything currently waiting on an admin, in one read.
 *
 * Previously this required visiting eight pages to discover that nothing was
 * waiting — which is how queues get forgotten. Counts respect capability, so a
 * moderator is not shown a number they cannot act on.
 */
export async function getAttention(): Promise<AttentionCounts> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) return { ...EMPTY_ATTENTION };
        const role = await getMyAdminRole();
        if (!role) return { ...EMPTY_ATTENTION };

        const today = new Date().toISOString().slice(0, 10);

        const [verifications, applications, tasks, ambassadors, orgs] = await Promise.all([
            can(role, "verifications.review")
                ? db.collection("verifications").where("status", "==", "pending").get().then((s) => s.size)
                : Promise.resolve(0),
            can(role, "applications.manage")
                ? db.collection("jobApplications").where("stage", "==", "new").get().then((s) => s.size)
                : Promise.resolve(0),
            can(role, "crm.view")
                ? db.collection("crmTasks").where("status", "==", "open").get()
                      // Only overdue and due-today count: a task due next week
                      // is not something waiting on you.
                      .then((s) => s.docs.filter((d) => (d.data().dueOn ?? "") <= today).length)
                : Promise.resolve(0),
            can(role, "ambassadors.view")
                ? db.collection("ambassadorActivities").get()
                      .then((s) => s.docs.filter((d) => !d.data().reviewedAt).length)
                : Promise.resolve(0),
            can(role, "organisations.view")
                ? db.collection("organisations").where("status", "in", ["applied", "reviewing"]).get().then((s) => s.size)
                : Promise.resolve(0),
        ]);

        return { verifications, applications, tasks, ambassadors, orgs };
    } catch {
        return { ...EMPTY_ATTENTION };
    }
}
