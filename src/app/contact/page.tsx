import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MessageCircle, ShieldQuestion } from "lucide-react";
import PublicShell from "@/components/PublicShell";
import { ContactForm } from "@/components/contact/ContactForm";
import { TOPIC_LABELS, type ContactTopic } from "@/lib/contact";
import { absoluteUrl, jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Contact Givny",
    description:
        "Get help with Givny, partner with us, or list your organisation. We read everything and reply within about two working days.",
    alternates: { canonical: absoluteUrl("/contact") },
};

const ANSWERS = [
    {
        q: "Does Givny cost anything?",
        a: "No. Listing, asking and collecting are all free, and there is no commission on anything.",
        href: "/about",
    },
    {
        q: "How do I list something?",
        a: "Create an account, tap List an item, add a photo and where it can be collected.",
        href: "/app/add-item",
    },
    {
        q: "Can my business or NGO list?",
        a: "Yes — organisations get their own page, team logins and an impact record.",
        href: "/for-organisations",
    },
    {
        q: "Are you hiring?",
        a: "Open roles are on the careers page, including campus and town ambassadors.",
        href: "/careers",
    },
];

export default function ContactPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    // A link can preselect the topic — "get in touch about partnerships" should
    // not land somebody on a form asking what they want.
    const requested = typeof searchParams.topic === "string" ? searchParams.topic : undefined;
    const initialTopic =
        requested && requested in TOPIC_LABELS ? (requested as ContactTopic) : undefined;

    const schema = {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name: "Contact Givny",
        url: absoluteUrl("/contact"),
        mainEntity: {
            "@type": "Organization",
            name: "Givny",
            email: "support@givny.com",
            areaServed: { "@type": "Country", name: "Ghana" },
            contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer support",
                email: "support@givny.com",
                availableLanguage: ["en"],
                areaServed: "GH",
            },
        },
    };

    return (
        <PublicShell>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />

            <div className="max-w-[1100px] mx-auto px-4 pt-12 pb-20 md:pt-16">
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-3">Contact</p>
                <h1 className="text-4xl md:text-5xl font-bold text-ink tracking-tight leading-[1.05] max-w-2xl">
                    Talk to a person.
                </h1>
                <p className="text-base md:text-lg text-gray-500 mt-4 max-w-xl leading-relaxed">
                    A small team in Ghana reads every message. Tell us what&rsquo;s happening and
                    we&rsquo;ll come back to you — usually within two working days.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-10 mt-10 items-start">
                    <ContactForm initialTopic={initialTopic} />

                    <aside className="space-y-4">
                        <div className="bg-white border border-gray-200/70 rounded-3xl p-5">
                            <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.15em] uppercase text-gray-400">
                                <Clock className="w-3.5 h-3.5 text-primary" /> When we reply
                            </p>
                            <p className="text-sm text-ink mt-2 leading-relaxed">
                                Monday to Friday, usually within two working days. Anything about a
                                handover that&rsquo;s already arranged, we prioritise.
                            </p>
                        </div>

                        <div className="bg-white border border-gray-200/70 rounded-3xl p-5">
                            <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.15em] uppercase text-gray-400">
                                <Mail className="w-3.5 h-3.5 text-primary" /> Prefer email?
                            </p>
                            <a
                                href="mailto:support@givny.com"
                                className="block text-sm font-bold text-forest hover:underline mt-2"
                            >
                                support@givny.com
                            </a>
                            <p className="text-xs text-gray-500 mt-1">
                                The form reaches the same place and gets a faster answer.
                            </p>
                        </div>

                        <div className="forest-panel rounded-3xl p-5 text-white">
                            <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.15em] uppercase text-lime">
                                <ShieldQuestion className="w-3.5 h-3.5" /> Safety
                            </p>
                            <p className="text-sm text-white/80 mt-2 leading-relaxed">
                                Nobody on Givny should ever ask you for money. If someone does, send
                                us their name and we&rsquo;ll deal with it.
                            </p>
                        </div>
                    </aside>
                </div>

                {/* The answer is often already written down. Sending someone to it
                    beats making them wait two days to be told the same thing. */}
                <section className="mt-16">
                    <h2 className="inline-flex items-center gap-2 text-xl font-bold text-ink tracking-tight">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        Answered already
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                        {ANSWERS.map((item) => (
                            <Link
                                key={item.q}
                                href={item.href}
                                className="bg-white border border-gray-200/70 rounded-3xl p-5 card-hover block"
                            >
                                <p className="font-bold text-ink">{item.q}</p>
                                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{item.a}</p>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </PublicShell>
    );
}
