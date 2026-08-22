import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getTokens } from "next-firebase-auth-edge";
import { Building2 } from "lucide-react";
import { getOrgInvite } from "@/app/app/actions/organisations";
import { authConfig } from "@/firebase/config/server-config";
import { ORG_ROLE_BLURB, ORG_ROLE_LABELS, ORG_TYPE_LABELS } from "@/lib/organisations";
import { ClaimButton } from "@/components/organisations/ClaimButton";

/**
 * Where an invited owner lands.
 *
 * Never indexed: the URL is a capability, and a token that turns up in search
 * results is a page anyone can take over.
 */
export const metadata: Metadata = {
    title: "Claim your organisation — Givny",
    robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ClaimPage({ params }: { params: { token: string } }) {
    const [invite, tokens] = await Promise.all([
        getOrgInvite(params.token),
        getTokens(await cookies(), authConfig),
    ]);

    const signedIn = !!tokens;

    if (!invite) {
        return (
            <div className="max-w-[560px] mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-bold text-ink tracking-tight">
                    That link doesn&rsquo;t work
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                    It may have been withdrawn, or already used. Ask whoever sent it for a new one.
                </p>
                <Link href="/for-organisations" className="inline-block mt-5 text-sm font-bold text-forest hover:underline">
                    About listing as an organisation
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-[560px] mx-auto px-4 py-14 md:py-20">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary">An invitation</p>

            <div className="flex items-center gap-4 mt-5">
                <span className="w-16 h-16 rounded-2xl bg-sand overflow-hidden flex items-center justify-center flex-shrink-0">
                    {invite.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={invite.logoUrl} alt="" className="w-full h-full object-contain p-1.5" />
                    ) : (
                        <Building2 className="w-6 h-6 text-forest" />
                    )}
                </span>
                <div className="min-w-0">
                    <h1 className="text-2xl md:text-3xl font-bold text-ink tracking-tight truncate">
                        {invite.orgName}
                    </h1>
                    <p className="text-sm text-gray-500">{ORG_TYPE_LABELS[invite.orgType]}</p>
                </div>
            </div>

            <p className="text-base text-ink leading-relaxed mt-6">
                {invite.invitedName ? `${invite.invitedName}, we` : "We"}&rsquo;ve prepared a Givny
                page for {invite.orgName}. Take it over and it becomes yours to run — you can
                change everything on it, list items, and add colleagues.
            </p>

            <div className="bg-white border border-gray-200/70 rounded-3xl p-5 mt-6">
                <p className="text-xs font-bold tracking-[0.15em] uppercase text-gray-400">
                    You&rsquo;ll join as
                </p>
                <p className="text-base font-bold text-ink mt-1.5">{ORG_ROLE_LABELS[invite.role]}</p>
                <p className="text-sm text-gray-500 mt-0.5">{ORG_ROLE_BLURB[invite.role]}</p>
            </div>

            {invite.problem ? (
                <div className="bg-amber-50 border border-amber-200/70 rounded-2xl px-5 py-4 mt-6">
                    <p className="text-sm font-bold text-amber-900">{invite.problem}</p>
                    <p className="text-sm text-amber-800 mt-1">
                        Ask whoever sent this for a fresh link.
                    </p>
                </div>
            ) : (
                <div className="mt-7">
                    <ClaimButton token={params.token} signedIn={signedIn} orgName={invite.orgName} />
                    <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                        Until you accept, the page publicly says Givny prepared it and that
                        {" "}{invite.orgName} hasn&rsquo;t claimed it. Nothing is listed in your name.
                    </p>
                </div>
            )}

            <p className="text-sm text-gray-400 mt-8">
                Prepared for <span className="font-semibold text-gray-500">{invite.invitedEmail}</span>.{" "}
                <Link href={`/o/${invite.orgSlug}`} className="font-bold text-forest hover:underline">
                    See the page first
                </Link>
            </p>
        </div>
    );
}
