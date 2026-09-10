import { ConditionType } from "@/app/types";
import { ConditionLabels } from "@/lib/utils";
import React from "react";

interface ConditionProps {
    condition: ConditionType
}

const conditionColors: Record<ConditionType, string> = {
    [ConditionType.NEW]: "bg-emerald-500",
    [ConditionType.LIKE_NEW]: "bg-teal-500",
    [ConditionType.GOOD]: "bg-green-500",
    [ConditionType.FAIR]: "bg-yellow-500",
    [ConditionType.POOR]: "bg-red-500"
}

export function Condition({ condition }: ConditionProps) {
    return (
        <div className="flex flex-row items-center gap-1">
            <div className={`w-[8px] h-[8px] rounded-full ${conditionColors[condition]}`} />
            {/* A lookup rather than `capitalize`-ing the raw value — "like_new"
                doesn't title-case into "Like New" on its own. */}
            <p className="text-sm font-medium text-muted-foreground font-cabinet mt-[1px]">{`${ConditionLabels[condition]} Condition`}</p>
        </div>
    )
}