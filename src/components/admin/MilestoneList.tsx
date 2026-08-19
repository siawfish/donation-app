import { Milestone } from "@/app/app/actions/analytics";
import { Check } from "lucide-react";
import { Num } from "./ui";

export function MilestoneList({ milestones }: { milestones: Milestone[] }) {
    return (
        <div className="space-y-3.5">
            {milestones.map((m) => {
                const pct = Math.min(100, Math.round((m.current / m.target) * 100));
                const done = m.current >= m.target;
                return (
                    <div key={m.id}>
                        <div className="flex items-baseline justify-between gap-3 mb-1">
                            <p className="text-[13px] font-medium text-ink flex items-center gap-1.5">
                                {done && <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                                {m.label}
                            </p>
                            <p className="text-[11px] text-gray-400 flex-shrink-0">
                                <Num className="text-ink font-semibold">{m.current.toLocaleString()}</Num>
                                {" / "}
                                <Num>{m.target.toLocaleString()}</Num>
                            </p>
                        </div>
                        {/* Square-ended bars, so progress reads as a measurement
                            rather than a decoration. */}
                        <div className="h-1.5 w-full rounded-sm bg-gray-100 overflow-hidden">
                            <div
                                className={`h-full transition-all ${done ? "bg-emerald-500" : "bg-forest"}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">{m.hint}</p>
                    </div>
                );
            })}
        </div>
    );
}
