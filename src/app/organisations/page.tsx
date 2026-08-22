import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ArrowRight } from "lucide-react";
import { listActiveOrgs } from "@/app/app/actions/organisations";
import { ORG_TYPE_LABELS, isUnclaimed } from "@/lib/organisations";
import { siteUrl } from "@/lib/seo";
import { FollowedStrip } from "@/components/organisations/FollowedStrip";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Organisations on Givny",
    description:
        "Businesses, NGOs, schools and faith groups passing on what they no longer need to households across Ghana.",
    alternates: { canonical: `${siteUrl()}/organisations` },
};

export default async function OrganisationsDirectory() {
    const orgs = await listActiveOrgs();

    return (
        <>
            <section className="max-w-[1100px] mx-auto px-4 pt-12 pb-8 md:pt-20">
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-3">Organisations</p>
                <h1 className="text-4xl md:text-6xl font-bold text-ink tracking-tight leading-[1.05] max-w-3xl">
                    Not just neighbours. <span className="text-primary">Whole organisations.</span>
                </h1>
                <p className="text-base md:text-lg text-gray-500 mt-4 max-w-xl leading-relaxed">
                    Businesses clearing offices, NGOs reaching the people they serve, schools at the end of
                    term. Every one of them checked before their page went live.
                </p>
            </section>

            <FollowedStrip />

            <section className="max-w-[1100px] mx-auto px-4 pb-24">
                {orgs.length === 0 ? (
                    <div className="bg-white border border-gray-200/70 rounded-3xl p-12 text-center">
                        <p className="text-lg font-bold text-ink">None listed yet</p>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                            We&rsquo;re onboarding the first organisations now. If yours should be here, tell us.
                        </p>
                        <Link href="/for-organisations" className="inline-flex items-center gap-1.5 mt-5 text-sm font-bold text-forest hover:underline">
                            Apply to list <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {orgs.map((org) => (
                            <Link
                                key={org.id}
                                href={`/o/${org.slug}`}
                                className="group bg-white border border-gray-200/70 rounded-3xl p-5 card-hover flex gap-4"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-sand overflow-hidden flex items-center justify-center flex-shrink-0">
                                    {org.logoUrl ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={org.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <span className="text-xl font-bold text-forest">{org.name.slice(0, 1)}</span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-ink leading-tight group-hover:text-forest transition-colors flex items-center gap-1.5">
                                        <span className="truncate">{org.name}</span>
                                        {org.verified && <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {ORG_TYPE_LABELS[org.type]}
                                        {/* A page we prepared is labelled here too, so the
                                            directory never implies participation. */}
                                        {isUnclaimed(org) && (
                                            <span className="ml-1.5 text-[10px] font-bold text-gray-500 bg-sand px-2 py-0.5 rounded-full">
                                                Not claimed
                                            </span>
                                        )}
                                    </p>
                                    {org.tagline && (
                                        <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{org.tagline}</p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}
