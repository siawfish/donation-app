/**
 * Retention email — campaigns, audiences and what a send is worth.
 *
 * WHY THIS IS BUILT ON THE LOYALTY DATA RATHER THAN BESIDE IT
 * ----------------------------------------------------------
 * A generic "we miss you" mail is ignored. A mail that says you are 40 points
 * from Sprout, and that listing one more thing gets you there, is a specific
 * thing a specific person can act on — and the number is already computed for
 * the leaderboard. So merge tags pull straight from a member's real standing,
 * and a campaign that references a number nobody has is refused rather than
 * sent with a blank in the middle of the sentence.
 *
 * Everything here is pure: the same rendering has to happen when previewing in
 * the admin and when sending on the server, and those two must never disagree
 * about what a member is about to be told.
 */

import type { SegmentId } from "./crm";

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "cancelled";

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
    draft: "Draft",
    scheduled: "Scheduled",
    sending: "Sending",
    sent: "Sent",
    cancelled: "Cancelled",
};

export const CAMPAIGN_STATUS_TONE: Record<CampaignStatus, "neutral" | "info" | "warn" | "good" | "bad"> = {
    draft: "neutral",
    scheduled: "info",
    sending: "warn",
    sent: "good",
    cancelled: "bad",
};

export interface Campaign {
    id?: string;
    name: string;
    /** What lands in the inbox. The single biggest lever on whether it is read. */
    subject: string;
    /** The grey line after the subject in most clients. Wasted if left empty. */
    preheader?: string;
    /** Markdown, rendered with the same renderer as the blog. */
    body: string;
    /** Button under the message. Optional, but a mail with no action is a note. */
    ctaLabel?: string;
    ctaUrl?: string;

    audience: SegmentId;
    status: CampaignStatus;
    scheduledFor?: string;

    createdBy: string;
    createdAt: string;
    updatedAt: string;
    sentAt?: string;
    /** Frozen at send time — the audience moves, the record should not. */
    recipientCount?: number;
}

/**
 * One person's copy of one campaign.
 *
 * Stored per recipient rather than as a counter, because every useful question
 * — who opened, who clicked, who unsubscribed from which mail — is a question
 * about individuals, and a counter cannot answer any of them.
 */
export type SendStatus = "queued" | "sent" | "failed" | "skipped";

export interface CampaignSend {
    id?: string;
    campaignId: string;
    uid: string;
    email: string;
    name: string;
    status: SendStatus;
    /** Why it never went — suppressed, no address, provider refused. */
    reason?: string;
    sentAt?: string;
    openedAt?: string;
    clickedAt?: string;
    unsubscribedAt?: string;
}

export interface CampaignStats {
    recipients: number;
    sent: number;
    failed: number;
    skipped: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
    /** Percentages of what actually went out, not of what was queued. */
    openRate: number;
    clickRate: number;
    unsubscribeRate: number;
}

export const EMPTY_STATS: CampaignStats = {
    recipients: 0, sent: 0, failed: 0, skipped: 0,
    opened: 0, clicked: 0, unsubscribed: 0,
    openRate: 0, clickRate: 0, unsubscribeRate: 0,
};

export function computeStats(sends: CampaignSend[]): CampaignStats {
    const sent = sends.filter((s) => s.status === "sent").length;
    const opened = sends.filter((s) => s.openedAt).length;
    const clicked = sends.filter((s) => s.clickedAt).length;
    const unsubscribed = sends.filter((s) => s.unsubscribedAt).length;

    const pct = (n: number) => (sent ? Math.round((n / sent) * 1000) / 10 : 0);

    return {
        recipients: sends.length,
        sent,
        failed: sends.filter((s) => s.status === "failed").length,
        skipped: sends.filter((s) => s.status === "skipped").length,
        opened,
        clicked,
        unsubscribed,
        openRate: pct(opened),
        clickRate: pct(clicked),
        unsubscribeRate: pct(unsubscribed),
    };
}

/* ── Merge tags ────────────────────────────────────────────────────────── */

/**
 * What a campaign may say about the person reading it.
 *
 * Deliberately small. Every one of these is a number the platform already
 * stands behind somewhere public, so a mail can never claim something the
 * member's own dashboard contradicts.
 */
export interface MergeContext {
    first_name: string;
    points: string;
    tier: string;
    next_tier: string;
    points_to_next: string;
    items_listed: string;
    items_rehomed: string;
    badges: string;
}

export const MERGE_TAGS: { tag: keyof MergeContext; label: string; example: string }[] = [
    { tag: "first_name", label: "First name", example: "Ama" },
    { tag: "points", label: "Loyalty points", example: "260" },
    { tag: "tier", label: "Current division", example: "Sprout" },
    { tag: "next_tier", label: "Next division", example: "Sapling" },
    { tag: "points_to_next", label: "Points to next division", example: "40" },
    { tag: "items_listed", label: "Items listed", example: "7" },
    { tag: "items_rehomed", label: "Items rehomed", example: "4" },
    { tag: "badges", label: "Badges earned", example: "3" },
];

const TAG_RE = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Replace every `{{tag}}` with the member's own value. Unknown tags survive. */
export function renderMergeTags(text: string, context: MergeContext): string {
    return (text ?? "").replace(TAG_RE, (whole, tag: string) =>
        tag in context ? String(context[tag as keyof MergeContext]) : whole
    );
}

/** Tags used in a piece of copy, so the editor can show what it will resolve to. */
export function tagsUsed(text: string): string[] {
    const found = new Set<string>();
    // matchAll returns an iterator this tsconfig target cannot spread, and the
    // regex is global so exec walks it just as well.
    const re = new RegExp(TAG_RE.source, "g");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text ?? "")) !== null) found.add(match[1]);
    return Array.from(found);
}

/** Any `{{tag}}` we do not know how to fill — it would ship as literal braces. */
export function unknownTags(text: string): string[] {
    const known = new Set(MERGE_TAGS.map((t) => t.tag as string));
    return tagsUsed(text).filter((t) => !known.has(t));
}

/* ── Validation ────────────────────────────────────────────────────────── */

export const SUBJECT_MAX = 120;
export const BODY_MAX = 20000;

export function validateCampaign(input: Partial<Campaign>): string | null {
    if (!(input.name ?? "").trim()) return "Give the campaign a name — it's for you, not the reader.";
    const subject = (input.subject ?? "").trim();
    if (subject.length < 3) return "The subject line is what decides whether this gets read.";
    if (subject.length > SUBJECT_MAX) return `Keep the subject under ${SUBJECT_MAX} characters.`;

    const body = (input.body ?? "").trim();
    if (body.length < 20) return "There's no message here yet.";
    if (body.length > BODY_MAX) return "That message is too long for an email.";

    for (const field of [subject, body, input.preheader ?? "", input.ctaLabel ?? ""]) {
        const unknown = unknownTags(field);
        if (unknown.length) {
            return `Unknown tag {{${unknown[0]}}} — it would be sent to members exactly as written.`;
        }
    }

    if (input.ctaLabel?.trim() && !input.ctaUrl?.trim()) return "The button needs a link.";
    if (input.ctaUrl?.trim() && !/^https?:\/\//i.test(input.ctaUrl.trim())) {
        return "The button link needs to start with http:// or https://";
    }
    return null;
}

/* ── Ready-made retention copy ─────────────────────────────────────────── */

/**
 * Starting points, not finished mail.
 *
 * Each one is written round a specific reason to come back, because the ones
 * that work say something true about that person rather than announcing that
 * we exist.
 */
export interface CampaignPreset {
    id: string;
    name: string;
    audience: SegmentId;
    subject: string;
    preheader: string;
    body: string;
    ctaLabel: string;
    ctaPath: string;
    why: string;
}

export const PRESETS: CampaignPreset[] = [
    {
        id: "almost-next-tier",
        name: "One listing from the next division",
        audience: "top_rehomers",
        subject: "{{first_name}}, you're {{points_to_next}} points from {{next_tier}}",
        preheader: "One more item would do it.",
        body:
            "Hi {{first_name}},\n\n" +
            "You're on **{{points}} points** — that's {{tier}} — and only **{{points_to_next}}** from {{next_tier}}.\n\n" +
            "You've passed on {{items_rehomed}} things so far. One more listing would take you up.\n\n" +
            "Whatever's sitting unused counts: a fan, a kettle, school books someone has grown out of.",
        ctaLabel: "List something",
        ctaPath: "/app/add-item",
        why: "Names a real number and a single action that changes it.",
    },
    {
        id: "never-listed",
        name: "Verified but never listed",
        audience: "verified_never_listed",
        subject: "{{first_name}}, what's the one thing you'd never miss?",
        preheader: "You're verified — listing takes about a minute.",
        body:
            "Hi {{first_name}},\n\n" +
            "You're verified, which is the slow part, and you haven't listed anything yet.\n\n" +
            "Most people start with one thing they'd genuinely never miss. A photo, a sentence, " +
            "and where it can be collected — about a minute.\n\n" +
            "Someone near you is looking for exactly that.",
        ctaLabel: "List your first item",
        ctaPath: "/app/add-item",
        why: "These members already cleared the hard step. The ask is small and specific.",
    },
    {
        id: "quiet-30",
        name: "Quiet for a month",
        audience: "inactive_30",
        subject: "It's been a while, {{first_name}}",
        preheader: "Here's what's moved near you since.",
        body:
            "Hi {{first_name}},\n\n" +
            "You listed {{items_listed}} things and {{items_rehomed}} of them found a home — " +
            "that's real, and we'd rather you didn't drift off.\n\n" +
            "People near you are still passing things on every week. Have a look at what's " +
            "available, or clear one more shelf.",
        ctaLabel: "See what's nearby",
        ctaPath: "/explore",
        why: "Leads with what they already did rather than with our absence.",
    },
    {
        id: "unverified",
        name: "Active but unverified",
        audience: "unverified_active",
        subject: "{{first_name}}, get the verified badge",
        preheader: "People say yes to verified members more often.",
        body:
            "Hi {{first_name}},\n\n" +
            "You're already using Givny — {{items_listed}} listed so far — but you don't have " +
            "the verified badge yet.\n\n" +
            "It takes one Ghana Card check, and it changes how often people say yes to you.",
        ctaLabel: "Get verified",
        ctaPath: "/app/settings",
        why: "A concrete benefit, tied to something they are already doing.",
    },
];
