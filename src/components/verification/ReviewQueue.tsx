"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X, Eye, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
    getVerificationImageUrl,
    listPendingVerifications,
    reviewVerification,
} from "@/app/app/actions/verification";
import { VerificationRecord } from "@/lib/verification";
import EmptyState from "../EmptyState";

export function ReviewQueue() {
    const [rows, setRows] = useState<VerificationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewing, setViewing] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        const res = await listPendingVerifications();
        if (!res.success) toast.error(res.message);
        setRows(res.data ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load() }, [load]);

    const view = async (uid: string) => {
        setViewing(uid);
        setImageUrl(null);
        const res = await getVerificationImageUrl(uid);
        if (!res.success) {
            toast.error("Couldn't open the card", { description: res.message });
            setViewing(null);
            return;
        }
        setImageUrl(res.data);
    };

    const decide = async (uid: string, approve: boolean) => {
        let reason = "";
        if (!approve) {
            reason = window.prompt("Reason (shown to the member):") ?? "";
            if (!reason.trim()) return;
        }
        setBusy(uid);
        const res = await reviewVerification({ uid, approve, reason });
        setBusy(null);
        if (!res.success) return toast.error(res.message);
        toast.success(res.message);
        setViewing(null);
        setImageUrl(null);
        await load();
    };

    if (loading) return <div className="h-40 rounded-3xl bg-sand animate-pulse" />;

    if (rows.length === 0) {
        return <EmptyState title="Nothing to review" description="New verification requests will appear here." />;
    }

    return (
        <div className="space-y-3">
            {rows.map((row) => (
                <div key={row.uid} className="bg-white border border-gray-200/70 rounded-3xl p-4 md:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary-light text-primary flex-shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </span>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-ink truncate">Member {row.uid.slice(0, 10)}…</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Card ending <span className="font-mono font-bold">{row.cardLast4}</span> ·
                                submitted {new Date(row.submittedAt).toLocaleDateString()}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={() => view(row.uid)}
                                className="inline-flex items-center gap-1.5 border border-gray-200 text-ink text-xs font-bold px-4 py-2 rounded-full hover:border-forest/40 transition-colors"
                            >
                                <Eye className="w-3.5 h-3.5" /> View card
                            </button>
                            <button
                                onClick={() => decide(row.uid, false)}
                                disabled={busy === row.uid}
                                className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-bold px-4 py-2 rounded-full hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-50"
                            >
                                <X className="w-3.5 h-3.5" /> Reject
                            </button>
                            <button
                                onClick={() => decide(row.uid, true)}
                                disabled={busy === row.uid}
                                className="inline-flex items-center gap-1.5 bg-forest text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-forest-dark transition-colors disabled:opacity-50"
                            >
                                {busy === row.uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Approve
                            </button>
                        </div>
                    </div>

                    {viewing === row.uid && (
                        <div className="mt-4 pt-4 border-t border-gray-200/70">
                            {imageUrl ? (
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={imageUrl}
                                        alt="Ghana Card submission"
                                        className="w-full max-w-md rounded-2xl border border-gray-200/70"
                                    />
                                    <p className="text-[11px] text-gray-400 mt-2">
                                        Link expires in 10 minutes. The image is deleted once you decide.
                                    </p>
                                </>
                            ) : (
                                <div className="h-40 max-w-md rounded-2xl bg-sand animate-pulse" />
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
