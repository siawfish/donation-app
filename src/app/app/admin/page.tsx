import { Metadata } from "next";
import { getAnalytics } from "@/app/app/actions/analytics";
import { KpiGrid } from "@/components/admin/KpiGrid";
import { TrendChart } from "@/components/admin/TrendChart";
import { MilestoneList } from "@/components/admin/MilestoneList";
import { Num, Panel } from "@/components/admin/ui";
import { AttentionInbox } from "@/components/admin/AttentionInbox";
import { getAttention } from "@/app/app/actions/audit";

export const metadata: Metadata = { title: "Admin overview — Givny" };

export default async function AdminOverview() {
    const [{ data, success, message }, attention] = await Promise.all([
        getAnalytics(),
        getAttention(),
    ]);

    if (!success || !data) {
        return (
            <Panel>
                <p className="text-[13px] text-gray-500">{message || "Couldn't load analytics."}</p>
            </Panel>
        );
    }

    return (
        <div className="space-y-4">
            <AttentionInbox attention={attention} />

            <div>
                <KpiGrid kpis={data.kpis} />
                <p className="text-[11px] text-gray-400 mt-1.5">
                    Compared with the previous 30 days. Items rehomed is the number worth watching —
                    everything else is a means to it.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
                <Panel title="Last six months" description="Signups, listings and handovers per month.">
                    <TrendChart points={data.trend} />
                </Panel>

                <Panel title="Milestones" description="Each target steps up once you pass it.">
                    <MilestoneList milestones={data.milestones} />
                </Panel>
            </div>

            {data.topCategories.length > 0 && (
                <Panel title="What people list">
                    <div className="space-y-2">
                        {data.topCategories.map((c) => {
                            const max = data.topCategories[0].count || 1;
                            return (
                                <div key={c.name} className="flex items-center gap-3">
                                    <span className="w-36 text-[13px] text-ink truncate flex-shrink-0">{c.name}</span>
                                    <div className="flex-1 h-1.5 rounded-sm bg-gray-100 overflow-hidden">
                                        <div
                                            className="h-full bg-forest"
                                            style={{ width: `${Math.round((c.count / max) * 100)}%` }}
                                        />
                                    </div>
                                    <Num className="w-8 text-right text-[13px] font-semibold text-ink">{c.count}</Num>
                                </div>
                            );
                        })}
                    </div>
                </Panel>
            )}
        </div>
    );
}
