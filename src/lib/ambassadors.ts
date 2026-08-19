/**
 * Ambassador programme.
 *
 * The important design decision here is that KPIs are *derived*, never
 * self-reported. The app already attributes signups: the register page accepts
 * `?ref=<uid>`, validates it server-side and stores `referredBy` on the new
 * member. An ambassador's referral link is therefore just their own profile
 * link, and every number below can be computed from data the platform already
 * holds.
 *
 * That matters because a programme paid on self-reported activity becomes a
 * paperwork exercise. Paid on signups that activated, it becomes a growth
 * channel.
 */

export type AmbassadorType = "campus" | "town";

export const TYPE_LABELS: Record<AmbassadorType, string> = {
    campus: "Campus",
    town: "Town",
};

export type AmbassadorStatus = "applicant" | "active" | "paused" | "ended";

export const STATUS_LABELS: Record<AmbassadorStatus, string> = {
    applicant: "Applicant",
    active: "Active",
    paused: "Paused",
    ended: "Ended",
};

export const STATUS_TONE: Record<AmbassadorStatus, "neutral" | "info" | "good" | "warn" | "bad"> = {
    applicant: "info",
    active: "good",
    paused: "warn",
    ended: "neutral",
};

/** Monthly targets. Deliberately three numbers, not ten. */
export interface AmbassadorTargets {
    signups: number;
    activations: number;
    handovers: number;
}

export const DEFAULT_TARGETS: AmbassadorTargets = {
    signups: 25,
    activations: 10,
    handovers: 5,
};

export interface Ambassador {
    uid: string;
    name?: string;
    email?: string;
    type: AmbassadorType;
    /** "KNUST" or "Dansoman" — free text, since Ghana's campuses and suburbs
     *  don't fit a fixed list and a wrong list is worse than none. */
    territory: string;
    status: AmbassadorStatus;
    targets: AmbassadorTargets;
    stipend?: number;
    startedAt?: string;
    endedAt?: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
}

/* ── Activity log ──────────────────────────────────────────────────────── */

export type ActivityKind = "event" | "outreach" | "partnership" | "content" | "other";

export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
    event: "Event or stand",
    outreach: "Door-to-door / outreach",
    partnership: "Partnership secured",
    content: "Content or post",
    other: "Other",
};

export interface AmbassadorActivity {
    id?: string;
    ambassadorId: string;
    ambassadorName?: string;
    kind: ActivityKind;
    title: string;
    detail?: string;
    /** Rough number of people reached. Self-reported, and labelled as such. */
    reach?: number;
    occurredOn: string; // yyyy-mm-dd
    createdAt: string;
    /** Admin acknowledgement, so an ambassador knows the work was seen. */
    reviewedBy?: string;
    reviewedAt?: string;
}

/* ── KPIs ──────────────────────────────────────────────────────────────── */

/**
 * The funnel that matters.
 *
 * A signup that never lists and never asks for anything is not growth, it is a
 * row in a table. So the programme is measured on what those signups went on to
 * do, not on how many accounts were created.
 */
export interface AmbassadorKpis {
    /** Members who signed up with this ambassador's link. */
    signups: number;
    /** Of those, how many listed or requested something — the real test. */
    activations: number;
    /** Of those, how many completed a handover. */
    handovers: number;
    /** Signups in the last 30 days. */
    signups30d: number;
    activations30d: number;
    handovers30d: number;
    /** Percentage of referred members who did anything at all. */
    activationRate: number;
    /** Self-reported reach from the activity log, kept separate on purpose. */
    loggedActivities: number;
    lastActivityAt?: string;
}

export const EMPTY_KPIS: AmbassadorKpis = {
    signups: 0, activations: 0, handovers: 0,
    signups30d: 0, activations30d: 0, handovers30d: 0,
    activationRate: 0, loggedActivities: 0,
};

/** Progress against a monthly target, capped for display. */
export function progressPct(actual: number, target: number): number {
    if (target <= 0) return actual > 0 ? 100 : 0;
    return Math.min(100, Math.round((actual / target) * 100));
}

/**
 * A single health verdict, so a roster of thirty can be scanned at a glance.
 *
 * Based on the last 30 days rather than lifetime totals: an ambassador who was
 * excellent in March and absent since is not currently doing the job.
 */
export type Health = "strong" | "steady" | "slipping" | "dormant";

export const HEALTH_LABELS: Record<Health, string> = {
    strong: "Strong",
    steady: "Steady",
    slipping: "Slipping",
    dormant: "Dormant",
};

export const HEALTH_TONE: Record<Health, "good" | "info" | "warn" | "bad"> = {
    strong: "good",
    steady: "info",
    slipping: "warn",
    dormant: "bad",
};

export function healthOf(kpis: AmbassadorKpis, targets: AmbassadorTargets): Health {
    if (kpis.signups30d === 0 && kpis.loggedActivities === 0) return "dormant";
    const pct = progressPct(kpis.signups30d, targets.signups);
    if (pct >= 100) return "strong";
    if (pct >= 50) return "steady";
    return "slipping";
}

/** The link an ambassador shares. Their uid is already the referral token. */
export function referralUrl(uid: string, origin: string): string {
    return `${origin.replace(/\/+$/, "")}/auth/register?ref=${uid}`;
}

/**
 * A short human-friendly code for posters and word of mouth.
 *
 * Derived from the uid rather than stored, so it cannot drift out of sync, and
 * only ever used for display — the link carries the real identifier.
 */
export function displayCode(uid: string, territory: string): string {
    // First word only: "Tema (C25)" should read TEMA, not TEMAC.
    const firstWord = (territory || "").trim().split(/[^A-Za-z]+/).filter(Boolean)[0] || "GIVNY";
    const place = firstWord.slice(0, 8).toUpperCase();
    const tail = uid.replace(/[^A-Za-z0-9]/g, "").slice(-4).toUpperCase();
    return `${place}-${tail}`;
}

export function daysSince(iso?: string, now: number = Date.now()): number | null {
    if (!iso) return null;
    const t = Date.parse(iso);
    return Number.isNaN(t) ? null : Math.floor((now - t) / 86_400_000);
}
