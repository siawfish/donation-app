import type { Metadata } from "next";
import Link from "next/link";
import { Check, XCircle } from "lucide-react";
import { optOutByToken } from "@/app/app/actions/campaigns";

/**
 * One-click unsubscribe.
 *
 * Deliberately has no confirm step. Every extra tap between "I don't want these"
 * and being off the list converts somebody who would have unsubscribed into
 * somebody who reports the mail as spam — which damages delivery for everyone
 * else. It is also what Gmail's own List-Unsubscribe button expects to find.
 */

export const metadata: Metadata = {
    title: "Unsubscribed — Givny",
    robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({ params }: { params: { token: string } }) {
    const res = await optOutByToken(params.token);
    const ok = res.success;

    return (
        <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-[460px] bg-white border border-gray-200/70 rounded-3xl p-8 text-center">
                <span
                    className={`inline-flex w-12 h-12 rounded-full items-center justify-center mb-4 ${
                        ok ? "bg-lime text-forest" : "bg-amber-100 text-amber-700"
                    }`}
                >
                    {ok ? <Check className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                </span>

                <h1 className="text-2xl font-bold text-ink tracking-tight">
                    {ok ? "You're unsubscribed" : "That link didn't work"}
                </h1>

                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                    {ok ? (
                        <>
                            We won&rsquo;t send you any more campaign emails
                            {res.data?.email ? (
                                <> at <span className="font-semibold text-ink">{res.data.email}</span></>
                            ) : null}
                            .
                        </>
                    ) : (
                        <>
                            It may have expired or already been used. If you keep getting emails you
                            don&rsquo;t want, tell us and we&rsquo;ll take you off by hand.
                        </>
                    )}
                </p>

                {ok && (
                    <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                        You&rsquo;ll still get messages about things you&rsquo;re doing — a reply to a
                        request, or a handover you arranged. Those aren&rsquo;t marketing, and turning
                        them off would break the app.
                    </p>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
                    <Link
                        href="/explore"
                        className="inline-flex items-center gap-2 bg-forest text-lime text-sm font-bold px-5 py-3 rounded-full hover:brightness-110 transition-all"
                    >
                        Browse what&rsquo;s nearby
                    </Link>
                    <Link
                        href="/contact?topic=support"
                        className="text-sm font-bold text-gray-500 hover:text-forest transition-colors px-3 py-3"
                    >
                        Contact us
                    </Link>
                </div>
            </div>
        </div>
    );
}
