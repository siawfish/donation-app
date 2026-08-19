"use client";

import { useState, useTransition } from "react";
import { Truck, Loader2, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { updateDeliverySettings } from "@/app/app/actions/settings";
import { FeatureSettings } from "@/lib/settings";
import { bandsForSize, formatCedis, PARCEL_SIZES } from "@/lib/delivery";

export function DeliverySettings({ initial }: { initial: FeatureSettings }) {
    const [settings, setSettings] = useState(initial);
    const [partner, setPartner] = useState(initial.deliveryPartner);
    const [pending, startTransition] = useTransition();

    const save = (patch: Parameters<typeof updateDeliverySettings>[0], note: string) => {
        startTransition(async () => {
            const res = await updateDeliverySettings(patch);
            if (!res.success || !res.data) { toast.error(res.message); return; }
            setSettings(res.data);
            setPartner(res.data.deliveryPartner);
            toast.success(note);
        });
    };

    return (
        <div className="space-y-5">
            {/* The master switch. */}
            <div className="bg-white border border-gray-200/70 rounded-3xl p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-ink flex items-center gap-2">
                            <Truck className="w-4 h-4 text-primary" /> Delivery estimates
                        </p>
                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed max-w-prose">
                            Shows members what having an item delivered would cost, on every
                            listing. Turning this off hides the estimate everywhere — it does
                            not cancel anything already arranged.
                        </p>
                    </div>

                    <button
                        role="switch"
                        aria-checked={settings.deliveryEnabled}
                        aria-label="Delivery estimates"
                        disabled={pending}
                        onClick={() =>
                            save(
                                { deliveryEnabled: !settings.deliveryEnabled },
                                settings.deliveryEnabled ? "Delivery estimates hidden" : "Delivery estimates are live"
                            )
                        }
                        className={`relative w-14 h-8 rounded-full flex-shrink-0 transition-colors disabled:opacity-50 ${
                            settings.deliveryEnabled ? "bg-forest" : "bg-gray-300"
                        }`}
                    >
                        <span
                            className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${
                                settings.deliveryEnabled ? "left-7" : "left-1"
                            }`}
                        />
                    </button>
                </div>

                <p className="mt-4 text-xs font-bold">
                    {settings.deliveryEnabled ? (
                        <span className="text-primary">● Live — members can see estimates</span>
                    ) : (
                        <span className="text-gray-400">● Off — no estimates are shown</span>
                    )}
                </p>

                {settings.updatedAt && (
                    <p className="text-[11px] text-gray-400 mt-1">
                        Last changed {new Date(settings.updatedAt).toLocaleString()}
                    </p>
                )}
            </div>

            {/* Rates have to be confirmed separately, so nobody can turn the
                feature on and unknowingly publish invented prices. */}
            <div className="bg-white border border-gray-200/70 rounded-3xl p-5">
                <p className="text-sm font-bold text-ink">Rates</p>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed max-w-prose">
                    The price bands live in the code (<code className="text-[11px]">src/lib/delivery.ts</code>).
                    Once they match your partner&rsquo;s real tariff, confirm them here to remove
                    the &ldquo;sample rates&rdquo; warning members currently see.
                </p>

                {!settings.deliveryRatesConfirmed && (
                    <p className="mt-3 text-xs leading-relaxed text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" />
                        <span>
                            Rates are unconfirmed. Estimates carry a visible notice telling
                            members these are sample figures.
                        </span>
                    </p>
                )}

                <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs min-w-[380px]">
                        <thead>
                            <tr className="text-gray-400 text-left">
                                <th className="font-semibold pb-2">Distance</th>
                                {PARCEL_SIZES.map((s) => (
                                    <th key={s.id} className="font-semibold pb-2 text-right">{s.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {bandsForSize("small").map((band, i) => (
                                <tr key={band.label} className="border-t border-gray-100">
                                    <td className="py-2 text-ink font-medium">{band.label}</td>
                                    {PARCEL_SIZES.map((s) => (
                                        <td key={s.id} className="py-2 text-right tabular-nums text-gray-600">
                                            {formatCedis(bandsForSize(s.id)[i].price)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <button
                    disabled={pending}
                    onClick={() =>
                        save(
                            { deliveryRatesConfirmed: !settings.deliveryRatesConfirmed },
                            settings.deliveryRatesConfirmed
                                ? "Rates marked unconfirmed — the sample-rates notice is back"
                                : "Rates confirmed — the sample-rates notice is gone"
                        )
                    }
                    className={`mt-4 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full border transition-colors disabled:opacity-50 ${
                        settings.deliveryRatesConfirmed
                            ? "border-gray-200 text-gray-600 hover:border-forest/40"
                            : "bg-forest text-white border-forest hover:bg-forest-dark"
                    }`}
                >
                    {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {settings.deliveryRatesConfirmed ? "Mark as unconfirmed" : "These rates are correct"}
                </button>
            </div>

            {/* Partner name — a commercial arrangement, not a code constant. */}
            <div className="bg-white border border-gray-200/70 rounded-3xl p-5">
                <p className="text-sm font-bold text-ink">Delivery partner</p>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    Shown to members beside the estimate.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <input
                        value={partner}
                        onChange={(e) => setPartner(e.target.value)}
                        maxLength={60}
                        aria-label="Delivery partner name"
                        className="flex-1 min-w-[200px] bg-white border border-gray-200/80 rounded-full px-4 py-2.5 text-sm text-ink outline-none focus:border-forest transition-colors"
                    />
                    <button
                        disabled={pending || !partner.trim() || partner === settings.deliveryPartner}
                        onClick={() => save({ deliveryPartner: partner }, "Partner name updated")}
                        className="bg-lime text-forest text-xs font-bold px-5 py-2.5 rounded-full hover:brightness-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
