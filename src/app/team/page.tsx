import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/PublicShell";
import Image from "next/image";
import { ArrowRight, MapPin } from "lucide-react";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { listPublicTeam } from "@/app/app/actions/team";
import { listOpenJobs } from "@/app/app/actions/jobs";
import { EMPLOYMENT_LABELS, WORK_MODE_LABELS } from "@/lib/jobs";
import { initialsOf } from "@/lib/team";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
    title: "The team behind Givny",
    description:
        "The people building Givny in Ghana — and the roles we're hiring for right now.",
    alternates: { canonical: absoluteUrl("/team") },
};

// People and open roles both change without a deploy, so this page cannot be
// baked at build time.
export const revalidate = 300;

export default async function Team() {
  const [team, jobs] = await Promise.all([listPublicTeam(), listOpenJobs()]);

  return (
    <PublicShell>
      <>
        <section className="py-12 md:py-24 container mx-auto px-4 md:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12 mb-12 lg:mb-20">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold flex-1">
              Meet the talented team<br />
              who make all this happen
            </h1>
            <p className="text-lg md:text-xl text-gray-600 flex-1">
              Our leadership team reflects our commitment to African excellence, with diverse
              executives and board members bringing deep expertise from across the continent.
            </p>
          </div>
          
          <InfiniteSlider duration={40} gap={16} className="py-8">
            {team.map((member) => (
              <div key={member.id} className="w-[240px] md:w-[280px] flex-shrink-0 px-3">
                <div className="relative aspect-square rounded-2xl overflow-hidden mb-4 bg-sand flex items-center justify-center">
                  {member.photoUrl ? (
                    <Image
                      src={member.photoUrl}
                      alt={member.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-forest">{initialsOf(member.name)}</span>
                  )}
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-1">{member.name}</h3>
                <p className="text-gray-600 font-medium mb-2">{member.role}</p>
                {member.bio && <p className="text-gray-500 text-sm">{member.bio}</p>}
              </div>
            ))}
          </InfiniteSlider>
        </section>

        <section className="py-12 md:py-24 container mx-auto px-4 md:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6">We&apos;re looking for talented people</h2>
            <p className="text-lg md:text-xl text-gray-600 mb-12 md:mb-16">
              Givny is growing fast, and we are always looking for passionate, dynamic,
              and talented individuals to join our distributed team all around the world.
            </p>
          </div>

          <div className="relative grid grid-cols-2 md:grid-cols-12 gap-2 md:gap-4 mb-12 md:mb-20">
            <div className="relative col-span-1 md:col-span-3 aspect-[3/4] rounded-2xl overflow-hidden">
              <Image
                src="/about_1.jpg"
                alt="Team member working"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="relative col-span-1 md:col-span-3 aspect-square rounded-2xl overflow-hidden">
              <Image
                src="/about_2.jpg"
                alt="Team collaboration"
                fill
                className="object-cover"
              />
            </div>
            <div className="relative col-span-1 md:col-span-3 aspect-[3/4] rounded-2xl overflow-hidden">
              <Image
                src="/about_3.jpg"
                alt="Office environment"
                fill
                className="object-cover"
              />
            </div>
            <div className="relative col-span-1 md:col-span-3 aspect-square rounded-2xl overflow-hidden">
              <Image
                src="/about_4.jpg"
                alt="Team meeting"
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Open roles come from the careers system now. The list here used to
              be hard-coded and had drifted out of step with what was actually
              open — two sources of truth for hiring is one too many. */}
          <div className="space-y-3 md:space-y-4">
            {jobs.length === 0 ? (
              <div className="border border-gray-200/70 rounded-2xl p-8 text-center bg-white">
                <p className="font-bold text-ink">No open roles right now</p>
                <p className="text-sm text-gray-500 mt-1">
                  Nothing is open at the moment, but that changes. Have a look at what we
                  have advertised before, or write to us.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                  <Link href="/careers" className="text-sm font-bold text-forest hover:underline">
                    Careers page
                  </Link>
                  <Link href="/contact?topic=other" className="text-sm font-bold text-forest hover:underline">
                    Get in touch
                  </Link>
                </div>
              </div>
            ) : (
              jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/careers/${job.slug}`}
                  className="block border border-gray-200/70 rounded-2xl p-4 md:p-6 bg-white card-hover"
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h4 className="text-lg md:text-xl font-semibold text-ink">{job.title}</h4>
                        {job.department && (
                          <span className="px-2 py-1 bg-primary-light text-primary rounded-full text-xs font-bold">
                            {job.department}
                          </span>
                        )}
                      </div>
                      {job.salaryRange && (
                        <p className="text-gray-600 text-sm md:text-base">{job.salaryRange}</p>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-forest flex-shrink-0">
                      View role <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-gray-500 text-sm mt-4">
                    {job.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary" /> {job.location}
                      </span>
                    )}
                    <span>{EMPLOYMENT_LABELS[job.employmentType]}</span>
                    <span>{WORK_MODE_LABELS[job.workMode]}</span>
                  </div>
                </Link>
              ))
            )}
          </div>

          {jobs.length > 0 && (
            <Link
              href="/careers"
              className="inline-flex items-center gap-2 text-sm font-bold text-forest hover:underline mt-6"
            >
              All {jobs.length} open role{jobs.length === 1 ? "" : "s"} <ArrowRight className="w-4 h-4" />
            </Link>
          )}

        </section>
      </>
      </PublicShell>
  );
}
