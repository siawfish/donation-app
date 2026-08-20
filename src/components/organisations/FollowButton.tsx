"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { followOrg, unfollowOrg, type FollowState } from "@/app/app/actions/orgSocial";

/**
 * Follow an organisation to hear when it lists something.
 *
 * The count is optimistic and reconciled from the server's reply, because the
 * whole interaction is one tap and a round trip long enough to feel broken.
 */
export function FollowButton({
    orgId,
    orgName,
    initial,
    signedIn,
    size = "default",
}: {
    orgId: string;
    orgName: string;
    initial: FollowState;
    signedIn: boolean;
    size?: "default" | "compact";
}) {
    const [state, setState] = useState(initial);
    const [busy, startTransition] = useTransition();
    const router = useRouter();
    const pathname = usePathname();

    const toggle = () => {
        if (!signedIn) {
            // Come back here afterwards, rather than dumping them on the app
            // home having forgotten what they were doing.
            router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
            return;
        }

        const wasFollowing = state.following;
        setState({
            following: !wasFollowing,
            followers: Math.max(0, state.followers + (wasFollowing ? -1 : 1)),
        });

        startTransition(async () => {
            const res = wasFollowing ? await unfollowOrg(orgId) : await followOrg(orgId);
            if (!res.success || !res.data) {
                setState({ following: wasFollowing, followers: state.followers });
                toast.error(res.message);
                return;
            }
            setState(res.data);
            toast.success(
                res.data.following
                    ? `Following ${orgName} — you'll hear when they list something.`
                    : `No longer following ${orgName}.`
            );
        });
    };

    const compact = size === "compact";
    const Icon = state.following ? BellRing : Bell;

    return (
        <button
            onClick={toggle}
            disabled={busy}
            aria-pressed={state.following}
            className={`inline-flex items-center gap-1.5 font-bold rounded-full transition-all disabled:opacity-60 ${
                compact ? "text-xs px-3.5 py-2" : "text-sm px-5 py-2.5"
            } ${
                state.following
                    ? "bg-white text-forest border border-forest/30 hover:border-forest/60"
                    : "bg-forest text-lime hover:brightness-110"
            }`}
        >
            {busy ? (
                <Loader2 className={`animate-spin ${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
            ) : (
                <Icon className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
            )}
            {state.following ? "Following" : "Follow"}
            {state.followers > 0 && (
                <span className={`tabular-nums ${state.following ? "text-gray-400" : "text-lime/60"}`}>
                    {state.followers}
                </span>
            )}
        </button>
    );
}
