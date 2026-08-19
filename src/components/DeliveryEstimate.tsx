'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { Truck, ChevronDown, Info } from "lucide-react"
import { doc, getDoc } from "firebase/firestore"
import { firestore } from "@/firebase/auth/firebase"
import { useAuth } from "@/firebase/auth/AuthContext"
import { ItemType } from "@/app/types"
import {
    bandsForSize,
    estimateDelivery,
    formatCedis,
    SIZE_LABELS,
    type ParcelSize,
} from "@/lib/delivery"
import { getFeatures } from "@/app/app/actions/settings"
import { DEFAULT_FEATURES, FeatureSettings } from "@/lib/settings"

/**
 * What collection would cost, shown while someone is still deciding.
 *
 * The estimate is computed rather than fetched — Flip has no quote endpoint
 * (see lib/delivery.ts). That turns out to be an advantage here: the figure
 * appears instantly on a page people are only browsing, with no request in
 * flight and nothing committed.
 */
export default function DeliveryEstimate({ item }: { item: ItemType }) {
    const { user } = useAuth()
    const [me, setMe] = useState<{ lat?: number; lng?: number } | null>(null)
    const [features, setFeatures] = useState<FeatureSettings | null>(null)

    // The session token doesn't carry coordinates, so read them from the
    // profile. Features come from the admin switch, which decides whether any
    // of this is shown at all.
    useEffect(() => {
        let cancelled = false

        getFeatures()
            .then((f) => !cancelled && setFeatures(f))
            .catch(() => !cancelled && setFeatures({ ...DEFAULT_FEATURES }))

        if (!user?.uid) { setMe({}); return () => { cancelled = true } }
        getDoc(doc(firestore, "users", user.uid))
            .then((snap) => {
                if (cancelled) return
                const d = snap.data()
                setMe({ lat: d?.lat, lng: d?.lng })
            })
            .catch(() => !cancelled && setMe({}))

        return () => { cancelled = true }
    }, [user?.uid])

    if (me === null || features === null) {
        return <div className="h-20 rounded-2xl bg-sand animate-pulse" />
    }

    // The admin switch wins over everything else.
    if (!features.deliveryEnabled) return null

    const estimate = estimateDelivery(item, me)

    // Each unavailable case gets its own line, because they call for different
    // things from the reader — one is fixable by them, the others are not.
    if (!estimate.available) {
        if (estimate.reason === "no-member-location") {
            return (
                <div className="rounded-2xl border border-gray-200/70 bg-white px-4 py-3.5">
                    <p className="text-sm font-bold text-ink flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" /> Delivery estimate
                    </p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Set your location and we&rsquo;ll show what having this delivered would cost.
                    </p>
                    <Link
                        href="/app/settings"
                        className="inline-block mt-2 text-xs font-bold text-primary hover:underline"
                    >
                        Add your location →
                    </Link>
                </div>
            )
        }
        // Nothing the reader can act on — say nothing rather than show a dead card.
        return null
    }

    return (
        <DeliveryEstimateCard
            price={estimate.price}
            km={estimate.km}
            size={estimate.size}
            partner={features.deliveryPartner}
            ratesConfirmed={features.deliveryRatesConfirmed}
        />
    )
}

/**
 * The card itself, free of auth and Firestore so it can be rendered — and
 * looked at — from fixed values.
 */
export function DeliveryEstimateCard({
    price,
    km,
    size,
    partner,
    ratesConfirmed,
}: {
    price: number
    km: number
    size: ParcelSize
    partner: string
    ratesConfirmed: boolean
}) {
    const [open, setOpen] = useState(false)
    const bands = bandsForSize(size)

    return (
        <div className="rounded-2xl border border-gray-200/70 bg-white overflow-hidden">
            <div className="px-4 py-3.5">
                <p className="text-sm font-bold text-ink flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" /> Delivery estimate
                </p>
                <p className="text-2xl font-extrabold text-ink mt-1.5 tabular-nums">
                    from {formatCedis(price)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    {SIZE_LABELS[size].toLowerCase()} item · {km < 1 ? "under 1 km" : `about ${Math.round(km)} km`} ·
                    via {partner}
                </p>

                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-ink transition-colors"
                >
                    How is this worked out?
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
            </div>

            {open && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-sand/40">
                    <p className="text-xs text-gray-500 leading-relaxed mt-3">
                        Based on the straight-line distance between you and the item, and the
                        size the owner gave. Roads are longer than straight lines, so treat
                        this as a floor rather than a firm price.
                    </p>

                    <div className="mt-3 space-y-1">
                        {bands.map((b) => (
                            <div
                                key={b.label}
                                className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg ${
                                    b.price === price ? "bg-white font-bold text-ink" : "text-gray-500"
                                }`}
                            >
                                <span>{b.label}</span>
                                <span className="tabular-nums">{formatCedis(b.price)}</span>
                            </div>
                        ))}
                    </div>

                    {!ratesConfirmed && (
                        <p className="mt-3 text-[11px] leading-relaxed text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 flex gap-1.5">
                            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                            <span>
                                These are sample rates, not live pricing. Arrange the
                                delivery with {partner} directly to get the real cost.
                            </span>
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
