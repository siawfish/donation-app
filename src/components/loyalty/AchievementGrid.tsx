import { Achievement } from "@/lib/loyalty";
import { Lock } from "lucide-react";

const GROUPS: Array<{ id: Achievement["group"]; label: string; blurb: string }> = [
    { id: "giving", label: "Giving", blurb: "Earned by putting items back into use" },
    { id: "community", label: "Community", blurb: "Earned by showing up for other members" },
    { id: "category", label: "Category champions", blurb: "Earned by specialising in what you give" },
];

function Badge({ a }: { a: Achievement }) {
    const pct = a.target > 0 ? Math.round((a.progress / a.target) * 100) : 0;

    return (
        <div
            className={`rounded-3xl p-4 border transition-colors ${
                a.unlocked
                    ? "bg-lime border-lime"
                    : "bg-white border-gray-200/70"
            }`}
        >
            <div className="flex items-start justify-between gap-2 mb-3">
                <span className={`text-2xl leading-none ${a.unlocked ? "" : "grayscale opacity-40"}`}>
                    {a.emoji}
                </span>
                {!a.unlocked && <Lock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-1" />}
            </div>

            <p className={`text-sm font-bold leading-tight ${a.unlocked ? "text-forest" : "text-ink"}`}>
                {a.name}
            </p>
            <p className={`text-[11px] mt-1 leading-relaxed ${a.unlocked ? "text-forest/70" : "text-gray-400"}`}>
                {a.description}
            </p>

            {a.unlocked ? (
                <p className="text-[11px] font-bold text-forest mt-3">Unlocked</p>
            ) : (
                <div className="mt-3">
                    <div className="h-1.5 w-full rounded-full bg-sand overflow-hidden">
                        <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5">
                        {a.progress} / {a.target}
                    </p>
                </div>
            )}
        </div>
    );
}

export function AchievementGrid({ achievements }: { achievements: Achievement[] }) {
    const unlockedCount = achievements.filter((a) => a.unlocked).length;

    return (
        <div className="space-y-8">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-1">Achievements</p>
                    <h2 className="text-xl font-bold text-ink tracking-tight">Your badges</h2>
                </div>
                <span className="text-sm text-gray-400 flex-shrink-0">
                    <span className="font-bold text-ink">{unlockedCount}</span> of {achievements.length} unlocked
                </span>
            </div>

            {GROUPS.map((group) => {
                const rows = achievements.filter((a) => a.group === group.id);
                if (rows.length === 0) return null;

                return (
                    <div key={group.id}>
                        <div className="mb-3">
                            <h3 className="text-sm font-bold text-ink">{group.label}</h3>
                            <p className="text-xs text-gray-400">{group.blurb}</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {rows.map((a) => (
                                <Badge key={a.id} a={a} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
