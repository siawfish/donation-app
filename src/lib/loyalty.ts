/**
 * Givny Loyalty — "Grow your Grove"
 *
 * Scoring is DERIVED from the items/requests collections rather than stored as a
 * counter on the user. That keeps every existing member's history counting from
 * day one (no backfill) and means a score can never drift out of sync with reality.
 *
 * Design principle: reward PASSING THINGS ON, not collecting. Picking something
 * up earns a token amount only — gamifying the asking side would push people to
 * claim things they don't need, which is the opposite of less waste.
 */

export const POINTS = {
    /** An item actually handed over. The event that creates real value. */
    DONATION_COMPLETED: 50,
    /** Putting something up for others. */
    ITEM_LISTED: 10,
    /** Replying either way — being responsive is good citizenship. */
    REQUEST_ANSWERED: 5,
    /** Deliberately small, see note above. */
    ITEM_RECEIVED: 5,
    /** Someone joined because of you. */
    REFERRAL_JOINED: 25,
    /** ...and they went on to give something away. */
    REFERRAL_FIRST_DONATION: 50,
} as const;

export interface MemberStats {
    donationsCompleted: number;
    itemsListed: number;
    requestsAnswered: number;
    itemsReceived: number;
    referralsJoined: number;
    referralsWhoDonated: number;
    /** donation count keyed by category name */
    donationsByCategory: Record<string, number>;
}

export const EMPTY_STATS: MemberStats = {
    donationsCompleted: 0,
    itemsListed: 0,
    requestsAnswered: 0,
    itemsReceived: 0,
    referralsJoined: 0,
    referralsWhoDonated: 0,
    donationsByCategory: {},
};

export function calculatePoints(stats: MemberStats): number {
    return (
        stats.donationsCompleted * POINTS.DONATION_COMPLETED +
        stats.itemsListed * POINTS.ITEM_LISTED +
        stats.requestsAnswered * POINTS.REQUEST_ANSWERED +
        stats.itemsReceived * POINTS.ITEM_RECEIVED +
        stats.referralsJoined * POINTS.REFERRAL_JOINED +
        stats.referralsWhoDonated * POINTS.REFERRAL_FIRST_DONATION
    );
}

/* ── Divisions ─────────────────────────────────────────────────────────── */

export interface Tier {
    id: string;
    name: string;
    emoji: string;
    minPoints: number;
    /** tailwind classes for the badge chip */
    chip: string;
    blurb: string;
}

export const TIERS: Tier[] = [
    { id: "seedling", name: "Seedling", emoji: "🌱", minPoints: 0, chip: "bg-sand text-forest", blurb: "Just getting started" },
    { id: "sprout", name: "Sprout", emoji: "🌿", minPoints: 100, chip: "bg-primary-light text-primary", blurb: "Finding your feet" },
    { id: "sapling", name: "Sapling", emoji: "🪴", minPoints: 300, chip: "bg-lime text-forest", blurb: "A regular giver" },
    { id: "grove", name: "Grove", emoji: "🌳", minPoints: 700, chip: "bg-forest text-lime", blurb: "A pillar of the community" },
    { id: "forest", name: "Forest", emoji: "🏆", minPoints: 1500, chip: "bg-forest text-lime ring-2 ring-lime", blurb: "Legendary generosity" },
];

export function getTier(points: number): Tier {
    // Walk backwards to the first threshold the score clears.
    for (let i = TIERS.length - 1; i >= 0; i--) {
        if (points >= TIERS[i].minPoints) return TIERS[i];
    }
    return TIERS[0];
}

export function getNextTier(points: number): Tier | null {
    return TIERS.find((t) => t.minPoints > points) ?? null;
}

/** How far through the current division, 0–100. Returns 100 at the top tier. */
export function tierProgress(points: number): number {
    const current = getTier(points);
    const next = getNextTier(points);
    if (!next) return 100;
    const span = next.minPoints - current.minPoints;
    if (span <= 0) return 100;
    return Math.min(100, Math.round(((points - current.minPoints) / span) * 100));
}

export function pointsToNextTier(points: number): number {
    const next = getNextTier(points);
    return next ? Math.max(0, next.minPoints - points) : 0;
}

/* ── Achievements ──────────────────────────────────────────────────────── */

export interface Achievement {
    id: string;
    name: string;
    description: string;
    emoji: string;
    /** current progress toward `target` */
    progress: number;
    target: number;
    unlocked: boolean;
    group: "giving" | "community" | "category";
}

const MILESTONES: Array<{
    id: string;
    name: string;
    description: string;
    emoji: string;
    target: number;
    group: "giving" | "community";
    of: (s: MemberStats) => number;
}> = [
    { id: "first_gift", name: "First Handover", description: "Pass on your first item", emoji: "🎁", target: 1, group: "giving", of: (s) => s.donationsCompleted },
    { id: "generous_5", name: "Second Lifer", description: "Pass on 5 items", emoji: "💚", target: 5, group: "giving", of: (s) => s.donationsCompleted },
    { id: "generous_25", name: "Waste Fighter", description: "Pass on 25 items", emoji: "🌟", target: 25, group: "giving", of: (s) => s.donationsCompleted },
    { id: "stocked_10", name: "Well Stocked", description: "List 10 items", emoji: "📦", target: 10, group: "giving", of: (s) => s.itemsListed },
    { id: "responsive_10", name: "Quick Replier", description: "Reply to 10 people who asked", emoji: "⚡", target: 10, group: "community", of: (s) => s.requestsAnswered },
    { id: "connector_3", name: "Connector", description: "Invite 3 people who join", emoji: "🤝", target: 3, group: "community", of: (s) => s.referralsJoined },
    { id: "mentor", name: "Ripple Effect", description: "Someone you invited passes on an item", emoji: "🌍", target: 1, group: "community", of: (s) => s.referralsWhoDonated },
];

/** Donations in a single category needed to earn its champion badge. */
export const CATEGORY_BADGE_TARGET = 5;

/**
 * Builds the full achievement list. `categories` drives the categorical badges so
 * they always match whatever categories actually exist in the platform.
 */
export function getAchievements(stats: MemberStats, categories: string[] = []): Achievement[] {
    const milestones: Achievement[] = MILESTONES.map((m) => {
        const progress = m.of(stats);
        return {
            id: m.id,
            name: m.name,
            description: m.description,
            emoji: m.emoji,
            progress: Math.min(progress, m.target),
            target: m.target,
            unlocked: progress >= m.target,
            group: m.group,
        };
    });

    const categorical: Achievement[] = categories.map((name) => {
        const progress = stats.donationsByCategory[name] ?? 0;
        return {
            id: `category_${name.toLowerCase().replace(/\s+/g, "_")}`,
            name: `${name} Champion`,
            description: `Pass on ${CATEGORY_BADGE_TARGET} items in ${name}`,
            emoji: "🏅",
            progress: Math.min(progress, CATEGORY_BADGE_TARGET),
            target: CATEGORY_BADGE_TARGET,
            unlocked: progress >= CATEGORY_BADGE_TARGET,
            group: "category",
        };
    });

    return [...milestones, ...categorical];
}

/* ── Leaderboard shapes ────────────────────────────────────────────────── */

export interface LeaderboardEntry {
    userId: string;
    name: string;
    profileUrl?: string;
    location?: string;
    points: number;
    rank: number;
    tierId: string;
    donationsCompleted: number;
    itemsListed: number;
}

export type LeaderboardScope = "all-time" | "month";

/** Rank a scored list, sharing a rank across ties. */
export function rankEntries(
    rows: Omit<LeaderboardEntry, "rank" | "tierId">[]
): LeaderboardEntry[] {
    const sorted = [...rows].sort(
        (a, b) => b.points - a.points || b.donationsCompleted - a.donationsCompleted
    );

    let lastPoints: number | null = null;
    let lastRank = 0;

    return sorted.map((row, index) => {
        const rank = row.points === lastPoints ? lastRank : index + 1;
        lastPoints = row.points;
        lastRank = rank;
        return { ...row, rank, tierId: getTier(row.points).id };
    });
}

/** Referral link for a member. `origin` should include protocol. */
export function buildInviteUrl(origin: string, userId: string): string {
    return `${origin}/auth/register?ref=${encodeURIComponent(userId)}`;
}

/** Short, human-friendly code shown in the UI (display only — links carry the id). */
export function displayCode(userId: string): string {
    return userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
}
