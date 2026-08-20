import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, MapPin, Banknote, CalendarClock, Check } from "lucide-react";
import { getOpenJob } from "@/app/app/actions/jobs";
import { EMPLOYMENT_LABELS, WORK_MODE_LABELS, isAcceptingApplications } from "@/lib/jobs";
import { renderMarkdown, excerptFrom } from "@/lib/markdown";
import { absoluteUrl, jsonLd, siteUrl } from "@/lib/seo";
import { ApplyForm } from "@/components/careers/ApplyForm";

export const revalidate = 1800;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const job = await getOpenJob(params.slug);
    if (!job) return { title: "Role not found — Givny" };

    const description = excerptFrom(job.description, 155);
    const url = absoluteUrl(`/careers/${job.slug}`);

    return {
        title: `${job.title} — Careers at Givny`,
        description,
        alternates: { canonical: url },
        openGraph: { title: job.title, description, url, type: "website", siteName: "Givny" },
        twitter: { card: "summary", title: job.title, description },
    };
}

export default async function JobPage({ params }: { params: { slug: string } }) {
    const job = await getOpenJob(params.slug);
    if (!job) notFound();

    const accepting = isAcceptingApplications(job);
    const html = renderMarkdown(job.description);

    // JobPosting schema — this is what puts the role into Google Jobs.
    const schema = {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: job.title,
        description: html,
        datePosted: job.publishedAt ?? job.createdAt,
        validThrough: job.closesOn ? `${job.closesOn}T23:59:59` : undefined,
        employmentType: job.employmentType.toUpperCase(),
        hiringOrganization: {
            "@type": "Organization",
            name: "Givny",
            sameAs: siteUrl(),
            logo: absoluteUrl("/logo.png"),
        },
        jobLocation: {
            "@type": "Place",
            address: { "@type": "PostalAddress", addressLocality: job.location, addressCountry: "GH" },
        },
        ...(job.workMode === "remote" ? { jobLocationType: "TELECOMMUTE" } : {}),
        ...(job.salaryRange ? { baseSalary: { "@type": "MonetaryAmount", currency: "GHS", value: job.salaryRange } } : {}),
        directApply: true,
    };

    const facts = [
        { icon: MapPin, label: job.location },
        { icon: Briefcase, label: EMPLOYMENT_LABELS[job.employmentType] },
        { icon: Check, label: WORK_MODE_LABELS[job.workMode] },
        ...(job.salaryRange ? [{ icon: Banknote, label: job.salaryRange }] : []),
        ...(job.closesOn ? [{ icon: CalendarClock, label: `Closes ${job.closesOn}` }] : []),
    ];

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />

            <div className="max-w-[840px] mx-auto px-4 pt-10 pb-20 md:pt-16">
                <Link href="/careers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-forest transition-colors">
                    <ArrowLeft className="w-4 h-4" /> All roles
                </Link>

                <header className="mt-6">
                    {job.department && (
                        <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-2">{job.department}</p>
                    )}
                    <h1 className="text-3xl md:text-5xl font-bold text-ink tracking-tight leading-[1.1]">{job.title}</h1>

                    <div className="flex flex-wrap gap-2 mt-5">
                        {facts.map((f) => (
                            <span key={f.label} className="inline-flex items-center gap-1.5 bg-white border border-gray-200/70 rounded-full px-3.5 py-1.5 text-sm text-ink">
                                <f.icon className="w-3.5 h-3.5 text-primary" />
                                {f.label}
                            </span>
                        ))}
                    </div>
                </header>

                <div className="prose-givny mt-8" dangerouslySetInnerHTML={{ __html: html }} />

                {job.responsibilities.length > 0 && (
                    <section className="mt-10">
                        <h2 className="text-xl font-bold text-ink tracking-tight mb-3">What you&rsquo;ll do</h2>
                        <ul className="space-y-2">
                            {job.responsibilities.map((r, i) => (
                                <li key={i} className="flex gap-2.5 text-ink leading-relaxed">
                                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                                    <span>{r}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {job.requirements.length > 0 && (
                    <section className="mt-8">
                        <h2 className="text-xl font-bold text-ink tracking-tight mb-3">What we&rsquo;re looking for</h2>
                        <ul className="space-y-2">
                            {job.requirements.map((r, i) => (
                                <li key={i} className="flex gap-2.5 text-ink leading-relaxed">
                                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                                    <span>{r}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <section id="apply" className="mt-12 scroll-mt-24">
                    {accepting ? (
                        <ApplyForm jobId={job.id!} jobTitle={job.title} />
                    ) : (
                        <div className="bg-white border border-gray-200/70 rounded-3xl p-8 text-center">
                            <p className="text-lg font-bold text-ink">Applications have closed</p>
                            <p className="text-sm text-gray-500 mt-1">
                                This role stopped accepting applications
                                {job.closesOn ? ` on ${job.closesOn}` : ""}.
                            </p>
                            <Link href="/careers" className="inline-block mt-4 text-sm font-bold text-forest hover:underline">
                                See other roles
                            </Link>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
