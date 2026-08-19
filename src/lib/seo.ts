/**
 * Shared SEO helpers.
 *
 * Absolute URLs matter here: Open Graph, canonical links, sitemaps and JSON-LD
 * all require them, and a relative URL in any of those is silently ignored by
 * crawlers rather than reported as an error.
 */

export function siteUrl(): string {
    const raw =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
        "http://localhost:3000";
    return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * JSON-LD is emitted as a script tag, so it must be safe to embed. `<` is the
 * only character that can break out of a script element, and escaping it keeps
 * the JSON valid for parsers.
 */
export function jsonLd(data: Record<string, unknown>): string {
    return JSON.stringify(data).replace(/</g, "\\u003c");
}
