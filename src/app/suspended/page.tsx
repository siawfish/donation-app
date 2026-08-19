import { Metadata } from "next";
import Link from "next/link";
import { Ban } from "lucide-react";

export const metadata: Metadata = { title: "Account suspended — Givny" };

export default function SuspendedPage() {
    return (
        <div className="min-h-[100dvh] bg-canvas flex items-center justify-center px-4">
            <div className="forest-panel rounded-[2rem] p-8 md:p-12 max-w-md w-full text-center text-white">
                <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-lime text-forest mb-6">
                    <Ban className="w-6 h-6" />
                </span>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Your account is on hold</h1>
                <p className="text-white/60 text-sm mt-3 leading-relaxed">
                    An admin has suspended this account, so you can&apos;t list or request items for now.
                    If you think this is a mistake, get in touch and we&apos;ll take another look.
                </p>
                <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 bg-lime text-forest font-bold text-sm px-7 py-3.5 rounded-full hover:brightness-95 transition-all mt-7"
                >
                    Contact support
                </Link>
            </div>
        </div>
    );
}
