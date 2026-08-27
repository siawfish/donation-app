"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { ArrowLeft, Check, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { getFirebaseAuth } from "@/firebase/auth/firebase";
import Logo from "@/components/Logo";

const FIELD =
    "w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all";

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

/**
 * Ask Firebase to send a reset link.
 *
 * Firebase sends the mail itself, so this works without any SMTP of our own —
 * which matters, because the platform no longer has an outbound mail path.
 */
export function ForgotPasswordForm() {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [pending, startTransition] = useTransition();

    const submit = () => {
        if (!isEmail(email)) {
            toast.error("That email address doesn't look right.");
            return;
        }

        startTransition(async () => {
            try {
                await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
            } catch (error: any) {
                // Anything except a genuinely broken request is swallowed on
                // purpose. `auth/user-not-found` would otherwise turn this form
                // into a way to test whether somebody has an account here, which
                // is a real answer to give a stranger about a real person.
                const code = error?.code ?? "";
                if (code !== "auth/user-not-found" && code !== "auth/invalid-email") {
                    if (code === "auth/too-many-requests") {
                        toast.error("Too many attempts", {
                            description: "Wait a few minutes and try again.",
                        });
                        return;
                    }
                    toast.error("Couldn't send the link", {
                        description: "Try again in a moment.",
                    });
                    return;
                }
            }

            setSent(true);
            toast.success("Check your email", {
                description: `If ${email.trim()} has an account, a reset link is on its way.`,
                duration: 6000,
            });
        });
    };

    return (
        <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-[420px]">
                <div className="flex justify-center mb-8">
                    <Logo />
                </div>

                {sent ? (
                    <div className="bg-white border border-gray-200/70 rounded-3xl p-8 text-center">
                        <span className="inline-flex w-12 h-12 rounded-full bg-lime text-forest items-center justify-center mb-4">
                            <Check className="w-6 h-6" />
                        </span>
                        <h1 className="text-2xl font-bold text-ink tracking-tight">Check your email</h1>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                            If <span className="font-semibold text-ink">{email.trim()}</span> has a Givny
                            account, we&rsquo;ve sent a link to set a new password. It expires in an hour.
                        </p>
                        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                            Nothing arrived? Check your spam folder, or{" "}
                            <button
                                onClick={() => setSent(false)}
                                className="font-bold text-forest hover:underline"
                            >
                                try another address
                            </button>
                            .
                        </p>

                        <Link
                            href="/auth/login"
                            className="inline-flex items-center justify-center gap-2 w-full bg-forest text-lime font-bold px-6 py-3.5 rounded-full hover:brightness-110 transition-all mt-6"
                        >
                            Back to sign in
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white border border-gray-200/70 rounded-3xl p-8">
                        <h1 className="text-2xl font-bold text-ink tracking-tight">Reset your password</h1>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                            Tell us the email you signed up with and we&rsquo;ll send you a link to set a
                            new one.
                        </p>

                        <label className="block mt-6">
                            <span className="text-sm font-semibold text-ink">Email</span>
                            <div className="relative mt-1.5">
                                <Mail className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && submit()}
                                    autoComplete="email"
                                    inputMode="email"
                                    autoFocus
                                    placeholder="you@example.com"
                                    className={`${FIELD} pl-11`}
                                />
                            </div>
                        </label>

                        <button
                            onClick={submit}
                            disabled={pending || !email.trim()}
                            className="inline-flex items-center justify-center gap-2 w-full bg-forest text-lime font-bold px-6 py-3.5 rounded-full hover:brightness-110 transition-all disabled:opacity-50 mt-5"
                        >
                            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Send reset link
                        </button>

                        <Link
                            href="/auth/login"
                            className="inline-flex items-center justify-center gap-1.5 w-full text-sm font-bold text-gray-500 hover:text-forest transition-colors mt-4"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to sign in
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
