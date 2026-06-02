"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import ImageCard from "./ui/image-card"
import { firestore } from "@/firebase/auth/firebase"
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore"
import { ItemType } from "@/app/types"
import { toast } from "sonner"
import { FirebaseErrors } from "@/firebase/errors"
import EmptyState from "./EmptyState"
import { ArrowRightIcon, MapPin } from "lucide-react"
import { formatDistance } from "@/lib/distance"

export default function PopularListings() {
  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState<ItemType[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        const q = query(collection(firestore, "items"), orderBy("views", "desc"), limit(8))
        const docs = await getDocs(q)
        if (docs.size > 0) {
          setItems(docs.docs.map((doc) => ({ ...doc.data(), id: doc.id } as ItemType)))
        }
      } catch (error: any) {
        toast.error(FirebaseErrors[error.code] || error.message)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  const [featured, ...rest] = items
  const restItems = rest.slice(0, 6)

  return (
    <section className="w-full py-16 bg-white">
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Popular right now</h2>
            <p className="text-sm text-gray-500 mt-1">Most viewed donations in your community</p>
          </div>
          <Link
            href="/explore"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline underline-offset-4 flex-shrink-0"
          >
            View all <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          /* Skeleton */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className={`w-full bg-gray-100 animate-pulse rounded-xl ${i === 0 ? "aspect-[4/3]" : "aspect-square"}`} />
                <div className="h-3.5 w-3/4 bg-gray-100 animate-pulse rounded" />
                <div className="h-3 w-1/2 bg-gray-100 animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {/* Featured item — spans 2 cols + 2 rows on md+ */}
            {featured && (
              <Link
                href={`/explore?id=${featured.id}`}
                className="col-span-2 row-span-2 group relative rounded-2xl overflow-hidden bg-gray-100 aspect-square md:aspect-auto shimmer-card"
              >
                {featured.assets[0]?.url ? (
                  <Image
                    src={featured.assets[0].url}
                    alt={featured.name}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                {/* FREE badge */}
                <div className="absolute top-3 left-3 bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow tracking-wide">
                  FREE
                </div>

                {/* Info overlay */}
                <div className="absolute bottom-0 inset-x-0 p-4">
                  <h3 className="text-white font-bold text-base md:text-lg leading-tight truncate">{featured.name}</h3>
                  <p className="text-white/70 text-xs mt-1 line-clamp-2">{featured.description}</p>
                  {(featured.distance != null || featured.locationName) && (
                    <div className="flex items-center gap-1 mt-2 text-white/60 text-xs">
                      <MapPin className="w-3 h-3" />
                      {featured.distance != null
                        ? <span className={featured.distance <= 5 ? "text-green-300 font-medium" : ""}>{formatDistance(featured.distance)}</span>
                        : <span>{featured.locationName}</span>
                      }
                    </div>
                  )}
                </div>
              </Link>
            )}

            {/* Remaining items */}
            {restItems.map((item) => (
              <Link key={item.id} href={`/explore?id=${item.id}`}>
                <ImageCard
                  image={item.assets[0]?.url || ""}
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
            description="Check back soon for new donations"
            containerClassName="min-h-[200px]"
          />
        )}

        {/* Mobile CTA */}
        <div className="mt-8 flex justify-center sm:hidden">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 bg-primary text-white px-7 py-3 rounded-full font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            View all listings <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
