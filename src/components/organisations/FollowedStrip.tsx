import Link from "next/link";
import { Building2, BellRing } from "lucide-react";
import { listFollowedOrgs } from "@/app/app/actions/orgSocial";

/**
 * The organisations this reader follows, with what each has up right now.
 *
 * Renders nothing at all when they follow none — an empty "you follow nobody"
 * shelf is an accusation, not a feature.
 */
export async function FollowedStrip() {
    const followed = await listFollowedOrgs();
    if (!followed.length) return null;

    return (
        <section className="max-w-[1100px] mx-auto px-4 pb-8">
            <h2 className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.2em] uppercase text-gray-400 mb-4">
                <BellRing className="w-3.5 h-3.5 text-primary" /> You follow
            </h2>

            <ul className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
                {followed.map((o) => (
                    <li key={o.id} className="flex-shrink-0 snap-start">
                        <Link
                            href={`/o/${o.slug}`}
                            className="flex items-center gap-3 bg-white border border-gray-200/70 rounded-2xl pl-3 pr-5 py-3 hover:border-forest/40 transition-colors min-w-[220px]"
                        >
                            <span className="w-10 h-10 rounded-xl bg-sand overflow-hidden flex items-center justify-center flex-shrink-0">
                                {o.logoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={o.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                                ) : (
                                    <Building2 className="w-4 h-4 text-forest" />
                                )}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-bold text-ink truncate">{o.name}</span>
                                <span className="block text-xs text-gray-400">
                                    {o.available > 0
                                        ? `${o.available} available now`
                                        : "Nothing up right now"}
                                </span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
