"use client";

import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";
import { useAuth } from "@/firebase/auth/AuthContext";

/**
 * The primary action on the public listing page.
 *
 * This page is what a shared link opens on — often for someone who has never
 * used Givny before. It used to always point at `/explore?id=…`, which opens
 * the item as a sheet in the app and only reveals a "Sign in to ask" button
 * once someone gets there. A visitor with no session goes straight to that
 * sign-in step instead of relying on them reaching the sheet first.
 */
export function AskButton({ itemId }: { itemId: string }) {
    const { user } = useAuth();
    const signedIn = !!user;
    const target = `/explore?id=${itemId}`;

    return (
        <Link
            href={signedIn ? target : `/auth/login?redirect=${encodeURIComponent(target)}`}
            className="inline-flex items-center justify-center gap-2 w-full bg-forest text-lime font-bold px-6 py-3.5 rounded-full hover:brightness-110 transition-all"
        >
            {signedIn ? (
                <>
                    Ask for this <ArrowRight className="w-4 h-4" />
                </>
            ) : (
                <>
                    <LogIn className="w-4 h-4" /> Log in to ask for this
                </>
            )}
        </Link>
    );
}
