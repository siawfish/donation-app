/**
 * CRM shapes and segment definitions.
 *
 * Givny has no sales pipeline, so the usual CRM spine (leads → opportunities →
 * won) doesn't map. What admins actually need is a record of the relationship
 * with a member: what they've done, what we've said, what we noticed, and what
 * someone still has to do about it. That's what this models.
 */

export type CrmNoteId = string;

export interface CrmNote {
    id?: string;
    memberId: string;
    body: string;
    authorId: string;
    authorName?: string;
    createdAt: string;
    /** Pinned notes surface above the timeline — standing context, not events. */
    pinned?: boolean;
}

export type InteractionChannel = "call" | "email" | "whatsapp" | "in_person" | "other";

export const CHANNEL_LABELS: Record<InteractionChannel, string> = {
    call: "Call",
    email: "Email",
    whatsapp: "WhatsApp",
    in_person: "In person",
    other: "Other",
};

export interface CrmInteraction {
    id?: string;
    memberId: string;
    channel: InteractionChannel;
    /** Which way it went — who reached out. */
    direction: "inbound" | "outbound";
    summary: string;
    /** When the conversation happened, which may not be when it was logged. */
    occurredAt: string;
    loggedBy: string;
    loggedByName?: string;
    createdAt: string;
}

export type TaskStatus = "open" | "done";

export interface CrmTask {
    id?: string;
    memberId: string;
    /** Denormalised so the task queue doesn't need a read per row. */
    memberName?: string;
    title: string;
    dueOn: string;            // yyyy-mm-dd
    assigneeId: string;
    assigneeName?: string;
    status: TaskStatus;
    createdBy: string;
    createdAt: string;
    completedAt?: string;
    completedBy?: string;
}

/** Tags live on one doc per member rather than spread across the user record. */
export interface CrmProfile {
    memberId: string;
    tags: string[];
    updatedAt?: string;
    updatedBy?: string;
}

/* ── Tags ──────────────────────────────────────────────────────────────── */

/**
 * Suggested labels. Free text is still allowed — these exist so that the
 * common cases stay spelled the same way, which is the difference between a
 * tag being a filter and being noise.
 */
export const SUGGESTED_TAGS = [
    "power lister",
    "first timer",
    "reported",
    "needs follow-up",
    "vip",
    "partner",
    "no-show",
    "bulk donor",
];

export function normaliseTag(raw: string): string {
    return raw.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 24);
}

export function isValidTag(raw: string): boolean {
    const t = normaliseTag(raw);
    return t.length >= 2 && t.length <= 24;
}

/* ── Segments ──────────────────────────────────────────────────────────── */

export type SegmentId =
    | "all"
    | "verified_never_listed"
    | "inactive_30"
    | "top_rehomers"
    | "unverified_active"
    | "suspended"
    | "new_this_month";

export interface SegmentDef {
    id: SegmentId;
    label: string;
    /** Why an admin would open this list — a segment nobody can act on is noise. */
    description: string;
}

export const SEGMENTS: SegmentDef[] = [
    { id: "all", label: "All members", description: "Everyone on the platform." },
    {
        id: "verified_never_listed",
        label: "Verified, never listed",
        description: "Passed Ghana Card checks but never posted an item — the easiest nudge on the platform.",
    },
    {
        id: "unverified_active",
        label: "Active but unverified",
        description: "Listing or requesting without a verified badge. Trust risk, and an easy verification win.",
    },
    {
        id: "inactive_30",
        label: "Quiet 30+ days",
        description: "No listing, request or login in the last month.",
    },
    {
        id: "top_rehomers",
        label: "Top rehomers",
        description: "Three or more items successfully rehomed. Worth keeping close.",
    },
    { id: "new_this_month", label: "Joined this month", description: "Signed up in the last 30 days." },
    { id: "suspended", label: "Suspended", description: "Blocked from the signed-in app." },
];

/** A member as the CRM sees them: profile plus the activity that matters. */
export interface CrmMemberRow {
    id: string;
    name: string;
    email: string;
    verified: boolean;
    suspended: boolean;
    role: string | null;
    tags: string[];
    listingsCount: number;
    rehomedCount: number;
    requestsCount: number;
    createdAt?: string;
    lastLogin?: string;
    openTasks: number;
    lastTouchedAt?: string;
}

export function daysSince(iso?: string, now: number = Date.now()): number | null {
    if (!iso) return null;
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return null;
    return Math.floor((now - t) / 86_400_000);
}

/**
 * Whether a member falls in a segment.
 *
 * Evaluated in memory rather than as Firestore queries: several of these need
 * counts across three collections, which no single index can answer, and the
 * member count here is small enough that reading once and filtering is both
 * simpler and cheaper than maintaining denormalised counters.
 */
export function inSegment(m: CrmMemberRow, segment: SegmentId, now: number = Date.now()): boolean {
    switch (segment) {
        case "all":
            return true;
        case "verified_never_listed":
            return m.verified && m.listingsCount === 0;
        case "unverified_active":
            return !m.verified && (m.listingsCount > 0 || m.requestsCount > 0);
        case "inactive_30": {
            const d = daysSince(m.lastLogin ?? m.createdAt, now);
            return d != null && d >= 30;
        }
        case "top_rehomers":
            return m.rehomedCount >= 3;
        case "new_this_month": {
            const d = daysSince(m.createdAt, now);
            return d != null && d <= 30;
        }
        case "suspended":
            return m.suspended;
        default:
            return true;
    }
}

/** yyyy-mm-dd for today, in the viewer's own timezone. */
export function todayISO(d: Date = new Date()): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function taskUrgency(dueOn: string, today: string = todayISO()): "overdue" | "today" | "upcoming" {
    if (dueOn < today) return "overdue";
    if (dueOn === today) return "today";
    return "upcoming";
}
