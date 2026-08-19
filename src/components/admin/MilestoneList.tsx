import { Milestone } from "@/app/app/actions/analytics";
import { Check } from "lucide-react";

export function MilestoneList({ milestones }: { milestones: Milestone[] }) {
    return (
        <div className="space-y-5">
            {milestones.map((m) => {
                const pct = Math.min(100, Math.round((m.current / m.target) * 100));
                const done = m.current >= m.target;
                return (
                    <div key={m.id}>
                        <div className="flex items-baseline justify-between gap-3 mb-1.5">
                            <p className="text-sm font-bold text-ink">{m.label}</p>
                            <p className="text-xs text-gray-400 tabular-nums flex-shrink-0">
                                <span className="text-ink font-bold">{m.current.toLocaleString()}</span>
                                {" / "}
                                {m.target.toLocaleString()}
                            </p>
                        </div>
                        <div className="h-2 w-full rounded-full bg-sand overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${done ? "bg-lime" : "bg-forest"}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                            {done && <Check className="w-3 h-3 text-primary" />}
                            {m.hint}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
