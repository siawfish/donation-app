/**
 * Admin audit trail.
 *
 * The backend has several actions that cannot be undone — removing a listing
 * deletes its requests and views, suspending blocks someone from the app,
 * deleting an application destroys a stranger's CV — and more than one person
 * holds those powers. Without a record, "who suspended this member and why" has
 * no answer, and an admin who makes a mistake has no way to trace it.
 *
 * Deliberately append-only and never edited: a log you can rewrite is not a log.
 */

export type AuditAction =
    | "member.suspend"
    | "member.reinstate"
    | "listing.remove"
    | "role.grant"
    | "role.revoke"
    | "verification.approve"
    | "verification.reject"
    | "application.delete"
    | "application.stage"
    | "job.delete"
    | "post.delete"
    | "post.publish"
    | "post.unpublish"
    | "settings.update"
    | "ambassador.add"
    | "ambassador.update"
    | "ambassador.remove"
    | "org.status"
    | "org.verify"
    | "org.unverify"
    | "comment.hide"
    | "comment.restore"
    | "org.create"
    | "org.invite"
    | "org.invite.revoke"
    | "org.claim";

export const AUDIT_LABELS: Record<AuditAction, string> = {
    "member.suspend": "Suspended a member",
    "member.reinstate": "Reinstated a member",
    "listing.remove": "Removed a listing",
    "role.grant": "Granted an admin role",
    "role.revoke": "Revoked an admin role",
    "verification.approve": "Approved a verification",
    "verification.reject": "Rejected a verification",
    "application.delete": "Deleted a job application",
    "application.stage": "Moved an applicant",
    "job.delete": "Deleted a role",
    "post.delete": "Deleted a post",
    "post.publish": "Published a post",
    "post.unpublish": "Unpublished a post",
    "settings.update": "Changed platform settings",
    "ambassador.add": "Added an ambassador",
    "ambassador.update": "Changed ambassador terms",
    "ambassador.remove": "Removed an ambassador",
    "org.status": "Changed an organisation's status",
    "org.verify": "Verified an organisation",
    "org.unverify": "Removed organisation verification",
    "comment.hide": "Hid a comment",
    "comment.restore": "Restored a comment",
    "org.create": "Created an organisation",
    "org.invite": "Invited an organisation owner",
    "org.invite.revoke": "Withdrew an invitation",
    "org.claim": "An organisation claimed its page",
};

/** How alarming an entry should look when scanning the list. */
export type AuditSeverity = "info" | "notable" | "destructive";

export const AUDIT_SEVERITY: Record<AuditAction, AuditSeverity> = {
    "member.suspend": "destructive",
    "member.reinstate": "notable",
    "listing.remove": "destructive",
    "role.grant": "destructive",
    "role.revoke": "destructive",
    "verification.approve": "notable",
    "verification.reject": "notable",
    "application.delete": "destructive",
    "application.stage": "info",
    "job.delete": "destructive",
    "post.delete": "destructive",
    "post.publish": "notable",
    "post.unpublish": "notable",
    "settings.update": "notable",
    "ambassador.add": "notable",
    "ambassador.update": "info",
    "ambassador.remove": "notable",
    "org.status": "notable",
    "org.verify": "notable",
    "org.unverify": "notable",
    // Hiding is a moderator silencing a member, which is worth flagging even
    // though it is reversible.
    "comment.hide": "destructive",
    "comment.restore": "notable",
    // Creating a page on someone's behalf, and handing one over, both change
    // who is publicly represented — worth flagging on a scan of the log.
    "org.create": "notable",
    "org.invite": "notable",
    "org.invite.revoke": "info",
    "org.claim": "notable",
};

export const SEVERITY_TONE: Record<AuditSeverity, "neutral" | "warn" | "bad"> = {
    info: "neutral",
    notable: "warn",
    destructive: "bad",
};

export interface AuditEntry {
    id?: string;
    action: AuditAction;
    actorId: string;
    actorName?: string;
    /** What was acted on — a uid, listing id, slug. */
    targetId?: string;
    /** Human label for the target, captured at the time so the log survives
     *  the target being deleted. */
    targetLabel?: string;
    /** Short free-text detail, e.g. "moderator → admin". */
    detail?: string;
    createdAt: string;
}

export function describeEntry(e: AuditEntry): string {
    const what = AUDIT_LABELS[e.action] ?? e.action;
    const who = e.targetLabel ? ` — ${e.targetLabel}` : "";
    const extra = e.detail ? ` (${e.detail})` : "";
    return `${what}${who}${extra}`;
}
