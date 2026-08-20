import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { listPublishedPosts, listPublishedTags } from "@/app/app/actions/blog";
import { BlogListItem } from "@/lib/blog";
import { siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Journal — Givny",
    description:
        "Stories about second-hand things, sustainability and the neighbours passing them on. From the team behind Ghana's free community marketplace.",
    alternates: { canonical: `${siteUrl()}/blog` },
    openGraph: {
        title: "Journal — Givny",
        description: "Stories about second-hand things, sustainability and the neighbours passing them on.",
        url: `${siteUrl()}/blog`,
        type: "website",
    },
};

// Posts change rarely; regenerate hourly rather than on every request.
export const revalidate = 3600;

function formatDate(iso?: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function PostCard({ post, featured }: { post: BlogListItem; featured?: boolean }) {
    return (
        <Link
            href={`/blog/${post.slug}`}
            className={`group block bg-white border border-gray-200/70 rounded-3xl overflow-hidden card-hover ${
                featured ? "md:grid md:grid-cols-2" : ""
            }`}
        >
            <div className={`bg-sand overflow-hidden ${featured ? "aspect-[16/10] md:aspect-auto md:h-full" : "aspect-[16/9]"}`}>
                {post.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={post.coverUrl}
                        alt={post.coverAlt || ""}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full bg-forest flex items-center justify-center">
                        <span className="text-lime text-4xl font-bold opacity-30">G</span>
                    </div>
                )}
            </div>

            <div className={`p-5 ${featured ? "md:p-8 md:flex md:flex-col md:justify-center" : ""}`}>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    {post.tags.slice(0, 2).map((t) => (
                        <span key={t} className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
                            {t}
                        </span>
                    ))}
                </div>
                <h2 className={`font-bold text-ink tracking-tight leading-tight group-hover:text-forest transition-colors ${
                    featured ? "text-2xl md:text-3xl" : "text-lg"
                }`}>
                    {post.title}
                </h2>
                <p className={`text-gray-500 leading-relaxed mt-2 ${featured ? "text-base" : "text-sm line-clamp-2"}`}>
                    {post.excerpt}
                </p>
                <div className="flex items-center gap-3 mt-4 text-xs text-gray-400">
                    <span>{formatDate(post.publishedAt)}</span>
                    <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {post.readingMinutes} min
                    </span>
                </div>
            </div>
        </Link>
    );
}

export default async function BlogIndex({
    searchParams,
}: {
    searchParams: { tag?: string };
}) {
    const tag = searchParams.tag;
    const [posts, tags] = await Promise.all([listPublishedPosts(tag), listPublishedTags()]);
    const [lead, ...rest] = posts;

    return (
        <>
            <section className="max-w-[1100px] mx-auto px-4 pt-12 pb-8 md:pt-20">
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-3">Journal</p>
                <h1 className="text-4xl md:text-6xl font-bold text-ink tracking-tight leading-[1.05] max-w-3xl">
                    Things worth <span className="text-primary">keeping</span> in circulation.
                </h1>
                <p className="text-base md:text-lg text-gray-500 mt-4 max-w-xl leading-relaxed">
                    Notes on second-hand things, sustainability, and the neighbours passing them on.
                </p>

                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-8">
                        <Link
                            href="/blog"
                            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                                !tag ? "bg-forest text-white border-forest" : "bg-white text-gray-600 border-gray-200 hover:border-forest/40"
                            }`}
                        >
                            All
                        </Link>
                        {tags.map((t) => (
                            <Link
                                key={t.tag}
                                href={`/blog?tag=${encodeURIComponent(t.tag)}`}
                                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                                    tag === t.tag ? "bg-forest text-white border-forest" : "bg-white text-gray-600 border-gray-200 hover:border-forest/40"
                                }`}
                            >
                                {t.tag}
                                <span className="ml-1.5 text-xs opacity-60 tabular-nums">{t.count}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            <section className="max-w-[1100px] mx-auto px-4 pb-24">
                {posts.length === 0 ? (
                    <div className="bg-white border border-gray-200/70 rounded-3xl p-12 text-center">
                        <p className="text-lg font-bold text-ink">Nothing here yet</p>
                        <p className="text-sm text-gray-500 mt-1">
                            {tag ? "No posts with that tag." : "The first post is on its way."}
                        </p>
                        <Link href="/explore" className="inline-flex items-center gap-1.5 mt-5 text-sm font-bold text-forest hover:underline">
                            Browse what&rsquo;s nearby <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* The newest post leads at double width — a wall of equal
                            cards gives the reader nowhere to start. */}
                        <PostCard post={lead} featured />
                        {rest.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {rest.map((p) => <PostCard key={p.id} post={p} />)}
                            </div>
                        )}
                    </div>
                )}
            </section>
        </>
    );
}
