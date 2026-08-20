"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { crestToBlob, drawCrest, type CrestConfig } from "@/lib/crest";
import { topOrgBadges } from "@/lib/orgLoyalty";
import type { OrgStanding } from "@/app/app/actions/organisations";
import type { OrgImpact } from "@/lib/organisations";

/**
 * A shareable image of an organisation's standing.
 *
 * This exists because the thing an organisation wants from Givny is something
 * to show — a LinkedIn post, a slide in a board pack, a line in a CSR report.
 * A number on a dashboard they have to log in to see does not travel; a PNG
 * does.
 */
export function OrgCrest({
    orgName,
    standing,
    impact,
    followers,
}: {
    orgName: string;
    standing: OrgStanding;
    impact: OrgImpact;
    followers: number;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [busy, setBusy] = useState(false);
    const [canSharePhoto, setCanSharePhoto] = useState(false);

    const config: CrestConfig = useMemo(
        () => ({
            variant: "organisation",
            name: orgName,
            tier: {
                name: standing.tier.name,
                emoji: standing.tier.emoji,
                blurb: standing.tier.blurb,
            },
            points: standing.points,
            rank: null,
            totalRanked: 0,
            stats: {
                donated: impact.rehomed,
                badges: standing.badges.filter((b) => b.unlocked).length,
                invited: followers,
            },
            statsRow: [
                { value: String(impact.rehomed), label: "Passed on" },
                { value: String(impact.householdsReached), label: "Households" },
                { value: `${impact.kgDiverted}kg`, label: "Diverted, est." },
            ],
            topBadges: topOrgBadges(standing.badges).map((b) => ({ emoji: b.emoji, name: b.name })),
        }),
        [orgName, standing, impact, followers]
    );

    // Wait for the brand face, or the first paint falls back to a system font
    // and the crest looks off-brand.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await document.fonts.ready;
            } catch {
                /* fonts API unavailable — draw with the fallback stack */
            }
            if (!cancelled && canvasRef.current) drawCrest(canvasRef.current, config);
        })();
        return () => { cancelled = true; };
    }, [config]);

    useEffect(() => {
        try {
            const probe = new File([new Blob(["x"])], "probe.png", { type: "image/png" });
            setCanSharePhoto(!!navigator.canShare?.({ files: [probe] }));
        } catch {
            setCanSharePhoto(false);
        }
    }, []);

    const withBlob = useCallback(async (fn: (blob: Blob) => Promise<void>) => {
        if (!canvasRef.current) return;
        setBusy(true);
        try {
            const blob = await crestToBlob(canvasRef.current);
            if (!blob) throw new Error("Could not render the crest");
            await fn(blob);
        } catch (e: any) {
            if (e?.name !== "AbortError") toast.error("Couldn't create the image", { description: e?.message });
        } finally {
            setBusy(false);
        }
    }, []);

    const fileName = `givny-${orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-crest.png`;

    const download = () =>
        withBlob(async (blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Crest saved");
        });

    const share = () =>
        withBlob(async (blob) => {
            const file = new File([blob], fileName, { type: "image/png" });
            await navigator.share({ files: [file], title: `${orgName} on Givny` });
        });

    return (
        <section className="bg-white border border-gray-200/70 rounded-3xl p-5 md:p-6">
            <h2 className="text-base font-bold text-ink">Your crest</h2>
            <p className="text-sm text-gray-500 mt-0.5">
                An image of where you stand, for a report, a post or a board pack.
            </p>

            <div className="mt-4 rounded-2xl overflow-hidden bg-forest max-w-[280px]">
                <canvas ref={canvasRef} className="w-full h-auto block" />
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4">
                <button
                    onClick={download}
                    disabled={busy}
                    className="inline-flex items-center gap-2 bg-forest text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-forest-dark transition-colors disabled:opacity-50"
                >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Download
                </button>

                {canSharePhoto && (
                    <button
                        onClick={share}
                        disabled={busy}
                        className="inline-flex items-center gap-2 border border-gray-200 text-ink text-sm font-bold px-5 py-2.5 rounded-full hover:border-forest/40 transition-colors disabled:opacity-50"
                    >
                        <Share2 className="w-4 h-4" /> Share
                    </button>
                )}
            </div>
        </section>
    );
}
