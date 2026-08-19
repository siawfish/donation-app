/**
 * "Just listed" labelling.
 *
 * Lives outside the rail component and is called from the server so the value is
 * computed once and passed down as data. Calling it during render on both sides
 * meant the server and the client evaluated `Date.now()` at different moments,
 * so the badge could exist in one tree and not the other — a hydration mismatch.
 */

/** Days after which an item stops counting as "fresh". */
export const FRESH_WINDOW_DAYS = 14;

/**
 * Compact age, or undefined once an item is no longer genuinely new.
 *
 * A badge reading "about 1 year" under a heading like "just listed" actively
 * misleads, so past the window we render nothing rather than aging text. The
 * rail still orders newest-first either way.
 */
export function freshnessLabel(iso?: string, now: number = Date.now()): string | undefined {
    if (!iso) return undefined;

    const ms = now - new Date(iso).getTime();
    if (!Number.isFinite(ms) || ms < 0) return undefined;

    const minutes = ms / 60_000;
    const hours = minutes / 60;
    const days = hours / 24;

    if (days > FRESH_WINDOW_DAYS) return undefined;
    if (minutes < 60) return "just now";
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    if (days < 7) return `${Math.floor(days)}d ago`;
    return `${Math.floor(days / 7)}w ago`;
}
