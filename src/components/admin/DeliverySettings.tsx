"use client";

import { useState, useTransition } from "react";
import { Loader2, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { updateDeliverySettings } from "@/app/app/actions/settings";
import { FeatureSettings } from "@/lib/settings";
import { bandsForSize, formatCedis, PARCEL_SIZES } from "@/lib/delivery";
import { Badge, Button, Input, Num, Panel, Table, TableWrap, Td, Th, Tr } from "./ui";

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
        <div className="space-y-4">
            <Panel
                title="Delivery estimates"
                description="Shows members what having an item delivered would cost, on every listing."
                actions={
                    <Badge tone={settings.deliveryEnabled ? "good" : "neutral"}>
                        {settings.deliveryEnabled ? "Live" : "Off"}
                    </Badge>
                }
            >
                <div className="flex items-start justify-between gap-4">
                    <p className="text-[13px] text-gray-500 leading-relaxed max-w-prose">
                        Turning this off hides the estimate everywhere. It does not cancel anything
                        already arranged.
                        {settings.updatedAt && (
                            <span className="block text-[11px] text-gray-400 mt-1">
                                Last changed {new Date(settings.updatedAt).toLocaleString()}
                            </span>
                        )}
                    </p>

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
                        className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors disabled:opacity-50 ${
                            settings.deliveryEnabled ? "bg-forest" : "bg-gray-300"
                        }`}
                    >
                        <span
                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                                settings.deliveryEnabled ? "left-[22px]" : "left-0.5"
                            }`}
                        />
                    </button>
                </div>
            </Panel>

            {/* Rates are confirmed separately, so nobody can turn the feature on
                and unknowingly publish invented prices. */}
            <Panel
                flush
                title="Rates"
                description="Price bands live in src/lib/delivery.ts."
                actions={
                    <Button
                        variant={settings.deliveryRatesConfirmed ? "default" : "primary"}
                        disabled={pending}
                        onClick={() =>
                            save(
                                { deliveryRatesConfirmed: !settings.deliveryRatesConfirmed },
                                settings.deliveryRatesConfirmed
                                    ? "Rates marked unconfirmed"
                                    : "Rates confirmed"
                            )
                        }
                    >
                        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        {settings.deliveryRatesConfirmed ? "Mark unconfirmed" : "These rates are correct"}
                    </Button>
                }
            >
                {!settings.deliveryRatesConfirmed && (
                    <p className="flex gap-2 px-4 py-2.5 text-xs leading-relaxed text-amber-800 bg-amber-50 border-b border-amber-200">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" />
                        <span>
                            Rates are unconfirmed, so estimates carry a visible notice telling members
                            these are sample figures. Confirm once they match your partner&rsquo;s tariff.
                        </span>
                    </p>
                )}

                <TableWrap>
                    <Table>
                        <thead>
                            <tr>
                                <Th>Distance</Th>
                                {PARCEL_SIZES.map((s) => (
                                    <Th key={s.id} align="right">{s.label}</Th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {bandsForSize("small").map((band, i) => (
                                <Tr key={band.label}>
                                    <Td className="font-medium text-ink">{band.label}</Td>
                                    {PARCEL_SIZES.map((s) => (
                                        <Td key={s.id} align="right" className="text-gray-600">
                                            <Num>{formatCedis(bandsForSize(s.id)[i].price)}</Num>
                                        </Td>
                                    ))}
                                </Tr>
                            ))}
                        </tbody>
                    </Table>
                </TableWrap>
            </Panel>

            <Panel title="Delivery partner" description="Shown to members beside the estimate.">
                <div className="flex flex-wrap gap-2">
                    <Input
                        value={partner}
                        onChange={(e) => setPartner(e.target.value)}
                        maxLength={60}
                        aria-label="Delivery partner name"
                        className="flex-1 min-w-[200px]"
                    />
                    <Button
                        variant="primary"
                        disabled={pending || !partner.trim() || partner === settings.deliveryPartner}
                        onClick={() => save({ deliveryPartner: partner }, "Partner name updated")}
                    >
                        Save
                    </Button>
                </div>
            </Panel>
        </div>
    );
}
