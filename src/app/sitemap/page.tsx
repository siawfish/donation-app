import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/PublicShell";
import { listPublishedPosts } from "@/app/app/actions/blog";
import { listOpenJobs } from "@/app/app/actions/jobs";
import { listActiveOrgs } from "@/app/app/actions/organisations";
import { absoluteUrl, jsonLd, siteUrl } from "@/lib/seo";

/**
 * A sitemap for people, not crawlers.
 *
 * /sitemap.xml already exists and is what Google reads. This is the human
 * version: one page listing everything, which is genuinely useful on a site
 * where a lot of the content sits behind search, and which gives every page an
 * internal link — the part of a sitemap that actually helps ranking.
 */

export const metadata: Metadata = {
    title: "Sitemap",
    description:
        "Every page on Givny — browse listings, organisations, the journal, open roles and everything else.",
    alternates: { canonical: absoluteUrl("/sitemap") },
};

export const revalidate = 3600;

const CORE = [
    { href: "/", label: "Home", note: "What Givny is and how it works" },
    { href: "/explore", label: "Browse listings", note: "Everything available near you" },
    { href: "/organisations", label: "Organisations", note: "Businesses, NGOs and schools listing at scale" },
    { href: "/leaderboard", label: "Leaderboard", note: "The most generous people and organisations" },
    { href: "/blog", label: "Journal", note: "Stories and guides from across Ghana" },
    { href: "/careers", label: "Careers", note: "Open roles, including campus ambassadors" },
];

const ABOUT = [
    { href: "/about", label: "About Givny" },
    { href: "/team", label: "The team" },
    { href: "/for-organisations", label: "For organisations" },
    { href: "/contact", label: "Contact" },
    { href: "/terms-of-use", label: "Terms of use" },
];

const ACCOUNT = [
    { href: "/auth/login", label: "Sign in" },
    { href: "/auth/register", label: "Create an account" },
];

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="mt-10">
            <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400 mb-4">{title}</h2>
            {children}
        </section>
    );
}

export default async function SitemapPage() {
    const [posts, jobs, orgs] = await Promise.all([
        listPublishedPosts(),
        listOpenJobs(),
        listActiveOrgs(),
    ]);

    // Declares the area actually served. Google retired Geo Sitemaps years ago;
    // what still carries geographic meaning is structured data like this, on
    // pages that are genuinely about the place.
    const schema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Givny",
        url: siteUrl(),
        inLanguage: "en-GH",
        publisher: {
            "@type": "Organization",
            name: "Givny",
            url: siteUrl(),
            areaServed: {
                "@type": "Country",
                name: "Ghana",
                identifier: "GH",
            },
        },
        potentialAction: {
            "@type": "SearchAction",
            target: `${siteUrl()}/explore?q={search_term_string}`,
            "query-input": "required name=search_term_string",
        },
    };

    return (
        <PublicShell>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />

            <div className="max-w-[1100px] mx-auto px-4 pt-12 pb-20 md:pt-16">
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-3">Sitemap</p>
                <h1 className="text-4xl md:text-5xl font-bold text-ink tracking-tight leading-[1.05]">
                    Everything on Givny
                </h1>
                <p className="text-base text-gray-500 mt-4 max-w-xl leading-relaxed">
                    Every public page in one place. Crawlers want{" "}
                    <a href="/sitemap.xml" className="font-semibold text-forest hover:underline">
                        sitemap.xml
                    </a>
                    ; this one is for people.
                </p>

                <Section title="Main">
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {CORE.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className="block bg-white border border-gray-200/70 rounded-2xl px-5 py-4 hover:border-forest/40 transition-colors"
                                >
                                    <span className="block font-bold text-ink">{item.label}</span>
                                    <span className="block text-sm text-gray-500 mt-0.5">{item.note}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Section>

                <Section title="About Givny">
                    <ul className="flex flex-wrap gap-2">
                        {ABOUT.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className="inline-block bg-white border border-gray-200/70 rounded-full px-4 py-2 text-sm font-semibold text-ink hover:border-forest/40 transition-colors"
                                >
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Section>

                {orgs.length > 0 && (
                    <Section title={`Organisations (${orgs.length})`}>
                        <ul className="flex flex-wrap gap-2">
                            {orgs.map((org) => (
                                <li key={org.id}>
                                    <Link
                                        href={`/o/${org.slug}`}
                                        className="inline-block bg-white border border-gray-200/70 rounded-full px-4 py-2 text-sm font-semibold text-ink hover:border-forest/40 transition-colors"
                                    >
                                        {org.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}

                {jobs.length > 0 && (
                    <Section title={`Open roles (${jobs.length})`}>
                        <ul className="space-y-2">
                            {jobs.map((job) => (
                                <li key={job.id}>
                                    <Link href={`/careers/${job.slug}`} className="text-forest font-semibold hover:underline">
                                        {job.title}
                                    </Link>
                                    <span className="text-sm text-gray-400"> · {job.location}</span>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}

                {posts.length > 0 && (
                    <Section title={`Journal (${posts.length})`}>
                        <ul className="space-y-2">
                            {posts.map((post) => (
                                <li key={post.id}>
                                    <Link href={`/blog/${post.slug}`} className="text-forest font-semibold hover:underline">
                                        {post.title}
                                    </Link>
                                    <span className="text-sm text-gray-400"> · {post.readingMinutes} min read</span>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}

                <Section title="Your account">
                    <ul className="flex flex-wrap gap-2">
                        {ACCOUNT.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className="inline-block bg-white border border-gray-200/70 rounded-full px-4 py-2 text-sm font-semibold text-ink hover:border-forest/40 transition-colors"
                                >
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs text-gray-400 mt-3">
                        Individual listings are not indexed here — there are too many and they
                        change constantly. They are in sitemap.xml, and searchable on{" "}
                        <Link href="/explore" className="font-semibold text-forest hover:underline">
                            Browse
                        </Link>
                        .
                    </p>
                </Section>
            </div>
        </PublicShell>
    );
}
