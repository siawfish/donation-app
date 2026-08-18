import { TIERS, Tier } from "@/lib/loyalty";

export function TierBadge({
    tierId,
    size = "sm",
    showBlurb = false,
}: {
    tierId: string;
    size?: "sm" | "lg";
    showBlurb?: boolean;
}) {
    const tier: Tier = TIERS.find((t) => t.id === tierId) ?? TIERS[0];

    if (size === "lg") {
        return (
            <div className="inline-flex items-center gap-2.5">
                <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold ${tier.chip}`}>
                    <span className="text-base leading-none">{tier.emoji}</span>
                    {tier.name}
                </span>
                {showBlurb && <span className="text-xs text-gray-400">{tier.blurb}</span>}
            </div>
        );
    }

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${tier.chip}`}>
            <span className="leading-none">{tier.emoji}</span>
            {tier.name}
        </span>
    );
}
