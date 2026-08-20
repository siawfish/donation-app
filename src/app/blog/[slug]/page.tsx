import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTokens } from "next-firebase-auth-edge";
import { ArrowLeft, Clock } from "lucide-react";
import { getPublishedPost, relatedPosts } from "@/app/app/actions/blog";
import { getPollResults, getReactions, listComments } from "@/app/app/actions/blogSocial";
import { authConfig } from "@/firebase/config/server-config";
import { countComments } from "@/lib/blogSocial";
import { ShareButtons } from "@/components/ShareButtons";
import { ReactionBar } from "@/components/blog/ReactionBar";
import { PollCard } from "@/components/blog/PollCard";
import { Comments } from "@/components/blog/Comments";
import { seoDescriptionFor, seoTitleFor } from "@/lib/blog";
import { excerptFrom, readingTimeMinutes, renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, jsonLd, siteUrl } from "@/lib/seo";

export const revalidate = 120;

/**
 * Metadata is generated from the post itself, with every field overridable in
 * the editor. A missing override falls back to something sensible rather than
 * to nothing — an empty og:description is worse than an imperfect one.
 */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const post = await getPublishedPost(params.slug);
    if (!post) return { title: "Post not found — Givny" };

    const title = seoTitleFor(post);
    const description = seoDescriptionFor(post, excerptFrom(post.body));
    const url = post.canonicalUrl || absoluteUrl(`/blog/${post.slug}`);
    const image = post.coverUrl ? absoluteUrl(post.coverUrl) : undefined;

    return {
        title: `${title} — Givny`,
        description,
        alternates: { canonical: url },
        robots: post.noindex ? { index: false, follow: true } : undefined,
        authors: post.authorName ? [{ name: post.authorName }] : undefined,
        keywords: post.tags?.length ? post.tags : undefined,
        openGraph: {
            type: "article",
            title,
            description,
            url,
            siteName: "Givny",
            publishedTime: post.publishedAt,
            modifiedTime: post.updatedAt,
            authors: post.authorName ? [post.authorName] : undefined,
            tags: post.tags,
            images: image ? [{ url: image, alt: post.coverAlt || title }] : undefined,
        },
        twitter: {
            card: image ? "summary_large_image" : "summary",
            title,
            description,
            images: image ? [image] : undefined,
        },
    };
}

const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
    const post = await getPublishedPost(params.slug);
    if (!post) notFound();

    const html = renderMarkdown(post.body);
    const minutes = readingTimeMinutes(post.body);

    const [related, reactions, comments, poll, tokens] = await Promise.all([
        relatedPosts(post.slug, post.tags ?? []),
        getReactions(post.id!),
        listComments(post.id!),
        getPollResults(post.id!),
        getTokens(await cookies(), authConfig),
    ]);

    const signedIn = !!tokens;
    const uid = tokens?.decodedToken.uid ?? null;
    const shareUrl = absoluteUrl(`/blog/${post.slug}`);
    const shareTitle = seoTitleFor(post);

    // Article schema; this is what earns the rich result in search.
    const schema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: seoTitleFor(post),
        description: seoDescriptionFor(post, excerptFrom(post.body)),
        image: post.coverUrl ? [absoluteUrl(post.coverUrl)] : undefined,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        author: { "@type": "Person", name: post.authorName || "Givny" },
        publisher: {
            "@type": "Organization",
            name: "Givny",
            logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png") },
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(`/blog/${post.slug}`) },
        keywords: post.tags?.join(", ") || undefined,
        commentCount: countComments(comments),
        interactionStatistic: [
            {
                "@type": "InteractionCounter",
                interactionType: "https://schema.org/CommentAction",
                userInteractionCount: countComments(comments),
            },
            {
                "@type": "InteractionCounter",
                interactionType: "https://schema.org/LikeAction",
                userInteractionCount: reactions.total,
            },
        ],
    };

    const breadcrumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
            { "@type": "ListItem", position: 2, name: "Journal", item: absoluteUrl("/blog") },
            { "@type": "ListItem", position: 3, name: post.title, item: absoluteUrl(`/blog/${post.slug}`) },
        ],
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbs) }} />

            <article className="max-w-[720px] mx-auto px-4 pt-10 pb-20 md:pt-16">
                <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-forest transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Journal
                </Link>

                <header className="mt-6">
                    <div className="flex flex-wrap gap-2 mb-3">
                        {(post.tags ?? []).map((t) => (
                            <Link
                                key={t}
                                href={`/blog?tag=${encodeURIComponent(t)}`}
                                className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary hover:underline"
                            >
                                {t}
                            </Link>
                        ))}
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold text-ink tracking-tight leading-[1.1]">
                        {post.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-sm text-gray-500">
                        {post.authorName && <span>By {post.authorName}</span>}
                        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                        <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {minutes} min read
                        </span>
                    </div>
                </header>

                {post.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={post.coverUrl}
                        alt={post.coverAlt || ""}
                        className="w-full aspect-[16/9] object-cover rounded-3xl mt-8 bg-sand"
                    />
                )}

                {/* Sharing sits above the fold as well as below it: the people
                    most likely to pass a post on decide within the first screen. */}
                <div className="mt-7 pb-1">
                    <ShareButtons url={shareUrl} title={shareTitle} label="" />
                </div>

                <div className="prose-givny mt-8" dangerouslySetInnerHTML={{ __html: html }} />

                {poll && <PollCard postId={post.id!} initial={poll} signedIn={signedIn} />}

                <ReactionBar postId={post.id!} initial={reactions} signedIn={signedIn} />

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <ShareButtons url={shareUrl} title={shareTitle} />
                </div>

                <div className="mt-12 forest-panel rounded-3xl p-6 md:p-8">
                    <p className="text-lime text-xs font-bold tracking-[0.2em] uppercase mb-2">Givny</p>
                    <p className="text-white text-xl md:text-2xl font-bold tracking-tight leading-tight">
                        Something in your house could be someone&rsquo;s answer.
                    </p>
                    <Link
                        href="/explore"
                        className="inline-flex items-center gap-2 bg-lime text-forest text-sm font-bold px-5 py-3 rounded-full mt-5 hover:brightness-95 transition-all"
                    >
                        Browse what&rsquo;s nearby
                    </Link>
                </div>
            </article>

            <Comments
                postId={post.id!}
                initial={comments}
                signedIn={signedIn}
                currentUid={uid}
            />

            {related.length > 0 && (
                <section className="max-w-[1100px] mx-auto px-4 pb-24">
                    <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400 mb-5">Read next</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {related.map((r) => (
                            <Link
                                key={r.id}
                                href={`/blog/${r.slug}`}
                                className="group bg-white border border-gray-200/70 rounded-3xl overflow-hidden card-hover"
                            >
                                <div className="aspect-[16/9] bg-sand overflow-hidden">
                                    {r.coverUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={r.coverUrl} alt={r.coverAlt || ""} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-ink leading-tight group-hover:text-forest transition-colors line-clamp-2">
                                        {r.title}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-2">{r.readingMinutes} min read</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}
