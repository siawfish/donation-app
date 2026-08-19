/**
 * Reverse-geocoding helpers, shared by the API route and its tests.
 *
 * Kept free of Next and network code so the parsing — the part that actually
 * broke in production — can be exercised directly.
 */

export interface GeocodeResult {
    /** A short place name, or coordinates if none could be resolved. */
    name: string;
    /** False when the name is a coordinate fallback rather than a real place. */
    resolved: boolean;
}

export function coordLabel(lat: number, lng: number): string {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/** Latitude/longitude within real bounds, and actually numbers. */
export function parseCoords(
    latRaw: string | null,
    lngRaw: string | null
): { lat: number; lng: number } | null {
    // Number(null) and Number("") are both 0, which is a real coordinate — so a
    // missing or blank parameter would otherwise geocode Null Island instead of
    // being rejected.
    if (latRaw == null || lngRaw == null) return null;
    if (latRaw.trim() === "" || lngRaw.trim() === "") return null;

    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
}

/**
 * Build a short name from a Nominatim response.
 *
 * Nominatim answers `{ error: "Unable to geocode" }` — with no `address` key at
 * all — for open water, remote areas and some rate-limit responses. Every field
 * is checked before it is read: the original bug was `data.address.suburb`
 * throwing on exactly that shape and being swallowed by a bare catch.
 */
export function nameFromNominatim(data: unknown, lat: number, lng: number): GeocodeResult {
    const d = data as any;
    const addr = d?.address;

    if (addr && typeof addr === "object") {
        const parts = [
            addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || addr.road,
            addr.city || addr.town || addr.county || addr.state,
        ].filter((p) => typeof p === "string" && p.trim());
        if (parts.length) return { name: parts.slice(0, 2).join(", "), resolved: true };
    }

    if (typeof d?.display_name === "string" && d.display_name.trim()) {
        return {
            name: d.display_name.split(",").slice(0, 2).join(",").trim(),
            resolved: true,
        };
    }

    return { name: coordLabel(lat, lng), resolved: false };
}

/**
 * Cache key for a coordinate pair.
 *
 * Rounded to about 11 metres. Two people tapping the same street corner should
 * share one upstream request — the point of the proxy is to make far fewer of
 * them — and Nominatim's answer does not meaningfully differ at that scale.
 */
export function cacheKey(lat: number, lng: number): string {
    return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}
