"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import ImageCard from "@/components/ui/image-card";
import { ItemType } from "@/app/types";

/** Days after which an item stops counting as "fresh". */
const FRESH_WINDOW_DAYS = 14;

/**
 * Compact age, or undefined once an item is no longer genuinely new.
 *
 * A badge reading "about 1 year" on a rail called "just listed" actively
 * misleads, so past the freshness window we show nothing rather than aging text.
 * The rail still orders newest-first either way.
 */
function freshnessLabel(iso?: string): string | undefined {
    if (!iso) return undefined;
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms) || ms < 0) return undefined;

    const minutes = ms / 60_000;
    const hours = minutes / 60;
    const days = hours / 24;

    if (days > FRESH_WINDOW_DAYS) return undefined;
    if (minutes < 60) return "just now";
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    if (days < 7) return `${Math.floor(days)}d ago`;
    return `${Math.floor(days / 7)}w ago`;
}

/**
 * A horizontally scrolling row of listings.
 *
 * Chosen over a grid for the secondary sections: it keeps several intents
 * ("just listed", "closest to you") above the fold without stacking three walls
 * of cards, and horizontal swiping is the native gesture on mobile.
 */
export function ListingRail({
    eyebrow,
    title,
    items,
    href = "/explore",
    showAge = false,
}: {
    eyebrow: string;
    title: string;
    items: ItemType[];
    href?: string;
    /** Render a "2h ago" chip — used by the freshness rail */
    showAge?: boolean;
}) {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [atStart, setAtStart] = useState(true);
    const [atEnd, setAtEnd] = useState(false);

    const sync = useCallback(() => {
        const el = scrollerRef.current;
        if (!el) return;
        setAtStart(el.scrollLeft <= 4);
        setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    }, []);

    useEffect(() => {
        sync();
        const el = scrollerRef.current;
        if (!el) return;
        el.addEventListener("scroll", sync, { passive: true });
        window.addEventListener("resize", sync);
        return () => {
            el.removeEventListener("scroll", sync);
            window.removeEventListener("resize", sync);
        };
    }, [sync, items.length]);

    const nudge = (dir: -1 | 1) => {
        const el = scrollerRef.current;
        if (!el) return;
        el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
    };

    if (items.length === 0) return null;

    return (
        <section className="w-full">
            <div className="flex items-end justify-between gap-4 mb-4 md:mb-5">
                <div className="min-w-0">
                    <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-1.5">{eyebrow}</p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">{title}</h2>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Arrows are a desktop affordance; touch users just swipe */}
                    <div className="hidden md:flex items-center gap-1.5">
                        <button
                            onClick={() => nudge(-1)}
                            disabled={atStart}
                            aria-label={`Scroll ${title} left`}
                            className="w-9 h-9 rounded-full border border-gray-200 bg-white text-ink flex items-center justify-center hover:border-forest/40 disabled:opacity-30 disabled:hover:border-gray-200 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => nudge(1)}
                            disabled={atEnd}
                            aria-label={`Scroll ${title} right`}
                            className="w-9 h-9 rounded-full border border-gray-200 bg-white text-ink flex items-center justify-center hover:border-forest/40 disabled:opacity-30 disabled:hover:border-gray-200 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <Link
                        href={href}
                        className="group inline-flex items-center gap-1.5 text-ink font-semibold text-sm border-b-2 border-lime pb-1 hover:gap-3 transition-all"
                    >
                        See all <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            <div
                ref={scrollerRef}
                className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 pb-1"
            >
                {items.map((item) => (
                    <Link
                        key={item.id}
                        href={`/explore?id=${item.id}`}
                        className="snap-start flex-shrink-0 w-[47%] sm:w-56 md:w-60"
                    >
                        <ImageCard
                            image={item.assets?.[0]?.url || ""}
                            title={item.name}
                            description={item.description}
                            itemId={item.id}
                            createdBy={item.createdBy}
                            distance={item.distance}
                            locationName={item.locationName}
                            photoCount={item.assets?.length}
                            badge={showAge ? freshnessLabel(item.createdAt) : undefined}
                        />
                    </Link>
                ))}
            </div>
        </section>
    );
}
