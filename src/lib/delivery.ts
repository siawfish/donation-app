/**
 * Delivery cost estimates, for members deciding whether an item is worth
 * collecting.
 *
 * WHY THIS IS COMPUTED LOCALLY RATHER THAN FETCHED
 * ------------------------------------------------
 * Flip's Business API (https://api.flip.delivery) exposes exactly two
 * endpoints: `createInternalParcels` and `retrieveParcel`. Neither answers
 * "what would this cost?" — `retrieveParcel` returns a price, but only for a
 * parcel that already exists. There is no quote endpoint to call.
 *
 * That is not the obstacle it first appears. Flip prices internal parcels from
 * the tariff table the business configures on ecommerce.flip.delivery, keyed by
 * parcel size. The rules are ours, so the number is ours to compute — and
 * computing it here is strictly better for a browsing member: instant, free,
 * offline-capable, and available long before anyone commits to anything.
 *
 * The obligation this creates is that TARIFFS below must mirror the Flip
 * dashboard. When they drift, members see a price Flip won't honour.
 */

import { haversineKm } from "./distance";

export type ParcelSize = "small" | "medium" | "large";

/** Matches Flip's `weight` field, which takes exactly these three values. */
export const PARCEL_SIZES: {
    id: ParcelSize;
    label: string;
    hint: string;
    /** Rough guide shown to the lister, in everyday objects rather than kg. */
    example: string;
}[] = [
    {
        id: "small",
        label: "Small",
        hint: "Fits in a backpack",
        example: "Books, clothes, a kettle, phone accessories",
    },
    {
        id: "medium",
        label: "Medium",
        hint: "Needs both arms",
        example: "A microwave, a desk chair, a box of kitchenware",
    },
    {
        id: "large",
        label: "Large",
        hint: "Takes two people or a van",
        example: "A sofa, a fridge, a wardrobe, a bed frame",
    },
];

export const SIZE_LABELS: Record<ParcelSize, string> = {
    small: "Small",
    medium: "Medium",
    large: "Large",
};

/**
 * ⚠️ PLACEHOLDER RATES — REPLACE BEFORE THIS IS TRUSTED
 *
 * These are illustrative Ghana figures, not your Flip tariff. Copy the real
 * numbers from your Tariff Page on ecommerce.flip.delivery into this table and
 * delete this warning. Until then `TARIFFS_ARE_PLACEHOLDER` stays true and the
 * UI labels every figure as a rough guide rather than a quote.
 *
 * Bands are upper bounds in km, ascending. `price` is in Ghana cedis.
 */
export const TARIFFS_ARE_PLACEHOLDER = true;

export const CURRENCY = "GHS";

type Band = { maxKm: number; price: Record<ParcelSize, number> };

const TARIFFS: Band[] = [
    { maxKm: 5, price: { small: 20, medium: 35, large: 70 } },
    { maxKm: 10, price: { small: 30, medium: 50, large: 100 } },
    { maxKm: 20, price: { small: 45, medium: 75, large: 150 } },
    { maxKm: 40, price: { small: 70, medium: 115, large: 230 } },
    { maxKm: Infinity, price: { small: 110, medium: 180, large: 360 } },
];

export type DeliveryEstimate =
    | { available: true; price: number; km: number; size: ParcelSize; approximate: boolean }
    /**
     * Why an estimate could not be produced. The UI says which, because
     * "we can't price this" and "tell us where you are" need different
     * responses from the member.
     */
    | { available: false; reason: "no-item-location" | "no-member-location" | "no-size" };

export type Coords = { lat?: number; lng?: number };

/**
 * Price a collection from the item's location to the member's.
 *
 * Distance is straight-line (haversine), so real road distance is always
 * longer — meaning this estimate is a floor, never a ceiling. `approximate`
 * carries that upward-only bias to the UI so it can be phrased as "from GHS x"
 * rather than a firm price.
 */
export function estimateDelivery(
    item: Coords & { parcelSize?: ParcelSize },
    member: Coords
): DeliveryEstimate {
    if (!item.parcelSize) return { available: false, reason: "no-size" };
    if (item.lat == null || item.lng == null) {
        return { available: false, reason: "no-item-location" };
    }
    if (member.lat == null || member.lng == null) {
        return { available: false, reason: "no-member-location" };
    }

    const km = haversineKm(item.lat, item.lng, member.lat, member.lng);
    const band = TARIFFS.find((b) => km <= b.maxKm) ?? TARIFFS[TARIFFS.length - 1];

    return {
        available: true,
        price: band.price[item.parcelSize],
        km,
        size: item.parcelSize,
        approximate: true,
    };
}

export function formatCedis(amount: number): string {
    return `${CURRENCY} ${amount.toFixed(2)}`;
}

/**
 * The full band table for one size, for the "how is this worked out?" panel.
 * Members trust a number more when they can see the rule behind it.
 */
export function bandsForSize(size: ParcelSize): { label: string; price: number }[] {
    return TARIFFS.map((b, i) => {
        const from = i === 0 ? 0 : TARIFFS[i - 1].maxKm;
        const label =
            b.maxKm === Infinity ? `Over ${from} km` : `${from}–${b.maxKm} km`;
        return { label, price: b.price[size] };
    });
}
