import Link from "next/link";
import { CategoryType } from "@/app/types";

/**
 * Category entry points. Counts come from the same pool the rails use, so a
 * category only appears when something is actually available in it — an empty
 * category tile is a dead end for the visitor.
 */
export function CategoryStrip({
    categories,
    counts,
}: {
    categories: CategoryType[];
    counts: Record<string, number>;
}) {
    const live = categories
        .filter((c) => (counts[c.id] ?? 0) > 0)
        .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));

    if (live.length === 0) return null;

    return (
        <section className="w-full">
            <div className="mb-4 md:mb-5">
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-1.5">Categories</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">What are you looking for?</h2>
            </div>

            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap pb-1">
                {live.map((cat) => (
                    <Link
                        key={cat.id}
                        href={`/explore?cid=${encodeURIComponent(cat.id)}`}
                        className="group flex-shrink-0 inline-flex items-center gap-2.5 bg-white border border-gray-200/70 rounded-full pl-5 pr-2 py-2.5 hover:border-forest/40 hover:bg-sand transition-colors"
                    >
                        <span className="text-sm font-semibold text-ink whitespace-nowrap">{cat.name}</span>
                        <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-sand group-hover:bg-lime text-forest text-[11px] font-extrabold transition-colors">
                            {counts[cat.id]}
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
