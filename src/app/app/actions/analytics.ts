'use server';

import { cache } from "react";
import { db } from "@/firebase/init";
import { ResponseData, RequestStatus } from "@/app/types";
import { getMyAdminRole } from "./admin";
import { can } from "@/lib/roles";

export interface Kpi {
    id: string;
    label: string;
    value: number;
    /** Rendered as a percentage rather than a count. */
    isPercent?: boolean;
    /** Change vs the previous window of the same length, in whole percent. */
    deltaPct?: number | null;
    hint: string;
}

export interface TrendPoint {
    month: string;      // "2026-08"
    label: string;      // "Aug"
    signups: number;
    listings: number;
    rehomed: number;
}

export interface Milestone {
    id: string;
    label: string;
    current: number;
    target: number;
    hint: string;
}

export interface AnalyticsSnapshot {
    kpis: Kpi[];
    trend: TrendPoint[];
    milestones: Milestone[];
    topCategories: { name: string; count: number }[];
    generatedAt: string;
}

const monthKey = (iso?: string) => (iso ? iso.slice(0, 7) : "");

function pctChange(current: number, previous: number): number | null {
    if (previous === 0) return current > 0 ? 100 : null;
    return Math.round(((current - previous) / previous) * 100);
}

/**
 * Platform analytics, derived from the collections rather than a stats document.
 * Same reasoning as the leaderboard: nothing to keep in sync, and historic data
 * counts immediately. One pass over each collection, memoised per request.
 */
export const getAnalytics = cache(async (): Promise<ResponseData<AnalyticsSnapshot | null>> => {
    try {
        const role = await getMyAdminRole();
        if (!can(role, "analytics.view")) throw new Error("You don't have permission to view analytics.");

        const [users, items, requests, messages, verifications] = await Promise.all([
            db.collection("users").get(),
            db.collection("items").get(),
            db.collection("requests").get(),
            db.collection("messages").get(),
            db.collection("verifications").get(),
        ]);

        const now = new Date();
        const dayMs = 86_400_000;
        const since = (days: number) => new Date(now.getTime() - days * dayMs).toISOString();
        const last30 = since(30);
        const prev30 = since(60);

        const inWindow = (iso: string | undefined, from: string, to?: string) =>
            !!iso && iso >= from && (!to || iso < to);

        /* ---- headline counts ---- */
        const totalMembers = users.size;
        const suspended = users.docs.filter((d) => d.data().suspended === true).length;
        const verifiedMembers = users.docs.filter((d) => d.data().verified === true).length;

        const signups30 = users.docs.filter((d) => inWindow(d.data().createdAt, last30)).length;
        const signupsPrev30 = users.docs.filter((d) => inWindow(d.data().createdAt, prev30, last30)).length;

        const activeListings = items.docs.filter((d) => !d.data().donatedTo).length;
        const listings30 = items.docs.filter((d) => inWindow(d.data().createdAt, last30)).length;
        const listingsPrev30 = items.docs.filter((d) => inWindow(d.data().createdAt, prev30, last30)).length;

        const completed = requests.docs.filter((d) => d.data().status === RequestStatus.COMPLETED);
        const rehomed30 = completed.filter((d) => inWindow(d.data().updatedAt ?? d.data().createdAt, last30)).length;
        const rehomedPrev30 = completed.filter((d) =>
            inWindow(d.data().updatedAt ?? d.data().createdAt, prev30, last30)
        ).length;

        const answered = requests.docs.filter((d) => d.data().status !== RequestStatus.PENDING);
        const accepted = requests.docs.filter((d) =>
            [RequestStatus.ACCEPTED, RequestStatus.COMPLETED].includes(d.data().status)
        );

        /* ---- how long an item waits before it finds a home ---- */
        const itemById: Record<string, any> = {};
        items.docs.forEach((d) => (itemById[d.id] = d.data()));
        const durations = completed
            .map((d) => {
                const req = d.data();
                const listedAt = itemById[req.itemId]?.createdAt;
                const doneAt = req.updatedAt ?? req.createdAt;
                if (!listedAt || !doneAt) return null;
                return (new Date(doneAt).getTime() - new Date(listedAt).getTime()) / dayMs;
            })
            .filter((n): n is number => n !== null && n >= 0)
            .sort((a, b) => a - b);
        const medianDays = durations.length
            ? Math.round(durations[Math.floor(durations.length / 2)] * 10) / 10
            : 0;

        const kpis: Kpi[] = [
            {
                id: "members",
                label: "Members",
                value: totalMembers,
                deltaPct: pctChange(signups30, signupsPrev30),
                hint: `${signups30} joined in the last 30 days`,
            },
            {
                id: "rehomed",
                label: "Items rehomed",
                value: completed.length,
                deltaPct: pctChange(rehomed30, rehomedPrev30),
                hint: `${rehomed30} in the last 30 days · the number that matters most`,
            },
            {
                id: "active",
                label: "Available now",
                value: activeListings,
                deltaPct: pctChange(listings30, listingsPrev30),
                hint: `${listings30} listed in the last 30 days`,
            },
            {
                id: "rehome_rate",
                label: "Rehoming rate",
                value: items.size ? Math.round((completed.length / items.size) * 100) : 0,
                isPercent: true,
                hint: "Share of all listings that found a home",
            },
            {
                id: "acceptance",
                label: "Acceptance rate",
                value: answered.length ? Math.round((accepted.length / answered.length) * 100) : 0,
                isPercent: true,
                hint: `${accepted.length} accepted of ${answered.length} answered`,
            },
            {
                id: "speed",
                label: "Days to rehome",
                value: medianDays,
                hint: "Median time from listing to handover",
            },
            {
                id: "verified",
                label: "Verified members",
                value: totalMembers ? Math.round((verifiedMembers / totalMembers) * 100) : 0,
                isPercent: true,
                hint: `${verifiedMembers} of ${totalMembers} verified${
                    verifications.size ? ` · ${verifications.docs.filter((d) => d.data().status === "pending").length} awaiting review` : ""
                }`,
            },
            {
                id: "messages",
                label: "Messages sent",
                value: messages.size,
                hint: `${suspended} member${suspended === 1 ? "" : "s"} currently suspended`,
            },
        ];

        /* ---- six-month trend ---- */
        const trend: TrendPoint[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            trend.push({
                month: key,
                label: d.toLocaleString("en", { month: "short" }),
                signups: users.docs.filter((u) => monthKey(u.data().createdAt) === key).length,
                listings: items.docs.filter((it) => monthKey(it.data().createdAt) === key).length,
                rehomed: completed.filter((r) => monthKey(r.data().updatedAt ?? r.data().createdAt) === key).length,
            });
        }

        /* ---- milestones ---- */
        // Targets step up as each is passed, so the board always shows the next
        // goal rather than a permanently completed bar.
        const nextTarget = (value: number, steps: number[]) =>
            steps.find((s) => value < s) ?? steps[steps.length - 1];

        const milestones: Milestone[] = [
            {
                id: "m_rehomed",
                label: "Items rehomed",
                current: completed.length,
                target: nextTarget(completed.length, [10, 50, 100, 500, 1000, 5000]),
                hint: "Every one is something kept out of a landfill",
            },
            {
                id: "m_members",
                label: "Community size",
                current: totalMembers,
                target: nextTarget(totalMembers, [25, 100, 500, 1000, 5000]),
                hint: "More neighbours means shorter distances",
            },
            {
                id: "m_listings",
                label: "Items listed",
                current: items.size,
                target: nextTarget(items.size, [25, 100, 500, 1000]),
                hint: "Supply is the constraint early on",
            },
            {
                id: "m_verified",
                label: "Verified members",
                current: verifiedMembers,
                target: nextTarget(verifiedMembers, [5, 25, 100, 500]),
                hint: "Verification is what makes strangers comfortable meeting",
            },
        ];

        /* ---- categories ---- */
        const categoryCounts: Record<string, number> = {};
        items.docs.forEach((d) =>
            (d.data().categories || []).forEach((c: any) => {
                if (c?.name) categoryCounts[c.name] = (categoryCounts[c.name] ?? 0) + 1;
            })
        );
        const topCategories = Object.entries(categoryCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

        return {
            success: true,
            message: "ok",
            data: { kpis, trend, milestones, topCategories, generatedAt: new Date().toISOString() },
        };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
});
