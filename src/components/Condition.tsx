import { ConditionType } from "@/app/types";
import { ConditionLabels, cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import React from "react";

interface ConditionProps {
    condition: ConditionType
    className?: string
}

/** Best to worst — a warmer condition reads as a calmer, more reassuring chip. */
const conditionStyles: Record<ConditionType, string> = {
    [ConditionType.NEW]: "bg-emerald-50 text-emerald-700",
    [ConditionType.LIKE_NEW]: "bg-teal-50 text-teal-700",
    [ConditionType.GOOD]: "bg-primary-light text-forest",
    [ConditionType.FAIR]: "bg-amber-50 text-amber-700",
    [ConditionType.POOR]: "bg-red-50 text-red-700",
}

export function Condition({ condition, className }: ConditionProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full",
                conditionStyles[condition],
                className
            )}
        >
            <Sparkles className="w-3.5 h-3.5" />
            {/* A lookup rather than `capitalize`-ing the raw value — "like_new"
                doesn't title-case into "Like New" on its own. */}
            {ConditionLabels[condition]} condition
        </span>
    )
}