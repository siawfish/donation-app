"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import type { AssetType } from "@/app/types";

/**
 * Photos for a shared listing.
 *
 * Kept simple on purpose: the first photo is what appears in a link preview, so
 * it is the one that has to load fast. Later photos are stepped through rather
 * than lazily virtualised — a listing has a handful of images, not a hundred.
 */
export function ListingGallery({
    photos,
    name,
    gone,
}: {
    photos: AssetType[];
    name: string;
    gone: boolean;
}) {
    const [active, setActive] = useState(0);

    if (!photos.length) {
        return (
            <div className="aspect-[4/3] rounded-3xl bg-sand flex items-center justify-center">
                <Images className="w-10 h-10 text-forest/30" />
            </div>
        );
    }

    const step = (by: number) => setActive((i) => (i + by + photos.length) % photos.length);

    return (
        <div className="min-w-0">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-sand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={photos[active].url}
                    alt={name}
                    className={`w-full h-full object-cover ${gone ? "opacity-60" : ""}`}
                />

                {photos.length > 1 && (
                    <>
                        <button
                            onClick={() => step(-1)}
                            aria-label="Previous photo"
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-ink" />
                        </button>
                        <button
                            onClick={() => step(1)}
                            aria-label="Next photo"
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-ink" />
                        </button>
                        <span className="absolute bottom-3 right-3 bg-black/55 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full tabular-nums">
                            {active + 1} / {photos.length}
                        </span>
                    </>
                )}
            </div>

            {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 mt-3">
                    {photos.map((p, i) => (
                        <button
                            key={p.id ?? p.url}
                            onClick={() => setActive(i)}
                            aria-label={`Photo ${i + 1}`}
                            aria-current={i === active}
                            className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-colors ${
                                i === active ? "border-forest" : "border-transparent hover:border-gray-300"
                            }`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.url} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
