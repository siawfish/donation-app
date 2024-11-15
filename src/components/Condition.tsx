import { ConditionType } from "@/app/types";
import React from "react";

interface ConditionProps {
    condition: ConditionType
}

const conditionColors: Record<ConditionType, string> = {
    [ConditionType.GOOD]: "bg-green-500",
    [ConditionType.FAIR]: "bg-yellow-500",
    [ConditionType.POOR]: "bg-red-500"
}

export function Condition({ condition }: ConditionProps) {
    return (
        <div className="flex flex-row items-center gap-1">
            <div className={`w-[8px] h-[8px] rounded-full ${conditionColors[condition]}`} />
            <p className="text-sm font-medium text-muted-foreground font-cabinet mt-[1px] capitalize">{`${condition} Condition`}</p>
        </div>
    )
}