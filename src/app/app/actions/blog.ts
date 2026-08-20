'use server';

import { cache } from "react";
import { db } from "@/firebase/init";
import { authConfig } from "@/firebase/config/server-config";
import { getTokens } from "next-firebase-auth-edge";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ResponseData } from "@/app/types";
import { can } from "@/lib/roles";
import { getMyAdminRole } from "./admin";
import { recordAudit } from "./audit";
import { POLL_OPTION_MAX, Poll, validatePoll } from "@/lib/blogSocial";
import { BlogListItem, BlogPost, isValidSlug, normaliseTag, slugify } from "@/lib/blog";
import { excerptFrom, readingTimeMinutes } from "@/lib/markdown";

const POSTS = "blogPosts";
const MAX_BODY = 120_000;

async function requireBlogAdmin() {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) throw new Error("Unauthorized");
    const role = await getMyAdminRole();
    if (!can(role, "blog.manage")) throw new Error("You don't have permission to manage the blog.");
    return { uid: tokens.decodedToken.uid };
}

const toListItem = (id: string, v: BlogPost): BlogListItem => ({
    id,
    title: v.title,
    slug: v.slug,
    excerpt: v.excerpt || excerptFrom(v.body),
    coverUrl: v.coverUrl,
    coverAlt: v.coverAlt,
    tags: v.tags ?? [],
    status: v.status,
    authorName: v.authorName,
    publishedAt: v.publishedAt,
    updatedAt: v.updatedAt,
    readingMinutes: readingTimeMinutes(v.body),
});

/* ── Public reads ──────────────────────────────────────────────────────── */

/**
 * Published posts, newest first.
 *
 * Sorted in memory rather than with orderBy so this needs no composite index
 * alongside the status filter — the same reasoning as the rest of the app.
 */
const readPublishedPosts = cache(async (tag?: string): Promise<BlogListItem[]> => {
    try {
        const snap = await db.collection(POSTS).where("status", "==", "published").get();
        let rows = snap.docs.map((d) => toListItem(d.id, d.data() as BlogPost));
        if (tag) {
            const t = normaliseTag(tag);
            rows = rows.filter((r) => r.tags.includes(t));
        }
        rows.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
        return rows;
    } catch {
        return [];
    }
});

const readPublishedPost = cache(async (slug: string): Promise<BlogPost | null> => {
    try {
        const snap = await db.collection(POSTS).where("slug", "==", slug).limit(1).get();
        if (snap.empty) return null;
        const doc = snap.docs[0];
        const post = { ...(doc.data() as BlogPost), id: doc.id };
        return post.status === "published" ? post : null;
    } catch {
        return null;
    }
});

export async function listPublishedPosts(tag?: string): Promise<BlogListItem[]> {
    return readPublishedPosts(tag);
}

export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
    return readPublishedPost(slug);
}

/** Every tag in use on a published post, with counts, for the index filter. */
export async function listPublishedTags(): Promise<{ tag: string; count: number }[]> {
    const posts = await readPublishedPosts();
    const counts = new Map<string, number>();
    posts.forEach((p) => p.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return Array.from(counts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Newest published posts other than this one, for the "read next" strip. */
export async function relatedPosts(slug: string, tags: string[], limit = 3): Promise<BlogListItem[]> {
    const all = (await readPublishedPosts()).filter((p) => p.slug !== slug);
    // Prefer shared tags, then fall back to recency so the strip is never empty.
    const scored = all.map((p) => ({ p, shared: p.tags.filter((t) => tags.includes(t)).length }));
    scored.sort((a, b) => b.shared - a.shared || (b.p.publishedAt ?? "").localeCompare(a.p.publishedAt ?? ""));
    return scored.slice(0, limit).map((s) => s.p);
}

/* ── Admin ─────────────────────────────────────────────────────────────── */

export async function listAllPosts(): Promise<ResponseData<BlogListItem[]>> {
    try {
        await requireBlogAdmin();
        const snap = await db.collection(POSTS).get();
        const rows = snap.docs.map((d) => toListItem(d.id, d.data() as BlogPost));
        rows.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
        return { success: true, message: "ok", data: rows };
    } catch (error: any) {
        return { success: false, message: error.message, data: [] };
    }
}

export async function getPost(id: string): Promise<ResponseData<BlogPost | null>> {
    try {
        await requireBlogAdmin();
        const snap = await db.collection(POSTS).doc(id).get();
        if (!snap.exists) return { success: false, message: "Post not found", data: null };
        return { success: true, message: "ok", data: { ...(snap.data() as BlogPost), id: snap.id } };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

/** Refuses a slug already used by a different post — two posts on one URL is a silent 404. */
async function assertSlugFree(slug: string, exceptId?: string) {
    const snap = await db.collection(POSTS).where("slug", "==", slug).get();
    const clash = snap.docs.find((d) => d.id !== exceptId);
    if (clash) throw new Error(`The slug "${slug}" is already used by another post.`);
}

export interface PostInput {
    title: string;
    slug?: string;
    body: string;
    excerpt?: string;
    coverUrl?: string;
    coverAlt?: string;
    tags?: string[];
    status: "draft" | "published";
    seoTitle?: string;
    seoDescription?: string;
    canonicalUrl?: string;
    noindex?: boolean;
    poll?: Poll | null;
}

function clean(input: PostInput) {
    const title = input.title.trim();
    if (!title) throw new Error("Give the post a title.");
    if (!input.body?.trim()) throw new Error("The post has no body.");
    if (input.body.length > MAX_BODY) throw new Error("That post is too long.");

    const slug = slugify(input.slug?.trim() || title);
    if (!isValidSlug(slug)) throw new Error("That slug isn't usable — try lowercase words with hyphens.");

    return {
        title,
        slug,
        body: input.body,
        excerpt: input.excerpt?.trim() || excerptFrom(input.body),
        coverUrl: input.coverUrl?.trim() || "",
        coverAlt: input.coverAlt?.trim() || "",
        tags: Array.from(new Set((input.tags ?? []).map(normaliseTag).filter((t) => t.length >= 2))).slice(0, 8),
        status: input.status,
        seoTitle: input.seoTitle?.trim() || "",
        seoDescription: input.seoDescription?.trim() || "",
        canonicalUrl: input.canonicalUrl?.trim() || "",
        noindex: input.noindex === true,
        poll: cleanPoll(input.poll),
    };
}

/**
 * Normalise a poll, or drop it.
 *
 * Option ids are preserved exactly as authored so that editing the wording of
 * an option does not silently discard the votes already cast for it.
 */
function cleanPoll(poll: Poll | null | undefined): Poll | null {
    if (!poll) return null;

    const question = (poll.question ?? "").trim();
    const options = (poll.options ?? [])
        .map((o) => ({ id: o.id, label: (o.label ?? "").trim() }))
        .filter((o) => o.id && o.label);

    // An empty poll form is not an error — it is someone who decided against
    // one — so it is dropped rather than rejected.
    if (!question && !options.length) return null;

    const invalid = validatePoll({ question, options, closesAt: poll.closesAt });
    if (invalid) throw new Error(invalid);

    return {
        question,
        options: options.slice(0, POLL_OPTION_MAX),
        ...(poll.closesAt ? { closesAt: poll.closesAt } : {}),
    };
}

/** Published pages are cached; every write has to clear the ones it affects. */
function revalidateBlog(slug?: string) {
    revalidatePath("/blog");
    revalidatePath("/sitemap.xml");
    if (slug) revalidatePath(`/blog/${slug}`);
}

export async function createPost(input: PostInput): Promise<ResponseData<string | null>> {
    try {
        const { uid } = await requireBlogAdmin();
        const data = clean(input);
        await assertSlugFree(data.slug);

        const userSnap = await db.collection("users").doc(uid).get();
        const now = new Date().toISOString();

        const ref = await db.collection(POSTS).add({
            ...data,
            authorId: uid,
            authorName: userSnap.data()?.name ?? "Givny",
            createdAt: now,
            updatedAt: now,
            ...(data.status === "published" ? { publishedAt: now } : {}),
        });

        revalidateBlog(data.slug);
        return { success: true, message: "Post created", data: ref.id };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function updatePost(id: string, input: PostInput): Promise<ResponseData<null>> {
    try {
        await requireBlogAdmin();
        const data = clean(input);
        await assertSlugFree(data.slug, id);

        const existing = await db.collection(POSTS).doc(id).get();
        if (!existing.exists) throw new Error("Post not found");
        const prev = existing.data() as BlogPost;

        await db.collection(POSTS).doc(id).update({
            ...data,
            updatedAt: new Date().toISOString(),
            // Stamped once, the first time it goes live, so the published date
            // doesn't jump every time a typo is fixed.
            ...(data.status === "published" && !prev.publishedAt
                ? { publishedAt: new Date().toISOString() }
                : {}),
        });

        revalidateBlog(data.slug);
        if (prev.slug !== data.slug) revalidateBlog(prev.slug);
        return { success: true, message: "Post saved", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function deletePost(id: string): Promise<ResponseData<null>> {
    try {
        await requireBlogAdmin();
        const snap = await db.collection(POSTS).doc(id).get();
        const slug = (snap.data() as BlogPost | undefined)?.slug;
        await db.collection(POSTS).doc(id).delete();
        await recordAudit({ action: "post.delete", targetId: id, targetLabel: slug || id });
        revalidateBlog(slug);
        return { success: true, message: "Post deleted", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}

export async function setPostStatus(id: string, status: "draft" | "published"): Promise<ResponseData<null>> {
    try {
        await requireBlogAdmin();
        const snap = await db.collection(POSTS).doc(id).get();
        if (!snap.exists) throw new Error("Post not found");
        const prev = snap.data() as BlogPost;

        await db.collection(POSTS).doc(id).update({
            status,
            updatedAt: new Date().toISOString(),
            ...(status === "published" && !prev.publishedAt
                ? { publishedAt: new Date().toISOString() }
                : {}),
        });

        revalidateBlog(prev.slug);
        return { success: true, message: status === "published" ? "Post is live" : "Moved to drafts", data: null };
    } catch (error: any) {
        return { success: false, message: error.message, data: null };
    }
}
