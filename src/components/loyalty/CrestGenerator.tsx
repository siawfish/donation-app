"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Share2, Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Achievement, MemberStats, TIERS } from "@/lib/loyalty";
import { CrestConfig, drawCrest, crestToBlob } from "@/lib/crest";

interface Props {
    name: string;
    tierId: string;
    points: number;
    rank: number | null;
    totalRanked: number;
    stats: MemberStats;
    achievements: Achievement[];
}

export function CrestGenerator({
    name,
    tierId,
    points,
    rank,
    totalRanked,
    stats,
    achievements,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selected, setSelected] = useState<string>("overall");
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const [canSharePhoto, setCanSharePhoto] = useState(false);

    const unlocked = useMemo(() => achievements.filter((a) => a.unlocked), [achievements]);

    const config: CrestConfig = useMemo(() => {
        const tier = TIERS.find((t) => t.id === tierId) ?? TIERS[0];
        const achievement = unlocked.find((a) => a.id === selected);

        return {
            variant: achievement ? "achievement" : "overall",
            name: name || "A Givny member",
            tier: { name: tier.name, emoji: tier.emoji, blurb: tier.blurb },
            points,
            rank,
            totalRanked,
            stats: {
                donated: stats.donationsCompleted,
                badges: unlocked.length,
                invited: stats.referralsJoined,
            },
            topBadges: unlocked.map((a) => ({ emoji: a.emoji, name: a.name })),
            achievement: achievement
                ? { emoji: achievement.emoji, name: achievement.name, description: achievement.description }
                : undefined,
        };
    }, [name, tierId, points, rank, totalRanked, stats, unlocked, selected]);

    // Wait for the brand face before drawing, otherwise the first paint falls
    // back to a system font and the crest looks off-brand.
    useEffect(() => {
        let cancelled = false;
        const render = async () => {
            try {
                await document.fonts.ready;
            } catch {
                /* fonts API unavailable — draw with the fallback stack */
            }
            if (!cancelled && canvasRef.current) drawCrest(canvasRef.current, config);
        };
        render();
        return () => { cancelled = true; };
    }, [config]);

    useEffect(() => {
        // Feature-detect file sharing once; iOS/Android support it, most desktops don't.
        try {
            const probe = new File([new Blob(["x"])], "probe.png", { type: "image/png" });
            setCanSharePhoto(!!navigator.canShare?.({ files: [probe] }));
        } catch {
            setCanSharePhoto(false);
        }
    }, []);

    const fileName = useMemo(() => {
        const label = config.variant === "achievement" ? config.achievement?.name : config.tier.name;
        return `givny-crest-${(label ?? "crest").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    }, [config]);

    const withBlob = useCallback(
        async (fn: (blob: Blob) => Promise<void>) => {
            if (!canvasRef.current) return;
            setBusy(true);
            try {
                const blob = await crestToBlob(canvasRef.current);
                if (!blob) throw new Error("Could not render the crest");
                await fn(blob);
            } catch (e: any) {
                if (e?.name !== "AbortError") {
                    toast.error("Couldn't create the image", { description: e?.message });
                }
            } finally {
                setBusy(false);
            }
        },
        []
    );

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

    const sharePhoto = () =>
        withBlob(async (blob) => {
            const file = new File([blob], fileName, { type: "image/png" });
            if (!navigator.canShare?.({ files: [file] })) {
                toast.error("Sharing images isn't supported here — try Download instead");
                return;
            }
            await navigator.share({
                files: [file],
                title: "My Givny crest",
                text:
                    config.variant === "achievement"
                        ? `I just unlocked "${config.achievement?.name}" on Givny — a free community marketplace.`
                        : `I'm in the ${config.tier.name} division on Givny — a free community marketplace where everything is free.`,
            });
        });

    const copyImage = () =>
        withBlob(async (blob) => {
            if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
                toast.error("Copying images isn't supported here — try Download instead");
                return;
            }
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success("Crest copied to clipboard");
        });

    return (
        <div className="space-y-4">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-1">Show it off</p>
                    <h2 className="text-xl font-bold text-ink tracking-tight">Your crest</h2>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 text-right">
                    Share as a photo
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_1fr] gap-6 items-start">
                {/* Preview */}
                <div className="bg-white border border-gray-200/70 rounded-3xl p-4">
                    <canvas
                        ref={canvasRef}
                        className="w-full h-auto rounded-2xl shadow-lg"
                        style={{ aspectRatio: "1080 / 1350" }}
                        role="img"
                        aria-label={
                            config.variant === "achievement"
                                ? `Crest for the ${config.achievement?.name} achievement`
                                : `Crest showing the ${config.tier.name} division`
                        }
                    />
                </div>

                {/* Controls */}
                <div className="space-y-5">
                    {/* Which crest */}
                    <div>
                        <p className="text-sm font-bold text-ink mb-2">Choose a crest</p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelected("overall")}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                                    selected === "overall"
                                        ? "bg-forest text-white border-forest"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-forest/40"
                                }`}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                Overall
                            </button>

                            {unlocked.map((a) => (
                                <button
                                    key={a.id}
                                    onClick={() => setSelected(a.id)}
                                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                                        selected === a.id
                                            ? "bg-lime text-forest border-lime"
                                            : "bg-white text-gray-600 border-gray-200 hover:border-forest/40"
                                    }`}
                                >
                                    <span>{a.emoji}</span>
                                    {a.name}
                                </button>
                            ))}
                        </div>

                        {unlocked.length === 0 && (
                            <p className="text-xs text-gray-400 mt-2">
                                Unlock a badge to create achievement crests — your division crest is ready now.
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                        {canSharePhoto && (
                            <button
                                onClick={sharePhoto}
                                disabled={busy}
                                className="inline-flex items-center gap-2 bg-forest text-white text-sm font-bold px-6 py-3 rounded-full hover:bg-forest-dark transition-colors disabled:opacity-50"
                            >
                                <Share2 className="w-4 h-4" /> Share photo
                            </button>
                        )}
                        <button
                            onClick={download}
                            disabled={busy}
                            className="inline-flex items-center gap-2 bg-lime text-forest text-sm font-bold px-6 py-3 rounded-full hover:brightness-95 transition-all disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" /> Download
                        </button>
                        <button
                            onClick={copyImage}
                            disabled={busy}
                            className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-semibold px-5 py-3 rounded-full hover:border-forest/40 transition-colors disabled:opacity-50"
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? "Copied" : "Copy"}
                        </button>
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed">
                        Saved as a 1080 × 1350 PNG — sized for Instagram, WhatsApp status and X.
                    </p>
                </div>
            </div>
        </div>
    );
}
