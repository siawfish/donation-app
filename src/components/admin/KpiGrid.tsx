import { Kpi } from "@/app/app/actions/analytics";
import { Stat } from "./ui";

/**
 * One bordered strip rather than eight floating cards. Shared edges make the
 * figures read as a single instrument panel, which is what they are.
 */
export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 bg-white border border-gray-200 rounded-lg overflow-hidden [&>*:nth-child(4n)]:border-r-0">
            {kpis.map((kpi) => (
                <Stat
                    key={kpi.id}
                    label={kpi.label}
                    value={
                        <>
                            {kpi.value.toLocaleString()}
                            {kpi.isPercent && <span className="text-sm text-gray-400 ml-0.5">%</span>}
                        </>
                    }
                    // A rate has no meaningful "up is good" reading without knowing
                    // the metric, so only count-style KPIs get a trend arrow.
                    delta={kpi.isPercent ? null : kpi.deltaPct}
                    hint={kpi.hint}
                />
            ))}
        </div>
    );
}
