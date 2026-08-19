/**
 * Mirrors the real Explore layout (header, sticky filter row, 2→5 column grid)
 * so content swaps in without the page jumping.
 */
export default function Loading() {
    return (
        <div className="w-full max-w-[1400px] mx-auto px-4">
            {/* Header */}
            <div className="pt-6 mb-5">
                <div className="h-3 w-20 bg-sand animate-pulse rounded-lg mb-3" />
                <div className="h-9 w-72 bg-sand animate-pulse rounded-2xl mb-2.5" />
                <div className="h-4 w-56 bg-sand animate-pulse rounded-lg" />
            </div>

            {/* Search + filters */}
            <div className="pt-3 pb-4 mb-6">
                <div className="h-12 w-full bg-sand animate-pulse rounded-full" />
                <div className="flex gap-2 mt-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-8 w-28 bg-sand animate-pulse rounded-full flex-shrink-0" />
                    ))}
                </div>
                <div className="flex gap-2 mt-2">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-8 w-24 bg-sand animate-pulse rounded-full flex-shrink-0" />
                    ))}
                </div>
            </div>

            {/* Grid — same breakpoints as the live one */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="rounded-3xl border border-gray-200/70 bg-white overflow-hidden">
                        <div className="aspect-square w-full bg-sand animate-pulse" />
                        <div className="p-3.5 space-y-2">
                            <div className="h-3.5 w-3/4 bg-sand animate-pulse rounded-lg" />
                            <div className="h-3 w-1/2 bg-sand animate-pulse rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
