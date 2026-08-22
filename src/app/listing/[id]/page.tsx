import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ArrowRight, BadgeCheck, Building2, CalendarDays, MapPin, ShieldCheck,
} from "lucide-react";
import { getPublicListing } from "@/app/app/actions/items";
import { absoluteUrl, jsonLd, siteUrl } from "@/lib/seo";
import { ShareButtons } from "@/components/ShareButtons";
import {
    listingDescription, listingHeadline, listingShareMessage,
} from "@/lib/listingCopy";
import { ListingGallery } from "@/components/ListingGallery";

/**
 * The canonical page for one listing.
 *
 * In the app a listing opens as a sheet over /explore, which is the right
 * in-session behaviour — you do not want to lose the grid you were scrolling.
 * But a sheet has no URL of its own worth sharing: `/explore?id=…` previews as
 * the generic explore page, so every listing shared into WhatsApp looked
 * identical. This page is what gets shared and what search engines index; the
 * sheet stays exactly as it was.
 */

export const revalidate = 300;

const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const listing = await getPublicListing(params.id);
    if (!listing) return { title: "Listing not found — Givny" };

    const { item, lister } = listing;
    const gone = !!item.donatedTo;

    // The preview is the whole advert, so it leads with the person rather than
    // the product — a name is what makes a stranger stop scrolling.
    const subject = {
        title: item.name,
        listerName: lister?.name,
        isOrganisation: lister?.kind === "organisation",
        locationName: item.locationName,
        gone,
    };
    const title = listingHeadline(subject);
    const description = listingDescription(subject, item.description);

    const image = item.assets?.[0]?.url;

    return {
        title,
        description,
        alternates: { canonical: absoluteUrl(`/listing/${item.id}`) },
        // A listing that has gone should not keep pulling people in from search.
        // The page still renders, so links already shared do not break.
        robots: gone ? { index: false, follow: true } : undefined,
        openGraph: {
            type: "website",
            title,
            description,
            url: absoluteUrl(`/listing/${item.id}`),
            siteName: "Givny",
            images: image ? [{ url: image, alt: item.name }] : undefined,
        },
        twitter: {
            card: image ? "summary_large_image" : "summary",
            title,
            description,
            images: image ? [image] : undefined,
        },
    };
}

export default async function ListingPage({ params }: { params: { id: string } }) {
    const listing = await getPublicListing(params.id);
    if (!listing) notFound();

    const { item, lister } = listing;
    const gone = !!item.donatedTo;
    const shareUrl = absoluteUrl(`/listing/${item.id}`);
    const photos = item.assets ?? [];

    // Product schema. Price is genuinely zero, which is the whole point, so it
    // is declared rather than omitted — a free offer is a valid offer.
    const schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: item.name,
        description: item.description || undefined,
        image: photos.map((p) => p.url),
        category: item.categories?.[0]?.name,
        offers: {
            "@type": "Offer",
            price: 0,
            priceCurrency: "GHS",
            availability: gone
                ? "https://schema.org/SoldOut"
                : "https://schema.org/InStock",
            url: shareUrl,
            ...(lister
                ? {
                      seller: {
                          "@type": lister.kind === "organisation" ? "Organization" : "Person",
                          name: lister.name,
                      },
                  }
                : {}),
            ...(item.locationName
                ? {
                      availableAtOrFrom: {
                          "@type": "Place",
                          address: { "@type": "PostalAddress", addressLocality: item.locationName, addressCountry: "GH" },
                      },
                  }
                : {}),
        },
    };

    const breadcrumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
            { "@type": "ListItem", position: 2, name: "Browse", item: absoluteUrl("/explore") },
            { "@type": "ListItem", position: 3, name: item.name, item: shareUrl },
        ],
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbs) }} />

            <div className="max-w-[1100px] mx-auto px-4 pt-6 pb-24">
                <Link
                    href="/explore"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-forest transition-colors"
                >
                    Browse everything
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-10 mt-5">
                    <ListingGallery photos={photos} name={item.name} gone={gone} />

                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full tracking-widest ${
                                gone ? "bg-sand text-gray-500" : "bg-lime text-forest"
                            }`}>
                                {gone ? "TAKEN" : "FREE"}
                            </span>
                            {item.categories?.map((c) => (
                                <span key={c.id} className="text-[11px] font-bold text-primary bg-primary-light px-2.5 py-1 rounded-full">
                                    {c.name}
                                </span>
                            ))}
                        </div>

                        <h1 className="text-2xl md:text-4xl font-bold text-ink tracking-tight leading-tight">
                            {item.name}
                        </h1>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
                            {item.locationName && (
                                <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-primary" /> {item.locationName}
                                </span>
                            )}
                            {item.createdAt && (
                                <span className="inline-flex items-center gap-1.5">
                                    <CalendarDays className="w-3.5 h-3.5" /> Listed {formatDate(item.createdAt)}
                                </span>
                            )}
                        </div>

                        {item.description && (
                            <p className="text-ink text-base leading-relaxed whitespace-pre-line mt-6">
                                {item.description}
                            </p>
                        )}

                        {/* Who is passing it on */}
                        {lister && (
                            <div className="mt-7">
                                <p className="text-xs font-bold tracking-[0.15em] uppercase text-gray-400 mb-2">
                                    Passing it on
                                </p>

                                {lister.kind === "organisation" && lister.slug ? (
                                    <Link
                                        href={`/o/${lister.slug}`}
                                        className="flex items-center gap-3 bg-white border border-gray-200/70 rounded-2xl px-4 py-3.5 hover:border-forest/40 transition-colors"
                                    >
                                        <span className="h-11 w-11 rounded-xl bg-sand overflow-hidden flex items-center justify-center flex-shrink-0">
                                            {lister.photoUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={lister.photoUrl} alt="" className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <Building2 className="w-5 h-5 text-forest" />
                                            )}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="text-base font-bold text-ink truncate flex items-center gap-1.5">
                                                {lister.name}
                                                {lister.verified && <BadgeCheck className="w-4 h-4 text-primary" />}
                                            </span>
                                            <span className="block text-xs text-gray-400">Organisation · view their page</span>
                                        </span>
                                    </Link>
                                ) : (
                                    <div className="flex items-center gap-3 bg-white border border-gray-200/70 rounded-2xl px-4 py-3.5">
                                        <span className="h-11 w-11 rounded-full bg-forest text-lime text-sm font-bold flex items-center justify-center flex-shrink-0 overflow-hidden">
                                            {lister.photoUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={lister.photoUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                lister.name.slice(0, 1).toUpperCase()
                                            )}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="text-base font-bold text-ink truncate flex items-center gap-1.5">
                                                {lister.name}
                                                {lister.verified && <BadgeCheck className="w-4 h-4 text-primary" />}
                                            </span>
                                            <span className="block text-xs text-gray-400 truncate">
                                                {lister.verified ? "Identity verified · " : ""}
                                                {lister.location || "Community member"}
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* The action. Signed-out visitors land on the sheet, which
                            prompts them to sign in — the same path as in-app. */}
                        <div className="mt-7">
                            {gone ? (
                                <div className="bg-sand border border-gray-200/70 rounded-2xl px-5 py-4">
                                    <p className="text-sm font-bold text-ink">This one has found a home</p>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        Plenty more nearby — and they go quickly.
                                    </p>
                                    <Link
                                        href="/explore"
                                        className="inline-flex items-center gap-1.5 text-sm font-bold text-forest hover:underline mt-3"
                                    >
                                        Browse what&rsquo;s available <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            ) : (
                                <Link
                                    href={`/explore?id=${item.id}`}
                                    className="inline-flex items-center justify-center gap-2 w-full bg-forest text-lime font-bold px-6 py-3.5 rounded-full hover:brightness-110 transition-all"
                                >
                                    Ask for this <ArrowRight className="w-4 h-4" />
                                </Link>
                            )}

                            <p className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-3">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Always free. Never send money for anything on Givny.
                            </p>
                        </div>

                        <div className="mt-7 pt-6 border-t border-gray-200/70">
                            <ShareButtons
                                url={shareUrl}
                                title={listingShareMessage({
                                    title: item.name,
                                    listerName: lister?.name,
                                    isOrganisation: lister?.kind === "organisation",
                                    gone,
                                })}
                                includeLinkedIn={false}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
