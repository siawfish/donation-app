"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, ShieldCheck, Upload, X, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "@/firebase/auth/firebase";
import { useAuth } from "@/firebase/auth/AuthContext";
import { awaitClientAuth } from "@/firebase/auth/clientAuth";
import { getMyVerification, submitVerification } from "@/app/app/actions/verification";
import {
    STATUS_COPY,
    VerificationRecord,
    VerificationStatus,
    isValidCardNumber,
    normaliseCardNumber,
} from "@/lib/verification";

const MAX_BYTES = 8 * 1024 * 1024;

export function VerificationPanel() {
    const { user } = useAuth();
    const [record, setRecord] = useState<VerificationRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    const [cardNumber, setCardNumber] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        const res = await getMyVerification();
        if (res.success) setRecord(res.data);
        setLoading(false);
    }, []);

    useEffect(() => { if (user) load() }, [user, load]);

    const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview]);

    const status: VerificationStatus = record?.status ?? "unverified";
    const copy = STATUS_COPY[status];

    const pick = (f: File | undefined) => {
        if (!f) return;
        if (!f.type.startsWith("image/")) return toast.error("Please choose a photo of your card");
        if (f.size > MAX_BYTES) return toast.error("That image is over 8 MB");
        setFile(f);
    };

    const submit = async () => {
        if (!user) return;
        if (!isValidCardNumber(cardNumber)) {
            return toast.error("Check the card number", { description: "It should read GHA-123456789-0." });
        }
        if (!file) return toast.error("Add a photo of your Ghana Card");

        setBusy(true);
        setProgress(0);
        try {
            const signedIn = await awaitClientAuth();
            if (!signedIn) throw new Error("Couldn't verify your session. Refresh and try again.");

            const safe = (file.name || "card").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-48);
            const path = `verifications/${user.uid}/${Date.now()}_${safe}`;

            await new Promise<void>((resolve, reject) => {
                const task = uploadBytesResumable(ref(storage, path), file, {
                    contentType: file.type || "image/jpeg",
                });
                task.on(
                    "state_changed",
                    (s) => setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
                    reject,
                    () => resolve()
                );
            });

            const res = await submitVerification({ cardNumber, imagePath: path });
            if (!res.success) throw new Error(res.message);

            toast.success("Sent for review", { description: "We'll let you know within a day." });
            setOpen(false);
            setFile(null);
            setCardNumber("");
            await load();
        } catch (e: any) {
            toast.error("Couldn't submit", { description: e.message });
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <div className="h-32 rounded-3xl bg-sand animate-pulse" />;

    return (
        <div className={`rounded-3xl p-5 md:p-6 ${status === "verified" ? "bg-lime" : "bg-white border border-gray-200/70"}`}>
            <div className="flex items-start gap-4">
                <span
                    className={`flex items-center justify-center w-11 h-11 rounded-2xl flex-shrink-0 ${
                        status === "verified" ? "bg-forest text-lime" : "bg-primary-light text-primary"
                    }`}
                >
                    {status === "verified" ? <BadgeCheck className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </span>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-bold ${status === "verified" ? "text-forest" : "text-ink"}`}>
                            {copy.label}
                        </h3>
                        {status === "pending" && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                In review
                            </span>
                        )}
                    </div>
                    <p className={`text-sm mt-1 leading-relaxed ${status === "verified" ? "text-forest/70" : "text-gray-500"}`}>
                        {copy.blurb}
                    </p>

                    {status === "rejected" && record?.rejectionReason && (
                        <p className="text-xs text-red-500 mt-2">{record.rejectionReason}</p>
                    )}

                    {(status === "unverified" || status === "rejected") && !open && (
                        <button
                            onClick={() => setOpen(true)}
                            className="mt-4 inline-flex items-center gap-2 bg-forest text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-forest-dark transition-colors"
                        >
                            <ShieldCheck className="w-4 h-4" />
                            {status === "rejected" ? "Try again" : "Get verified"}
                        </button>
                    )}
                </div>
            </div>

            {open && (
                <div className="mt-5 pt-5 border-t border-gray-200/70 space-y-4">
                    {/* Stating the retention rule up front is the single biggest
                        driver of whether people are willing to submit an ID at all. */}
                    <div className="flex gap-2.5 bg-sand rounded-2xl px-4 py-3">
                        <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-ink leading-relaxed">
                            Your card is reviewed by a person and then <strong>deleted</strong>. We never
                            store the image or your card number — only that you were verified, and when.
                            Your details are never shown to other members.
                        </p>
                    </div>

                    <div>
                        <label htmlFor="ghana-card" className="block text-sm font-bold text-ink mb-1.5">
                            Ghana Card number
                        </label>
                        <input
                            id="ghana-card"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            onBlur={() => setCardNumber((v) => (v ? normaliseCardNumber(v) : v))}
                            placeholder="GHA-123456789-0"
                            autoComplete="off"
                            disabled={busy}
                            className="w-full bg-white border border-gray-200/80 rounded-2xl px-4 py-3 text-sm text-ink placeholder-gray-400 outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all font-mono tracking-wide"
                        />
                        {cardNumber && !isValidCardNumber(cardNumber) && (
                            <p className="flex items-center gap-1.5 text-xs text-red-500 mt-1.5">
                                <AlertCircle className="w-3.5 h-3.5" /> Should read GHA-123456789-0
                            </p>
                        )}
                    </div>

                    <div>
                        <p className="text-sm font-bold text-ink mb-1.5">Photo of the front of your card</p>
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={busy}
                            onChange={(e) => pick(e.target.files?.[0])}
                        />

                        {file && preview ? (
                            <div className="relative w-full max-w-xs rounded-2xl overflow-hidden border border-gray-200/70 bg-sand">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={preview} alt="Ghana Card preview" className="w-full aspect-[1.6] object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setFile(null)}
                                    disabled={busy}
                                    aria-label="Remove photo"
                                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                disabled={busy}
                                className="w-full max-w-xs aspect-[1.6] rounded-2xl border-2 border-dashed border-gray-300 hover:border-forest hover:bg-sand transition-colors flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-forest"
                            >
                                <Upload className="w-5 h-5" />
                                <span className="text-xs font-bold">Upload a photo</span>
                                <span className="text-[10px]">Make sure the text is readable</span>
                            </button>
                        )}
                    </div>

                    {busy && progress > 0 && (
                        <div className="h-1.5 w-full rounded-full bg-sand overflow-hidden">
                            <div className="h-full bg-forest transition-all" style={{ width: `${progress}%` }} />
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <button
                            onClick={submit}
                            disabled={busy}
                            className="inline-flex items-center gap-2 bg-forest text-white text-sm font-bold px-6 py-3 rounded-full hover:bg-forest-dark transition-colors disabled:opacity-50"
                        >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            {busy ? "Sending…" : "Submit for review"}
                        </button>
                        <button
                            onClick={() => { setOpen(false); setFile(null) }}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-ink transition-colors disabled:opacity-50"
                        >
                            <X className="w-4 h-4" /> Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
