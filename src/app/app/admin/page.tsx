import { Metadata } from "next";
import { getAnalytics } from "@/app/app/actions/analytics";
import { KpiGrid } from "@/components/admin/KpiGrid";
import { TrendChart } from "@/components/admin/TrendChart";
import { MilestoneList } from "@/components/admin/MilestoneList";

export const metadata: Metadata = { title: "Admin overview — Givny" };

export default async function AdminOverview() {
    const { data, success, message } = await getAnalytics();

    if (!success || !data) {
        return (
            <div className="bg-white border border-gray-200/70 rounded-3xl p-6">
                <p className="text-sm text-gray-500">{message || "Couldn't load analytics."}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-6">
            <section>
                <h2 className="text-xl font-bold text-ink tracking-tight mb-1">How the platform is doing</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Compared with the previous 30 days. Items rehomed is the number worth watching —
                    everything else is a means to it.
                </p>
                <KpiGrid kpis={data.kpis} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
                <section className="bg-white border border-gray-200/70 rounded-3xl p-5 md:p-6">
                    <h2 className="text-lg font-bold text-ink tracking-tight">Last six months</h2>
                    <p className="text-sm text-gray-500 mb-5">Signups, listings and handovers per month.</p>
                    <TrendChart points={data.trend} />
                </section>

                <section className="bg-white border border-gray-200/70 rounded-3xl p-5 md:p-6">
                    <h2 className="text-lg font-bold text-ink tracking-tight">Milestones</h2>
                    <p className="text-sm text-gray-500 mb-5">Each target steps up once you pass it.</p>
                    <MilestoneList milestones={data.milestones} />
                </section>
            </div>

            {data.topCategories.length > 0 && (
                <section className="bg-white border border-gray-200/70 rounded-3xl p-5 md:p-6">
                    <h2 className="text-lg font-bold text-ink tracking-tight mb-4">What people list</h2>
                    <div className="space-y-2.5">
                        {data.topCategories.map((c) => {
                            const max = data.topCategories[0].count || 1;
                            return (
                                <div key={c.name} className="flex items-center gap-3">
                                    <span className="w-40 text-sm text-ink truncate flex-shrink-0">{c.name}</span>
                                    <div className="flex-1 h-2.5 rounded-full bg-sand overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-primary"
                                            style={{ width: `${Math.round((c.count / max) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="w-8 text-right text-sm font-bold text-ink tabular-nums">{c.count}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
