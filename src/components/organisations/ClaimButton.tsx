"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { acceptOrgInvite } from "@/app/app/actions/organisations";

/**
 * Accept the invitation, or sign in first.
 *
 * The redirect carries the claim URL, so signing in returns here rather than
 * dropping someone on the app home having lost the invitation entirely.
 */
export function ClaimButton({
    token,
    signedIn,
    orgName,
}: {
    token: string;
    signedIn: boolean;
    orgName: string;
}) {
    const [pending, startTransition] = useTransition();
    const router = useRouter();
    const pathname = usePathname();

    const accept = () => {
        if (!signedIn) {
            router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
            return;
        }

        startTransition(async () => {
            const res = await acceptOrgInvite(token);
            if (!res.success) { toast.error(res.message); return; }
            toast.success(res.message);
            router.push("/app/organisation");
        });
    };

    return (
        <>
            <button
                onClick={accept}
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 w-full bg-forest text-lime font-bold px-6 py-3.5 rounded-full hover:brightness-110 transition-all disabled:opacity-60"
            >
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {signedIn ? `Take over ${orgName}` : "Sign in to claim this page"}
                {!pending && <ArrowRight className="w-4 h-4" />}
            </button>

            {!signedIn && (
                <p className="text-xs text-gray-500 mt-2.5 text-center">
                    No account yet?{" "}
                    <a
                        href={`/auth/register?redirect=${encodeURIComponent(pathname)}`}
                        className="font-bold text-forest hover:underline"
                    >
                        Create one
                    </a>{" "}
                    — it takes a minute, and this link will still be here.
                </p>
            )}
        </>
    );
}
