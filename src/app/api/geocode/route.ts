import { NextRequest, NextResponse } from "next/server";
import { cacheKey, coordLabel, GeocodeResult, nameFromNominatim, parseCoords } from "@/lib/geocode";

/**
 * Reverse-geocoding proxy for the location picker.
 *
 * The browser used to call nominatim.openstreetmap.org directly, which breaks
 * that service's usage policy in two ways we could not fix client-side: it asks
 * for an identifying User-Agent (a browser will not let a page set one) and
 * caps callers at roughly one request per second across the whole application,
 * which no amount of per-tab restraint can guarantee.
 *
 * Proxying fixes both, and adds the thing that actually matters at scale: a
 * shared cache. Members pin from the same handful of neighbourhoods, so most
 * lookups should never reach Nominatim at all.
 */

// In-memory state. Node runtime so it survives between requests on an
// instance — see the note on `serverlessCaveat` below.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM = "https://nominatim.openstreetmap.org/reverse";

/** Nominatim asks callers to identify themselves and give a contact. */
const CONTACT = process.env.NOMINATIM_CONTACT || "https://github.com/siawfish/donation-app";
const USER_AGENT = `Givny/1.0 (${CONTACT})`;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // place names are effectively static
const CACHE_MAX = 5_000;
const MIN_UPSTREAM_GAP_MS = 1_100; // policy is ~1 req/sec; leave headroom
const CLIENT_WINDOW_MS = 60_000;
const CLIENT_MAX_REQUESTS = 40; // generous for pinning, mean for scripts
const UPSTREAM_TIMEOUT_MS = 6_000;

type Entry = { value: GeocodeResult; expires: number };
const cache = new Map<string, Entry>();

/** Coalesces concurrent requests for the same point into one upstream call. */
const inFlight = new Map<string, Promise<GeocodeResult>>();

const clientHits = new Map<string, number[]>();

/**
 * Serialises upstream calls so we never exceed Nominatim's rate limit, however
 * many members are pinning at once. Each caller waits for its turn rather than
 * firing in parallel.
 */
let upstreamChain: Promise<unknown> = Promise.resolve();
let lastUpstreamAt = 0;

function scheduleUpstream<T>(task: () => Promise<T>): Promise<T> {
    const run = upstreamChain.then(async () => {
        const wait = MIN_UPSTREAM_GAP_MS - (Date.now() - lastUpstreamAt);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        lastUpstreamAt = Date.now();
        return task();
    });
    // Keep the chain alive even if this task rejects.
    upstreamChain = run.catch(() => {});
    return run;
}

function readCache(key: string): GeocodeResult | null {
    const hit = cache.get(key);
    if (!hit) return null;
    if (hit.expires < Date.now()) { cache.delete(key); return null; }
    // Refresh insertion order so eviction is roughly least-recently-used.
    cache.delete(key);
    cache.set(key, hit);
    return hit.value;
}

function writeCache(key: string, value: GeocodeResult) {
    // Only cache real answers. Caching a coordinate fallback for a day would
    // make a transient rate-limit look permanent.
    if (!value.resolved) return;
    cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
    while (cache.size > CACHE_MAX) {
        const oldest = cache.keys().next().value;
        if (oldest === undefined) break;
        cache.delete(oldest);
    }
}

function rateLimited(ip: string): boolean {
    const now = Date.now();
    const hits = (clientHits.get(ip) ?? []).filter((t) => now - t < CLIENT_WINDOW_MS);
    hits.push(now);
    clientHits.set(ip, hits);
    if (clientHits.size > 10_000) clientHits.clear(); // crude, bounded
    return hits.length > CLIENT_MAX_REQUESTS;
}

function clientIp(req: NextRequest): string {
    return (
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("x-real-ip") ||
        "unknown"
    );
}

async function lookup(lat: number, lng: number, key: string): Promise<GeocodeResult> {
    const pending = inFlight.get(key);
    if (pending) return pending;

    const promise = scheduleUpstream(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
        try {
            const res = await fetch(
                `${UPSTREAM}?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`,
                {
                    headers: { "User-Agent": USER_AGENT, "Accept-Language": "en", Accept: "application/json" },
                    signal: controller.signal,
                    cache: "no-store",
                }
            );
            if (!res.ok) return { name: coordLabel(lat, lng), resolved: false };
            return nameFromNominatim(await res.json(), lat, lng);
        } catch {
            // Timeout, abort or network failure — a usable answer either way.
            return { name: coordLabel(lat, lng), resolved: false };
        } finally {
            clearTimeout(timer);
        }
    }).finally(() => inFlight.delete(key));

    inFlight.set(key, promise);
    return promise;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const coords = parseCoords(searchParams.get("lat"), searchParams.get("lng"));

    if (!coords) {
        return NextResponse.json({ message: "Invalid coordinates" }, { status: 400 });
    }

    const { lat, lng } = coords;
    const key = cacheKey(lat, lng);

    const cached = readCache(key);
    if (cached) {
        return NextResponse.json(cached, {
            headers: { "Cache-Control": "public, max-age=86400", "X-Cache": "HIT" },
        });
    }

    if (rateLimited(clientIp(req))) {
        // Still a valid shape, so the picker degrades rather than breaks.
        return NextResponse.json(
            { name: coordLabel(lat, lng), resolved: false },
            { status: 429, headers: { "Retry-After": "60" } }
        );
    }

    const result = await lookup(lat, lng, key);
    writeCache(key, result);

    return NextResponse.json(result, {
        headers: {
            "Cache-Control": result.resolved ? "public, max-age=86400" : "no-store",
            "X-Cache": "MISS",
        },
    });
}
