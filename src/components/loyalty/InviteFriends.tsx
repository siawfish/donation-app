"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2, Mail, MessageCircle, Gift } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/firebase/auth/AuthContext";
import { POINTS, buildInviteUrl, displayCode } from "@/lib/loyalty";
import { PUBLIC_SITE_URL } from "@/lib/seo";

const SHARE_TEXT =
    "I'm giving away things I no longer need on Givny — a free community marketplace. Everything on it is free. Join me:";

export function InviteFriends({
    referralsJoined = 0,
    compact = false,
}: {
    referralsJoined?: number;
    compact?: boolean;
}) {
    const { user } = useAuth();
    const [inviteUrl, setInviteUrl] = useState("");
    const [copied, setCopied] = useState(false);
    const [canNativeShare, setCanNativeShare] = useState(false);

    // The origin is a build-time constant rather than `window.location.origin`,
    // which was the third different way this app decided what its own address
    // is. It also meant a referral link inherited whatever host the member
    // happened to be on — a preview deployment, or the apex domain that only
    // redirects — so two members could share genuinely different URLs for the
    // same thing. Still set in an effect because the uid arrives with the
    // client-side auth state, not because the origin needs the browser.
    useEffect(() => {
        if (!user?.uid) return;
        setInviteUrl(buildInviteUrl(PUBLIC_SITE_URL, user.uid));
        setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
    }, [user?.uid]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            toast.success("Invite link copied");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Couldn't copy — select the link and copy it manually");
        }
    };

    const nativeShare = async () => {
        try {
            await navigator.share({ title: "Join me on Givny", text: SHARE_TEXT, url: inviteUrl });
        } catch {
            /* user dismissed the sheet — nothing to report */
        }
    };

    const encoded = encodeURIComponent(`${SHARE_TEXT} ${inviteUrl}`);
    const channels = [
        { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${encoded}` },
        { label: "Email", icon: Mail, href: `mailto:?subject=${encodeURIComponent("Join me on Givny")}&body=${encoded}` },
    ];

    if (!user) return null;

    return (
        <div className={`forest-panel rounded-3xl ${compact ? "p-5" : "p-6 md:p-8"} text-white`}>
            <div className="flex items-start gap-3 mb-5">
                <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-lime text-forest flex-shrink-0">
                    <Gift className="w-5 h-5" />
                </span>
                <div>
                    <h3 className={`font-bold tracking-tight ${compact ? "text-lg" : "text-xl md:text-2xl"}`}>
                        Invite a neighbour
                    </h3>
                    <p className="text-sm text-white/60 mt-1 leading-relaxed">
                        Earn <span className="text-lime font-bold">{POINTS.REFERRAL_JOINED} points</span> when they
                        join, and <span className="text-lime font-bold">{POINTS.REFERRAL_FIRST_DONATION} more</span>{" "}
                        once they give something away.
                    </p>
                </div>
            </div>

            {/* Link + copy */}
            <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-full p-1.5 pl-4">
                <span className="flex-1 min-w-0 truncate text-sm text-white/70" title={inviteUrl}>
                    {inviteUrl || "Preparing your link…"}
                </span>
                <button
                    onClick={copy}
                    disabled={!inviteUrl}
                    className="inline-flex items-center gap-1.5 bg-lime text-forest text-xs font-bold px-4 py-2.5 rounded-full hover:brightness-95 transition-all flex-shrink-0 disabled:opacity-50"
                >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                </button>
            </div>

            {/* Channels */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
                {canNativeShare && (
                    <button
                        onClick={nativeShare}
                        className="inline-flex items-center gap-1.5 border border-white/20 text-white/80 text-xs font-semibold px-4 py-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <Share2 className="w-3.5 h-3.5" /> Share
                    </button>
                )}
                {channels.map(({ label, icon: Icon, href }) => (
                    <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 border border-white/20 text-white/80 text-xs font-semibold px-4 py-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <Icon className="w-3.5 h-3.5" /> {label}
                    </a>
                ))}
            </div>

            {/* Footer stats */}
            <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-white/10">
                <span className="text-xs text-white/40">
                    Your code · <span className="font-bold text-white/70">{displayCode(user.uid)}</span>
                </span>
                <span className="text-xs text-white/60">
                    <span className="font-bold text-lime">{referralsJoined}</span>{" "}
                    {referralsJoined === 1 ? "person has" : "people have"} joined
                </span>
            </div>
        </div>
    );
}
