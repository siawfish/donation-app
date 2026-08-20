/**
 * Blog model.
 *
 * Posts are authored in markdown and rendered by lib/markdown.ts. Everything
 * SEO needs is stored explicitly rather than derived at render time, so an
 * author can override any of it — but sensible fallbacks mean they never have
 * to.
 */

import type { Poll } from "./blogSocial";

export type PostStatus = "draft" | "published";

export interface BlogPost {
    id?: string;
    title: string;
    slug: string;
    /** Markdown source. */
    body: string;
    /** Shown on cards and used as the meta description fallback. */
    excerpt?: string;
    coverUrl?: string;
    coverAlt?: string;
    tags: string[];
    status: PostStatus;

    /* SEO overrides — each falls back to the post itself when blank. */
    seoTitle?: string;
    seoDescription?: string;
    canonicalUrl?: string;
    /** Keep this post out of search results without unpublishing it. */
    noindex?: boolean;

    /**
     * An optional single-question poll rendered after the body. Stored with the
     * post rather than in its own collection: it is authored with the post,
     * read with the post, and dies with it.
     */
    poll?: Poll | null;

    authorId: string;
    authorName?: string;
    createdAt: string;
    updatedAt: string;
    /** Set the first time it goes live; the date shown to readers and crawlers. */
    publishedAt?: string;
}

export interface BlogListItem {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    coverUrl?: string;
    coverAlt?: string;
    tags: string[];
    status: PostStatus;
    authorName?: string;
    publishedAt?: string;
    updatedAt: string;
    readingMinutes: number;
}

/**
 * URL-safe slug.
 *
 * Strips accents first so "Kwabenya's Café" becomes "kwabenyas-cafe" rather
 * than losing those characters entirely.
 */
export function slugify(input: string): string {
    return (input ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
}

export function isValidSlug(slug: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 80;
}

export function normaliseTag(raw: string): string {
    return raw.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 24);
}

/* ── SEO derivation ────────────────────────────────────────────────────── */

/** Google truncates around 60 characters; longer isn't wrong, just cut off. */
export const SEO_TITLE_MAX = 60;
export const SEO_DESC_MAX = 160;

export function seoTitleFor(post: Pick<BlogPost, "title" | "seoTitle">): string {
    return (post.seoTitle?.trim() || post.title || "").slice(0, 70);
}

export function seoDescriptionFor(
    post: Pick<BlogPost, "seoDescription" | "excerpt">,
    fallback = ""
): string {
    const text = post.seoDescription?.trim() || post.excerpt?.trim() || fallback;
    return text.slice(0, 200);
}

export type SeoIssueLevel = "error" | "warn" | "ok";

export interface SeoCheck {
    id: string;
    label: string;
    level: SeoIssueLevel;
    detail: string;
}

/**
 * Live feedback in the editor.
 *
 * Deliberately advisory rather than blocking: an author who knows what they're
 * doing should be able to publish a 30-character title, and a checklist that
 * refuses to let you save is a checklist people learn to hate.
 */
export function auditSeo(post: {
    title?: string;
    slug?: string;
    body?: string;
    excerpt?: string;
    coverUrl?: string;
    coverAlt?: string;
    seoTitle?: string;
    seoDescription?: string;
    tags?: string[];
}): SeoCheck[] {
    const checks: SeoCheck[] = [];
    const title = (post.seoTitle?.trim() || post.title || "").trim();
    const desc = (post.seoDescription?.trim() || post.excerpt || "").trim();
    const words = (post.body ?? "").split(/\s+/).filter(Boolean).length;

    checks.push(
        title.length === 0
            ? { id: "title", label: "Title", level: "error", detail: "A post needs a title." }
            : title.length > SEO_TITLE_MAX
                ? { id: "title", label: "Title", level: "warn", detail: `${title.length} characters — Google shows about ${SEO_TITLE_MAX}.` }
                : title.length < 20
                    ? { id: "title", label: "Title", level: "warn", detail: "Short titles rank less well. Aim for 40–60 characters." }
                    : { id: "title", label: "Title", level: "ok", detail: `${title.length} characters.` }
    );

    checks.push(
        desc.length === 0
            ? { id: "desc", label: "Meta description", level: "warn", detail: "Without one, search engines invent a snippet from the page." }
            : desc.length > SEO_DESC_MAX
                ? { id: "desc", label: "Meta description", level: "warn", detail: `${desc.length} characters — about ${SEO_DESC_MAX} are shown.` }
                : desc.length < 70
                    ? { id: "desc", label: "Meta description", level: "warn", detail: "Aim for 120–160 characters to fill the snippet." }
                    : { id: "desc", label: "Meta description", level: "ok", detail: `${desc.length} characters.` }
    );

    checks.push(
        !post.slug
            ? { id: "slug", label: "URL", level: "error", detail: "A post needs a slug." }
            : !isValidSlug(post.slug)
                ? { id: "slug", label: "URL", level: "error", detail: "Use lowercase words separated by hyphens." }
                : { id: "slug", label: "URL", level: "ok", detail: `/blog/${post.slug}` }
    );

    checks.push(
        !post.coverUrl
            ? { id: "cover", label: "Cover image", level: "warn", detail: "Links shared without an image get far fewer clicks." }
            : !post.coverAlt?.trim()
                ? { id: "cover", label: "Cover image", level: "warn", detail: "Add alt text — it helps screen readers and image search." }
                : { id: "cover", label: "Cover image", level: "ok", detail: "Set, with alt text." }
    );

    checks.push(
        words < 100
            ? { id: "length", label: "Body", level: "warn", detail: `${words} words — thin pages rarely rank.` }
            : { id: "length", label: "Body", level: "ok", detail: `${words} words.` }
    );

    checks.push(
        !post.tags?.length
            ? { id: "tags", label: "Tags", level: "warn", detail: "Tags build topic pages and internal links." }
            : { id: "tags", label: "Tags", level: "ok", detail: `${post.tags.length} tag${post.tags.length === 1 ? "" : "s"}.` }
    );

    return checks;
}

export function seoScore(checks: SeoCheck[]): number {
    if (!checks.length) return 0;
    const points = checks.reduce((n, c) => n + (c.level === "ok" ? 1 : c.level === "warn" ? 0.5 : 0), 0);
    return Math.round((points / checks.length) * 100);
}
