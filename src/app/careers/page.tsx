import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Briefcase, ArrowRight, Clock } from "lucide-react";
import { listOpenJobs } from "@/app/app/actions/jobs";
import { EMPLOYMENT_LABELS, WORK_MODE_LABELS, isAcceptingApplications } from "@/lib/jobs";
import { absoluteUrl, jsonLd, siteUrl } from "@/lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = {
    title: "Careers — Givny",
    description:
        "Help build Ghana's free community marketplace. Open roles at Givny, the platform keeping good things out of landfill.",
    alternates: { canonical: `${siteUrl()}/careers` },
    openGraph: {
        title: "Careers — Givny",
        description: "Help build Ghana's free community marketplace.",
        url: `${siteUrl()}/careers`,
        type: "website",
    },
};

export default async function CareersPage() {
    const jobs = await listOpenJobs();

    // Group by department so a growing list stays scannable.
    const groups = jobs.reduce<Record<string, typeof jobs>>((acc, job) => {
        const key = job.department?.trim() || "Open roles";
        (acc[key] ||= []).push(job);
        return acc;
    }, {});

    return (
        <main className="bg-canvas min-h-screen">
            <section className="max-w-[1100px] mx-auto px-4 pt-12 pb-10 md:pt-20">
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-3">Careers</p>
                <h1 className="text-4xl md:text-6xl font-bold text-ink tracking-tight leading-[1.05] max-w-3xl">
                    Build the thing that keeps <span className="text-primary">good stuff</span> in circulation.
                </h1>
                <p className="text-base md:text-lg text-gray-500 mt-4 max-w-xl leading-relaxed">
                    Givny is small, and everyone here touches the product people actually use. If that
                    sounds good, we&rsquo;d like to hear from you.
                </p>
            </section>

            <section className="max-w-[1100px] mx-auto px-4 pb-24">
                {jobs.length === 0 ? (
                    <div className="bg-white border border-gray-200/70 rounded-3xl p-12 text-center">
                        <p className="text-lg font-bold text-ink">No open roles right now</p>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                            Nothing is open at the moment, but we&rsquo;re always glad to hear from people who
                            care about this problem.
                        </p>
                        <Link href="/contact" className="inline-flex items-center gap-1.5 mt-5 text-sm font-bold text-forest hover:underline">
                            Get in touch <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {Object.entries(groups).map(([dept, roles]) => (
                            <div key={dept}>
                                <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400 mb-4">
                                    {dept}
                                </h2>
                                <div className="space-y-3">
                                    {roles.map((job) => {
                                        const open = isAcceptingApplications(job);
                                        return (
                                            <Link
                                                key={job.id}
                                                href={`/careers/${job.slug}`}
                                                className="group flex flex-wrap items-center justify-between gap-4 bg-white border border-gray-200/70 rounded-3xl px-5 py-5 md:px-7 md:py-6 card-hover"
                                            >
                                                <div className="min-w-0">
                                                    <h3 className="text-lg md:text-xl font-bold text-ink tracking-tight group-hover:text-forest transition-colors">
                                                        {job.title}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <MapPin className="w-3.5 h-3.5 text-primary" />
                                                            {job.location}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Briefcase className="w-3.5 h-3.5 text-primary" />
                                                            {EMPLOYMENT_LABELS[job.employmentType]}
                                                        </span>
                                                        <span>{WORK_MODE_LABELS[job.workMode]}</span>
                                                        {!open && (
                                                            <span className="inline-flex items-center gap-1.5 text-amber-700 font-semibold">
                                                                <Clock className="w-3.5 h-3.5" /> Applications closed
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-forest flex-shrink-0">
                                                    {open ? "View role" : "See details"}
                                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
