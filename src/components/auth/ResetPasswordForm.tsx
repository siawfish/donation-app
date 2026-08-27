"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getFirebaseAuth } from "@/firebase/auth/firebase";
import Logo from "@/components/Logo";

const FIELD =
    "w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 pr-12 text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all";

const MIN_LENGTH = 8;

/**
 * Set a new password from a reset link.
 *
 * Firebase's own hosted page handles this by default. This exists so the whole
 * journey can stay on givny.com — point Authentication → Templates → Password
 * reset → the action URL at /auth/reset-password and the emailed link lands
 * here instead of on a Google-branded page.
 */
export function ResetPasswordForm() {
    const params = useSearchParams();
    const router = useRouter();
    const code = params.get("oobCode");

    const [checking, setChecking] = useState(true);
    const [email, setEmail] = useState<string | null>(null);
    const [invalid, setInvalid] = useState<string | null>(null);

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState(false);
    const [done, setDone] = useState(false);
    const [pending, startTransition] = useTransition();

    // Check the code before showing the form. Letting somebody type a new
    // password and only then discovering the link expired is the worst order to
    // do this in.
    useEffect(() => {
        if (!code) {
            setInvalid("That link is missing its reset code.");
            setChecking(false);
            return;
        }

        let alive = true;
        verifyPasswordResetCode(getFirebaseAuth(), code)
            .then((address) => { if (alive) { setEmail(address); setChecking(false); } })
            .catch((error: any) => {
                if (!alive) return;
                setInvalid(
                    error?.code === "auth/expired-action-code"
                        ? "That link has expired. Ask for a new one."
                        : "That link isn't valid. It may already have been used."
                );
                setChecking(false);
            });
        return () => { alive = false };
    }, [code]);

    const problem =
        password && password.length < MIN_LENGTH
            ? `Use at least ${MIN_LENGTH} characters.`
            : confirm && password !== confirm
              ? "The two passwords don't match."
              : null;

    const submit = () => {
        if (!code || problem || password.length < MIN_LENGTH || password !== confirm) return;

        startTransition(async () => {
            try {
                await confirmPasswordReset(getFirebaseAuth(), code, password);
                setDone(true);
                toast.success("Password changed", { description: "You can sign in with it now." });
                // Straight to sign-in rather than leaving them on a dead end.
                setTimeout(() => router.push("/auth/login"), 1800);
            } catch (error: any) {
                toast.error("Couldn't change your password", {
                    description:
                        error?.code === "auth/weak-password"
                            ? "Pick something harder to guess."
                            : "The link may have expired — ask for a new one.",
                });
            }
        });
    };

    return (
        <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-[420px]">
                <div className="flex justify-center mb-8">
                    <Logo />
                </div>

                <div className="bg-white border border-gray-200/70 rounded-3xl p-8">
                    {checking ? (
                        <p className="flex items-center justify-center gap-2 text-sm text-gray-500 py-6">
                            <Loader2 className="w-4 h-4 animate-spin" /> Checking your link…
                        </p>
                    ) : invalid ? (
                        <div className="text-center">
                            <span className="inline-flex w-12 h-12 rounded-full bg-amber-100 text-amber-700 items-center justify-center mb-4">
                                <AlertCircle className="w-6 h-6" />
                            </span>
                            <h1 className="text-2xl font-bold text-ink tracking-tight">Link doesn&rsquo;t work</h1>
                            <p className="text-sm text-gray-500 mt-2">{invalid}</p>
                            <Link
                                href="/auth/forgot-password"
                                className="inline-flex items-center justify-center w-full bg-forest text-lime font-bold px-6 py-3.5 rounded-full hover:brightness-110 transition-all mt-6"
                            >
                                Send a new link
                            </Link>
                        </div>
                    ) : done ? (
                        <div className="text-center">
                            <span className="inline-flex w-12 h-12 rounded-full bg-lime text-forest items-center justify-center mb-4">
                                <Check className="w-6 h-6" />
                            </span>
                            <h1 className="text-2xl font-bold text-ink tracking-tight">Password changed</h1>
                            <p className="text-sm text-gray-500 mt-2">Taking you to sign in…</p>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold text-ink tracking-tight">Set a new password</h1>
                            {email && (
                                <p className="text-sm text-gray-500 mt-2">
                                    For <span className="font-semibold text-ink">{email}</span>
                                </p>
                            )}

                            <label className="block mt-6">
                                <span className="text-sm font-semibold text-ink">New password</span>
                                <span className="relative block mt-1.5">
                                    <input
                                        type={show ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="new-password"
                                        autoFocus
                                        className={FIELD}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShow((v) => !v)}
                                        aria-label={show ? "Hide password" : "Show password"}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink"
                                    >
                                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </span>
                                <span className="block text-xs text-gray-400 mt-1">
                                    At least {MIN_LENGTH} characters.
                                </span>
                            </label>

                            <label className="block mt-4">
                                <span className="text-sm font-semibold text-ink">Repeat it</span>
                                <input
                                    type={show ? "text" : "password"}
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && submit()}
                                    autoComplete="new-password"
                                    className={`${FIELD} mt-1.5`}
                                />
                            </label>

                            {problem && <p className="text-sm text-amber-700 mt-3">{problem}</p>}

                            <button
                                onClick={submit}
                                disabled={pending || !!problem || password.length < MIN_LENGTH || password !== confirm}
                                className="inline-flex items-center justify-center gap-2 w-full bg-forest text-lime font-bold px-6 py-3.5 rounded-full hover:brightness-110 transition-all disabled:opacity-50 mt-5"
                            >
                                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Change password
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
