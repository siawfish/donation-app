import { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import { ItemDetails } from "@/components/ItemDetails";
import { LeaderboardBoard } from "@/components/loyalty/LeaderboardBoard";
import { getLeaderboard, getLeaderboardCategories } from "@/app/app/actions/leaderboard";
import { getTokens } from "next-firebase-auth-edge";
import { authConfig } from "@/firebase/config/server-config";
import { cookies } from "next/headers";
import { LeaderboardScope, POINTS, TIERS } from "@/lib/loyalty";
import { Trophy, Gift, Package, Users, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
    title: "Community Leaderboard — Givny",
    description:
        "See who's giving the most in your community. Givny rewards generosity — earn points for every item you pass on, climb the divisions, and unlock category badges.",
};

const SCOPES: { id: LeaderboardScope; label: string }[] = [
    { id: "all-time", label: "All time" },
    { id: "month", label: "This month" },
];

const EARNING = [
    { icon: Gift, label: "Pass an item on", points: POINTS.DONATION_COMPLETED },
    { icon: Package, label: "List an item", points: POINTS.ITEM_LISTED },
    { icon: Users, label: "Invite someone who joins", points: POINTS.REFERRAL_JOINED },
];

export default async function LeaderboardPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const scope: LeaderboardScope = searchParams.scope === "month" ? "month" : "all-time";
    const category = typeof searchParams.category === "string" ? searchParams.category : undefined;

    const [{ data: entries }, { data: categories }, tokens] = await Promise.all([
        getLeaderboard({ scope, category, limit: 50 }),
        getLeaderboardCategories(),
        getTokens(await cookies(), authConfig).catch(() => null),
    ]);

    const currentUserId = tokens?.decodedToken.uid;
    const href = (next: { scope?: string; category?: string }) => {
        const p = new URLSearchParams();
        const s = next.scope ?? scope;
        const c = next.category ?? category;
        if (s !== "all-time") p.set("scope", s);
        if (c) p.set("category", c);
        const qs = p.toString();
        return `/leaderboard${qs ? `?${qs}` : ""}`;
    };

    return (
        <div className="flex flex-col min-h-[100dvh] bg-canvas">
            <Navbar />

            <main className="flex-1">
                {/* Hero */}
                <section className="w-full px-3 sm:px-4 pt-3">
                    <div className="forest-panel relative max-w-[1400px] mx-auto rounded-[2rem] md:rounded-[2.5rem] overflow-hidden px-5 sm:px-10 md:px-16 py-12 md:py-16">
                        <div className="inline-flex items-center gap-2 border border-white/15 bg-white/5 text-lime text-xs font-medium px-4 py-1.5 rounded-full mb-6">
                            <Trophy className="w-3.5 h-3.5" />
                            Grow your Grove
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.03] tracking-tight text-balance max-w-3xl">
                            The most generous people in the community.
                        </h1>
                        <p className="text-sm sm:text-base text-white/60 max-w-xl leading-relaxed mt-5">
                            Every item you pass on earns points. Climb the divisions, unlock category
                            badges, and see where you stand — nothing here costs anyone a penny.
                        </p>

                        {/* How points work */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10 max-w-3xl">
                            {EARNING.map(({ icon: Icon, label, points }) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-3 bg-white/8 border border-white/10 rounded-2xl px-4 py-3"
                                >
                                    <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-lime text-forest flex-shrink-0">
                                        <Icon className="w-4 h-4" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-lime text-sm font-extrabold leading-none">+{points}</p>
                                        <p className="text-white/60 text-[11px] mt-1 leading-tight">{label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Divisions */}
                        <div className="flex flex-wrap items-center gap-2 mt-8">
                            <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/40 mr-1">
                                Divisions
                            </span>
                            {TIERS.map((t) => (
                                <span
                                    key={t.id}
                                    className="inline-flex items-center gap-1.5 border border-white/15 text-white/70 text-xs font-semibold px-3 py-1.5 rounded-full"
                                >
                                    <span>{t.emoji}</span>
                                    {t.name}
                                    <span className="text-white/30">{t.minPoints}+</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Board */}
                <section className="max-w-[1400px] mx-auto px-4 md:px-8 py-12 md:py-16">
                    {/* Scope tabs */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        {SCOPES.map((s) => (
                            <Link
                                key={s.id}
                                href={href({ scope: s.id })}
                                className={`px-5 py-2 rounded-full text-sm font-bold transition-colors border ${
                                    scope === s.id
                                        ? "bg-forest text-white border-forest"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-forest/40"
                                }`}
                            >
                                {s.label}
                            </Link>
                        ))}
                    </div>

                    {/* Category tabs */}
                    {(categories?.length ?? 0) > 0 && (
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-8">
                            <Link
                                href={href({ category: "" })}
                                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                                    !category
                                        ? "bg-lime text-forest border-lime"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-forest/40"
                                }`}
                            >
                                Overall
                            </Link>
                            {categories!.map((c) => (
                                <Link
                                    key={c}
                                    href={href({ category: c })}
                                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                                        category === c
                                            ? "bg-lime text-forest border-lime"
                                            : "bg-white text-gray-600 border-gray-200 hover:border-forest/40"
                                    }`}
                                >
                                    {c}
                                </Link>
                            ))}
                        </div>
                    )}

                    <div className="mb-6">
                        <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-2">
                            {category ? `${category} champions` : scope === "month" ? "This month" : "All time"}
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
                            {category ? `Top ${category} givers` : "Top givers"}
                        </h2>
                    </div>

                    <LeaderboardBoard
                        entries={entries ?? []}
                        currentUserId={currentUserId}
                        metricLabel={category ? "passed on" : "points"}
                    />

                    {/* Join CTA — only for signed-out visitors */}
                    {!currentUserId && (
                        <div className="mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-lime rounded-3xl p-6 md:p-8">
                            <div>
                                <h3 className="text-xl md:text-2xl font-bold text-forest tracking-tight">
                                    Want your name up there?
                                </h3>
                                <p className="text-sm text-forest/70 mt-1">
                                    Join free, list something you no longer need, and start climbing.
                                </p>
                            </div>
                            <Link
                                href="/auth/register"
                                className="group inline-flex items-center justify-center gap-2 bg-forest text-white font-bold text-sm px-7 py-3.5 rounded-full hover:bg-forest-dark transition-colors flex-shrink-0"
                            >
                                Join free
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    )}
                </section>
            </main>

            <Footer />
            <Suspense>
                <ItemDetails />
            </Suspense>
        </div>
    );
}
