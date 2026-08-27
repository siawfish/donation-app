import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getMyAmbassadorship } from "@/app/app/actions/ambassadors";
import { AmbassadorPortal } from "@/components/ambassador/AmbassadorPortal";

export const metadata: Metadata = { title: "Ambassador — Givny" };

export default async function AmbassadorPage() {
    const res = await getMyAmbassadorship();

    // Not on the programme: point at the roles rather than showing an error.
    // Most people reaching this URL are curious, not lost.
    if (!res.success || !res.data) {
        return (
            <div className="bg-white border border-gray-200/70 rounded-3xl p-8 md:p-12 text-center max-w-xl mx-auto">
                <h1 className="text-2xl font-bold text-ink tracking-tight">You&rsquo;re not an ambassador yet</h1>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                    We run campus ambassadors at universities across Ghana and community ambassadors in
                    neighbourhoods like Dansoman and Tema. Both are paid, part-time, and measured on real
                    signups.
                </p>
                <Link
                    href="/careers"
                    className="inline-flex items-center gap-1.5 bg-forest hover:bg-forest-dark text-white text-sm font-bold px-6 py-3 rounded-full mt-6 transition-colors"
                >
                    See the roles <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    return <AmbassadorPortal initial={res.data} />;
}
