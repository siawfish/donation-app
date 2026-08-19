import Link from "next/link";
import { ArrowRight, PackagePlus } from "lucide-react";
import ImageCard from "@/components/ui/image-card";
import EmptyState from "@/components/EmptyState";
import { CategoryType } from "@/app/types";
import { HomeFeed } from "@/app/app/actions/items";
import { ListingRail } from "./ListingRail";
import { CategoryStrip } from "./CategoryStrip";
import { freshnessLabel } from "@/lib/freshness";

/**
 * Homepage listings.
 *
 * Replaces the previous single bento grid, whose oversized "featured" tile
 * implied an importance the item hadn't earned — it was simply the most-viewed
 * one, and the extra area carried no extra information. This is organised by
 * visitor intent instead: what's new, what's closest, then a uniform grid where
 * every card is genuinely comparable.
 */
export function HomeListings({
    feed,
    categories,
}: {
    feed: HomeFeed;
    categories: CategoryType[];
}) {
    const { fresh, popular, nearby, categoryCounts, totalAvailable } = feed;

    if (totalAvailable === 0) {
        return (
            <section className="w-full py-16 bg-canvas">
                <div className="max-w-[1400px] mx-auto px-4 md:px-8">
                    <EmptyState
                        title="Nothing listed yet"
                        description="Be the first to give something a second life in your community."
                        containerClassName="min-h-[240px]"
                    />
                </div>
            </section>
        );
    }

    return (
        <section className="w-full bg-canvas py-14 md:py-20">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 space-y-14 md:space-y-20">

                {/* Freshness first — newly listed items are the most perishable,
                    and seeing recent activity is what signals a living community.
                    Labels are resolved here, on the server, so both renders agree. */}
                <ListingRail
                    eyebrow="Just listed"
                    title="Fresh off the shelf"
                    items={fresh.map((item) => ({ ...item, badge: freshnessLabel(item.createdAt) }))}
                />

                {/* Only meaningful when we know where the viewer is */}
                {nearby.length > 0 && (
                    <ListingRail
                        eyebrow="Around the corner"
                        title="Closest to you"
                        items={nearby}
                        href="/explore?radius=5"
                    />
                )}

                <CategoryStrip categories={categories} counts={categoryCounts} />

                {/* Uniform grid — equal weight, easy to compare */}
                {popular.length > 0 && (
                    <div>
                        <div className="flex items-end justify-between gap-4 mb-4 md:mb-5">
                            <div>
                                <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-1.5">
                                    Most wanted
                                </p>
                                <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                                    Popular right now
                                </h2>
                            </div>
                            <Link
                                href="/explore"
                                className="group hidden sm:inline-flex items-center gap-1.5 text-ink font-semibold text-sm border-b-2 border-lime pb-1 hover:gap-3 transition-all flex-shrink-0"
                            >
                                See all <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                            {popular.map((item) => (
                                <Link key={item.id} href={`/explore?id=${item.id}`}>
                                    <ImageCard
                                        image={item.assets?.[0]?.url || ""}
                                        title={item.name}
                                        description={item.description}
                                        itemId={item.id}
                                        createdBy={item.createdBy}
                                        distance={item.distance}
                                        locationName={item.locationName}
                                        photoCount={item.assets?.length}
                                    />
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Contribution prompt — the feed is only as good as what people add */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-lime rounded-3xl p-6 md:p-8">
                    <div>
                        <h3 className="text-xl md:text-2xl font-bold text-forest tracking-tight">
                            Something of yours could be here.
                        </h3>
                        <p className="text-sm text-forest/70 mt-1">
                            {totalAvailable} item{totalAvailable !== 1 ? "s" : ""} are looking for a new home right now.
                            Add yours in under two minutes.
                        </p>
                    </div>
                    <Link
                        href="/app/add-item"
                        className="group inline-flex items-center justify-center gap-2 bg-forest text-white font-bold text-sm px-7 py-3.5 rounded-full hover:bg-forest-dark transition-colors flex-shrink-0"
                    >
                        <PackagePlus className="w-4 h-4" />
                        List an item
                    </Link>
                </div>
            </div>
        </section>
    );
}
