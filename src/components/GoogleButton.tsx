"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { toast } from "sonner";
import { getFirebaseAuth } from "@/firebase/auth/firebase";
import { googleSignInAction } from "@/app/auth/actions/google";

/** Google's mark. Their brand guidelines require the four-colour original. */
function GoogleMark() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
        </svg>
    );
}

/**
 * Sign in, or sign up, with Google.
 *
 * The popup has to run here: Google will not authenticate anybody inside a
 * server action, which is where this app does its email-and-password sign-in.
 * So the browser gets the ID token and posts it to `googleSignInAction`, which
 * verifies it with Google and turns it into a session cookie.
 */
export function GoogleButton({
    label = "Continue with Google",
    referredBy,
    inviteToken,
    onSignedIn,
    disabled,
}: {
    label?: string;
    referredBy?: string;
    inviteToken?: string;
    /** Told what happened, so the caller can route or ask for a location. */
    onSignedIn: (result: { name: string; isNew: boolean; needsLocation: boolean }) => void;
    disabled?: boolean;
}) {
    const [busy, setBusy] = useState(false);

    const start = async () => {
        setBusy(true);
        try {
            const provider = new GoogleAuthProvider();
            // Always offer the account chooser. Without it a shared device
            // silently reuses whoever signed in last, which on a phone passed
            // around a household is the wrong person more often than not.
            provider.setCustomParameters({ prompt: "select_account" });

            const credential = await signInWithPopup(getFirebaseAuth(), provider);
            const idToken = await credential.user.getIdToken();

            const res = await googleSignInAction(idToken, { referredBy, inviteToken });
            if (!res.success || !res.data) {
                toast.error("Google sign-in failed", { description: res.message });
                return;
            }

            onSignedIn({
                name: res.data.user.name,
                isNew: res.data.isNew,
                needsLocation: res.data.needsLocation,
            });
        } catch (error: any) {
            // Closing the popup is a decision, not a failure, and does not
            // deserve an error toast.
            const code = error?.code ?? "";
            if (
                code === "auth/popup-closed-by-user" ||
                code === "auth/cancelled-popup-request" ||
                code === "auth/user-cancelled"
            ) {
                return;
            }
            toast.error(
                code === "auth/popup-blocked"
                    ? "Your browser blocked the Google window. Allow pop-ups for this site and try again."
                    : "Google sign-in failed",
                { description: code === "auth/popup-blocked" ? undefined : error?.message }
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={start}
            disabled={busy || disabled}
            className="w-full inline-flex items-center justify-center gap-3 bg-white border border-gray-200/80 rounded-full px-6 py-3.5 text-sm font-semibold text-ink hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleMark />}
            {busy ? "Signing in…" : label}
        </button>
    );
}

/** The "or" rule between Google and the email form. */
export function OrDivider() {
    return (
        <div className="flex items-center gap-3 my-5" aria-hidden="true">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <span className="h-px flex-1 bg-gray-200" />
        </div>
    );
}
