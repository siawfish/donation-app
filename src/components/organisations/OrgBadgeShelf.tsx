"use client";

import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import type { OrgStanding } from "@/app/app/actions/organisations";

const GROUP_LABELS: Record<string, string> = {
    reach: "Reach",
    trust: "Trust",
    consistency: "Consistency",
};

/**
 * The badges an organisation holds, and — folded away — the ones it doesn't.
 *
 * Locked badges are shown with their progress rather than hidden, because the
 * whole value of a scheme like this is that the next rung is visible. They start
 * collapsed so a visitor sees achievements, not a list of things this
 * organisation has failed to do.
 */
export function OrgBadgeShelf({ standing }: { standing: OrgStanding }) {
    const [open, setOpen] = useState(false);

    const unlocked = standing.badges.filter((b) => b.unlocked);
    const locked = standing.badges.filter((b) => !b.unlocked);

    if (!unlocked.length && standing.points === 0) return null;

    return (
        <section className="bg-white border border-gray-200/70 rounded-3xl p-5 md:p-6 mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-base font-bold text-ink">
                    Standing
                    <span className="text-gray-400 font-normal"> · {standing.tier.blurb}</span>
                </h2>
                <span className="text-sm font-bold text-forest tabular-nums">
                    {standing.points.toLocaleString()} pts
                </span>
            </div>

            {standing.nextTier && (
                <div className="mt-3">
                    <div className="h-1.5 rounded-sm bg-gray-100 overflow-hidden">
                        <div className="h-full bg-forest transition-all" style={{ width: `${standing.progress}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {standing.pointsToNext.toLocaleString()} points to{" "}
                        <span className="font-semibold text-ink">
                            {standing.nextTier.emoji} {standing.nextTier.name}
                        </span>
                    </p>
                </div>
            )}

            {unlocked.length > 0 && (
                <ul className="flex flex-wrap gap-2 mt-4">
                    {unlocked.map((b) => (
                        <li
                            key={b.id}
                            title={b.description}
                            className="inline-flex items-center gap-1.5 bg-sand text-forest text-xs font-bold px-3 py-1.5 rounded-full"
                        >
                            <span aria-hidden="true">{b.emoji}</span> {b.name}
                        </li>
                    ))}
                </ul>
            )}

            {locked.length > 0 && (
                <>
                    <button
                        onClick={() => setOpen((o) => !o)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-forest mt-4 transition-colors"
                        aria-expanded={open}
                    >
                        {open ? "Hide" : `${locked.length} still to earn`}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>

                    {open && (
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                            {locked.map((b) => (
                                <li key={b.id} className="flex items-start gap-2.5 rounded-2xl border border-gray-100 px-3.5 py-3">
                                    <span className="mt-0.5 flex-shrink-0 opacity-40" aria-hidden="true">
                                        <Lock className="w-3.5 h-3.5" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-xs font-bold text-ink">
                                            {b.emoji} {b.name}
                                            <span className="ml-1.5 text-[11px] font-normal text-gray-400">
                                                {GROUP_LABELS[b.group]}
                                            </span>
                                        </span>
                                        <span className="block text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                                            {b.description}
                                        </span>
                                        <span className="block h-1 rounded-sm bg-gray-100 overflow-hidden mt-1.5">
                                            <span
                                                className="block h-full bg-primary"
                                                style={{ width: `${Math.round((b.progress / b.target) * 100)}%` }}
                                            />
                                        </span>
                                        <span className="block text-[10px] text-gray-400 mt-1 tabular-nums">
                                            {b.progress} / {b.target}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </section>
    );
}
