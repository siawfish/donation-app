import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { authConfig } from "@/firebase/config/server-config";
import { getMyLoyalty, getLeaderboard } from "@/app/app/actions/leaderboard";
import { AchievementGrid } from "@/components/loyalty/AchievementGrid";
import { CrestGenerator } from "@/components/loyalty/CrestGenerator";
import { InviteFriends } from "@/components/loyalty/InviteFriends";
import { TierBadge } from "@/components/loyalty/TierBadge";
import { LeaderboardBoard } from "@/components/loyalty/LeaderboardBoard";
import {
    POINTS,
    TIERS,
    getNextTier,
    pointsToNextTier,
    tierProgress,
} from "@/lib/loyalty";
import { ArrowRight, Gift, Package, Users, MessageSquare } from "lucide-react";

export const metadata: Metadata = {
    title: "Your rewards — Givny",
    description: "Track your division, badges and rank in the Givny community.",
};

export default async function RewardsPage() {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) redirect("/auth/login?redirect=/app/rewards");

    const [{ data: loyalty }, { data: top }] = await Promise.all([
        getMyLoyalty(),
        getLeaderboard({ scope: "all-time", limit: 5 }),
    ]);

    if (!loyalty) {
        return (
            <p className="text-gray-500">We couldn&apos;t load your rewards. Please try again.</p>
        );
    }

    const tier = TIERS.find((t) => t.id === loyalty.tierId) ?? TIERS[0];
    const next = getNextTier(loyalty.points);
    const progress = tierProgress(loyalty.points);
    const remaining = pointsToNextTier(loyalty.points);

    const breakdown = [
        { icon: Gift, label: "Items passed on", count: loyalty.stats.donationsCompleted, each: POINTS.DONATION_COMPLETED },
        { icon: Package, label: "Items listed", count: loyalty.stats.itemsListed, each: POINTS.ITEM_LISTED },
        { icon: MessageSquare, label: "People you replied to", count: loyalty.stats.requestsAnswered, each: POINTS.REQUEST_ANSWERED },
        { icon: Users, label: "People you invited", count: loyalty.stats.referralsJoined, each: POINTS.REFERRAL_JOINED },
    ];

    return (
        <div className="space-y-10">
            {/* Header */}
            <div>
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-2">Rewards</p>
                <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">Grow your Grove</h1>
                <p className="text-gray-500 text-sm mt-1.5">
                    Points come from keeping good things in use — passing them on, not picking them up.
                </p>
            </div>

            {/* Tier hero */}
            <div className="forest-panel rounded-3xl p-6 md:p-8 text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <span className="flex items-center justify-center w-20 h-20 rounded-3xl bg-lime text-5xl flex-shrink-0">
                            {tier.emoji}
                        </span>
                        <div>
                            <TierBadge tierId={tier.id} />
                            <p className="text-4xl md:text-5xl font-bold text-white leading-none mt-2">
                                {loyalty.points.toLocaleString()}
                                <span className="text-lg font-semibold text-white/40 ml-2">pts</span>
                            </p>
                            <p className="text-sm text-white/50 mt-1.5">{tier.blurb}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 md:gap-10">
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-1">Rank</p>
                            <p className="text-2xl font-bold text-lime leading-none">
                                {loyalty.rank ? `#${loyalty.rank}` : "—"}
                            </p>
                            <p className="text-[11px] text-white/40 mt-1">of {loyalty.totalRanked} ranked</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-1">Badges</p>
                            <p className="text-2xl font-bold text-lime leading-none">
                                {loyalty.achievements.filter((a) => a.unlocked).length}
                            </p>
                            <p className="text-[11px] text-white/40 mt-1">of {loyalty.achievements.length}</p>
                        </div>
                    </div>
                </div>

                {next ? (
                    <div className="mt-8">
                        <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-white/60">
                                <span className="font-bold text-lime">{remaining}</span> points to reach {next.emoji}{" "}
                                {next.name}
                            </span>
                            <span className="text-white/40 font-semibold">{progress}%</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-[11px] text-white/40 mt-2">
                            That&apos;s about {Math.ceil(remaining / POINTS.DONATION_COMPLETED)} more{" "}
                            {Math.ceil(remaining / POINTS.DONATION_COMPLETED) === 1 ? "handover" : "handovers"}.
                        </p>
                    </div>
                ) : (
                    <p className="mt-8 text-lime font-bold text-sm">
                        🏆 You&apos;ve reached the top division. Thank you for what you give.
                    </p>
                )}
            </div>

            {/* Points breakdown */}
            <div className="space-y-4">
                <div>
                    <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-1">Breakdown</p>
                    <h2 className="text-xl font-bold text-ink tracking-tight">Where your points came from</h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {breakdown.map(({ icon: Icon, label, count, each }) => (
                        <div key={label} className="bg-white border border-gray-200/70 rounded-3xl p-4 md:p-5">
                            <span className="flex items-center justify-center w-9 h-9 rounded-2xl bg-primary-light text-primary mb-3">
                                <Icon className="w-4 h-4" />
                            </span>
                            <p className="text-2xl font-bold text-ink">{(count * each).toLocaleString()}</p>
                            <p className="text-xs font-bold text-ink mt-1">{label}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                {count} × {each} pts
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Shareable crest */}
            <CrestGenerator
                name={loyalty.name}
                tierId={loyalty.tierId}
                points={loyalty.points}
                rank={loyalty.rank}
                totalRanked={loyalty.totalRanked}
                stats={loyalty.stats}
                achievements={loyalty.achievements}
            />

            {/* Invite */}
            <InviteFriends referralsJoined={loyalty.stats.referralsJoined} />

            {/* Achievements */}
            <AchievementGrid achievements={loyalty.achievements} />

            {/* Top of the board */}
            <div className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-1">Community</p>
                        <h2 className="text-xl font-bold text-ink tracking-tight">Top givers right now</h2>
                    </div>
                    <Link
                        href="/leaderboard"
                        className="group inline-flex items-center gap-1.5 text-ink font-semibold text-sm border-b-2 border-lime pb-1 hover:gap-3 transition-all flex-shrink-0"
                    >
                        Full board <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
                <LeaderboardBoard entries={top ?? []} currentUserId={loyalty.userId} />
            </div>
        </div>
    );
}
