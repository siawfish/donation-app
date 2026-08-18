"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, ArrowUpRight, Flame } from "lucide-react";
import { useAuth } from "@/firebase/auth/AuthContext";
import { getMyLoyalty, MemberLoyalty } from "@/app/app/actions/leaderboard";
import { TIERS, getNextTier, pointsToNextTier, tierProgress } from "@/lib/loyalty";

export function LoyaltyCard() {
    const { user } = useAuth();
    const [loyalty, setLoyalty] = useState<MemberLoyalty | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        let active = true;
        getMyLoyalty()
            .then((res) => {
                if (active && res.success) setLoyalty(res.data);
            })
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [user]);

    if (loading) return <div className="h-44 rounded-3xl bg-sand animate-pulse" />;
    if (!loyalty) return null;

    const tier = TIERS.find((t) => t.id === loyalty.tierId) ?? TIERS[0];
    const next = getNextTier(loyalty.points);
    const progress = tierProgress(loyalty.points);
    const remaining = pointsToNextTier(loyalty.points);
    const unlocked = loyalty.achievements.filter((a) => a.unlocked).length;

    return (
        <div className="forest-panel rounded-3xl p-5 md:p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                {/* Tier + points */}
                <div className="flex items-center gap-4">
                    <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-lime text-3xl flex-shrink-0">
                        {tier.emoji}
                    </span>
                    <div>
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-lime/80 mb-1">
                            {tier.name} division
                        </p>
                        <p className="text-3xl md:text-4xl font-bold text-white leading-none">
                            {loyalty.points.toLocaleString()}
                            <span className="text-base font-semibold text-white/40 ml-1.5">pts</span>
                        </p>
                    </div>
                </div>

                {/* Rank + badges */}
                <div className="flex items-center gap-6 sm:gap-8">
                    <div>
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-1">Rank</p>
                        <p className="text-xl font-bold text-white leading-none">
                            {loyalty.rank ? `#${loyalty.rank}` : "—"}
                            {loyalty.rank && (
                                <span className="text-xs font-semibold text-white/40 ml-1">
                                    of {loyalty.totalRanked}
                                </span>
                            )}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-1">Badges</p>
                        <p className="text-xl font-bold text-white leading-none">{unlocked}</p>
                    </div>
                </div>
            </div>

            {/* Progress to next division */}
            {next ? (
                <div className="mt-6">
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-white/60">
                            <span className="font-bold text-lime">{remaining}</span> points to {next.emoji} {next.name}
                        </span>
                        <span className="text-white/40 font-semibold">{progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-lime transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            ) : (
                <div className="mt-6 flex items-center gap-2 text-sm text-lime font-bold">
                    <Flame className="w-4 h-4" />
                    Top division reached — you&apos;re a legend.
                </div>
            )}

            {/* Links */}
            <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-white/10">
                <Link
                    href="/app/rewards"
                    className="inline-flex items-center gap-1.5 bg-lime text-forest text-xs font-bold px-4 py-2.5 rounded-full hover:brightness-95 transition-all"
                >
                    <Trophy className="w-3.5 h-3.5" /> Your rewards
                </Link>
                <Link
                    href="/leaderboard"
                    className="group inline-flex items-center gap-1.5 border border-white/20 text-white/80 text-xs font-semibold px-4 py-2.5 rounded-full hover:bg-white/10 transition-colors"
                >
                    Leaderboard
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
            </div>
        </div>
    );
}
