import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Kpi } from "@/app/app/actions/analytics";

export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {kpis.map((kpi) => {
                const delta = kpi.deltaPct;
                // A rate has no meaningful "up is good" reading without knowing the
                // metric, so only count-style KPIs get a trend arrow.
                const showDelta = delta !== null && delta !== undefined && !kpi.isPercent;
                const up = (delta ?? 0) > 0;
                const flat = (delta ?? 0) === 0;

                return (
                    <div
                        key={kpi.id}
                        className={`rounded-3xl p-4 md:p-5 ${
                            kpi.id === "rehomed" ? "bg-lime" : "bg-white border border-gray-200/70"
                        }`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs font-bold ${kpi.id === "rehomed" ? "text-forest" : "text-gray-500"}`}>
                                {kpi.label}
                            </p>
                            {showDelta && (
                                <span
                                    className={`inline-flex items-center gap-0.5 text-[11px] font-bold flex-shrink-0 ${
                                        flat ? "text-gray-400" : up ? "text-primary" : "text-red-500"
                                    }`}
                                    title="vs previous 30 days"
                                >
                                    {flat ? <Minus className="w-3 h-3" /> : up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {Math.abs(delta ?? 0)}%
                                </span>
                            )}
                        </div>

                        <p className={`text-3xl md:text-4xl font-bold mt-2 tabular-nums ${kpi.id === "rehomed" ? "text-forest" : "text-ink"}`}>
                            {kpi.value.toLocaleString()}
                            {kpi.isPercent && <span className="text-lg font-semibold opacity-50">%</span>}
                        </p>
                        <p className={`text-[11px] mt-1.5 leading-relaxed ${kpi.id === "rehomed" ? "text-forest/70" : "text-gray-400"}`}>
                            {kpi.hint}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
