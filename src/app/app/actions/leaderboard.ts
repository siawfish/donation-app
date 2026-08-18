'use server';

import { cache } from "react";
import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { FirebaseErrors } from "@/firebase/errors";
import {
    ItemType,
    RequestStatus,
    RequestType,
    ResponseData,
    UserType,
} from "@/app/types";
import {
    Achievement,
    EMPTY_STATS,
    LeaderboardEntry,
    LeaderboardScope,
    MemberStats,
    calculatePoints,
    getAchievements,
    getTier,
    rankEntries,
} from "@/lib/loyalty";

/**
 * Scores are computed by aggregating the items/requests collections rather than
 * read from a stored counter — see the note in `@/lib/loyalty`.
 *
 * That means a full pass over both collections. At the platform's current size
 * this is comfortably fast; if it grows past these caps the aggregation should
 * move to a scheduled job that materialises a `leaderboard` collection.
 */
const MAX_DOCS = 5000;

interface Aggregate {
    stats: Record<string, MemberStats>;
    users: Record<string, UserType>;
}

function blankStats(): MemberStats {
    return { ...EMPTY_STATS, donationsByCategory: {} };
}

function startOfMonthISO(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/**
 * Memoised per request: a single page renders several boards (overall, category
 * tabs, the member's own rank), and without this each one would re-scan all three
 * collections. `cache` dedupes by argument for the lifetime of one request.
 */
const aggregate = cache(async function aggregate(scope: LeaderboardScope): Promise<Aggregate> {
    const [usersSnap, itemsSnap, requestsSnap] = await Promise.all([
        db.collection("users").limit(MAX_DOCS).get(),
        db.collection("items").limit(MAX_DOCS).get(),
        db.collection("requests").limit(MAX_DOCS).get(),
    ]);

    const users: Record<string, UserType> = {};
    usersSnap.docs.forEach((d) => {
        users[d.id] = { ...(d.data() as UserType), id: d.id };
    });

    const items: Record<string, ItemType> = {};
    itemsSnap.docs.forEach((d) => {
        items[d.id] = { ...(d.data() as ItemType), id: d.id };
    });

    const stats: Record<string, MemberStats> = {};
    const touch = (uid?: string) => {
        if (!uid) return null;
        if (!stats[uid]) stats[uid] = blankStats();
        return stats[uid];
    };

    // Everyone with an account appears, even at zero.
    Object.keys(users).forEach((uid) => touch(uid));

    const since = scope === "month" ? startOfMonthISO() : null;
    const inWindow = (ts?: string) => !since || (!!ts && ts >= since);

    // Listings
    itemsSnap.docs.forEach((d) => {
        const item = d.data() as ItemType;
        if (!inWindow(item.createdAt)) return;
        const s = touch(item.createdBy);
        if (s) s.itemsListed += 1;
    });

    // Requests drive donations, receipts and responsiveness
    requestsSnap.docs.forEach((d) => {
        const req = d.data() as RequestType;
        const when = req.updatedAt ?? req.createdAt;
        if (!inWindow(when)) return;

        // Donor answered the request at all (anything past pending)
        if (req.status !== RequestStatus.PENDING) {
            const donor = touch(req.donorId);
            if (donor) donor.requestsAnswered += 1;
        }

        if (req.status !== RequestStatus.COMPLETED) return;

        const donor = touch(req.donorId);
        if (donor) {
            donor.donationsCompleted += 1;
            const categories = items[req.itemId]?.categories ?? [];
            categories.forEach((c) => {
                if (!c?.name) return;
                donor.donationsByCategory[c.name] =
                    (donor.donationsByCategory[c.name] ?? 0) + 1;
            });
        }

        const receiver = touch(req.createdBy);
        if (receiver) receiver.itemsReceived += 1;
    });

    // Referrals — credited all-time regardless of scope, since the relationship
    // itself is permanent.
    Object.values(users).forEach((u) => {
        const referrer = (u as any).referredBy as string | undefined;
        if (!referrer) return;
        const s = touch(referrer);
        if (!s) return;
        s.referralsJoined += 1;
        if ((stats[u.id]?.donationsCompleted ?? 0) > 0) s.referralsWhoDonated += 1;
    });

    return { stats, users };
});

export async function getLeaderboard({
    scope = "all-time",
    category,
    limit = 50,
}: {
    scope?: LeaderboardScope;
    /** restrict scoring to donations in this category */
    category?: string;
    limit?: number;
} = {}): Promise<ResponseData<LeaderboardEntry[] | null>> {
    try {
        const { stats, users } = await aggregate(scope);

        const rows = Object.entries(stats)
            .map(([userId, s]) => {
                const user = users[userId];
                if (!user?.name) return null;

                // A category board ranks purely on donations in that category, so
                // the winner is whoever actually gave the most of that thing.
                const categoryDonations = category ? s.donationsByCategory[category] ?? 0 : 0;
                if (category && categoryDonations === 0) return null;

                return {
                    userId,
                    name: user.name,
                    profileUrl: user.profileUrl,
                    location: user.preferedLocation,
                    points: category
                        ? categoryDonations * 50
                        : calculatePoints(s),
                    donationsCompleted: category ? categoryDonations : s.donationsCompleted,
                    itemsListed: s.itemsListed,
                };
            })
            .filter((r): r is NonNullable<typeof r> => r !== null)
            // Hide accounts with no activity at all from public boards
            .filter((r) => r.points > 0);

        return {
            success: true,
            message: "Leaderboard fetched successfully",
            data: rankEntries(rows).slice(0, limit),
        };
    } catch (error: any) {
        return {
            success: false,
            message: FirebaseErrors[error.code] || error.message,
            data: null,
        };
    }
}

export interface MemberLoyalty {
    userId: string;
    name: string;
    points: number;
    rank: number | null;
    totalRanked: number;
    tierId: string;
    stats: MemberStats;
    achievements: Achievement[];
}

/** Loyalty summary for the signed-in member (dashboard + profile). */
export async function getMyLoyalty(): Promise<ResponseData<MemberLoyalty | null>> {
    try {
        const tokens = await getTokens(await cookies(), authConfig);
        if (!tokens) throw new Error("Unauthorized");
        const uid = tokens.decodedToken.uid;

        const [{ stats, users }, categoriesSnap] = await Promise.all([
            aggregate("all-time"),
            db.collection("categories").get(),
        ]);

        const mine = stats[uid] ?? blankStats();
        const points = calculatePoints(mine);

        // Rank against everyone with a non-zero score
        const ranked = rankEntries(
            Object.entries(stats)
                .map(([userId, s]) => ({
                    userId,
                    name: users[userId]?.name ?? "",
                    profileUrl: users[userId]?.profileUrl,
                    location: users[userId]?.preferedLocation,
                    points: calculatePoints(s),
                    donationsCompleted: s.donationsCompleted,
                    itemsListed: s.itemsListed,
                }))
                .filter((r) => r.name && r.points > 0)
        );

        const categories = categoriesSnap.docs
            .map((d) => (d.data() as { name?: string }).name)
            .filter((n): n is string => !!n);

        return {
            success: true,
            message: "Loyalty fetched successfully",
            data: {
                userId: uid,
                name: users[uid]?.name ?? "",
                points,
                rank: ranked.find((r) => r.userId === uid)?.rank ?? null,
                totalRanked: ranked.length,
                tierId: getTier(points).id,
                stats: mine,
                achievements: getAchievements(mine, categories),
            },
        };
    } catch (error: any) {
        return {
            success: false,
            message: FirebaseErrors[error.code] || error.message,
            data: null,
        };
    }
}

/** Resolve an invite code to the inviter's first name, for the signup banner. */
export async function getInviterName(userId?: string): Promise<string | null> {
    if (!userId) return null;
    try {
        const snap = await db.collection("users").doc(userId).get();
        if (!snap.exists) return null;
        const name = (snap.data() as UserType | undefined)?.name;
        return name ? name.split(" ")[0] : null;
    } catch {
        return null;
    }
}

/** Category names that currently have at least one completed donation. */
export async function getLeaderboardCategories(): Promise<ResponseData<string[]>> {
    try {
        const { stats } = await aggregate("all-time");
        const names = new Set<string>();
        Object.values(stats).forEach((s) =>
            Object.entries(s.donationsByCategory).forEach(([name, count]) => {
                if (count > 0) names.add(name);
            })
        );
        return {
            success: true,
            message: "Categories fetched successfully",
            data: Array.from(names).sort(),
        };
    } catch {
        return { success: true, message: "No categories", data: [] };
    }
}
