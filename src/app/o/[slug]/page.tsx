import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Globe, MapPin, Leaf, Package, Users2 } from "lucide-react";
import { getStorefront } from "@/app/app/actions/organisations";
import { ORG_TYPE_LABELS, impactSentence } from "@/lib/organisations";
import { renderMarkdown, excerptFrom } from "@/lib/markdown";
import { absoluteUrl, jsonLd, siteUrl } from "@/lib/seo";
import { StorefrontGrid } from "@/components/organisations/StorefrontGrid";

export const revalidate = 900;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const front = await getStorefront(params.slug);
    if (!front) return { title: "Organisation not found — Givny" };

    const { org, impact } = front;
    const description =
        org.tagline?.trim() ||
        excerptFrom(org.about ?? "", 155) ||
        impactSentence(org, impact);

    return {
        title: `${org.name} — Givny`,
        description,
        alternates: { canonical: absoluteUrl(`/o/${org.slug}`) },
        openGraph: {
            title: org.name,
            description,
            url: absoluteUrl(`/o/${org.slug}`),
            type: "website",
            siteName: "Givny",
            images: org.coverUrl ? [{ url: absoluteUrl(org.coverUrl) }] : undefined,
        },
    };
}

export default async function StorefrontPage({ params }: { params: { slug: string } }) {
    const front = await getStorefront(params.slug);
    if (!front) notFound();

    const { org, impact, items } = front;
    const about = org.about ? renderMarkdown(org.about) : "";

    // Organization schema, so the storefront can be understood as an entity
    // rather than a generic page.
    const schema = {
        "@context": "https://schema.org",
        "@type": org.type === "ngo" ? "NGO" : "Organization",
        name: org.name,
        description: org.tagline || excerptFrom(org.about ?? "", 200),
        url: absoluteUrl(`/o/${org.slug}`),
        logo: org.logoUrl ? absoluteUrl(org.logoUrl) : undefined,
        sameAs: org.website ? [org.website] : undefined,
        address: org.locationName
            ? { "@type": "PostalAddress", addressLocality: org.locationName, addressCountry: "GH" }
            : undefined,
    };

    const stats = [
        { icon: Package, value: impact.rehomed, label: "items passed on" },
        {
            icon: Users2,
            value: impact.householdsReached,
            label: `household${impact.householdsReached === 1 ? "" : "s"} reached`,
        },
        { icon: Leaf, value: `${impact.kgDiverted} kg`, label: "diverted, estimated" },
    ];

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />

            {/* Cover */}
            <div className="relative h-40 md:h-60 bg-forest overflow-hidden">
                {org.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={org.coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-dot-grid opacity-30" />
                )}
            </div>

            <div className="max-w-[1100px] mx-auto px-4">
                {/* Identity, overlapping the cover */}
                <div className="-mt-12 md:-mt-16 relative">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-white border border-gray-200/70 shadow-sm overflow-hidden flex items-center justify-center flex-shrink-0">
                            {org.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={org.logoUrl} alt={org.name} className="w-full h-full object-contain p-2" />
                            ) : (
                                <span className="text-3xl font-bold text-forest">{org.name.slice(0, 1)}</span>
                            )}
                        </div>

                        <div className="min-w-0 flex-1 pb-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl md:text-4xl font-bold text-ink tracking-tight">{org.name}</h1>
                                {org.verified && (
                                    <span className="inline-flex items-center gap-1 bg-primary-light text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                                        <BadgeCheck className="w-3.5 h-3.5" /> Verified
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                                {ORG_TYPE_LABELS[org.type]}
                                {org.locationName && (
                                    <>
                                        {" · "}
                                        <span className="inline-flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-primary" />
                                            {org.locationName}
                                        </span>
                                    </>
                                )}
                            </p>
                        </div>

                        {org.website && (
                            <a
                                href={org.website}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="inline-flex items-center gap-1.5 border border-gray-200 text-ink text-sm font-bold px-4 py-2.5 rounded-full hover:border-forest/40 transition-colors"
                            >
                                <Globe className="w-4 h-4" /> Website
                            </a>
                        )}
                    </div>

                    {org.tagline && (
                        <p className="text-base md:text-lg text-ink mt-4 max-w-2xl leading-relaxed">{org.tagline}</p>
                    )}
                </div>

                {/* Impact — the reason an organisation is here, stated plainly. */}
                {impact.rehomed > 0 && (
                    <div className="grid grid-cols-3 bg-white border border-gray-200/70 rounded-3xl overflow-hidden mt-6">
                        {stats.map((s, i) => (
                            <div key={s.label} className={`px-4 py-5 text-center ${i > 0 ? "border-l border-gray-200/70" : ""}`}>
                                <s.icon className="w-4 h-4 text-primary mx-auto mb-1.5" />
                                <p className="text-xl md:text-2xl font-bold text-ink tabular-nums">{s.value}</p>
                                <p className="text-[11px] md:text-xs text-gray-500 mt-0.5 leading-tight">{s.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {about && (
                    <div className="prose-givny mt-8 max-w-2xl" dangerouslySetInnerHTML={{ __html: about }} />
                )}

                {/* Listings */}
                <section className="mt-10 pb-20">
                    <div className="flex items-baseline justify-between gap-3 mb-4">
                        <h2 className="text-xl font-bold text-ink tracking-tight">
                            {impact.available > 0 ? `${impact.available} available now` : "Nothing available right now"}
                        </h2>
                        {impact.rehomed > 0 && (
                            <span className="text-sm text-gray-400">{impact.rehomed} already rehomed</span>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <div className="bg-white border border-gray-200/70 rounded-3xl p-10 text-center">
                            <p className="text-ink font-bold">Nothing listed yet</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Check back, or browse what other neighbours are passing on.
                            </p>
                            <Link href="/explore" className="inline-block mt-4 text-sm font-bold text-forest hover:underline">
                                Browse everything
                            </Link>
                        </div>
                    ) : (
                        <StorefrontGrid items={items} />
                    )}
                </section>
            </div>
        </>
    );
}
