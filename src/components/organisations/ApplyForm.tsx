"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { applyAsOrganisation } from "@/app/app/actions/organisations";
import { ORG_TYPE_LABELS, ORG_TYPE_MOTIVE, OrgType } from "@/lib/organisations";

const FIELD =
    "w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all";

export function OrgApplyForm({ signedIn }: { signedIn: boolean }) {
    const [pending, startTransition] = useTransition();
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [type, setType] = useState<OrgType>("business");
    const [form, setForm] = useState({
        name: "", contactName: "", contactEmail: "", contactPhone: "",
        registrationNumber: "", website: "", locationName: "", motivation: "",
    });

    const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const submit = () => {
        setError(null);
        startTransition(async () => {
            const res = await applyAsOrganisation({ ...form, type });
            if (!res.success) { setError(res.message); return; }
            setDone(true);
        });
    };

    if (done) {
        return (
            <div className="forest-panel rounded-3xl p-8 md:p-10 text-center">
                <span className="inline-flex w-12 h-12 rounded-full bg-lime text-forest items-center justify-center mb-4">
                    <Check className="w-6 h-6" />
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight">Application received</h2>
                <p className="text-white/70 mt-2 max-w-md mx-auto leading-relaxed">
                    We check every organisation before its page goes public — usually within a couple of
                    working days. We&rsquo;ll email {form.contactEmail}.
                </p>
                <Link
                    href="/app"
                    className="inline-flex items-center gap-2 bg-lime text-forest text-sm font-bold px-6 py-3 rounded-full mt-6 hover:brightness-95 transition-all"
                >
                    Back to Givny <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    // Applying attaches the organisation to an account, so there has to be one.
    if (!signedIn) {
        return (
            <div className="bg-white border border-gray-200/70 rounded-3xl p-8 text-center">
                <h2 className="text-xl font-bold text-ink tracking-tight">First, a Givny account</h2>
                <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
                    Your organisation is attached to an account so your team can be added to it later.
                    It takes a minute and it&rsquo;s free.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-5">
                    <Link href="/auth/register?redirect=/for-organisations" className="bg-forest hover:bg-forest-dark text-white text-sm font-bold px-6 py-3 rounded-full transition-colors">
                        Create an account
                    </Link>
                    <Link href="/auth/login?redirect=/for-organisations" className="border border-gray-200 text-ink text-sm font-bold px-6 py-3 rounded-full hover:border-forest/40 transition-colors">
                        Sign in
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200/70 rounded-3xl p-6 md:p-8">
            <h2 className="text-2xl font-bold text-ink tracking-tight">Apply to list</h2>
            <p className="text-sm text-gray-500 mt-1">
                Five minutes. We reply within a couple of working days.
            </p>

            <label className="block mt-6">
                <span className="text-sm font-semibold text-ink">What kind of organisation?</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {(Object.keys(ORG_TYPE_LABELS) as OrgType[]).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setType(t)}
                            aria-pressed={type === t}
                            className={`text-left p-3 rounded-2xl border transition-colors ${
                                type === t ? "border-forest bg-forest text-white" : "border-gray-200 hover:border-forest/40"
                            }`}
                        >
                            <span className="block text-sm font-bold">{ORG_TYPE_LABELS[t]}</span>
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{ORG_TYPE_MOTIVE[type]}</p>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                <label className="block sm:col-span-2">
                    <span className="text-sm font-semibold text-ink">Organisation name *</span>
                    <input value={form.name} onChange={(e) => set("name", e.target.value)} className={`${FIELD} mt-1.5`} placeholder="e.g. Kwabenya Ventures Ltd" />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-ink">Your name *</span>
                    <input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} className={`${FIELD} mt-1.5`} placeholder="Ama Mensah" />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-ink">Work email *</span>
                    <input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} className={`${FIELD} mt-1.5`} placeholder="ama@company.com" />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-ink">Phone</span>
                    <input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} className={`${FIELD} mt-1.5`} placeholder="024 123 4567" />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-ink">Where are you based?</span>
                    <input value={form.locationName} onChange={(e) => set("locationName", e.target.value)} className={`${FIELD} mt-1.5`} placeholder="Tema, Ghana" />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-ink">Registration number</span>
                    <input value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} className={`${FIELD} mt-1.5`} placeholder="RGD / CG number" />
                    {/* Said plainly: people are reasonably wary of handing this over. */}
                    <span className="block text-xs text-gray-400 mt-1">
                        Used only to confirm you exist. Never shown publicly.
                    </span>
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-ink">Website or social page</span>
                    <input value={form.website} onChange={(e) => set("website", e.target.value)} className={`${FIELD} mt-1.5`} placeholder="https://…" />
                </label>
            </div>

            <label className="block mt-4">
                <span className="text-sm font-semibold text-ink">What would you list, and why?</span>
                <textarea
                    rows={4}
                    value={form.motivation}
                    onChange={(e) => set("motivation", e.target.value)}
                    className={`${FIELD} mt-1.5 resize-y`}
                    placeholder="e.g. We refit our branches every few years and throw out working furniture. We'd rather it went to families nearby."
                />
            </label>

            {error && (
                <p className="flex items-center gap-2 mt-4 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </p>
            )}

            <button
                onClick={submit}
                disabled={pending}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-forest hover:bg-forest-dark text-white font-bold px-8 py-3.5 rounded-full mt-6 transition-colors disabled:opacity-50"
            >
                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                {pending ? "Sending…" : "Send application"}
            </button>
        </div>
    );
}
