import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTokens } from "next-firebase-auth-edge";
import { getStorefront } from "@/app/app/actions/organisations";
import { getFollowState } from "@/app/app/actions/orgSocial";
import { authConfig } from "@/firebase/config/server-config";
import { impactSentence } from "@/lib/organisations";
import { renderMarkdown, excerptFrom } from "@/lib/markdown";
import { absoluteUrl, jsonLd } from "@/lib/seo";
import { StorefrontGrid } from "@/components/organisations/StorefrontGrid";
import { StorefrontHeader } from "@/components/organisations/StorefrontHeader";

/**
 * A storefront is followed and shared, so it cannot be cached for long — a
 * follower count that is fifteen minutes stale makes the follow button look
 * broken to the person who just pressed it.
 */
export const revalidate = 60;

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
        twitter: {
            card: org.coverUrl ? "summary_large_image" : "summary",
            title: org.name,
            description,
        },
    };
}

export default async function StorefrontPage({ params }: { params: { slug: string } }) {
    const front = await getStorefront(params.slug);
    if (!front) notFound();

    const { org, impact, items, standing } = front;

    const [follow, tokens] = await Promise.all([
        getFollowState(org.id!),
        getTokens(await cookies(), authConfig),
    ]);

    const about = org.about ? renderMarkdown(org.about) : "";
    const shareUrl = absoluteUrl(`/o/${org.slug}`);

    const schema = {
        "@context": "https://schema.org",
        "@type": org.type === "ngo" ? "NGO" : "Organization",
        name: org.name,
        description: org.tagline || excerptFrom(org.about ?? "", 200),
        url: shareUrl,
        logo: org.logoUrl ? absoluteUrl(org.logoUrl) : undefined,
        sameAs: org.website ? [org.website] : undefined,
        address: org.locationName
            ? { "@type": "PostalAddress", addressLocality: org.locationName, addressCountry: "GH" }
            : undefined,
        // Followers are a real, checkable signal of interest, so they are
        // declared rather than left as decoration on the page.
        interactionStatistic: follow.followers
            ? {
                  "@type": "InteractionCounter",
                  interactionType: "https://schema.org/FollowAction",
                  userInteractionCount: follow.followers,
              }
            : undefined,
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />

            <StorefrontHeader
                org={org}
                impact={impact}
                standing={standing}
                follow={follow}
                signedIn={!!tokens}
                shareUrl={shareUrl}
            />

            <div className="max-w-[1100px] mx-auto px-4">
                {about && (
                    <section className="mt-9">
                        <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-gray-400 mb-3">
                            About {org.name}
                        </h2>
                        <div className="prose-givny max-w-2xl" dangerouslySetInnerHTML={{ __html: about }} />
                    </section>
                )}

                <section className="mt-10 pb-24">
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
                            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                                Follow {org.name} and you&rsquo;ll be told the moment they put something up.
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
