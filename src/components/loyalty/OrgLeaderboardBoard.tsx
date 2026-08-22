import Link from "next/link";
import { BadgeCheck, Building2, Leaf, Users2 } from "lucide-react";
import { ORG_TIERS, type OrgLeaderboardEntry } from "@/lib/orgLoyalty";

/**
 * The organisation board.
 *
 * Every row is a link to a storefront, which the member board's rows are not —
 * an organisation near the top of this table is exactly who a reader should be
 * following, and making them hunt for the page wastes the ranking.
 */

function Logo({ entry, size }: { entry: OrgLeaderboardEntry; size: number }) {
    return (
        <span
            className="rounded-2xl bg-sand overflow-hidden flex items-center justify-center flex-shrink-0"
            style={{ width: size, height: size }}
        >
            {entry.logoUrl ? (
                // Logos come from arbitrary URLs, so a plain img avoids
                // configuring next/image for every possible host.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.logoUrl} alt="" className="w-full h-full object-contain p-1.5" />
            ) : (
                <Building2 className="text-forest" style={{ width: size * 0.4, height: size * 0.4 }} />
            )}
        </span>
    );
}

function OrgTierChip({ tierId }: { tierId: string }) {
    const tier = ORG_TIERS.find((t) => t.id === tierId) ?? ORG_TIERS[0];
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${tier.chip}`}>
            <span aria-hidden="true">{tier.emoji}</span> {tier.name}
        </span>
    );
}

const MEDALS = ["🥇", "🥈", "🥉"];

function PodiumCard({ entry, place }: { entry: OrgLeaderboardEntry; place: 0 | 1 | 2 }) {
    const first = place === 0;

    return (
        <Link
            href={`/o/${entry.slug}`}
            className={`relative rounded-3xl p-5 text-center flex flex-col items-center transition-colors ${
                first ? "bg-lime md:pt-8 md:pb-7 hover:brightness-95" : "bg-white border border-gray-200/70 hover:border-forest/40"
            }`}
        >
            <span className="text-3xl leading-none mb-3">{MEDALS[place]}</span>
            <Logo entry={entry} size={first ? 64 : 52} />

            <p className={`mt-3 font-bold leading-tight inline-flex items-center gap-1 ${first ? "text-forest text-lg" : "text-ink text-sm"}`}>
                {entry.name}
                {entry.verified && <BadgeCheck className={first ? "w-4 h-4" : "w-3.5 h-3.5"} />}
            </p>
            {entry.locationName && (
                <p className={`text-[11px] mt-0.5 truncate max-w-full ${first ? "text-forest/60" : "text-gray-400"}`}>
                    {entry.locationName}
                </p>
            )}

            <p className={`mt-3 font-extrabold ${first ? "text-forest text-3xl" : "text-ink text-2xl"}`}>
                {entry.points.toLocaleString()}
            </p>
            <p className={`text-[11px] ${first ? "text-forest/60" : "text-gray-400"}`}>points</p>

            <div className="mt-3">
                <OrgTierChip tierId={entry.tierId} />
            </div>
        </Link>
    );
}

export function OrgLeaderboardBoard({ entries }: { entries: OrgLeaderboardEntry[] }) {
    if (entries.length === 0) {
        return (
            <div className="bg-white border border-gray-200/70 rounded-3xl px-8 py-14 text-center">
                <p className="text-3xl mb-3">🏛️</p>
                <p className="text-lg font-bold text-ink">No organisations on the board yet</p>
                <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                    Businesses, NGOs and schools appear here once they&rsquo;ve passed things on.
                </p>
                <Link href="/for-organisations" className="inline-block mt-4 text-sm font-bold text-forest hover:underline">
                    Apply to list
                </Link>
            </div>
        );
    }

    const podium = entries.slice(0, 3);
    const rest = entries.slice(3);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 sm:items-end">
                {podium[1] && (
                    <div className="order-2 sm:order-1">
                        <PodiumCard entry={podium[1]} place={1} />
                    </div>
                )}
                {podium[0] && (
                    <div className="order-1 sm:order-2">
                        <PodiumCard entry={podium[0]} place={0} />
                    </div>
                )}
                {podium[2] && (
                    <div className="order-3">
                        <PodiumCard entry={podium[2]} place={2} />
                    </div>
                )}
            </div>

            {rest.length > 0 && (
                <div className="bg-white border border-gray-200/70 rounded-3xl overflow-hidden">
                    {rest.map((entry, i) => (
                        <Link
                            key={entry.orgId}
                            href={`/o/${entry.slug}`}
                            className={`flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5 hover:bg-sand/60 transition-colors ${
                                i !== rest.length - 1 ? "border-b border-gray-100" : ""
                            }`}
                        >
                            <span className="w-7 text-sm font-extrabold text-gray-400 tabular-nums flex-shrink-0">
                                {entry.rank}
                            </span>
                            <Logo entry={entry} size={38} />

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-ink truncate inline-flex items-center gap-1">
                                    {entry.name}
                                    {entry.verified && <BadgeCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                                </p>
                                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                                    <span className="inline-flex items-center gap-1">
                                        <Users2 className="w-3 h-3" /> {entry.householdsReached} household
                                        {entry.householdsReached === 1 ? "" : "s"}
                                    </span>
                                    <span className="hidden sm:inline-flex items-center gap-1">
                                        <Leaf className="w-3 h-3" /> {entry.kgDiverted}kg diverted
                                    </span>
                                </div>
                            </div>

                            <div className="hidden sm:block flex-shrink-0">
                                <OrgTierChip tierId={entry.tierId} />
                            </div>

                            <div className="text-right flex-shrink-0 w-16">
                                <p className="text-sm font-extrabold text-ink tabular-nums">
                                    {entry.points.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-gray-400">points</p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
