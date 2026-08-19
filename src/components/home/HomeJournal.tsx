import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { BlogListItem } from "@/lib/blog";

const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

/**
 * A few recent posts on the landing page.
 *
 * Renders nothing when there is nothing published — an empty "From the journal"
 * heading with no posts under it looks broken, and a new site will sit in that
 * state for a while.
 */
export function HomeJournal({ posts }: { posts: BlogListItem[] }) {
    if (!posts.length) return null;

    return (
        <section className="max-w-[1400px] mx-auto px-4 py-16 md:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                <div>
                    <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-2">Journal</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-ink tracking-tight leading-tight">
                        Why any of this matters
                    </h2>
                </div>
                <Link
                    href="/blog"
                    className="group inline-flex items-center gap-1.5 text-sm font-bold text-forest hover:underline flex-shrink-0"
                >
                    Read the journal
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {posts.map((post) => (
                    <Link
                        key={post.id}
                        href={`/blog/${post.slug}`}
                        className="group bg-white border border-gray-200/70 rounded-3xl overflow-hidden card-hover flex flex-col"
                    >
                        <div className="aspect-[16/9] bg-sand overflow-hidden flex-shrink-0">
                            {post.coverUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={post.coverUrl}
                                    alt={post.coverAlt || ""}
                                    loading="lazy"
                                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full bg-forest flex items-center justify-center">
                                    <span className="text-lime text-4xl font-bold opacity-30">G</span>
                                </div>
                            )}
                        </div>

                        <div className="p-5 flex flex-col flex-1">
                            {post.tags[0] && (
                                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary mb-1.5">
                                    {post.tags[0]}
                                </span>
                            )}
                            <h3 className="text-lg font-bold text-ink leading-tight tracking-tight group-hover:text-forest transition-colors line-clamp-2">
                                {post.title}
                            </h3>
                            <p className="text-sm text-gray-500 leading-relaxed mt-2 line-clamp-2 flex-1">
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
                ))}
            </div>
        </section>
    );
}
