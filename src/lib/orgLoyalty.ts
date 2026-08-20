/**
 * Organisation standing — "Grow your Grove", for the entities that list at scale.
 *
 * WHY THIS IS NOT THE MEMBER SCHEME WITH A DIFFERENT LABEL
 * -------------------------------------------------------
 * A member's score rewards personal generosity: give a thing away, get points.
 * Applied unchanged to a furniture retailer clearing a warehouse, that produces
 * a leaderboard where the biggest company always wins, which tells a reader
 * nothing and gives the company nothing to aim at beyond volume.
 *
 * So the organisation scheme scores the things an organisation can be held to
 * and would want in a report:
 *
 *   - what actually reached a household, not what was listed
 *   - how many distinct households, so ten items to ten homes beats ten to one
 *   - weight kept out of a landfill, the number a sustainability lead needs
 *   - whether they answer people, since an unanswered listing is a broken promise
 *   - whether the public trusts them enough to follow
 *
 * Everything is DERIVED from items, requests and followers at read time. Nothing
 * is stored, so a score can never drift from the facts behind it, and an
 * organisation cannot inflate it by editing its own record.
 */

import type { OrgImpact } from "./organisations";

export const ORG_POINTS = {
    /** An item that reached someone. The only event that is unambiguously good. */
    ITEM_REHOMED: 50,
    /** Putting something up. Worth something, but a listing is only a promise. */
    ITEM_LISTED: 8,
    /** A distinct household served — rewards spreading it around. */
    HOUSEHOLD_REACHED: 25,
    /** Per estimated kilogram diverted from disposal. */
    KG_DIVERTED: 1,
    /** Someone chose to follow. Small, because it is cheap to give. */
    FOLLOWER: 5,
    /** Replying to a request either way. Being reachable is the job. */
    REQUEST_ANSWERED: 5,
    /** A finished storefront, awarded once. */
    STOREFRONT_COMPLETE: 100,
    /** Registration checked by an admin against real evidence. */
    VERIFIED: 150,
} as const;

export interface OrgScoreInput {
    impact: OrgImpact;
    followers: number;
    requestsAnswered: number;
    storefrontComplete: boolean;
    verified: boolean;
}

export function calculateOrgPoints(input: OrgScoreInput): number {
    const { impact, followers, requestsAnswered, storefrontComplete, verified } = input;
    return (
        impact.rehomed * ORG_POINTS.ITEM_REHOMED +
        impact.listed * ORG_POINTS.ITEM_LISTED +
        impact.householdsReached * ORG_POINTS.HOUSEHOLD_REACHED +
        Math.round(impact.kgDiverted * ORG_POINTS.KG_DIVERTED) +
        followers * ORG_POINTS.FOLLOWER +
        requestsAnswered * ORG_POINTS.REQUEST_ANSWERED +
        (storefrontComplete ? ORG_POINTS.STOREFRONT_COMPLETE : 0) +
        (verified ? ORG_POINTS.VERIFIED : 0)
    );
}

/* ── Standing ──────────────────────────────────────────────────────────── */

export interface OrgTier {
    id: string;
    name: string;
    emoji: string;
    minPoints: number;
    /** Tailwind classes for the badge chip. */
    chip: string;
    /** What reaching it says about them, in a reader's terms. */
    blurb: string;
}

/**
 * Thresholds sit well above the member tiers on purpose.
 *
 * An organisation clearing one office already out-lists an active neighbour, so
 * reusing the member ladder would put every applicant at the top in week one and
 * leave the badge meaning nothing.
 */
export const ORG_TIERS: OrgTier[] = [
    {
        id: "new", name: "New here", emoji: "🌱", minPoints: 0,
        chip: "bg-sand text-forest",
        blurb: "Just joined and finding their feet.",
    },
    {
        id: "contributor", name: "Contributor", emoji: "🌿", minPoints: 500,
        chip: "bg-primary-light text-primary",
        blurb: "Listing regularly, and things are reaching people.",
    },
    {
        id: "partner", name: "Partner", emoji: "🤝", minPoints: 2000,
        chip: "bg-lime text-forest",
        blurb: "A dependable source of good things in their area.",
    },
    {
        id: "champion", name: "Champion", emoji: "🏅", minPoints: 6000,
        chip: "bg-forest text-lime",
        blurb: "Serious volume, reaching households across the city.",
    },
    {
        id: "landmark", name: "Landmark", emoji: "🏛️", minPoints: 15000,
        chip: "bg-forest text-lime ring-2 ring-lime",
        blurb: "One of the reasons Givny works in Ghana.",
    },
];

export function getOrgTier(points: number): OrgTier {
    for (let i = ORG_TIERS.length - 1; i >= 0; i--) {
        if (points >= ORG_TIERS[i].minPoints) return ORG_TIERS[i];
    }
    return ORG_TIERS[0];
}

export function getNextOrgTier(points: number): OrgTier | null {
    return ORG_TIERS.find((t) => t.minPoints > points) ?? null;
}

/** How far through the current standing, 0–100. Returns 100 at the top. */
export function orgTierProgress(points: number): number {
    const current = getOrgTier(points);
    const next = getNextOrgTier(points);
    if (!next) return 100;
    const span = next.minPoints - current.minPoints;
    if (span <= 0) return 100;
    return Math.min(100, Math.round(((points - current.minPoints) / span) * 100));
}

export function pointsToNextOrgTier(points: number): number {
    const next = getNextOrgTier(points);
    return next ? Math.max(0, next.minPoints - points) : 0;
}

/* ── Marks of standing ─────────────────────────────────────────────────── */

/**
 * Badges an organisation earns, expressed as progress rather than a bare
 * boolean so a locked one still tells them how close they are.
 */
export interface OrgBadge {
    id: string;
    name: string;
    description: string;
    emoji: string;
    progress: number;
    target: number;
    unlocked: boolean;
    group: "reach" | "trust" | "consistency";
}

export function orgBadges(input: OrgScoreInput): OrgBadge[] {
    const { impact, followers, requestsAnswered, verified } = input;

    const make = (
        id: string, name: string, description: string, emoji: string,
        progress: number, target: number, group: OrgBadge["group"]
    ): OrgBadge => ({
        id, name, description, emoji,
        progress: Math.min(progress, target),
        target,
        unlocked: progress >= target,
        group,
    });

    return [
        make("first-handover", "Opened the doors", "Pass on your first item.", "🚪",
            impact.rehomed, 1, "reach"),
        make("ten-homes", "Ten homes", "Reach ten different households.", "🏘️",
            impact.householdsReached, 10, "reach"),
        make("fifty-homes", "Fifty homes", "Reach fifty different households.", "🌍",
            impact.householdsReached, 50, "reach"),
        make("half-tonne", "Half a tonne", "Divert an estimated 500 kg from disposal.", "⚖️",
            Math.round(impact.kgDiverted), 500, "reach"),
        make("tonne", "A tonne kept out", "Divert an estimated 1,000 kg from disposal.", "🏔️",
            Math.round(impact.kgDiverted), 1000, "reach"),

        make("verified", "Checked and verified", "Have your registration verified by Givny.", "✅",
            verified ? 1 : 0, 1, "trust"),
        make("followed", "Worth following", "Earn 25 followers.", "📣",
            followers, 25, "trust"),
        make("well-followed", "A name people know", "Earn 250 followers.", "⭐",
            followers, 250, "trust"),

        make("responsive", "Answers people", "Reply to 25 requests, either way.", "💬",
            requestsAnswered, 25, "consistency"),
        make("stocked", "Never empty-handed", "List 50 items.", "📦",
            impact.listed, 50, "consistency"),
    ];
}

/**
 * The badges worth showing in a small space — unlocked first, hardest first
 * within that, so a crest leads with the most impressive thing they hold.
 */
export function topOrgBadges(badges: OrgBadge[], limit = 3): OrgBadge[] {
    return [...badges]
        .filter((b) => b.unlocked)
        .sort((a, b) => b.target - a.target)
        .slice(0, limit);
}
