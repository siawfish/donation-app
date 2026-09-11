import { Tag, Recycle } from "lucide-react";
import { ReactNode } from "react";

/**
 * "Details" and the eco notice — split out of ItemContent so the same look
 * can back both the real item page and the listing wizard's preview.
 *
 * Only ever shows fields we actually collect. Size is the one attribute this
 * covers today; if the model grows more (brand, material…) they belong here
 * as additional DetailRow entries, each only rendered when the item has one.
 */

export function DetailsList({ children }: { children: ReactNode }) {
    return (
        <div>
            <p className="text-sm font-bold text-ink mb-3">Details</p>
            <div className="space-y-2.5">{children}</div>
        </div>
    )
}

export function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-2 text-gray-500">
                {icon}
                {label}
            </span>
            <span className="font-semibold text-ink">{value}</span>
        </div>
    )
}

/** The whole Details section, or nothing — an item without a size has no details to show yet. */
export function SizeDetails({ size }: { size?: string }) {
    if (!size) return null
    return (
        <DetailsList>
            <DetailRow icon={<Tag className="w-4 h-4" />} label="Size" value={size} />
        </DetailsList>
    )
}

export function EcoNotice() {
    return (
        <div className="flex items-start gap-3 bg-primary-light/60 rounded-2xl p-4">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white text-forest flex-shrink-0">
                <Recycle className="w-5 h-5" />
            </span>
            <div>
                <p className="text-sm font-bold text-forest">Give it a second life</p>
                <p className="text-xs text-forest/70 mt-0.5 leading-relaxed">
                    Passing this on keeps something useful in circulation, and one more thing out of landfill.
                </p>
            </div>
        </div>
    )
}
