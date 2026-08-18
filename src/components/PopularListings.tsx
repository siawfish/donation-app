import React from "react"
import Link from "next/link"
import Image from "next/image"
import ImageCard from "./ui/image-card"
import { ItemType } from "@/app/types"
import EmptyState from "./EmptyState"
import { ArrowRightIcon, MapPin } from "lucide-react"
import { formatDistance } from "@/lib/distance"

/**
 * Server-rendered. This used to query Firestore from the client, which meant the
 * Firebase SDK had to load and round-trip before anything appeared above the fold.
 * Items now arrive with the HTML.
 */
export default function PopularListings({ items = [] }: { items?: ItemType[] }) {
  const [featured, ...rest] = items
  const restItems = rest.slice(0, 6)

  return (
    <section className="w-full py-16 md:pb-24 bg-canvas">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-8 md:mb-10">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-2 md:mb-3">Fresh finds</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-ink leading-[1.08] tracking-tight">
              Popular right now
            </h2>
          </div>
          <Link
            href="/explore"
            className="group hidden sm:inline-flex items-center gap-2 text-ink font-semibold text-sm border-b-2 border-lime pb-1 hover:gap-3.5 transition-all flex-shrink-0"
          >
            View all <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {/* Featured item — spans 2 cols + 2 rows on md+ */}
            {featured && (
              <Link
                href={`/explore?id=${featured.id}`}
                className="col-span-2 row-span-2 group card-hover relative rounded-3xl overflow-hidden bg-sand aspect-square md:aspect-auto"
              >
                {featured.assets?.[0]?.url ? (
                  <Image
                    src={featured.assets[0].url}
                    alt={featured.name}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <div className="w-full h-full bg-sand flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                <div className="absolute top-4 left-4 bg-lime text-forest text-[10px] font-extrabold px-2.5 py-1 rounded-full tracking-widest">
                  FREE
                </div>

                <div className="absolute bottom-0 inset-x-0 p-4">
                  <h3 className="text-white font-bold text-base md:text-lg leading-tight truncate">{featured.name}</h3>
                  <p className="text-white/70 text-xs mt-1 line-clamp-2">{featured.description}</p>
                  {(featured.distance != null || featured.locationName) && (
                    <div className="flex items-center gap-1 mt-2 text-white/60 text-xs">
                      <MapPin className="w-3 h-3" />
                      {featured.distance != null
                        ? <span className={featured.distance <= 5 ? "text-lime font-medium" : ""}>{formatDistance(featured.distance)}</span>
                        : <span>{featured.locationName}</span>
                      }
                    </div>
                  )}
                </div>
              </Link>
            )}

            {restItems.map((item) => (
              <Link key={item.id} href={`/explore?id=${item.id}`}>
                <ImageCard
                  image={item.assets?.[0]?.url || ""}
                  title={item.name}
                  description={item.description}
                  itemId={item.id}
                  createdBy={item.createdBy}
                  distance={item.distance}
                  locationName={item.locationName}
                />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No listings yet"
            description="New finds appear here as neighbours list them"
            containerClassName="min-h-[200px]"
          />
        )}

        {/* Mobile CTA */}
        <div className="mt-8 flex justify-center sm:hidden">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 bg-forest text-white px-7 py-3.5 rounded-full font-semibold text-sm hover:bg-forest-dark transition-colors"
          >
            View all listings <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
