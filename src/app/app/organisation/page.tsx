import Link from "next/link";
import { Suspense } from "react";
import { Metadata } from "next";
import { ArrowRight, Clock } from "lucide-react";
import { getMyOrg } from "@/app/app/actions/organisations";
import { ORG_STATUS_LABELS } from "@/lib/organisations";
import { OrgDashboard } from "@/components/organisations/OrgDashboard";

export const metadata: Metadata = { title: "Your organisation — Givny" };

export default async function OrganisationPage() {
    const res = await getMyOrg();

    // Not in one: explain the programme rather than showing an error. Most
    // people reaching this URL are curious.
    if (!res.success || !res.data) {
        return (
            <div className="bg-white border border-gray-200/70 rounded-3xl p-8 md:p-12 text-center max-w-xl mx-auto">
                <h1 className="text-2xl font-bold text-ink tracking-tight">List as an organisation</h1>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                    Businesses, NGOs, schools and faith groups get their own page, a team with separate
                    logins, and a record of what they diverted from landfill. It&rsquo;s free.
                </p>
                <Link
                    href="/for-organisations"
                    className="inline-flex items-center gap-1.5 bg-forest hover:bg-forest-dark text-white text-sm font-bold px-6 py-3 rounded-full mt-6 transition-colors"
                >
                    How it works <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    const { org } = res.data;

    // Applied but not yet approved: there is nothing to manage, so say where
    // things stand instead of showing an empty dashboard.
    if (org.status === "applied" || org.status === "reviewing") {
        return (
            <div className="bg-white border border-gray-200/70 rounded-3xl p-8 md:p-12 text-center max-w-xl mx-auto">
                <span className="inline-flex w-12 h-12 rounded-full bg-sand text-forest items-center justify-center mb-4">
                    <Clock className="w-6 h-6" />
                </span>
                <h1 className="text-2xl font-bold text-ink tracking-tight">{org.name}</h1>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                    {ORG_STATUS_LABELS[org.status]}. We check every organisation before its page goes
                    public — usually within a couple of working days. We&rsquo;ll email {org.contactEmail}.
                </p>
            </div>
        );
    }

    if (org.status === "rejected") {
        return (
            <div className="bg-white border border-gray-200/70 rounded-3xl p-8 md:p-12 max-w-xl mx-auto">
                <h1 className="text-2xl font-bold text-ink tracking-tight">We couldn&rsquo;t approve {org.name}</h1>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                    {org.rejectionReason || "Get in touch if you think this was a mistake."}
                </p>
                <Link href="/contact" className="inline-block mt-5 text-sm font-bold text-forest hover:underline">
                    Contact us
                </Link>
            </div>
        );
    }

    // useSearchParams inside the dashboard needs a boundary to opt this
    // subtree out of static rendering.
    return (
        <Suspense fallback={<div className="h-40 rounded-3xl bg-sand animate-pulse" />}>
            <OrgDashboard initial={res.data} />
        </Suspense>
    );
}
