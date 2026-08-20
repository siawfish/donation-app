"use client";

import Link from "next/link";
import { BadgeCheck, Globe, MapPin, Package, Users2, Leaf, Repeat } from "lucide-react";
import { ORG_TYPE_LABELS, type OrgImpact, type Organisation } from "@/lib/organisations";
import type { OrgStanding } from "@/app/app/actions/organisations";
import type { FollowState } from "@/app/app/actions/orgSocial";
import { FollowButton } from "./FollowButton";
import { ShareButtons } from "@/components/ShareButtons";
import { OrgBadgeShelf } from "./OrgBadgeShelf";

/**
 * The top of a storefront.
 *
 * Ordered by the question a visitor is actually asking, in order: who is this,
 * can I trust them, what have they done, what do they have. Standing and impact
 * come before the listings because an organisation is asking a stranger to turn
 * up somewhere — the numbers are what make that reasonable.
 */
export function StorefrontHeader({
    org,
    impact,
    standing,
    follow,
    signedIn,
    shareUrl,
}: {
    org: Organisation;
    impact: OrgImpact;
    standing: OrgStanding;
    follow: FollowState;
    signedIn: boolean;
    shareUrl: string;
}) {
    const stats = [
        { icon: Package, value: impact.rehomed, label: "passed on" },
        { icon: Users2, value: impact.householdsReached, label: `household${impact.householdsReached === 1 ? "" : "s"}` },
        { icon: Leaf, value: `${impact.kgDiverted}kg`, label: "diverted, est." },
        { icon: Repeat, value: `${impact.rehomingRate}%`, label: "found a home" },
    ];

    return (
        <>
            {/* Cover */}
            <div className="relative h-40 md:h-64 bg-forest overflow-hidden">
                {org.coverUrl ? (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={org.coverUrl} alt="" className="w-full h-full object-cover" />
                        {/* The identity block sits over this, so it needs a floor. */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                    </>
                ) : (
                    <div className="w-full h-full bg-dot-grid opacity-30" />
                )}
            </div>

            <div className="max-w-[1100px] mx-auto px-4">
                {/*
                    Stacked on a phone, one row from md up.
                    `flex-wrap` alone put the name, the meta line and both
                    buttons on a single squeezed row, which crushed "NGO /
                    non-profit · Anloga" into a four-line column.
                */}
                <div className="-mt-12 md:-mt-20 relative">
                    <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-5">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white border border-gray-200/70 shadow-lg shadow-forest/5 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {org.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={org.logoUrl} alt={org.name} className="w-full h-full object-contain p-2.5" />
                            ) : (
                                <span className="text-4xl font-bold text-forest">{org.name.slice(0, 1)}</span>
                            )}
                        </div>

                        <div className="min-w-0 flex-1 md:pb-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${standing.tier.chip}`}>
                                    <span aria-hidden="true">{standing.tier.emoji}</span> {standing.tier.name}
                                </span>
                                {org.verified && (
                                    <span className="inline-flex items-center gap-1 bg-primary-light text-primary text-[11px] font-bold px-2.5 py-1 rounded-full">
                                        <BadgeCheck className="w-3.5 h-3.5" /> Verified
                                    </span>
                                )}
                            </div>

                            <h1 className="text-2xl md:text-4xl font-bold text-ink tracking-tight">{org.name}</h1>

                            <p className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-x-1.5">
                                <span>{ORG_TYPE_LABELS[org.type]}</span>
                                {org.locationName && (
                                    <>
                                        <span aria-hidden="true">·</span>
                                        <span className="inline-flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-primary" />
                                            {org.locationName}
                                        </span>
                                    </>
                                )}
                                {follow.followers > 0 && (
                                    <>
                                        <span aria-hidden="true">·</span>
                                        <span className="tabular-nums">
                                            {follow.followers} follower{follow.followers === 1 ? "" : "s"}
                                        </span>
                                    </>
                                )}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 md:flex-shrink-0">
                            {/* Full width on a phone, where it is the primary action. */}
                            <span className="flex-1 md:flex-none [&>button]:w-full [&>button]:justify-center">
                                <FollowButton
                                    orgId={org.id!}
                                    orgName={org.name}
                                    initial={follow}
                                    signedIn={signedIn}
                                />
                            </span>
                            {org.website && (
                                <a
                                    href={org.website}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow"
                                    className="inline-flex items-center gap-1.5 border border-gray-200 bg-white text-ink text-sm font-bold px-4 py-2.5 rounded-full hover:border-forest/40 transition-colors flex-shrink-0"
                                >
                                    <Globe className="w-4 h-4" />
                                    <span className="hidden sm:inline">Website</span>
                                </a>
                            )}
                        </div>
                    </div>

                    {org.tagline && (
                        <p className="text-base md:text-lg text-ink mt-5 max-w-2xl leading-relaxed">{org.tagline}</p>
                    )}

                </div>

                {/* Impact. Hidden entirely until there is something true to say —
                    a row of zeroes is worse than no row. */}
                {impact.rehomed > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 bg-white border border-gray-200/70 rounded-3xl overflow-hidden mt-7">
                        {stats.map((s, i) => (
                            <div
                                key={s.label}
                                className={`px-4 py-5 text-center ${i % 2 === 1 ? "border-l border-gray-200/70" : ""} ${
                                    i >= 2 ? "border-t md:border-t-0 border-gray-200/70" : ""
                                } ${i === 2 ? "md:border-l" : ""}`}
                            >
                                <s.icon className="w-4 h-4 text-primary mx-auto mb-1.5" />
                                <p className="text-xl md:text-2xl font-bold text-ink tabular-nums">{s.value}</p>
                                <p className="text-[11px] md:text-xs text-gray-500 mt-0.5 leading-tight">{s.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                <OrgBadgeShelf standing={standing} />

                <div className="mt-6">
                    <ShareButtons url={shareUrl} title={`${org.name} on Givny`} includeLinkedIn />
                </div>
            </div>
        </>
    );
}

/** Small “who lists here” line used on the directory card. */
export function OrgTypeLine({ org }: { org: Organisation }) {
    return (
        <Link href={`/o/${org.slug}`} className="text-sm text-gray-500 hover:text-forest">
            {ORG_TYPE_LABELS[org.type]}
        </Link>
    );
}
