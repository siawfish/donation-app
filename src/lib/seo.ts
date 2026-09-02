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
export const CANONICAL_ORIGIN = "https://www.givny.com";

/**
 * The base URL for links built in the browser.
 *
 * Client components cannot call `siteUrl()`: `VERCEL_ENV` and `VERCEL_URL` are
 * server-only and are not inlined into the bundle, so it would quietly resolve
 * to localhost in production. They get this constant instead — same origin,
 * same override, resolved at build time.
 *
 * Both are derived from CANONICAL_ORIGIN so the two cannot drift apart. They
 * had: nine components each carried their own `https://givny.com` while the
 * server said `https://www.givny.com`, so a listing shared from the detail
 * sheet and the same listing shared from its own page produced different URLs.
 *
 * Locally and on previews this constant still says the live domain, because a
 * client bundle has nothing else to go on. Set NEXT_PUBLIC_SITE_URL in
 * `.env.local` (to http://localhost:3000) and both sides follow it — otherwise
 * a share button in dev hands you a link to production.
 */
export const PUBLIC_SITE_URL = (
    process.env.NEXT_PUBLIC_SITE_URL || CANONICAL_ORIGIN
).replace(/\/+$/, "");

export function siteUrl(): string {
    const raw =
        process.env.NEXT_PUBLIC_SITE_URL ||
        // Preview deployments genuinely do want their own hostname; only
        // production gets the canonical domain.
        (process.env.VERCEL_ENV === "production" ? CANONICAL_ORIGIN : "") ||
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
