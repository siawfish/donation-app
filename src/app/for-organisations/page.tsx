import type { Metadata } from "next";
import Link from "next/link";
import { getTokens } from "next-firebase-auth-edge";
import { cookies, headers } from "next/headers";
import { authConfig } from "@/firebase/config/server-config";
import { Leaf, FileText, Users2, Store, ArrowRight, Check } from "lucide-react";
import { OrgApplyForm } from "@/components/organisations/ApplyForm";
import { siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Givny for organisations",
    description:
        "Clear your offices, stores or storerooms without sending working things to landfill — and get the evidence for your sustainability reporting. Free for businesses, NGOs and schools in Ghana.",
    alternates: { canonical: `${siteUrl()}/for-organisations` },
    openGraph: {
        title: "Givny for organisations",
        description: "Pass on what you no longer need, and evidence what you diverted.",
        url: `${siteUrl()}/for-organisations`,
        type: "website",
    },
};

const VALUE = [
    {
        icon: Leaf,
        title: "Disposal you don't pay for",
        body: "Clearing an office costs money and a skip. Listing costs nothing, and someone collects.",
    },
    {
        icon: FileText,
        title: "Evidence for your report",
        body: "We count what you passed on, how many households received it, and the estimated weight diverted. Numbers you can put in front of a board or a funder.",
    },
    {
        icon: Store,
        title: "A page that is yours",
        body: "Your own storefront with your logo and everything you've listed — a link you can put in a newsletter.",
    },
    {
        icon: Users2,
        title: "Your team, not your password",
        body: "Add colleagues with their own logins. Owners, managers and listers see different things.",
    },
];

const STEPS = [
    { n: 1, title: "Apply", body: "Five minutes. Tell us who you are and what you'd list." },
    { n: 2, title: "We check", body: "We confirm the organisation is real. Usually a couple of working days." },
    { n: 3, title: "Set up", body: "Add a logo, a short description, your first items, your team." },
    { n: 4, title: "Go live", body: "Your storefront is public and your listings reach neighbours nearby." },
];

export default async function ForOrganisations() {
    const tokens = await getTokens(await cookies(), { ...authConfig, headers: await headers() });

    return (
        <>
            <section className="max-w-[1100px] mx-auto px-4 pt-12 pb-10 md:pt-20">
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-3">For organisations</p>
                <h1 className="text-4xl md:text-6xl font-bold text-ink tracking-tight leading-[1.05] max-w-3xl">
                    Your old office furniture is somebody&rsquo;s <span className="text-primary">first flat</span>.
                </h1>
                <p className="text-base md:text-lg text-gray-500 mt-4 max-w-xl leading-relaxed">
                    Businesses, NGOs, schools and faith groups list on Givny for nothing — and get back a
                    record of exactly what they kept out of landfill.
                </p>
                <div className="flex flex-wrap gap-2 mt-7">
                    <Link href="#apply" className="inline-flex items-center gap-2 bg-forest hover:bg-forest-dark text-white text-sm font-bold px-6 py-3.5 rounded-full transition-colors">
                        Apply to list <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link href="/organisations" className="inline-flex items-center gap-2 border border-gray-200 text-ink text-sm font-bold px-6 py-3.5 rounded-full hover:border-forest/40 transition-colors">
                        See who&rsquo;s already here
                    </Link>
                </div>
            </section>

            <section className="max-w-[1100px] mx-auto px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {VALUE.map((v) => (
                        <div key={v.title} className="bg-white border border-gray-200/70 rounded-3xl p-6">
                            <v.icon className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-bold text-ink tracking-tight mt-3">{v.title}</h2>
                            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{v.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* The honest part: what we ask in return. */}
            <section className="max-w-[1100px] mx-auto px-4 py-12">
                <div className="forest-panel rounded-3xl p-6 md:p-10">
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                        What it costs: nothing. What we ask: honesty.
                    </h2>
                    <ul className="mt-5 space-y-2.5 max-w-2xl">
                        {[
                            "List things that still work. Broken is fine if you say so.",
                            "Answer requests. A page nobody replies from is worse than no page.",
                            "Hand over when you say you will — a household is planning around it.",
                            "Nothing is for sale here, ever. No prices, no upselling, no lead capture.",
                        ].map((line) => (
                            <li key={line} className="flex gap-2.5 text-white/80 leading-relaxed">
                                <Check className="w-4 h-4 text-lime flex-shrink-0 mt-1" />
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section className="max-w-[1100px] mx-auto px-4 pb-12">
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400 mb-5">How it goes</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {STEPS.map((s) => (
                        <div key={s.n} className="bg-white border border-gray-200/70 rounded-3xl p-5">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-lime text-forest font-bold text-sm">
                                {s.n}
                            </span>
                            <h3 className="font-bold text-ink mt-3">{s.title}</h3>
                            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{s.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section id="apply" className="max-w-[720px] mx-auto px-4 pb-24 scroll-mt-24">
                <OrgApplyForm signedIn={!!tokens} />
            </section>
        </>
    );
}
