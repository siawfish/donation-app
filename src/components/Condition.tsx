import { ConditionType } from "@/app/types";
import React from "react";

interface ConditionProps {
    condition: ConditionType
}

export function Condition({ condition }: ConditionProps) {
    return (
        <div className="flex flex-row items-center gap-1">
            <div className="w-[8px] h-[8px] bg-primary rounded-full" />
            <p className="text-sm font-medium text-muted-foreground font-cabinet mt-[1px] capitalize">{`${condition} Condition`}</p>
        </div>
    )
}