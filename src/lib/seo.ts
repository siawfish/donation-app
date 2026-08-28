/**
 * Shared SEO helpers.
 *
 * Absolute URLs matter here: Open Graph, canonical links, sitemaps and JSON-LD
 * all require them, and a relative URL in any of those is silently ignored by
 * crawlers rather than reported as an error.
 */

/**
 * The canonical production domain.
 *
 * Hard-coded as the production default rather than left to `VERCEL_URL`, which
 * is a *per-deployment* hostname: it changes with every deploy and it sits
 * behind Vercel's deployment protection, so links built from it redirect the
 * visitor to a Vercel SSO login page. That was live — every button in every
 * email we send (welcome, invitations, verification outcomes, campaign
 * unsubscribe and click tracking) pointed at a URL the recipient could not
 * reach, and the sitemap handed Google a list of the same.
 *
 * `NEXT_PUBLIC_SITE_URL` still overrides this, so setting it in the hosting
 * environment keeps working and is still the better answer if the domain ever
 * changes. This is the floor, not a replacement for it.
 */
const PRODUCTION_ORIGIN = "https://www.givny.com";

export function siteUrl(): string {
    const raw =
        process.env.NEXT_PUBLIC_SITE_URL ||
        // Preview deployments genuinely do want their own hostname; only
        // production gets the canonical domain.
        (process.env.VERCEL_ENV === "production" ? PRODUCTION_ORIGIN : "") ||
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
